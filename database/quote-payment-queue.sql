-- Run after quote-acceptance.sql in the Vores Kok CRM project.
begin;
create function crm_private.quote_payment_queue() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not crm.has_permission('quotes.read') or not crm.has_permission('people.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(items) order by items.accepted_at desc,items.id),'[]'::jsonb) into result from (
 select q.id,q.person_id,coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.primary_email,'Unavngiven person') as person_name,p.status as person_status,q.title,q.lines,q.currency,q.vat_mode,q.accepted_at,q.accepted_email
 from crm.quote_drafts q join crm.people p on p.id=q.person_id
 where q.status='approved' and q.accepted_at is not null
 order by q.accepted_at desc,q.id limit 200
 ) items;
 return result;
end$$;
create function public.list_crm_quote_payment_queue() returns jsonb language sql security invoker set search_path='' as $$select crm_private.quote_payment_queue()$$;
revoke all on function crm_private.quote_payment_queue(),public.list_crm_quote_payment_queue() from public,anon,authenticated;
grant execute on function crm_private.quote_payment_queue(),public.list_crm_quote_payment_queue() to authenticated;
commit;
