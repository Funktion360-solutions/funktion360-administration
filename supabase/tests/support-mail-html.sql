-- Run with the migration inside one transaction, then roll back. No real email.
do $$
declare
 u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); r uuid:=gen_random_uuid();
 p uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); e uuid:=gen_random_uuid();
 payload jsonb; result jsonb;
begin
 insert into auth.users(id) values(u);
 insert into crm.staff_users(id,auth_user_id,display_name,email) values(s,u,'Rollback test','test@example.invalid');
 insert into crm.roles(id,key,name) values(r,'rollback_'||r,'Rollback test');
 insert into crm.staff_roles(staff_user_id,role_id) values(s,r);
 insert into crm.role_permissions(role_id,permission_id) select r,id from crm.permissions where key in ('support.read','support.respond');
 insert into crm.people(id,first_name,primary_email) values(p,'Rollback','recipient@example.invalid');
 insert into crm.support_cases(id,person_id,subject) values(c,p,'Rollback test');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'aal','aal2')::text,true);
 payload:=jsonb_build_object('id',e,'case_id',c,'recipient','recipient@example.invalid','sender','support@example.invalid','reply_to','support@example.invalid','subject','Test','body','Test body','html_body','<p>Immutable HTML</p>');
 result:=public.crm_support_email('prepare',payload);
 if result->>'html_body'<>'<p>Immutable HTML</p>' then raise exception 'HTML snapshot missing'; end if;
 if result->>'status'<>'prepared' then raise exception 'prepare assertion'; end if;
 result:=public.crm_support_email('prepare',payload||jsonb_build_object('html_body','<p>Later design</p>'));
 if result->>'html_body'<>'<p>Immutable HTML</p>' then raise exception 'snapshot was changed'; end if;
 if (select count(*) from crm.support_email_outbox where id=e)<>1 then raise exception 'duplicate assertion'; end if;
 begin
   perform public.crm_support_email('prepare',payload||jsonb_build_object('body','changed'));
   raise exception 'conflict not rejected';
 exception when raise_exception then if sqlerrm='conflict not rejected' then raise; end if; end;
 perform public.crm_support_email('uncertain',jsonb_build_object('id',e));
 result:=public.crm_support_email('retry',jsonb_build_object('id',e));
 if result->>'html_body'<>'<p>Immutable HTML</p>' then raise exception 'retry HTML changed'; end if;
 if result->>'body'<>'Test body' then raise exception 'retry immutable assertion'; end if;
 perform public.crm_support_email('accept',jsonb_build_object('id',e,'provider_id','mock_'||e));
 perform public.crm_support_email('accept',jsonb_build_object('id',e,'provider_id','mock_'||e));
 if (select count(*) from crm.support_messages where support_case_id=c)<>1 then raise exception 'message duplicate assertion'; end if;
 if (select status from crm.support_cases where id=c)<>'waiting_customer' then raise exception 'case status assertion'; end if;
 result:=public.crm_support_email('list',jsonb_build_object('case_id',c));
 if jsonb_array_length(result)<>1 then raise exception 'list assertion'; end if;
 update crm.support_email_outbox set status='uncertain',created_at=now()-interval '25 hours' where id=e;
 begin
   perform public.crm_support_email('retry',jsonb_build_object('id',e));
   raise exception 'expired retry not rejected';
 exception when raise_exception then if sqlerrm='expired retry not rejected' then raise; end if; end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'aal','aal1')::text,true);
 update crm.security_policies set boolean_value=true where policy_key='staff_mfa_required';
 begin
   perform public.crm_support_email('list',jsonb_build_object('case_id',c));
   raise exception 'MFA not enforced';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'aal','aal2')::text,true);
 perform public.crm_support_email('prepare',payload||jsonb_build_object('id',gen_random_uuid(),'html_body',null));
 if (select count(*) from crm.support_email_outbox where support_case_id=c and html_body is null)<>1 then raise exception 'legacy entry lost'; end if;
 begin
  perform public.crm_support_email('prepare',payload||jsonb_build_object('id',gen_random_uuid(),'html_body',repeat('x',200001)));
  raise exception 'oversize snapshot accepted';
 exception when check_violation then null; end;
 delete from crm.role_permissions where role_id=r;
 begin
   perform public.crm_support_email('list',jsonb_build_object('case_id',c));
   raise exception 'permission not enforced';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims','{}',true);
 begin
   perform public.crm_support_email('list',jsonb_build_object('case_id',c));
   raise exception 'unauthorized read accepted';
 exception when insufficient_privilege then null; end;
 if has_function_privilege('anon','public.crm_support_email(text,jsonb)','execute') then raise exception 'anon grant assertion'; end if;
 if has_table_privilege('authenticated','crm.support_email_outbox','SELECT') then raise exception 'direct table grant assertion'; end if;
end;
$$;
select 'CRM mail assertions passed; all test records rolled back' as verification;
