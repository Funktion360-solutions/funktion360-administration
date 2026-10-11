-- CRM-only outbox. No changes to Vores Kok tables or existing support RPCs.
create table crm.support_email_outbox (
 id uuid primary key,
 support_case_id uuid not null references crm.support_cases(id),
 author_staff_user_id uuid not null references crm.staff_users(id),
 recipient text not null,
 sender text not null,
 reply_to text not null,
 subject text not null,
 body text not null,
 status text not null default 'prepared' check (status in ('prepared','accepted','uncertain')),
 provider_id text unique,
 message_id uuid unique references crm.support_messages(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table crm.support_email_outbox enable row level security;
revoke all on crm.support_email_outbox from public, anon, authenticated;
create index support_email_outbox_case_idx on crm.support_email_outbox(support_case_id,created_at);

-- Definer stays inside private CRM; all operations explicitly check the live staff permission and MFA policy.
create function crm.support_email_operation(operation text, payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 staff_id uuid;
 item crm.support_email_outbox;
 case_id uuid;
 new_message uuid;
 org_id uuid;
begin
 if auth.uid() is null or not crm.has_permission(case when operation='list' then 'support.read' else 'support.respond' end) then
   raise exception 'permission denied' using errcode='42501';
 end if;
 if coalesce((select boolean_value from crm.security_policies where policy_key='staff_mfa_required' and is_active limit 1),true)
    and coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
   raise exception 'MFA required' using errcode='42501';
 end if;
 select id into strict staff_id from crm.staff_users where auth_user_id=auth.uid() and status='active';
 if operation='list' then
   case_id := (payload->>'case_id')::uuid;
   return coalesce((select jsonb_agg(to_jsonb(e) || jsonb_build_object('retry_allowed',e.created_at >= now()-interval '23 hours' and e.author_staff_user_id=staff_id) order by e.created_at) from crm.support_email_outbox e where e.support_case_id=case_id),'[]'::jsonb);
 end if;
 if operation='prepare' then
   case_id := (payload->>'case_id')::uuid;
   if not exists(select 1 from crm.support_cases where id=case_id) then raise exception 'case not found'; end if;
   if coalesce(payload->>'recipient','') !~ '^[^[:space:]<>@,;]+@[^[:space:]<>@,;]+[.][^[:space:]<>@,;]+$'
      or length(coalesce(payload->>'recipient','')) > 254
      or length(btrim(coalesce(payload->>'subject',''))) not between 1 and 200
      or (payload->>'subject') ~ '[\r\n]'
      or length(btrim(coalesce(payload->>'body',''))) not between 1 and 20000
      or length(coalesce(payload->>'sender','')) not between 3 and 320
      or length(coalesce(payload->>'reply_to','')) not between 3 and 254 then
     raise exception 'invalid email';
   end if;
   insert into crm.support_email_outbox(id,support_case_id,author_staff_user_id,recipient,sender,reply_to,subject,body)
   values((payload->>'id')::uuid,case_id,staff_id,payload->>'recipient',payload->>'sender',payload->>'reply_to',payload->>'subject',payload->>'body')
   on conflict(id) do nothing;
   select * into strict item from crm.support_email_outbox where id=(payload->>'id')::uuid;
   if item.author_staff_user_id<>staff_id or item.support_case_id<>case_id or item.recipient<>payload->>'recipient'
      or item.subject<>payload->>'subject' or item.body<>payload->>'body' then raise exception 'request conflict'; end if;
   if item.status<>'accepted' and item.created_at < now()-interval '23 hours' then raise exception 'retry expired'; end if;
   return to_jsonb(item);
 end if;
 select * into strict item from crm.support_email_outbox where id=(payload->>'id')::uuid for update;
 if item.author_staff_user_id<>staff_id then raise exception 'permission denied' using errcode='42501'; end if;
 if operation='retry' then
   if item.status<>'accepted' and item.created_at < now()-interval '23 hours' then raise exception 'retry expired'; end if;
   return to_jsonb(item);
 elsif operation='uncertain' then
   update crm.support_email_outbox set status='uncertain',updated_at=now() where id=item.id and status<>'accepted';
   return jsonb_build_object('ok',true);
 elsif operation='accept' then
   if item.status='accepted' then return to_jsonb(item); end if;
   if length(coalesce(payload->>'provider_id','')) not between 1 and 200 then raise exception 'provider id required'; end if;
   insert into crm.support_messages(support_case_id,message_type,visibility,author_staff_user_id,body,source_system,external_reference)
   values(item.support_case_id,'staff_response','customer',staff_id,item.body,'resend',payload->>'provider_id') returning id into new_message;
   update crm.support_email_outbox set status='accepted',provider_id=payload->>'provider_id',message_id=new_message,updated_at=now() where id=item.id returning * into item;
   update crm.support_cases set first_response_at=coalesce(first_response_at,now()),updated_at=now(),
     status=case when status in ('new','open','waiting_internal') then 'waiting_customer' else status end
     where id=item.support_case_id returning organization_id into org_id;
   perform crm.write_audit_event(event_action:='RESPOND',event_category:='support',event_entity_type:='support_case',
     event_entity_id:=item.support_case_id,event_organization_id:=org_id,event_metadata:=jsonb_build_object('message_id',new_message,'email_id',item.id,'provider_id',item.provider_id));
   return to_jsonb(item);
 end if;
 raise exception 'invalid operation';
end;
$$;
revoke all on function crm.support_email_operation(text,jsonb) from public,anon;
grant usage on schema crm to authenticated;
grant execute on function crm.support_email_operation(text,jsonb) to authenticated;
create function public.crm_support_email(operation text,payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select crm.support_email_operation(operation,payload);
$$;
revoke all on function public.crm_support_email(text,jsonb) from public,anon;
grant execute on function public.crm_support_email(text,jsonb) to authenticated;
