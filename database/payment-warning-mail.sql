begin;
-- Run after payment-warning-drafts.sql in Vores Kok CRM. Test mail only.

create table if not exists crm.payment_warning_mail(draft_id uuid primary key references crm.payment_warning_drafts(id),provider_id text unique,status text not null default 'prepared',sender text not null,reply_to text not null,subject text not null,body text not null,created_at timestamptz not null default now(),sent_at timestamptz,delivered_at timestamptz,test_deadline_at timestamptz);
create table if not exists crm.warning_delivery_events(event_id text primary key,provider_id text not null,event_type text not null,occurred_at timestamptz not null,received_at timestamptz not null default now());
alter table crm.payment_warning_mail enable row level security;alter table crm.warning_delivery_events enable row level security;
revoke all on crm.payment_warning_mail,crm.warning_delivery_events from public,anon,authenticated;
create or replace function crm_private.reconcile_warning_mail(p_provider text) returns void language plpgsql security definer set search_path='' as $$
declare m crm.payment_warning_mail%rowtype;e crm.warning_delivery_events%rowtype;new_status text;delivered timestamptz;quote uuid;
begin
 select * into m from crm.payment_warning_mail where provider_id=p_provider for update;if not found then return;end if;
 select * into e from crm.warning_delivery_events where provider_id=p_provider order by occurred_at desc,event_id desc limit 1;if not found then return;end if;
 select min(received_at) into delivered from crm.warning_delivery_events where provider_id=p_provider and event_type='email.delivered';
 new_status:=case when e.event_type='email.delivered' then 'delivered' else 'delivery_failed' end;
 update crm.payment_warning_mail set status=new_status,delivered_at=delivered,test_deadline_at=case when new_status='delivered' then delivered+interval '7 days' else null end where draft_id=m.draft_id;
 if m.status is distinct from new_status then
 select quote_id into quote from crm.payment_warning_drafts where id=m.draft_id;
 insert into crm.audit_events(action,category,entity_type,entity_id,result,metadata) values('PAYMENT_WARNING_TEST_DELIVERY','billing','quote_draft',quote,'success',jsonb_build_object('draft_id',m.draft_id,'delivery_status',new_status,'mode','test'));
 end if;
