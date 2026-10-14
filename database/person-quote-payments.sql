-- Run after quote-stripe-test.sql in the Vores Kok CRM project.
begin;
create or replace function crm_private.get_quote(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('quotes.read') or not crm.has_permission('people.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select jsonb_build_object('id',q.id,'person_id',q.person_id,'person_name',coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.primary_email,'Unavngiven person'),'title',q.title,'lines',q.lines,'currency',q.currency,'vat_mode',q.vat_mode,'valid_until',q.valid_until,'status',q.status,'approved_at',q.approved_at,'created_at',q.created_at,'accepted_at',q.accepted_at,'accepted_email',q.accepted_email,'test_paid_at',c.paid_at,'test_subscription_id',c.subscription_id,'test_amount_paid',c.amount_paid,'test_session_created_at',c.created_at) into result from crm.quote_drafts q join crm.people p on p.id=q.person_id left join crm.quote_test_checkouts c on c.quote_id=q.id where q.id=p_id;
 return result;
end$$;
create function crm_private.person_quote_payments(p_person uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('people.read') or not crm.has_permission('quotes.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(items) order by items.created_at desc,items.id),'[]'::jsonb) into result from (
 select q.id,q.title,q.lines,q.vat_mode,q.status,q.created_at,q.accepted_at,c.paid_at as test_paid_at,c.amount_paid as test_amount_paid,c.subscription_id as test_subscription_id
 from crm.quote_drafts q left join crm.quote_test_checkouts c on c.quote_id=q.id where q.person_id=p_person order by q.created_at desc,q.id limit 100
 ) items;return result;
end$$;
create function public.list_crm_person_quote_payments(p_person uuid) returns jsonb language sql security invoker set search_path='' as $$select crm_private.person_quote_payments(p_person)$$;
revoke all on function crm_private.person_quote_payments(uuid),public.list_crm_person_quote_payments(uuid) from public,anon,authenticated;
grant execute on function crm_private.person_quote_payments(uuid),public.list_crm_person_quote_payments(uuid) to authenticated;
commit;
