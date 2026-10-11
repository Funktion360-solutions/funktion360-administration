-- Immutable HTML snapshot: old outbox entries keep their original plain-text payload.
-- CRM only; access control and the public RPC signature are unchanged.
alter table crm.support_email_outbox add column html_body text
 check (html_body is null or length(html_body) between 1 and 200000);

CREATE OR REPLACE FUNCTION crm.support_email_operation(operation text, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
   insert into crm.support_email_outbox(id,support_case_id,author_staff_user_id,recipient,sender,reply_to,subject,body,html_body)
   values((payload->>'id')::uuid,case_id,staff_id,payload->>'recipient',payload->>'sender',payload->>'reply_to',payload->>'subject',payload->>'body',nullif(payload->>'html_body',''))
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
$function$
