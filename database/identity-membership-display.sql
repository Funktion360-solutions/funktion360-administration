begin;
create function crm_private.identity_memberships(p_issuer text,p_subject uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if p_issuer is distinct from 'https://fthalqavjmsydmqszvkk.supabase.co/auth/v1' or p_subject is null then raise exception 'Invalid identity' using errcode='22023';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('organization_id',o.id,'name',o.name,'role',m.role,'status',m.status,'product','favn360') order by o.name,o.id) from crm.person_id_links l join crm.people p on p.id=l.person_id join crm.organization_id_memberships m on m.person_id=p.id join crm.organizations o on o.id=m.organization_id where l.issuer=p_issuer and l.subject=p_subject and p.status='active' and o.status='active' and m.status in ('active','suspended')),'[]'::jsonb);
end$$;
create function public.get_identity_organization_memberships(p_issuer text,p_subject uuid) returns jsonb language sql security invoker set search_path='' as $$select crm_private.identity_memberships(p_issuer,p_subject)$$;
revoke all on function crm_private.identity_memberships(text,uuid),public.get_identity_organization_memberships(text,uuid) from public,anon,authenticated;
grant execute on function crm_private.identity_memberships(text,uuid),public.get_identity_organization_memberships(text,uuid) to service_role;
commit;
