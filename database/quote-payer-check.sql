-- Run after quote-commercial-assignment.sql in Vores Kok CRM.
begin;
alter table crm.quote_commercial_assignments add column stripe_customer_id text,add column stripe_customer_email text,add column stripe_customer_name text,add column stripe_payer_matches boolean,add column stripe_checked_at timestamptz,add column stripe_checked_assignment_at timestamptz;
create function crm_private.record_payer_check(p_quote uuid,p_version timestamptz,p_customer text,p_email text,p_name text,p_actor uuid) returns boolean language plpgsql security definer set search_path='' as $$declare a crm.quote_commercial_assignments%rowtype;matches boolean;begin
 if p_customer is null or p_customer !~ '^cus_' or not exists(select 1 from crm.staff_users where id=p_actor and status='active') then raise exception 'Invalid check' using errcode='22023';end if;
 select * into a from crm.quote_commercial_assignments where quote_id=p_quote for update;
 if not found or a.updated_at is distinct from p_version then raise exception 'Assignment changed; recheck' using errcode='22023';end if;
 matches:=nullif(btrim(p_email),'') is not null and lower(btrim(a.payer_email))=lower(btrim(p_email));
 update crm.quote_commercial_assignments set stripe_customer_id=p_customer,stripe_customer_email=p_email,stripe_customer_name=p_name,stripe_payer_matches=matches,stripe_checked_at=now(),stripe_checked_assignment_at=a.updated_at where quote_id=p_quote;
 insert into crm.audit_events(actor_staff_user_id,action,category,entity_type,entity_id,result,metadata) values(p_actor,'CHECK_STRIPE_TEST_PAYER','billing','quote_draft',p_quote,'success',jsonb_build_object('customer_id',p_customer,'email_matches',matches,'mode','test','stripe_updated',false));
 return matches;
end$$;
create function public.record_crm_payer_check(p_quote uuid,p_version timestamptz,p_customer text,p_email text,p_name text,p_actor uuid) returns boolean language sql security invoker set search_path='' as $$select crm_private.record_payer_check(p_quote,p_version,p_customer,p_email,p_name,p_actor)$$;
revoke all on function crm_private.record_payer_check(uuid,timestamptz,text,text,text,uuid),public.record_crm_payer_check(uuid,timestamptz,text,text,text,uuid) from public,anon,authenticated;
grant execute on function crm_private.record_payer_check(uuid,timestamptz,text,text,text,uuid),public.record_crm_payer_check(uuid,timestamptz,text,text,text,uuid) to service_role;
commit;
