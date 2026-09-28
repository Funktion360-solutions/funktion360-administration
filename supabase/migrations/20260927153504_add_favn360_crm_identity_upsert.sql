alter table crm.external_identities
  add column if not exists source_updated_at timestamp with time zone;

comment on column crm.external_identities.source_updated_at is
  'Latest source-system updated_at accepted for this external identity; used to reject stale synchronization writes.';

create or replace function public.upsert_favn360_crm_identity(
  target_external_user_id uuid,
  target_email text,
  target_full_name text,
  target_role text,
  target_source_updated_at timestamp with time zone
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_person_id uuid;
  existing_source_updated_at timestamp with time zone;
  normalized_email text;
  normalized_full_name text;
  resolved_first_name text;
  resolved_last_name text;
  identity_exists boolean := false;
begin
  if target_external_user_id is null then
    raise exception 'external user ID is required'
      using errcode = '22023';
  end if;

  normalized_email :=
    nullif(lower(btrim(target_email)), '');

  normalized_full_name :=
    nullif(btrim(target_full_name), '');

  if normalized_full_name is null then
    raise exception 'full name is required'
      using errcode = '22023';
  end if;

  if target_role is null
     or target_role not in (
       'citizen',
       'administrator',
       'representative'
     )
  then
    raise exception 'invalid Favn360 role'
      using errcode = '22023';
  end if;

  if target_source_updated_at is null then
    raise exception 'source updated_at is required'
      using errcode = '22023';
  end if;

  resolved_first_name :=
    split_part(normalized_full_name, ' ', 1);

  resolved_last_name :=
    nullif(
      btrim(
        substring(
          normalized_full_name
          from length(resolved_first_name) + 1
        )
      ),
      ''
    );

  select
    ei.person_id,
    ei.source_updated_at
  into
    resolved_person_id,
    existing_source_updated_at
  from crm.external_identities as ei
  where ei.system = 'favn360'
    and ei.external_user_id = target_external_user_id::text
  for update;

  identity_exists := found;

  if identity_exists
     and existing_source_updated_at is not null
     and target_source_updated_at < existing_source_updated_at
  then
    insert into crm.audit_events (
      actor_staff_user_id,
      actor_auth_user_id,
      action,
      category,
      entity_type,
      entity_id,
      result,
      metadata
    )
    values (
      null,
      null,
      'SYNC_STALE_IGNORED',
      'integration',
      'person',
      resolved_person_id,
      'success',
      jsonb_build_object(
        'actor_type', 'system',
        'actor_system', 'favn360-crm-sync',
        'source_system', 'favn360',
        'external_user_id', target_external_user_id::text,
        'source_role', target_role,
        'source_updated_at', target_source_updated_at,
        'accepted_source_updated_at', existing_source_updated_at
      )
    );

    return resolved_person_id;
  end if;

  if identity_exists then
    update crm.people
    set
      first_name = resolved_first_name,
      last_name = resolved_last_name,
      primary_email = normalized_email,
      status = 'active',
      updated_at = now()
    where id = resolved_person_id;

    if not found then
      raise exception 'CRM person for Favn360 identity not found'
        using errcode = 'P0002';
    end if;

    update crm.external_identities
    set
      email = normalized_email,
      is_active = true,
      source_updated_at = target_source_updated_at,
      last_synced_at = now(),
      updated_at = now()
    where system = 'favn360'
      and external_user_id = target_external_user_id::text;
  else
    insert into crm.people (
      first_name,
      last_name,
      primary_email,
      status
    )
    values (
      resolved_first_name,
      resolved_last_name,
      normalized_email,
      'active'
    )
    returning id into resolved_person_id;

    insert into crm.external_identities (
      person_id,
      system,
      external_user_id,
      email,
      is_active,
      source_updated_at,
      last_synced_at
    )
    values (
      resolved_person_id,
      'favn360',
      target_external_user_id::text,
      normalized_email,
      true,
      target_source_updated_at,
      now()
    );
  end if;

  insert into crm.audit_events (
    actor_staff_user_id,
    actor_auth_user_id,
    action,
    category,
    entity_type,
    entity_id,
    result,
    metadata
  )
  values (
    null,
    null,
    case
      when identity_exists then 'SYNC_UPDATE'
      else 'SYNC_CREATE'
    end,
    'integration',
    'person',
    resolved_person_id,
    'success',
    jsonb_build_object(
      'actor_type', 'system',
      'actor_system', 'favn360-crm-sync',
      'source_system', 'favn360',
      'external_user_id', target_external_user_id::text,
      'source_role', target_role,
      'source_updated_at', target_source_updated_at
    )
  );

  return resolved_person_id;
end;
$$;

revoke all on function public.upsert_favn360_crm_identity(
  uuid,
  text,
  text,
  text,
  timestamp with time zone
) from public;

revoke all on function public.upsert_favn360_crm_identity(
  uuid,
  text,
  text,
  text,
  timestamp with time zone
) from anon;

revoke all on function public.upsert_favn360_crm_identity(
  uuid,
  text,
  text,
  text,
  timestamp with time zone
) from authenticated;

grant execute on function public.upsert_favn360_crm_identity(
  uuid,
  text,
  text,
  text,
  timestamp with time zone
) to service_role;
