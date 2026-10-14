-- Verified identity snapshots written only by the administration backend.
begin;
do $$ declare expression text;begin
 select pg_get_expr(conbin,conrelid) into expression from pg_constraint where conrelid='crm.external_identities'::regclass and conname='external_identities_system_check' and contype='c';
 if expression is not null then
 alter table crm.external_identities drop constraint external_identities_system_check;
 execute format('alter table crm.external_identities add constraint external_identities_system_check check ((%s) or system=%L)',expression,'funktion360_id');
 end if;
end$$;
create table crm.person_id_links(person_id uuid primary key references crm.people(id),issuer text not null,subject uuid not null,email text not null,checked_at timestamptz not null,linked_by uuid not null references crm.staff_users(id),linked_at timestamptz not null default now(),unique(issuer,subject));
alter table crm.person_id_links enable row level security;
revoke all on crm.person_id_links from public,anon,authenticated;
create function crm_private.read_person_id_link(p_person uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('people.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select to_jsonb(l) into result from crm.person_id_links l where person_id=p_person;return result;
end$$;
create function crm_private.link_person_id(p_person uuid,p_issuer text,p_subject uuid,p_email text,p_checked timestamptz,p_actor uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare existing crm.person_id_links%rowtype;legacy crm.external_identities%rowtype;
begin
 if p_issuer is distinct from 'https://fthalqavjmsydmqszvkk.supabase.co/auth/v1' or p_subject is null or nullif(btrim(p_email),'') is null or p_checked is null or p_checked<now()-interval '5 minutes' or p_checked>now()+interval '1 minute' or not exists(select 1 from crm.staff_users where id=p_actor and status='active') then raise exception 'Fresh verified identity required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_issuer||p_subject::text,0));
 perform 1 from crm.people where id=p_person and status='active' for update;
 if not found then raise exception 'Active person required' using errcode='22023';end if;
 select * into existing from crm.person_id_links where person_id=p_person;
 if found and (existing.issuer<>p_issuer or existing.subject<>p_subject) then raise exception 'Person already linked; review required' using errcode='22023';end if;
 if exists(select 1 from crm.person_id_links where issuer=p_issuer and subject=p_subject and person_id<>p_person) or exists(select 1 from crm.external_identities where system='funktion360_id' and lower(external_user_id)=p_subject::text and person_id<>p_person) or exists(select 1 from crm.external_identities where person_id=p_person and system='funktion360_id' and is_active and lower(external_user_id)<>p_subject::text) then raise exception 'Identity conflict; review required' using errcode='22023';end if;
 if (select count(*) from crm.external_identities where person_id=p_person and system='funktion360_id' and lower(external_user_id)=p_subject::text)>1 then raise exception 'Duplicate legacy identities; review required' using errcode='22023';end if;
 select * into legacy from crm.external_identities where person_id=p_person and system='funktion360_id' and lower(external_user_id)=p_subject::text;
 if not found then
 insert into crm.external_identities(person_id,system,external_user_id,email,is_active,last_synced_at) values(p_person,'funktion360_id',p_subject::text,p_email,true,p_checked);
 else
 update crm.external_identities set email=p_email,is_active=true,last_synced_at=p_checked,updated_at=now() where id=legacy.id;
 end if;
 insert into crm.person_id_links(person_id,issuer,subject,email,checked_at,linked_by) values(p_person,p_issuer,p_subject,p_email,p_checked,p_actor) on conflict(person_id) do update set email=excluded.email,checked_at=excluded.checked_at;
 if existing.person_id is null or legacy.is_active is distinct from true then
 insert into crm.audit_events(actor_staff_user_id,action,category,entity_type,entity_id,result,metadata) values(p_actor,'LINK_VERIFIED_FUNKTION360_ID','identity','person',p_person,'success',jsonb_build_object('issuer',p_issuer,'subject',p_subject,'email_verified',true,'products_activated',false));
 end if;return p_person;
end$$;
create function public.get_crm_person_id_link(p_person uuid) returns jsonb language sql security invoker set search_path='' as $$select crm_private.read_person_id_link(p_person)$$;
create function public.link_crm_person_id(p_person uuid,p_issuer text,p_subject uuid,p_email text,p_checked timestamptz,p_actor uuid) returns uuid language sql security invoker set search_path='' as $$select crm_private.link_person_id(p_person,p_issuer,p_subject,p_email,p_checked,p_actor)$$;
revoke all on function crm_private.read_person_id_link(uuid),public.get_crm_person_id_link(uuid),crm_private.link_person_id(uuid,text,uuid,text,timestamptz,uuid),public.link_crm_person_id(uuid,text,uuid,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function crm_private.read_person_id_link(uuid),public.get_crm_person_id_link(uuid) to authenticated;
grant execute on function crm_private.link_person_id(uuid,text,uuid,text,timestamptz,uuid),public.link_crm_person_id(uuid,text,uuid,text,timestamptz,uuid) to service_role;
commit;
