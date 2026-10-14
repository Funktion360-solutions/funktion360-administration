begin;
create schema if not exists crm_private;
revoke all on schema crm_private from public,anon;
grant usage on schema crm_private to authenticated;
create table crm.person_product_requests(
 id uuid primary key default gen_random_uuid(),person_id uuid not null references crm.people(id),product_id uuid not null references crm.products(id),
 status text not null default 'pending' check(status in ('pending','withdrawn','provisioning','active','failed','suspended')),
 reason text not null check(char_length(btrim(reason)) between 1 and 500),created_by uuid not null references crm.staff_users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index person_product_request_open on crm.person_product_requests(person_id,product_id) where status<>'withdrawn';
alter table crm.person_product_requests enable row level security;
revoke all on crm.person_product_requests from public,anon,authenticated;
create function crm_private.request_person_product(p_person uuid,p_product uuid,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare staff uuid; request_id uuid;
begin
 if auth.uid() is null or not crm.has_permission('licenses.manage') or not crm.has_permission('people.update') then raise exception 'Permission denied' using errcode='42501';end if;
 perform public.require_crm_critical_action_aal2();
 select id into strict staff from crm.staff_users where auth_user_id=auth.uid() and status='active';
 if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then raise exception 'Reason required' using errcode='22023';end if;
 if not exists(select 1 from crm.people where id=p_person and status='active' and primary_email is not null) or not exists(select 1 from crm.products where id=p_product and status='active') then raise exception 'Active person and product required' using errcode='22023';end if;
 insert into crm.person_product_requests(person_id,product_id,reason,created_by) values(p_person,p_product,btrim(p_reason),staff) on conflict(person_id,product_id) where status<>'withdrawn' do nothing returning id into request_id;
 if request_id is null then select id into request_id from crm.person_product_requests where person_id=p_person and product_id=p_product and status<>'withdrawn';return request_id;end if;
 insert into crm.audit_events(actor_staff_user_id,actor_auth_user_id,action,category,entity_type,entity_id,result,reason,metadata) values(staff,auth.uid(),'REQUEST_PRODUCT','access','person_product_request',request_id,'success',btrim(p_reason),jsonb_build_object('person_id',p_person,'product_id',p_product));
 return request_id;
end $$;
create function crm_private.list_person_products(p_person uuid) returns table(id uuid,product_id uuid,product_name text,status text,reason text,created_at timestamptz) language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not crm.has_permission('people.read') or not crm.has_permission('licenses.read') then raise exception 'Permission denied' using errcode='42501';end if;
 return query select r.id,r.product_id,p.name,r.status,r.reason,r.created_at from crm.person_product_requests r join crm.products p on p.id=r.product_id where r.person_id=p_person order by r.created_at desc;
end $$;
create function public.request_crm_person_product(p_person uuid,p_product uuid,p_reason text) returns uuid language sql security invoker set search_path='' as $$select crm_private.request_person_product(p_person,p_product,p_reason)$$;
create function public.list_crm_person_product_requests(p_person uuid) returns table(id uuid,product_id uuid,product_name text,status text,reason text,created_at timestamptz) language sql security invoker set search_path='' as $$select * from crm_private.list_person_products(p_person)$$;
revoke all on function crm_private.request_person_product(uuid,uuid,text),crm_private.list_person_products(uuid),public.request_crm_person_product(uuid,uuid,text),public.list_crm_person_product_requests(uuid) from public,anon,authenticated;
grant execute on function crm_private.request_person_product(uuid,uuid,text),crm_private.list_person_products(uuid),public.request_crm_person_product(uuid,uuid,text),public.list_crm_person_product_requests(uuid) to authenticated;
commit;
