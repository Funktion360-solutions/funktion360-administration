-- Run after quote-payer-check.sql and payment-followups.sql in Vores Kok CRM.
begin;
create table crm.payment_warning_drafts(id uuid primary key default gen_random_uuid(),invoice_id text not null references crm.stripe_test_invoices(invoice_id),quote_id uuid not null references crm.quote_drafts(id),assignment_version timestamptz not null,recipient text not null,amount_remaining bigint not null,subject text not null,body text not null,reason text not null,created_by uuid not null references crm.staff_users(id),created_at timestamptz not null default now(),unique(invoice_id,assignment_version,amount_remaining));
alter table crm.payment_warning_drafts enable row level security;
revoke all on crm.payment_warning_drafts from public,anon,authenticated;
create function crm_private.prepare_warning_draft(p_invoice text,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare i crm.stripe_test_invoices%rowtype;a crm.quote_commercial_assignments%rowtype;staff uuid;result uuid;amount text;
begin
 if auth.uid() is null or not crm.has_permission('quotes.manage') or not crm.has_permission('licenses.manage') or not crm.has_permission('people.read') or not crm.has_permission('organizations.read') then raise exception 'Permission denied' using errcode='42501';end if;
 perform public.require_crm_critical_action_aal2();
 select id into strict staff from crm.staff_users where auth_user_id=auth.uid() and status='active';
 if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then raise exception 'Reason required' using errcode='22023';end if;
 select * into i from crm.stripe_test_invoices where invoice_id=p_invoice for update;
 if not found or i.status not in ('open','uncollectible') or i.amount_remaining<=0 or (i.status='open' and i.attempt_count=0 and i.last_event<>'invoice.payment_action_required') then raise exception 'Payment issue required' using errcode='22023';end if;
 select * into a from crm.quote_commercial_assignments where quote_id=i.quote_id for update;
 if not found or a.stripe_payer_matches is distinct from true or a.stripe_checked_assignment_at is distinct from a.updated_at or a.stripe_checked_at is null or a.stripe_checked_at<now()-interval '24 hours' then raise exception 'Current payer check required' using errcode='22023';end if;
 if a.payer_person_id is not null then
 if not exists(select 1 from crm.people where id=a.payer_person_id and status='active' and lower(btrim(primary_email))=lower(btrim(a.payer_email))) then raise exception 'Payer changed' using errcode='22023';end if;
 else
 if not exists(select 1 from crm.organizations where id=a.payer_organization_id and status='active' and lower(btrim(primary_email))=lower(btrim(a.payer_email))) then raise exception 'Payer changed' using errcode='22023';end if;end if;
 select id into result from crm.payment_warning_drafts where invoice_id=i.invoice_id and assignment_version=a.updated_at and amount_remaining=i.amount_remaining;
 if found then return result;end if;
 amount:=replace(to_char(i.amount_remaining::numeric/100,'FM999999999999990.00'),'.',',')||' kr.';
 insert into crm.payment_warning_drafts(invoice_id,quote_id,assignment_version,recipient,amount_remaining,subject,body,reason,created_by) values(i.invoice_id,i.quote_id,a.updated_at,a.payer_email,i.amount_remaining,'TESTUDKAST: Betalingsvarsel for Favn360','Hej '||a.payer_name||E'\n\nVi har registreret et udestående på '||amount||E' vedrørende Favn360.\n\nBetalingen skal være gennemført senest syv dage efter dette varsel. Herefter kan adgangen blive begrænset til læsning og eksport. Du bevarer adgang til betaling og support.\n\nKontakt Funktion360, hvis betalingen allerede er gennemført, eller du har spørgsmål.\n\nVenlig hilsen\nFunktion360',btrim(p_reason),staff) returning id into result;
 insert into crm.audit_events(actor_staff_user_id,actor_auth_user_id,action,category,entity_type,entity_id,result,reason,metadata) values(staff,auth.uid(),'PREPARE_PAYMENT_WARNING_DRAFT','billing','quote_draft',i.quote_id,'success',btrim(p_reason),jsonb_build_object('draft_id',result,'invoice_id',i.invoice_id,'mode','test','sent',false,'deadline_started',false));
 return result;
end$$;
create function public.prepare_crm_warning_draft(p_invoice text,p_reason text) returns uuid language sql security invoker set search_path='' as $$select crm_private.prepare_warning_draft(p_invoice,p_reason)$$;
create function crm_private.list_warning_drafts() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('quotes.read') or not crm.has_permission('people.read') or not crm.has_permission('licenses.read') or not crm.has_permission('organizations.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(items) order by items.created_at desc),'[]'::jsonb) into result from (
 select d.*,q.title,(i.status in ('open','uncollectible') and i.amount_remaining=d.amount_remaining and a.updated_at=d.assignment_version and a.stripe_payer_matches is true and a.stripe_checked_assignment_at=a.updated_at and a.stripe_checked_at>=now()-interval '24 hours' and (exists(select 1 from crm.people where id=a.payer_person_id and status='active' and lower(btrim(primary_email))=lower(btrim(a.payer_email))) or exists(select 1 from crm.organizations where id=a.payer_organization_id and status='active' and lower(btrim(primary_email))=lower(btrim(a.payer_email))))) as is_current
 from crm.payment_warning_drafts d join crm.quote_drafts q on q.id=d.quote_id join crm.stripe_test_invoices i on i.invoice_id=d.invoice_id join crm.quote_commercial_assignments a on a.quote_id=d.quote_id order by d.created_at desc limit 200
 ) items;return result;
end$$;
create function public.list_crm_warning_drafts() returns jsonb language sql security invoker set search_path='' as $$select crm_private.list_warning_drafts()$$;
revoke all on function crm_private.prepare_warning_draft(text,text),crm_private.list_warning_drafts(),public.prepare_crm_warning_draft(text,text),public.list_crm_warning_drafts() from public,anon,authenticated;
grant execute on function crm_private.prepare_warning_draft(text,text),crm_private.list_warning_drafts(),public.prepare_crm_warning_draft(text,text),public.list_crm_warning_drafts() to authenticated;
commit;
