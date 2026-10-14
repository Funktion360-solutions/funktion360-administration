-- Run in Vores Kok CRM after the quote/Stripe packages.
begin;
create table crm.quote_commercial_assignments(quote_id uuid primary key references crm.quote_drafts(id),plan_id uuid not null references crm.product_plans(id),organization_id uuid references crm.organizations(id),payer_person_id uuid references crm.people(id),payer_organization_id uuid references crm.organizations(id),plan_name text not null,organization_name text,payer_name text not null,payer_email text not null,reason text not null check(char_length(btrim(reason)) between 1 and 500),updated_by uuid not null references crm.staff_users(id),updated_at timestamptz not null default now(),check((payer_person_id is null)<>(payer_organization_id is null)));
alter table crm.quote_commercial_assignments enable row level security;
revoke all on crm.quote_commercial_assignments from public,anon,authenticated;
create function crm_private.quote_assignment(p_quote uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('quotes.read') or not crm.has_permission('people.read') or not crm.has_permission('licenses.read') or not crm.has_permission('organizations.read') then raise exception 'Permission denied' using errcode='42501';end if;
 if not exists(select 1 from crm.quote_drafts where id=p_quote) then return null;end if;
 select jsonb_build_object('assignment',(select to_jsonb(a) from crm.quote_commercial_assignments a where a.quote_id=p_quote),'plans',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name) order by p.name),'[]'::jsonb) from crm.product_plans p join crm.quote_drafts q on q.product_id=p.product_id where q.id=p_quote and p.status='active'),'organizations',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name),'[]'::jsonb) from crm.organizations where status='active'),'people',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',concat_ws(' ',first_name,last_name),'email',primary_email) order by first_name,last_name),'[]'::jsonb) from crm.people where status='active' and primary_email is not null)) into result;
 return result;
end$$;
create function crm_private.assign_quote(p_quote uuid,p_plan uuid,p_organization uuid,p_payer_person uuid,p_payer_organization uuid,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare q crm.quote_drafts%rowtype;previous crm.quote_commercial_assignments%rowtype;staff uuid;plan_name text;organization_name text;payer_name text;payer_email text;
begin
 if auth.uid() is null or not crm.has_permission('quotes.manage') or not crm.has_permission('licenses.manage') or not crm.has_permission('people.read') or not crm.has_permission('organizations.read') then raise exception 'Permission denied' using errcode='42501';end if;
 perform public.require_crm_critical_action_aal2();
 select id into strict staff from crm.staff_users where auth_user_id=auth.uid() and status='active';
 if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 or (p_payer_person is null)=(p_payer_organization is null) then raise exception 'Plan and exactly one payer required' using errcode='22023';end if;
 select * into q from crm.quote_drafts where id=p_quote for update;
 if not found or q.status<>'approved' or q.accepted_at is null or not exists(select 1 from crm.products where id=q.product_id and slug='favn360') then raise exception 'Accepted Favn360 quote required' using errcode='22023';end if;
 select p.name into plan_name from crm.product_plans p where p.id=p_plan and p.product_id=q.product_id and p.status='active';
 if not found then raise exception 'Active matching plan required' using errcode='22023';end if;
 if p_organization is not null then
 select o.name into organization_name from crm.organizations o where o.id=p_organization and o.status='active';
 if not found then raise exception 'Active organization required' using errcode='22023';end if;end if;
 if p_payer_person is not null then
 select coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.primary_email),p.primary_email into payer_name,payer_email from crm.people p where p.id=p_payer_person and p.status='active';
 else
 select o.name,o.primary_email into payer_name,payer_email from crm.organizations o where o.id=p_payer_organization and o.status='active';end if;
 if payer_name is null or nullif(btrim(payer_email),'') is null then raise exception 'Active payer with email required' using errcode='22023';end if;
 select * into previous from crm.quote_commercial_assignments where quote_id=p_quote;
 if found and previous.plan_id=p_plan and previous.organization_id is not distinct from p_organization and previous.payer_person_id is not distinct from p_payer_person and previous.payer_organization_id is not distinct from p_payer_organization and previous.reason=btrim(p_reason) and previous.plan_name=plan_name and previous.organization_name is not distinct from organization_name and previous.payer_name=payer_name and previous.payer_email=payer_email then return p_quote;end if;
 insert into crm.quote_commercial_assignments(quote_id,plan_id,organization_id,payer_person_id,payer_organization_id,plan_name,organization_name,payer_name,payer_email,reason,updated_by) values(p_quote,p_plan,p_organization,p_payer_person,p_payer_organization,plan_name,organization_name,payer_name,payer_email,btrim(p_reason),staff) on conflict(quote_id) do update set plan_id=excluded.plan_id,organization_id=excluded.organization_id,payer_person_id=excluded.payer_person_id,payer_organization_id=excluded.payer_organization_id,plan_name=excluded.plan_name,organization_name=excluded.organization_name,payer_name=excluded.payer_name,payer_email=excluded.payer_email,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=now();
 insert into crm.audit_events(actor_staff_user_id,actor_auth_user_id,action,category,entity_type,entity_id,result,reason,metadata) values(staff,auth.uid(),'ASSIGN_QUOTE_PLAN_PAYER','billing','quote_draft',p_quote,'success',btrim(p_reason),jsonb_build_object('plan_id',p_plan,'organization_id',p_organization,'payer_person_id',p_payer_person,'payer_organization_id',p_payer_organization,'previous_plan_id',previous.plan_id,'previous_organization_id',previous.organization_id,'previous_payer_person_id',previous.payer_person_id,'previous_payer_organization_id',previous.payer_organization_id,'activation','not_requested','stripe_payer','not_updated'));
 return p_quote;
end$$;
create function public.get_crm_quote_assignment(p_quote uuid) returns jsonb language sql security invoker set search_path='' as $$select crm_private.quote_assignment(p_quote)$$;
create function public.assign_crm_quote(p_quote uuid,p_plan uuid,p_organization uuid,p_payer_person uuid,p_payer_organization uuid,p_reason text) returns uuid language sql security invoker set search_path='' as $$select crm_private.assign_quote(p_quote,p_plan,p_organization,p_payer_person,p_payer_organization,p_reason)$$;
revoke all on function crm_private.quote_assignment(uuid),crm_private.assign_quote(uuid,uuid,uuid,uuid,uuid,text),public.get_crm_quote_assignment(uuid),public.assign_crm_quote(uuid,uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function crm_private.quote_assignment(uuid),crm_private.assign_quote(uuid,uuid,uuid,uuid,uuid,text),public.get_crm_quote_assignment(uuid),public.assign_crm_quote(uuid,uuid,uuid,uuid,uuid,text) to authenticated;
commit;
