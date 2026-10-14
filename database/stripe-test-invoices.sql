-- Run after stripe-test-subscriptions.sql in Vores Kok CRM.
begin;
create table crm.stripe_test_invoices(invoice_id text primary key,subscription_id text not null,quote_id uuid not null references crm.quote_drafts(id),status text not null check(status in ('draft','open','paid','void','uncollectible')),amount_due bigint not null check(amount_due>=0),amount_paid bigint not null check(amount_paid>=0),amount_remaining bigint not null check(amount_remaining>=0),attempt_count integer not null check(attempt_count>=0),billing_reason text,invoice_created timestamptz not null,last_event text not null,event_created bigint not null,updated_at timestamptz not null default now());
alter table crm.stripe_test_invoices enable row level security;
revoke all on crm.stripe_test_invoices from public,anon,authenticated;
create function crm_private.sync_test_invoice(p_invoice jsonb,p_event text,p_created bigint) returns boolean language plpgsql security definer set search_path='' as $$
declare checkout crm.quote_test_checkouts%rowtype;previous crm.stripe_test_invoices%rowtype;
begin
 if p_invoice is null or p_invoice->>'livemode' is distinct from 'false' or p_invoice->>'currency' is distinct from 'dkk' or coalesce(p_invoice->>'id','') !~ '^in_' or coalesce(p_invoice->>'status','') not in ('draft','open','paid','void','uncollectible') or p_created is null or p_created<=0 or p_event is null then raise exception 'Invalid test invoice' using errcode='22023';end if;
 select * into checkout from crm.quote_test_checkouts where subscription_id=p_invoice->>'subscription_id' for update;
 if not found then return false;end if;
 select * into previous from crm.stripe_test_invoices where invoice_id=p_invoice->>'id';
 if found and previous.subscription_id is distinct from checkout.subscription_id then raise exception 'Invoice ownership mismatch' using errcode='22023';end if;
 if found and previous.event_created>p_created then return true;end if;
 insert into crm.stripe_test_invoices(invoice_id,subscription_id,quote_id,status,amount_due,amount_paid,amount_remaining,attempt_count,billing_reason,invoice_created,last_event,event_created) values(p_invoice->>'id',checkout.subscription_id,checkout.quote_id,p_invoice->>'status',(p_invoice->>'amount_due')::bigint,(p_invoice->>'amount_paid')::bigint,(p_invoice->>'amount_remaining')::bigint,(p_invoice->>'attempt_count')::integer,p_invoice->>'billing_reason',(p_invoice->>'created_at')::timestamptz,p_event,p_created)
 on conflict(invoice_id) do update set status=excluded.status,amount_due=excluded.amount_due,amount_paid=excluded.amount_paid,amount_remaining=excluded.amount_remaining,attempt_count=excluded.attempt_count,last_event=excluded.last_event,event_created=excluded.event_created,updated_at=now();
 if previous.status is distinct from p_invoice->>'status' or previous.amount_paid is distinct from (p_invoice->>'amount_paid')::bigint or previous.attempt_count is distinct from (p_invoice->>'attempt_count')::integer then
 insert into crm.audit_events(action,category,entity_type,entity_id,result,metadata) values('STRIPE_TEST_INVOICE_SYNC','billing','quote_draft',checkout.quote_id,'success',jsonb_build_object('invoice_id',p_invoice->>'id','status',p_invoice->>'status','mode','test','activation','not_requested'));
 end if;return true;
end$$;
create function public.sync_crm_test_invoice(p_invoice jsonb,p_event text,p_created bigint) returns boolean language sql security invoker set search_path='' as $$select crm_private.sync_test_invoice(p_invoice,p_event,p_created)$$;
revoke all on function crm_private.sync_test_invoice(jsonb,text,bigint),public.sync_crm_test_invoice(jsonb,text,bigint) from public,anon,authenticated;
grant execute on function crm_private.sync_test_invoice(jsonb,text,bigint),public.sync_crm_test_invoice(jsonb,text,bigint) to service_role;
create function crm_private.list_test_invoices(p_person uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('quotes.read') or not crm.has_permission('people.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(items) order by items.invoice_created desc,items.invoice_id),'[]'::jsonb) into result from (
 select i.*,q.title,q.person_id,coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.primary_email,'Unavngiven person') as person_name from crm.stripe_test_invoices i join crm.quote_drafts q on q.id=i.quote_id join crm.people p on p.id=q.person_id where p_person is null or q.person_id=p_person order by i.invoice_created desc,i.invoice_id limit 200
 ) items;return result;
end$$;
create function public.list_crm_test_invoices(p_person uuid default null) returns jsonb language sql security invoker set search_path='' as $$select crm_private.list_test_invoices(p_person)$$;
revoke all on function crm_private.list_test_invoices(uuid),public.list_crm_test_invoices(uuid) from public,anon,authenticated;
grant execute on function crm_private.list_test_invoices(uuid),public.list_crm_test_invoices(uuid) to authenticated;
commit;
