do $$
declare
 u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); r uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); e uuid:=gen_random_uuid();
 token text:='rollback-test-token-with-at-least-forty-characters';
 payload jsonb; thread jsonb; mail_id uuid; result jsonb;
begin
 insert into crm.support_mail_settings(singleton,ingest_token_hash) values(true,encode(extensions.digest(token,'sha256'),'hex'));
 insert into auth.users(id) values(u);
 insert into crm.staff_users(id,auth_user_id,display_name,email) values(s,u,'Rollback','staff@example.invalid');
 insert into crm.roles(id,key,name) values(r,'rollback_'||r,'Rollback');
 insert into crm.staff_roles(staff_user_id,role_id) values(s,r);
 insert into crm.role_permissions(role_id,permission_id) select r,id from crm.permissions where key in ('support.read','support.respond','support.manage');
 insert into crm.people(id,first_name,primary_email) values(p,'Rollback','customer@example.invalid');
 insert into crm.support_cases(id,person_id,subject) values(c,p,'Rollback');
 insert into crm.support_email_outbox(id,support_case_id,author_staff_user_id,recipient,sender,reply_to,subject,body,status,provider_id) values(e,c,s,'customer@example.invalid','support@example.invalid','support@example.invalid','Test','Hello','accepted','test_outbound');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'aal','aal2')::text,true);
 thread:=public.crm_support_inbox('thread',jsonb_build_object('case_id',c));
 payload:=jsonb_build_object('event_id','test_inbound','event_type','email.received','provider_id','test_received','occurred_at',now(),'received_at',now(),'sender','customer@example.invalid','recipients',jsonb_build_array(thread->>'reply_to'),'subject','Re: Test','body','Hello back','authenticated_sender',true);
 perform set_config('request.jwt.claims','{}',true);
 begin
  perform public.ingest_crm_support_mail('incorrect',payload);
  raise exception 'bad token accepted';
 exception when insufficient_privilege then null; end;
 perform public.ingest_crm_support_mail(token,payload);
 perform public.ingest_crm_support_mail(token,payload);
 if (select count(*) from crm.support_messages where support_case_id=c)<>1 then raise exception 'duplicate or automatic matching failure'; end if;
 select id into mail_id from crm.support_mail_inbox where provider_id='test_received';
 if (select status from crm.support_mail_inbox where id=mail_id)<>'attached' then raise exception 'attachment failure'; end if;
 perform public.ingest_crm_support_mail(token,payload||jsonb_build_object('event_id','spoof_event','provider_id','spoof_mail','authenticated_sender',false));
 if (select status from crm.support_mail_inbox where provider_id='spoof_mail')<>'unassigned' then raise exception 'spoof matched automatically'; end if;
 perform public.ingest_crm_support_mail(token,payload||jsonb_build_object('event_id','unknown_event','provider_id','unknown_mail','sender','other@example.invalid'));
 if (select status from crm.support_mail_inbox where provider_id='unknown_mail')<>'unassigned' then raise exception 'unknown sender matched'; end if;
 begin
  perform public.crm_support_inbox('list','{}');raise exception 'anonymous inbox accepted';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'aal','aal2')::text,true);
 select id into mail_id from crm.support_mail_inbox where provider_id='unknown_mail';
 result:=public.crm_support_inbox('create',jsonb_build_object('id',mail_id,'person_id',p));
 if result->>'case_id' is null then raise exception 'manual case creation failure'; end if;
 perform public.ingest_crm_support_mail(token,jsonb_build_object('event_id','delivery','event_type','email.delivered','provider_id','test_outbound','occurred_at',now()));
 result:=public.crm_support_inbox('delivery',jsonb_build_object('case_id',c));
 if result->>e::text<>'email.delivered' then raise exception 'delivery status failure'; end if;
 if has_table_privilege('anon','crm.support_mail_inbox','select') or has_function_privilege('anon','public.crm_support_inbox(text,jsonb)','execute') then raise exception 'anonymous grant failure'; end if;
end; $$;
select 'Inbox assertions passed; rollback removes all test data' as verification;
