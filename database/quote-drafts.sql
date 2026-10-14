begin;
create schema if not exists crm_private;
revoke all on schema crm_private from public,anon;
grant usage on schema crm_private to authenticated;
create table crm.quote_drafts(
 id uuid primary key,person_id uuid not null references crm.people(id),product_id uuid not null references crm.products(id),
 title text not null check(char_length(btrim(title)) between 1 and 200),lines jsonb not null check(jsonb_typeof(lines)='array'),
 vat_mode text not null check(vat_mode in ('inclusive','exclusive')),currency text not null default 'DKK' check(currency='DKK'),valid_until date not null,
 reason text not null check(char_length(btrim(reason)) between 1 and 500),created_by uuid not null references crm.staff_users(id),created_at timestamptz not null default now()
);
alter table crm.quote_drafts enable row level security;
revoke all on crm.quote_drafts from public,anon,authenticated;
create function crm_private.create_quote_draft(p_id uuid,p_person uuid,p_product uuid,p_title text,p_lines jsonb,p_vat text,p_until date,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare staff uuid; item jsonb; previous crm.quote_drafts%rowtype;
begin
 if auth.uid() is null or not crm.has_permission('quotes.manage') or not crm.has_permission('people.read') then raise exception 'Permission denied' using errcode='42501';end if;
 perform public.require_crm_critical_action_aal2();
 select id into strict staff from crm.staff_users where auth_user_id=auth.uid() and status='active';
 if p_id is null or p_title is null or char_length(btrim(p_title)) not between 1 and 200 or p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 or p_vat is null or p_vat not in ('inclusive','exclusive') or p_until is null or p_until<current_date or p_until>current_date+365 then raise exception 'Invalid quote' using errcode='22023';end if;
 if p_lines is null or jsonb_typeof(p_lines)<>'array' then raise exception 'Invalid lines' using errcode='22023';end if;
 if jsonb_array_length(p_lines) not between 1 and 50 then raise exception 'Invalid line count' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(p_lines) loop
  if jsonb_typeof(item)<>'object' or coalesce(char_length(btrim(item->>'description')),0) not between 1 and 300 or coalesce(item->>'quantity','') !~ '^[0-9]+$' or (item->>'quantity')::numeric not between 1 and 1000000 or coalesce(item->>'unit_minor','') !~ '^[0-9]+$' or (item->>'unit_minor')::numeric not between 0 and 100000000 or coalesce(item->>'interval','') not in ('month','year','one_time','custom') then raise exception 'Invalid quote line' using errcode='22023';end if;
 end loop;
 if not exists(select 1 from crm.people where id=p_person and status='active' and primary_email is not null) or not exists(select 1 from crm.products where id=p_product and slug='favn360' and status='active') then raise exception 'Active customer and Favn360 required' using errcode='22023';end if;
 insert into crm.quote_drafts(id,person_id,product_id,title,lines,vat_mode,valid_until,reason,created_by) values(p_id,p_person,p_product,btrim(p_title),p_lines,p_vat,p_until,btrim(p_reason),staff) on conflict(id) do nothing;
 if not found then
  select * into previous from crm.quote_drafts where id=p_id;
  if previous.created_by<>staff or previous.person_id<>p_person or previous.product_id<>p_product or previous.lines<>p_lines or previous.title<>btrim(p_title) or previous.vat_mode<>p_vat or previous.valid_until<>p_until or previous.reason<>btrim(p_reason) then raise exception 'Request ID already used' using errcode='22023';end if;
  return p_id;
 end if;
 insert into crm.audit_events(actor_staff_user_id,actor_auth_user_id,action,category,entity_type,entity_id,result,reason,metadata) values(staff,auth.uid(),'CREATE_QUOTE_DRAFT','sales','quote_draft',p_id,'success',btrim(p_reason),jsonb_build_object('person_id',p_person,'product_id',p_product));
 return p_id;
end$$;
create function crm_private.list_quote_drafts() returns table(id uuid,person_id uuid,person_name text,title text,lines jsonb,vat_mode text,valid_until date,created_at timestamptz) language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not crm.has_permission('quotes.read') or not crm.has_permission('people.read') then raise exception 'Permission denied' using errcode='42501';end if;
 return query select q.id,q.person_id,coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.primary_email,'Unavngiven person'),q.title,q.lines,q.vat_mode,q.valid_until,q.created_at from crm.quote_drafts q join crm.people p on p.id=q.person_id order by q.created_at desc,q.id;
end$$;
create function public.create_crm_quote_draft(p_id uuid,p_person uuid,p_product uuid,p_title text,p_lines jsonb,p_vat text,p_until date,p_reason text) returns uuid language sql security invoker set search_path='' as $$select crm_private.create_quote_draft(p_id,p_person,p_product,p_title,p_lines,p_vat,p_until,p_reason)$$;
create function public.list_crm_quote_drafts() returns table(id uuid,person_id uuid,person_name text,title text,lines jsonb,vat_mode text,valid_until date,created_at timestamptz) language sql security invoker set search_path='' as $$select * from crm_private.list_quote_drafts()$$;
revoke all on function crm_private.create_quote_draft(uuid,uuid,uuid,text,jsonb,text,date,text),crm_private.list_quote_drafts(),public.create_crm_quote_draft(uuid,uuid,uuid,text,jsonb,text,date,text),public.list_crm_quote_drafts() from public,anon,authenticated;
grant execute on function crm_private.create_quote_draft(uuid,uuid,uuid,text,jsonb,text,date,text),crm_private.list_quote_drafts(),public.create_crm_quote_draft(uuid,uuid,uuid,text,jsonb,text,date,text),public.list_crm_quote_drafts() to authenticated;
commit;
