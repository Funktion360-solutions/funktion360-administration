-- Test checkout only. Run after quote-payment-queue.sql in the Vores Kok CRM.
begin;
create table crm.quote_test_checkouts(quote_id uuid primary key references crm.quote_drafts(id),session_id text unique,checkout_url text,expires_at timestamptz,created_at timestamptz not null default now(),paid_at timestamptz,subscription_id text,amount_paid bigint);
alter table crm.quote_test_checkouts enable row level security;
revoke all on crm.quote_test_checkouts from public,anon,authenticated;
create function crm_private.prepare_test_checkout(p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare q crm.quote_drafts%rowtype;c crm.quote_test_checkouts%rowtype;
begin
 select qd.* into q from crm.quote_drafts qd join crm.quote_deliveries d on d.quote_id=qd.id where d.token_hash=p_hash for update of qd;
 if not found or q.status<>'approved' or q.valid_until<current_date or q.accepted_at is null or q.accepted_email is null then raise exception 'Accepted offer required' using errcode='22023';end if;
 if not exists(select 1 from crm.people where id=q.person_id and status='active') then raise exception 'Inactive customer' using errcode='22023';end if;
 insert into crm.quote_test_checkouts(quote_id) values(q.id) on conflict do nothing;
 select * into c from crm.quote_test_checkouts where quote_id=q.id;
 if c.paid_at is not null or c.created_at<now()-interval '23 hours' or (c.expires_at is not null and c.expires_at<=now()) then raise exception 'Checkout unavailable' using errcode='22023';end if;
 return jsonb_build_object('id',q.id,'email',q.accepted_email,'lines',q.lines,'vat_mode',q.vat_mode,'session_id',c.session_id,'url',c.checkout_url,'created_at',c.created_at);
end$$;
create function crm_private.save_test_checkout(p_quote uuid,p_session text,p_url text,p_expires timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare c crm.quote_test_checkouts%rowtype;
begin
 if p_session is null or p_session !~ '^cs_test_' or p_url is null or p_url !~ '^https://checkout\.stripe\.com/' or p_expires is null then raise exception 'Invalid test session' using errcode='22023';end if;
 select * into c from crm.quote_test_checkouts where quote_id=p_quote for update;
 if not found or (c.session_id is not null and c.session_id<>p_session) then raise exception 'Session conflict' using errcode='22023';end if;
 update crm.quote_test_checkouts set session_id=p_session,checkout_url=p_url,expires_at=p_expires where quote_id=p_quote;
end$$;
create function crm_private.confirm_test_checkout(p_quote uuid,p_session text,p_amount bigint,p_subscription text) returns void language plpgsql security definer set search_path='' as $$
declare c crm.quote_test_checkouts%rowtype;expected bigint;
begin
 select * into c from crm.quote_test_checkouts where quote_id=p_quote for update;
 if not found or c.session_id is distinct from p_session or p_session !~ '^cs_test_' then raise exception 'Unknown test session' using errcode='22023';end if;
 select sum((x->>'quantity')::bigint*(x->>'unit_minor')::bigint) into expected from crm.quote_drafts q cross join lateral jsonb_array_elements(q.lines) x where q.id=p_quote and q.vat_mode='inclusive' and q.accepted_at is not null;
 if p_amount is null or expected is distinct from p_amount or p_amount<=0 then raise exception 'Amount mismatch' using errcode='22023';end if;
 if c.paid_at is not null then return;end if;
 update crm.quote_test_checkouts set paid_at=now(),amount_paid=p_amount,subscription_id=p_subscription where quote_id=p_quote;
 insert into crm.audit_events(action,category,entity_type,entity_id,result,metadata) values('STRIPE_TEST_QUOTE_PAID','billing','quote_draft',p_quote,'success',jsonb_build_object('session_id',p_session,'amount_minor',p_amount,'mode','test','activation','not_requested'));
end$$;
create function public.prepare_crm_test_checkout(p_hash text) returns jsonb language sql security invoker set search_path='' as $$select crm_private.prepare_test_checkout(p_hash)$$;
create function public.save_crm_test_checkout(p_quote uuid,p_session text,p_url text,p_expires timestamptz) returns void language sql security invoker set search_path='' as $$select crm_private.save_test_checkout(p_quote,p_session,p_url,p_expires)$$;
create function public.confirm_crm_test_checkout(p_quote uuid,p_session text,p_amount bigint,p_subscription text) returns void language sql security invoker set search_path='' as $$select crm_private.confirm_test_checkout(p_quote,p_session,p_amount,p_subscription)$$;
revoke all on function crm_private.prepare_test_checkout(text),crm_private.save_test_checkout(uuid,text,text,timestamptz),crm_private.confirm_test_checkout(uuid,text,bigint,text),public.prepare_crm_test_checkout(text),public.save_crm_test_checkout(uuid,text,text,timestamptz),public.confirm_crm_test_checkout(uuid,text,bigint,text) from public,anon,authenticated;
grant execute on function crm_private.prepare_test_checkout(text),crm_private.save_test_checkout(uuid,text,text,timestamptz),crm_private.confirm_test_checkout(uuid,text,bigint,text),public.prepare_crm_test_checkout(text),public.save_crm_test_checkout(uuid,text,text,timestamptz),public.confirm_crm_test_checkout(uuid,text,bigint,text) to service_role;
create or replace function crm_private.quote_payment_queue() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not crm.has_permission('quotes.read') or not crm.has_permission('people.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(items) order by items.accepted_at desc,items.id),'[]'::jsonb) into result from (
 select q.id,q.person_id,coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.primary_email,'Unavngiven person') as person_name,p.status as person_status,q.title,q.lines,q.currency,q.vat_mode,q.accepted_at,q.accepted_email,c.paid_at as test_paid_at,c.subscription_id as test_subscription_id
 from crm.quote_drafts q join crm.people p on p.id=q.person_id
 left join crm.quote_test_checkouts c on c.quote_id=q.id
 where q.status='approved' and q.accepted_at is not null
 order by q.accepted_at desc,q.id limit 200
 ) items;
 return result;
end$$;
create or replace function crm_private.public_quote(p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then return null;end if;
 select jsonb_build_object('title',q.title,'lines',q.lines,'currency',q.currency,'vat_mode',q.vat_mode,'valid_until',q.valid_until,'accepted_at',q.accepted_at,'test_paid_at',c.paid_at) into result from crm.quote_deliveries d join crm.quote_drafts q on q.id=d.quote_id left join crm.quote_test_checkouts c on c.quote_id=q.id where d.token_hash=p_hash and q.status='approved' and q.valid_until>=current_date;
 return result;
end$$;
commit;
