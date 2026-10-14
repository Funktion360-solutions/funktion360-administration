begin;
create function crm_private.dashboard_overview() returns jsonb language plpgsql security definer set search_path='' as $$
declare metrics jsonb:='{}'::jsonb;available jsonb:='{}'::jsonb;financial boolean;
begin
 if auth.uid() is null or not exists(select 1 from crm.staff_users where auth_user_id=auth.uid() and status='active') then raise exception 'Active staff required' using errcode='42501';end if;
 if crm.has_permission('people.read') then metrics:=metrics||jsonb_build_object('people',(select count(*) from crm.people where status='active'));end if;
 if crm.has_permission('organizations.read') then metrics:=metrics||jsonb_build_object('organizations',(select count(*) from crm.organizations where status='active'));end if;
 if crm.has_permission('products.read') then metrics:=metrics||jsonb_build_object('products',(select count(*) from crm.products where status='active'),'plans',(select count(*) from crm.product_plans where status='active'));end if;
 financial:=crm.has_permission('quotes.read') and crm.has_permission('people.read') and crm.has_permission('licenses.read') and crm.has_permission('organizations.read');
 if financial then
 if to_regclass('crm.quote_drafts') is not null then
 metrics:=metrics||jsonb_build_object('quote_drafts',(select count(*) from crm.quote_drafts where status='draft' and valid_until>=current_date),'awaiting_acceptance',(select count(*) from crm.quote_drafts where status='approved' and accepted_at is null and valid_until>=current_date));
 else available:=available||jsonb_build_object('quote_drafts','module','awaiting_acceptance','module');end if;
 if to_regclass('crm.quote_test_checkouts') is not null then
 metrics:=metrics||jsonb_build_object('accepted_unpaid',(select count(*) from crm.quote_drafts q left join crm.quote_test_checkouts c on c.quote_id=q.id where q.accepted_at is not null and c.paid_at is null),'test_paid',(select count(*) from crm.quote_test_checkouts where paid_at is not null));
 else available:=available||jsonb_build_object('accepted_unpaid','module','test_paid','module');end if;
 if to_regclass('crm.stripe_test_invoices') is not null then
 metrics:=metrics||jsonb_build_object('payment_followups',(select count(*) from crm.stripe_test_invoices where amount_remaining>0 and (status='uncollectible' or (status='open' and (attempt_count>0 or last_event='invoice.payment_action_required')))));
 else available:=available||jsonb_build_object('payment_followups','module');end if;
 if to_regclass('crm.stripe_test_subscriptions') is not null then
 metrics:=metrics||jsonb_build_object('test_subscriptions',(select count(*) from crm.stripe_test_subscriptions where status='active'));
 else available:=available||jsonb_build_object('test_subscriptions','module');end if;
 end if;
 if crm.has_permission('support.read') then
 if to_regclass('crm.knowledge_articles') is not null then
 metrics:=metrics||jsonb_build_object('knowledge_published',(select count(*) from crm.knowledge_articles where status='published'));
 if crm.has_permission('support.manage') then metrics:=metrics||jsonb_build_object('knowledge_drafts',(select count(*) from crm.knowledge_articles where status='draft'));end if;
 else available:=available||jsonb_build_object('knowledge_published','module','knowledge_drafts','module');end if;
 end if;
 return jsonb_build_object('metrics',metrics,'availability',available,'observed_at',now());
end$$;
create function public.get_crm_dashboard_overview() returns jsonb language sql security invoker set search_path='' as $$select crm_private.dashboard_overview()$$;
revoke all on function crm_private.dashboard_overview(),public.get_crm_dashboard_overview() from public,anon,authenticated;
grant execute on function crm_private.dashboard_overview(),public.get_crm_dashboard_overview() to authenticated;
commit;