end$$;
create or replace function crm_private.prepare_warning_mail(p_draft uuid,p_sender text,p_reply text,p_actor uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare d crm.payment_warning_drafts%rowtype;i crm.stripe_test_invoices%rowtype;a crm.quote_commercial_assignments%rowtype;m crm.payment_warning_mail%rowtype;
begin
 if nullif(p_sender,'') is null or nullif(p_reply,'') is null or not exists(select 1 from crm.staff_users where id=p_actor and status='active') then raise exception 'Invalid sender' using errcode='22023';end if;
 select * into d from crm.payment_warning_drafts where id=p_draft for update;if not found then raise exception 'Draft not found' using errcode='22023';end if;
 select * into i from crm.stripe_test_invoices where invoice_id=d.invoice_id;
 select * into a from crm.quote_commercial_assignments where quote_id=d.quote_id;
 if i.status not in ('open','uncollectible') or i.amount_remaining<>d.amount_remaining or a.updated_at is distinct from d.assignment_version or a.stripe_payer_matches is distinct from true or a.stripe_checked_assignment_at is distinct from a.updated_at or a.stripe_checked_at is null or a.stripe_checked_at<now()-interval '24 hours' then raise exception 'Draft requires fresh review' using errcode='22023';end if;
 select * into m from crm.payment_warning_mail where draft_id=p_draft;
 if found then if m.status='prepared' and m.created_at<now()-interval '23 hours' then raise exception 'Retry window expired' using errcode='22023';end if;return to_jsonb(m);end if;
 insert into crm.payment_warning_mail(draft_id,sender,reply_to,subject,body) values(p_draft,p_sender,p_reply,'TEST: Betalingsvarsel for Favn360',E'Dette er en test af betalingsvarsling. Ingen produktadgang ændres.\n\n'||d.body) returning * into m;
 insert into crm.audit_events(actor_staff_user_id,action,category,entity_type,entity_id,result,metadata) values(p_actor,'PREPARE_WARNING_TEST_MAIL','billing','quote_draft',d.quote_id,'success',jsonb_build_object('draft_id',d.id,'mode','test','deadline_started',false));
 return to_jsonb(m);
end$$;
create or replace function crm_private.mark_warning_sent(p_draft uuid,p_provider text) returns void language plpgsql security definer set search_path='' as $$declare m crm.payment_warning_mail%rowtype;begin
 if nullif(p_provider,'') is null then raise exception 'Provider ID required' using errcode='22023';end if;
 select * into m from crm.payment_warning_mail where draft_id=p_draft for update;
 if not found or (m.provider_id is not null and m.provider_id<>p_provider) then raise exception 'Provider conflict' using errcode='22023';end if;
 update crm.payment_warning_mail set provider_id=p_provider,sent_at=coalesce(sent_at,now()),status=case when status='prepared' then 'sent' else status end where draft_id=p_draft;
 perform crm_private.reconcile_warning_mail(p_provider);
end$$;
create or replace function crm_private.warning_event(p_event text,p_provider text,p_type text,p_occurred timestamptz) returns void language plpgsql security definer set search_path='' as $$begin
 if nullif(p_event,'') is null or nullif(p_provider,'') is null or p_type is null or p_type not in ('email.delivered','email.bounced','email.failed','email.complained','email.suppressed') or p_occurred is null then raise exception 'Invalid delivery event' using errcode='22023';end if;
 insert into crm.warning_delivery_events(event_id,provider_id,event_type,occurred_at) values(p_event,p_provider,p_type,p_occurred) on conflict(event_id) do nothing;
 perform crm_private.reconcile_warning_mail(p_provider);
end$$;
create or replace function public.prepare_crm_warning_mail(p_draft uuid,p_sender text,p_reply text,p_actor uuid) returns jsonb language sql security invoker set search_path='' as $$select crm_private.prepare_warning_mail(p_draft,p_sender,p_reply,p_actor)$$;
create or replace function public.mark_crm_warning_sent(p_draft uuid,p_provider text) returns void language sql security invoker set search_path='' as $$select crm_private.mark_warning_sent(p_draft,p_provider)$$;
create or replace function public.record_crm_warning_event(p_event text,p_provider text,p_type text,p_occurred timestamptz) returns void language sql security invoker set search_path='' as $$select crm_private.warning_event(p_event,p_provider,p_type,p_occurred)$$;
revoke all on function crm_private.reconcile_warning_mail(text),crm_private.prepare_warning_mail(uuid,text,text,uuid),crm_private.mark_warning_sent(uuid,text),crm_private.warning_event(text,text,text,timestamptz),public.prepare_crm_warning_mail(uuid,text,text,uuid),public.mark_crm_warning_sent(uuid,text),public.record_crm_warning_event(text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function crm_private.reconcile_warning_mail(text),crm_private.prepare_warning_mail(uuid,text,text,uuid),crm_private.mark_warning_sent(uuid,text),crm_private.warning_event(text,text,text,timestamptz),public.prepare_crm_warning_mail(uuid,text,text,uuid),public.mark_crm_warning_sent(uuid,text),public.record_crm_warning_event(text,text,text,timestamptz) to service_role;
create or replace function crm_private.list_warning_drafts() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('quotes.read') or not crm.has_permission('people.read') or not crm.has_permission('licenses.read') or not crm.has_permission('organizations.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(items) order by items.created_at desc),'[]'::jsonb) into result from (
 select d.*,q.title,m.status as mail_status,m.delivered_at,m.test_deadline_at,(i.status in ('open','uncollectible') and i.amount_remaining=d.amount_remaining and a.updated_at=d.assignment_version and a.stripe_payer_matches is true and a.stripe_checked_assignment_at=a.updated_at and a.stripe_checked_at>=now()-interval '24 hours' and (exists(select 1 from crm.people where id=a.payer_person_id and status='active' and lower(btrim(primary_email))=lower(btrim(a.payer_email))) or exists(select 1 from crm.organizations where id=a.payer_organization_id and status='active' and lower(btrim(primary_email))=lower(btrim(a.payer_email))))) as is_current
 from crm.payment_warning_drafts d join crm.quote_drafts q on q.id=d.quote_id join crm.stripe_test_invoices i on i.invoice_id=d.invoice_id join crm.quote_commercial_assignments a on a.quote_id=d.quote_id left join crm.payment_warning_mail m on m.draft_id=d.id order by d.created_at desc limit 200
 ) items;return result;
end$$;
-- Run after payment-warning-mail.sql in Vores Kok CRM. Read-only test decisions.

create or replace function crm_private.list_warning_drafts() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('quotes.read') or not crm.has_permission('people.read') or not crm.has_permission('licenses.read') or not crm.has_permission('organizations.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(items) order by items.created_at desc),'[]'::jsonb) into result from (
 select d.*,q.title,now() as observed_at,i.status as invoice_status,i.amount_remaining as invoice_remaining,i.updated_at as invoice_synced_at,a.stripe_checked_at as payer_checked_at,(a.updated_at=d.assignment_version and a.stripe_payer_matches is true and a.stripe_checked_assignment_at=a.updated_at and (exists(select 1 from crm.people where id=a.payer_person_id and status='active' and lower(btrim(primary_email))=lower(btrim(a.payer_email))) or exists(select 1 from crm.organizations where id=a.payer_organization_id and status='active' and lower(btrim(primary_email))=lower(btrim(a.payer_email)))) and exists(select 1 from crm.people where id=q.person_id and status='active') and exists(select 1 from crm.product_plans where id=a.plan_id and status='active') and (a.organization_id is null or exists(select 1 from crm.organizations where id=a.organization_id and status='active'))) as binding_current,m.status as mail_status,m.delivered_at,m.test_deadline_at,(i.status in ('open','uncollectible') and i.amount_remaining=d.amount_remaining and a.updated_at=d.assignment_version and a.stripe_payer_matches is true and a.stripe_checked_assignment_at=a.updated_at and a.stripe_checked_at>=now()-interval '24 hours' and (exists(select 1 from crm.people where id=a.payer_person_id and status='active' and lower(btrim(primary_email))=lower(btrim(a.payer_email))) or exists(select 1 from crm.organizations where id=a.payer_organization_id and status='active' and lower(btrim(primary_email))=lower(btrim(a.payer_email))))) as is_current
 from crm.payment_warning_drafts d join crm.quote_drafts q on q.id=d.quote_id join crm.stripe_test_invoices i on i.invoice_id=d.invoice_id join crm.quote_commercial_assignments a on a.quote_id=d.quote_id left join crm.payment_warning_mail m on m.draft_id=d.id order by d.created_at desc limit 200
 ) items;return result;
end$$;
commit;
