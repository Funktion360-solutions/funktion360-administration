begin;
create function crm_private.identity_products(p_issuer text,p_subject uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare person uuid;begin
 if p_issuer is distinct from 'https://fthalqavjmsydmqszvkk.supabase.co/auth/v1' or p_subject is null then raise exception 'Invalid identity' using errcode='22023';end if;
 select p.id into person from crm.person_id_links l join crm.people p on p.id=l.person_id where l.issuer=p_issuer and l.subject=p_subject and p.status='active';
 return jsonb_build_object('accounts',coalesce((select jsonb_agg(jsonb_build_object('system',e.system,'registered',e.is_active) order by e.system,e.id) from crm.external_identities e where e.person_id=person and e.system<>'funktion360_id'),'[]'::jsonb),'requests',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'name',p.name,'status',q.status) order by q.created_at desc,q.id) from crm.person_product_requests q join crm.products p on p.id=q.product_id where q.person_id=person and q.status<>'withdrawn'),'[]'::jsonb));
end$$;
create function public.get_identity_products(p_issuer text,p_subject uuid) returns jsonb language sql security invoker set search_path='' as $$select crm_private.identity_products(p_issuer,p_subject)$$;
revoke all on function crm_private.identity_products(text,uuid),public.get_identity_products(text,uuid) from public,anon,authenticated;
grant execute on function crm_private.identity_products(text,uuid),public.get_identity_products(text,uuid) to service_role;
commit;
