-- Unified Person Profile read API.
-- CRM tables remain outside the browser-facing API surface.
-- Authenticated staff access data through narrow SECURITY DEFINER RPCs.

create or replace function public.get_crm_person(
  target_person_id uuid
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  primary_email text,
  phone text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not crm.has_permission('people.read') then
    raise exception 'permission denied'
      using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.first_name,
    p.last_name,
    p.primary_email,
    p.phone,
    p.status,
    p.created_at,
    p.updated_at
  from crm.people p
  where p.id = target_person_id
    and p.status <> 'deleted';
end;
$$;


create or replace function public.get_crm_person_external_identities(
  target_person_id uuid
)
returns table (
  id uuid,
  system text,
  external_user_id text,
  email text,
  is_active boolean,
  last_synced_at timestamptz,
  source_updated_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not crm.has_permission('people.read') then
    raise exception 'permission denied'
      using errcode = '42501';
  end if;

  return query
  select
    ei.id,
    ei.system,
    ei.external_user_id,
    ei.email,
    ei.is_active,
    ei.last_synced_at,
    ei.source_updated_at,
    ei.created_at,
    ei.updated_at
  from crm.external_identities ei
  join crm.people p
    on p.id = ei.person_id
  where ei.person_id = target_person_id
    and p.status <> 'deleted'
  order by ei.system asc, ei.created_at asc;
end;
$$;


create or replace function public.get_crm_person_organizations(
  target_person_id uuid
)
returns table (
  relation_id uuid,
  organization_id uuid,
  organization_name text,
  organization_type text,
  cvr_number text,
  organization_email text,
  organization_phone text,
  organization_status text,
  role text,
  job_title text,
  is_primary_contact boolean,
  is_billing_contact boolean,
  is_contract_contact boolean,
  is_technical_contact boolean,
  is_dpo_contact boolean,
  relation_created_at timestamptz,
  relation_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not crm.has_permission('people.read') then
    raise exception 'permission denied'
      using errcode = '42501';
  end if;

  return query
  select
    op.id,
    o.id,
    o.name,
    o.organization_type,
    o.cvr_number,
    o.primary_email,
    o.phone,
    o.status,
    op.role,
    op.job_title,
    op.is_primary_contact,
    op.is_billing_contact,
    op.is_contract_contact,
    op.is_technical_contact,
    op.is_dpo_contact,
    op.created_at,
    op.updated_at
  from crm.organization_people op
  join crm.organizations o
    on o.id = op.organization_id
  join crm.people p
    on p.id = op.person_id
  where op.person_id = target_person_id
    and p.status <> 'deleted'
    and o.status <> 'deleted'
  order by
    op.is_primary_contact desc,
    o.name asc;
end;
$$;


revoke all on function public.get_crm_person(uuid)
  from public;

revoke all on function public.get_crm_person_external_identities(uuid)
  from public;

revoke all on function public.get_crm_person_organizations(uuid)
  from public;


revoke all on function public.get_crm_person(uuid)
  from anon;

revoke all on function public.get_crm_person_external_identities(uuid)
  from anon;

revoke all on function public.get_crm_person_organizations(uuid)
  from anon;


grant execute on function public.get_crm_person(uuid)
  to authenticated;

grant execute on function public.get_crm_person_external_identities(uuid)
  to authenticated;

grant execute on function public.get_crm_person_organizations(uuid)
  to authenticated;
