-- Run after quote-commercial-assignment.sql and quote-payer-check.sql in Vores Kok CRM.
begin;
create function crm_private.quote_pipeline() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('quotes.read') or not crm.has_permission('people.read') or not crm.has_permission('licenses.read') or not crm.has_permission('organizations.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(items) order by items.created_at desc,items.id),'[]'::jsonb) into result from (
 select q.id,q.person_id,q.title,q.status,q.lines,q.vat_mode,q.valid_until,q.accepted_at,q.created_at,c.paid_at as test_paid_at,coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.primary_email,'Unavngiven person') as person_name,a.plan_name,a.payer_name,a.organization_name,(a.stripe_payer_matches is true and a.stripe_checked_assignment_at=a.updated_at and a.stripe_checked_at>=now()-interval '24 hours' and (exists(select 1 from crm.people where id=a.payer_person_id and status='active' and lower(btrim(primary_email))=lower(btrim(a.payer_email))) or exists(select 1 from crm.organizations where id=a.payer_organization_id and status='active' and lower(btrim(primary_email))=lower(btrim(a.payer_email))))) as payer_checked,(q.valid_until<current_date and q.accepted_at is null) as expired
 from crm.quote_drafts q join crm.people p on p.id=q.person_id join crm.products product on product.id=q.product_id left join crm.quote_test_checkouts c on c.quote_id=q.id left join crm.quote_commercial_assignments a on a.quote_id=q.id where product.slug='favn360' order by q.created_at desc,q.id limit 200
 ) items;return result;
end$$;
create function public.list_crm_quote_pipeline() returns jsonb language sql security invoker set search_path='' as $$select crm_private.quote_pipeline()$$;
revoke all on function crm_private.quote_pipeline(),public.list_crm_quote_pipeline() from public,anon,authenticated;
grant execute on function crm_private.quote_pipeline(),public.list_crm_quote_pipeline() to authenticated;
commit;
