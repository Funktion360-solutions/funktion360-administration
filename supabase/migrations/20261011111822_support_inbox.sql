-- Scoped CRM inbound mail; no service-role access needed by webhook.
create table crm.support_mail_settings (
 singleton boolean primary key default true check(singleton),
 ingest_token_hash text not null check(length(ingest_token_hash)=64)
);
create table crm.support_mail_threads (
 support_case_id uuid primary key references crm.support_cases(id),
 token uuid not null unique default gen_random_uuid()
);
create table crm.support_mail_inbox (
 id uuid primary key default gen_random_uuid(),
 provider_id text not null unique,
 sender text not null,
 recipients jsonb not null,
 subject text not null,
 body text not null,
 attachment_count integer not null default 0,
 authenticated_sender boolean not null default false,
 support_case_id uuid references crm.support_cases(id),
 message_id uuid unique references crm.support_messages(id),
 received_at timestamptz not null,
 status text not null default 'unassigned' check(status in ('unassigned','attached','archived'))
);
create table crm.support_mail_events (
 event_id text primary key,
 provider_id text not null,
 event_type text not null,
 occurred_at timestamptz not null
);
create index support_mail_events_provider_idx on crm.support_mail_events(provider_id,occurred_at desc);
create index support_mail_inbox_status_idx on crm.support_mail_inbox(status,received_at desc);
alter table crm.support_mail_settings enable row level security;
alter table crm.support_mail_threads enable row level security;
alter table crm.support_mail_inbox enable row level security;
alter table crm.support_mail_events enable row level security;
revoke all on crm.support_mail_settings,crm.support_mail_threads,crm.support_mail_inbox,crm.support_mail_events from public,anon,authenticated;

