begin;
create table crm.organization_id_memberships (
 organization_id uuid not null references crm.organizations(id),
 person_id uuid not null references crm.person_id_links(person_id),
 role text not null check(role in ('owner','admin','member','billing')),
 status text not null check(status in ('active','suspended','removed')),
 reason text not null check(length(btrim(reason)) between 5 and 1000),
 updated_at timestamptz not null default now(),
 primary key(organization_id,person_id)
);
alter table crm.organization_id_memberships enable row level security;
revoke all on crm.organization_id_memberships from public,anon,authenticated;
create function crm_private.organization_id_members(p_org uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not crm.has_permission('organizations.read') or not crm.has_permission('people.read') then raise exception 'Permission denied' using errcode='42501';end if;
 return jsonb_build_object('members',coalesce((select jsonb_agg(jsonb_build_object('person_id',m.person_id,'name',concat_ws(' ',p.first_name,p.last_name),'email',p.primary_email,'role',m.role,'status',m.status,'updated_at',m.updated_at) order by p.first_name,p.last_name) from crm.organization_id_memberships m join crm.people p on p.id=m.person_id where m.organization_id=p_org),'[]'::jsonb),'candidates',coalesce((select jsonb_agg(jsonb_build_object('person_id',p.id,'name',concat_ws(' ',p.first_name,p.last_name),'email',p.primary_email) order by p.first_name,p.last_name) from crm.people p join crm.person_id_links l on l.person_id=p.id where p.status='active'),'[]'::jsonb));
end$$;
create function crm_private.save_organization_id_member(p_org uuid,p_person uuid,p_role text,p_status text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare previous crm.organization_id_memberships%rowtype;actor uuid;
begin
 if auth.uid() is null or not crm.has_permission('organizations.update') or not crm.has_permission('organizations.read') or not crm.has_permission('people.read') or not crm.has_permission('licenses.manage') then raise exception 'Permission denied' using errcode='42501';end if;
 perform public.require_crm_critical_action_aal2();
 select id into actor from crm.staff_users where auth_user_id=auth.uid() and status='active';
 if actor is null then raise exception 'Active staff required' using errcode='42501';end if;
 if p_role is null or p_role not in ('owner','admin','member','billing') or p_status is null or p_status not in ('active','suspended','removed') or p_reason is null or length(btrim(p_reason)) not between 5 and 1000 then raise exception 'Invalid membership' using errcode='22023';end if;
 perform 1 from crm.organizations where id=p_org and status='active' for update;
 if not found then raise exception 'Active organization required' using errcode='22023';end if;
 if not exists(select 1 from crm.people p join crm.person_id_links l on l.person_id=p.id where p.id=p_person and (p.status='active' or p_status<>'active') and l.issuer='https://fthalqavjmsydmqszvkk.supabase.co/auth/v1') then raise exception 'Verified person required' using errcode='22023';end if;
 select * into previous from crm.organization_id_memberships where organization_id=p_org and person_id=p_person;
 if previous.person_id is not null and previous.role=p_role and previous.status=p_status then return;end if;
 if previous.role='owner' and previous.status='active' and (p_role<>'owner' or p_status<>'active') and not exists(select 1 from crm.organization_id_memberships where organization_id=p_org and person_id<>p_person and role='owner' and status='active') then raise exception 'Assign another owner first' using errcode='22023';end if;
 insert into crm.organization_id_memberships values(p_org,p_person,p_role,p_status,btrim(p_reason),now()) on conflict(organization_id,person_id) do update set role=excluded.role,status=excluded.status,reason=excluded.reason,updated_at=excluded.updated_at;
 insert into crm.audit_events(actor_staff_user_id,actor_auth_user_id,action,category,entity_type,entity_id,organization_id,result,reason,metadata) values(actor,auth.uid(),'SAVE_ORGANIZATION_ID_MEMBER','identity','person',p_person,p_org,'success',btrim(p_reason),jsonb_build_object('old_role',previous.role,'old_status',previous.status,'role',p_role,'status',p_status,'product','favn360','product_access_changed',false));
end$$;
create function public.get_crm_organization_id_members(p_org uuid) returns jsonb language sql security invoker set search_path='' as $$select crm_private.organization_id_members(p_org)$$;
create function public.save_crm_organization_id_member(p_org uuid,p_person uuid,p_role text,p_status text,p_reason text) returns void language sql security invoker set search_path='' as $$select crm_private.save_organization_id_member(p_org,p_person,p_role,p_status,p_reason)$$;
revoke all on function crm_private.organization_id_members(uuid),public.get_crm_organization_id_members(uuid),crm_private.save_organization_id_member(uuid,uuid,text,text,text),public.save_crm_organization_id_member(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function crm_private.organization_id_members(uuid),public.get_crm_organization_id_members(uuid),crm_private.save_organization_id_member(uuid,uuid,text,text,text),public.save_crm_organization_id_member(uuid,uuid,text,text,text) to authenticated;
commit;
