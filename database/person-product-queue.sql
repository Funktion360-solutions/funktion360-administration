-- Install after administration-personlige-produkter.sql, in Vores Kok (crm).
begin;
do $$begin if to_regclass('crm.person_product_requests') is null then raise exception 'Install person-product-requests.sql first';end if;end$$;
create or replace function crm_private.person_product_queue()
returns table(id uuid,person_id uuid,person_name text,product_name text,product_slug text,status text,reason text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not crm.has_permission('people.read') or not crm.has_permission('licenses.read') then raise exception 'Permission denied' using errcode='42501';end if;
 return query select r.id,r.person_id,coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.primary_email,'Unavngiven person'),pr.name,pr.slug,r.status,r.reason,r.created_at from crm.person_product_requests r join crm.people p on p.id=r.person_id join crm.products pr on pr.id=r.product_id where r.status in ('pending','provisioning','failed','suspended') order by r.created_at,r.id;
end$$;
create or replace function public.list_crm_person_product_queue()
returns table(id uuid,person_id uuid,person_name text,product_name text,product_slug text,status text,reason text,created_at timestamptz)
language sql security invoker set search_path='' as $$select * from crm_private.person_product_queue()$$;
revoke all on function crm_private.person_product_queue(),public.list_crm_person_product_queue() from public,anon,authenticated;
grant execute on function crm_private.person_product_queue(),public.list_crm_person_product_queue() to authenticated;
commit;
