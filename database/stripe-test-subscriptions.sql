-- Run after person-quote-payments.sql in Vores Kok CRM.
begin;
create table crm.stripe_test_subscriptions(subscription_id text primary key,quote_id uuid not null unique references crm.quote_drafts(id),status text not null check(status in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')),cancel_at_period_end boolean not null,current_period_end timestamptz,event_created bigint not null,updated_at timestamptz not null default now());
alter table crm.stripe_test_subscriptions enable row level security;
revoke all on crm.stripe_test_subscriptions from public,anon,authenticated;
create function crm_private.sync_test_subscription(p_subscription text,p_status text,p_cancel boolean,p_period timestamptz,p_created bigint) returns boolean language plpgsql security definer set search_path='' as $$
declare checkout crm.quote_test_checkouts%rowtype;previous crm.stripe_test_subscriptions%rowtype;
begin
 if p_subscription is null or p_status is null or p_status not in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused') or p_cancel is null or p_created is null or p_created<=0 then raise exception 'Invalid subscription' using errcode='22023';end if;
 select * into checkout from crm.quote_test_checkouts where subscription_id=p_subscription for update;
 if not found then return false;end if;
 select * into previous from crm.stripe_test_subscriptions where subscription_id=p_subscription;
 if found and previous.event_created>p_created then return true;end if;
 insert into crm.stripe_test_subscriptions(subscription_id,quote_id,status,cancel_at_period_end,current_period_end,event_created) values(p_subscription,checkout.quote_id,p_status,p_cancel,p_period,p_created) on conflict(subscription_id) do update set status=excluded.status,cancel_at_period_end=excluded.cancel_at_period_end,current_period_end=excluded.current_period_end,event_created=excluded.event_created,updated_at=now();
 if previous.status is distinct from p_status or previous.cancel_at_period_end is distinct from p_cancel or previous.current_period_end is distinct from p_period then
 insert into crm.audit_events(action,category,entity_type,entity_id,result,metadata) values('STRIPE_TEST_SUBSCRIPTION_SYNC','billing','quote_draft',checkout.quote_id,'success',jsonb_build_object('subscription_id',p_subscription,'status',p_status,'cancel_at_period_end',p_cancel,'mode','test','activation','not_requested'));
 end if;return true;
end$$;
create function public.sync_crm_test_subscription(p_subscription text,p_status text,p_cancel boolean,p_period timestamptz,p_created bigint) returns boolean language sql security invoker set search_path='' as $$select crm_private.sync_test_subscription(p_subscription,p_status,p_cancel,p_period,p_created)$$;
revoke all on function crm_private.sync_test_subscription(text,text,boolean,timestamptz,bigint),public.sync_crm_test_subscription(text,text,boolean,timestamptz,bigint) from public,anon,authenticated;
grant execute on function crm_private.sync_test_subscription(text,text,boolean,timestamptz,bigint),public.sync_crm_test_subscription(text,text,boolean,timestamptz,bigint) to service_role;
create function crm_private.list_test_subscriptions(p_person uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('quotes.read') or not crm.has_permission('people.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(items) order by items.updated_at desc),'[]'::jsonb) into result from (
 select s.*,q.title,q.person_id,coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.primary_email,'Unavngiven person') as person_name from crm.stripe_test_subscriptions s join crm.quote_drafts q on q.id=s.quote_id join crm.people p on p.id=q.person_id where p_person is null or q.person_id=p_person order by s.updated_at desc limit 200
 ) items;return result;
end$$;
create function public.list_crm_test_subscriptions(p_person uuid default null) returns jsonb language sql security invoker set search_path='' as $$select crm_private.list_test_subscriptions(p_person)$$;
revoke all on function crm_private.list_test_subscriptions(uuid),public.list_crm_test_subscriptions(uuid) from public,anon,authenticated;
grant execute on function crm_private.list_test_subscriptions(uuid),public.list_crm_test_subscriptions(uuid) to authenticated;
commit;