create function crm.attach_inbound_mail(mail_id uuid,case_id uuid,person_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare item crm.support_mail_inbox; ticket crm.support_cases; msg uuid;
begin
 select * into strict item from crm.support_mail_inbox where id=mail_id for update;
 if item.status='attached' then
  if item.support_case_id<>case_id then raise exception 'mail already attached elsewhere'; end if;
  return;
 end if;
 select * into strict ticket from crm.support_cases where id=case_id;
 if person_id is null or ticket.person_id is distinct from person_id then raise exception 'case person mismatch'; end if;
 insert into crm.support_messages(support_case_id,message_type,visibility,author_person_id,body,source_system,external_reference)
 values(case_id,'customer_message','customer',person_id,item.body,'resend',item.provider_id) returning id into msg;
 update crm.support_mail_inbox set support_case_id=case_id,message_id=msg,status='attached' where id=mail_id;
 update crm.support_cases set updated_at=now(),status=case when status in ('new','waiting_customer','resolved') then 'open' else status end,resolved_at=case when status='resolved' then null else resolved_at end where id=case_id;
end; $$;
revoke all on function crm.attach_inbound_mail(uuid,uuid,uuid) from public,anon,authenticated;

-- Only a server-held, separately provisioned token can ingest provider events.
-- This grants neither customer reads nor general CRM/database writes.
create schema support_mail_ingress;
revoke all on schema support_mail_ingress from public;
grant usage on schema support_mail_ingress to anon,authenticated;
create function support_mail_ingress.ingest_support_mail(ingest_token text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item_id uuid; case_id uuid; person_id uuid; match_count integer;
begin
 if length(coalesce(ingest_token,''))<40 or not exists(select 1 from crm.support_mail_settings where ingest_token_hash=encode(extensions.digest(ingest_token,'sha256'),'hex')) then
  raise exception 'invalid ingest token' using errcode='42501';
 end if;
 if length(coalesce(payload->>'event_id','')) not between 1 and 200
    or length(coalesce(payload->>'provider_id','')) not between 1 and 200 then raise exception 'invalid event'; end if;
 if exists(select 1 from crm.support_mail_events where event_id=payload->>'event_id') then return jsonb_build_object('duplicate',true); end if;
 if payload->>'event_type' not in ('email.received','email.sent','email.delivered','email.delivery_delayed','email.bounced','email.failed','email.complained','email.suppressed') then raise exception 'unsupported event'; end if;
 if payload->>'event_type'='email.received' then
  if length(coalesce(payload->>'sender','')) not between 3 and 254 or length(coalesce(payload->>'body',''))>100000 or jsonb_typeof(payload->'recipients')<>'array' then raise exception 'invalid received mail'; end if;
  insert into crm.support_mail_inbox(provider_id,sender,recipients,subject,body,attachment_count,authenticated_sender,received_at)
  values(payload->>'provider_id',payload->>'sender',payload->'recipients',left(coalesce(payload->>'subject','Uden emne'),500),coalesce(nullif(payload->>'body',''),'[Mail uden tekstindhold]'),least(greatest(coalesce((payload->>'attachment_count')::int,0),0),1000),coalesce((payload->>'authenticated_sender')::boolean,false),(payload->>'received_at')::timestamptz)
  on conflict(provider_id) do nothing returning id into item_id;
  if item_id is not null and coalesce((payload->>'authenticated_sender')::boolean,false) then
   -- Opaque thread token plus an existing recipient on this case. No subject-based matching.
   select t.support_case_id,c.person_id,count(*) over() into case_id,person_id,match_count from crm.support_mail_threads t
   join crm.support_cases c on c.id=t.support_case_id
   where c.person_id is not null and exists(select 1 from jsonb_array_elements_text(payload->'recipients') a where lower(a)=lower('support+'||t.token::text||'@indbakke.funktion360.dk'))
   and exists(select 1 from crm.support_email_outbox e where e.support_case_id=t.support_case_id and e.status='accepted' and lower(e.recipient)=lower(payload->>'sender')) limit 1;
   if case_id is not null and match_count=1 then perform crm.attach_inbound_mail(item_id,case_id,person_id); end if;
  end if;
 end if;
 insert into crm.support_mail_events(event_id,provider_id,event_type,occurred_at)
 values(payload->>'event_id',payload->>'provider_id',payload->>'event_type',(payload->>'occurred_at')::timestamptz)
 on conflict(event_id) do nothing;
 return jsonb_build_object('ok',true);
end; $$;
revoke all on function support_mail_ingress.ingest_support_mail(text,jsonb) from public;
grant execute on function support_mail_ingress.ingest_support_mail(text,jsonb) to anon,authenticated;

create function public.ingest_crm_support_mail(ingest_token text,payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select support_mail_ingress.ingest_support_mail(ingest_token,payload); $$;
revoke all on function public.ingest_crm_support_mail(text,jsonb) from public;
grant execute on function public.ingest_crm_support_mail(text,jsonb) to anon,authenticated;

create function crm.support_inbox_operation(operation text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item crm.support_mail_inbox; case_id uuid; person_id uuid; result jsonb; thread_token uuid;
begin
 if auth.uid() is null or not crm.has_permission(case when operation in ('list','get','delivery') then 'support.read' when operation='thread' then 'support.respond' else 'support.manage' end) then raise exception 'permission denied' using errcode='42501'; end if;
 if coalesce((select boolean_value from crm.security_policies where policy_key='staff_mfa_required' and is_active limit 1),true) and coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'MFA required' using errcode='42501'; end if;
 if operation='list' then
  return coalesce((select jsonb_agg(to_jsonb(e)-'body' order by e.received_at desc) from (select * from crm.support_mail_inbox where status=coalesce(payload->>'status','unassigned') order by received_at desc limit 200) e),'[]'::jsonb);
 elsif operation='get' then
  select to_jsonb(e) into result from crm.support_mail_inbox e where id=(payload->>'id')::uuid; return result;
 elsif operation='delivery' then
  return coalesce((select jsonb_object_agg(e.id,coalesce((select event_type from crm.support_mail_events m where m.provider_id=e.provider_id and m.event_type<>'email.received' order by case when event_type in ('email.bounced','email.failed','email.complained','email.suppressed') then 2 else 1 end desc,occurred_at desc limit 1),'email.sent')) from crm.support_email_outbox e where e.support_case_id=(payload->>'case_id')::uuid),'{}'::jsonb);
 elsif operation='thread' then
  case_id:=(payload->>'case_id')::uuid;
  insert into crm.support_mail_threads(support_case_id) values(case_id) on conflict do nothing;
  select token into thread_token from crm.support_mail_threads where support_case_id=case_id;
  return jsonb_build_object('reply_to','support+'||thread_token::text||'@indbakke.funktion360.dk');
 end if;
 select * into strict item from crm.support_mail_inbox where id=(payload->>'id')::uuid for update;
 if operation='archive' then
  if item.status='attached' then raise exception 'attached mail cannot be archived'; end if;
  update crm.support_mail_inbox set status='archived' where id=item.id;
 elsif operation='attach' then
  case_id:=(payload->>'case_id')::uuid;
  select c.person_id into person_id from crm.support_cases c where c.id=case_id;
  perform crm.attach_inbound_mail(item.id,case_id,person_id);
 elsif operation='create' then
  if item.status='attached' then return jsonb_build_object('case_id',item.support_case_id); end if;
  person_id:=(payload->>'person_id')::uuid;
  case_id:=public.create_crm_support_case(left(item.subject,200),'Modtaget fra '||item.sender,person_id,null,null,'normal','email');
  perform crm.attach_inbound_mail(item.id,case_id,person_id);
 else raise exception 'invalid operation'; end if;
 perform crm.write_audit_event(event_action:='UPDATE',event_category:='support',event_entity_type:='support_inbox',event_entity_id:=item.id,event_metadata:=jsonb_build_object('operation',operation,'case_id',case_id));
 return jsonb_build_object('ok',true,'case_id',case_id);
end; $$;
revoke all on function crm.support_inbox_operation(text,jsonb) from public,anon;
grant execute on function crm.support_inbox_operation(text,jsonb) to authenticated;
create function public.crm_support_inbox(operation text,payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select crm.support_inbox_operation(operation,payload); $$;
revoke all on function public.crm_support_inbox(text,jsonb) from public,anon;
grant execute on function public.crm_support_inbox(text,jsonb) to authenticated;
