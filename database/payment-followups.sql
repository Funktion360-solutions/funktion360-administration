-- Run after stripe-test-invoices.sql in Vores Kok CRM.
begin;
create function crm_private.payment_followups() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('quotes.read') or not crm.has_permission('people.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(items) order by items.invoice_created,items.invoice_id),'[]'::jsonb) into result from (
 select i.invoice_id,i.quote_id,i.status,i.amount_remaining,i.attempt_count,i.last_event,i.invoice_created,q.title,q.person_id,coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.primary_email,'Unavngiven person') as person_name
 from crm.stripe_test_invoices i join crm.quote_drafts q on q.id=i.quote_id join crm.people p on p.id=q.person_id
 where i.amount_remaining>0 and (i.status='uncollectible' or (i.status='open' and (i.attempt_count>0 or i.last_event='invoice.payment_action_required')))
 order by i.invoice_created,i.invoice_id limit 200
 ) items;return result;
end$$;
create function public.list_crm_payment_followups() returns jsonb language sql security invoker set search_path='' as $$select crm_private.payment_followups()$$;
revoke all on function crm_private.payment_followups(),public.list_crm_payment_followups() from public,anon,authenticated;
grant execute on function crm_private.payment_followups(),public.list_crm_payment_followups() to authenticated;
commit;
