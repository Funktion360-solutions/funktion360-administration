-- Run after quote-drafts.sql in Vores Kok (crm).
begin;
alter table crm.quote_drafts add column status text not null default 'draft' check(status in ('draft','approved'));
alter table crm.quote_drafts add column approved_by uuid references crm.staff_users(id);
alter table crm.quote_drafts add column approved_at timestamptz;
create function crm_private.get_quote(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('quotes.read') or not crm.has_permission('people.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select jsonb_build_object('id',q.id,'person_id',q.person_id,'person_name',coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),p.primary_email,'Unavngiven person'),'title',q.title,'lines',q.lines,'currency',q.currency,'vat_mode',q.vat_mode,'valid_until',q.valid_until,'status',q.status,'approved_at',q.approved_at,'created_at',q.created_at) into result from crm.quote_drafts q join crm.people p on p.id=q.person_id where q.id=p_id;
 return result;
end$$;
create function crm_private.approve_quote(p_id uuid) returns uuid language plpgsql security definer set search_path='' as $$declare staff uuid;quote crm.quote_drafts%rowtype;begin
 if auth.uid() is null or not crm.has_permission('quotes.approve') or not crm.has_permission('people.read') then raise exception 'Permission denied' using errcode='42501';end if;
 perform public.require_crm_critical_action_aal2();
 select id into strict staff from crm.staff_users where auth_user_id=auth.uid() and status='active';
 select * into quote from crm.quote_drafts where id=p_id for update;
 if not found then raise exception 'Quote not found' using errcode='22023';end if;
 if quote.valid_until<current_date then raise exception 'Quote expired' using errcode='22023';end if;
 if not exists(select 1 from crm.people where id=quote.person_id and status='active') then raise exception 'Customer inactive' using errcode='22023';end if;
 if quote.status='approved' then return p_id;end if;
 update crm.quote_drafts set status='approved',approved_by=staff,approved_at=now() where id=p_id;
 insert into crm.audit_events(actor_staff_user_id,actor_auth_user_id,action,category,entity_type,entity_id,result,metadata) values(staff,auth.uid(),'APPROVE_QUOTE','sales','quote_draft',p_id,'success',jsonb_build_object('person_id',quote.person_id));
 return p_id;
end$$;
create function public.get_crm_quote(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select crm_private.get_quote(p_id)$$;
create function public.approve_crm_quote(p_id uuid) returns uuid language sql security invoker set search_path='' as $$select crm_private.approve_quote(p_id)$$;
revoke all on function crm_private.get_quote(uuid),crm_private.approve_quote(uuid),public.get_crm_quote(uuid),public.approve_crm_quote(uuid) from public,anon,authenticated;
grant execute on function crm_private.get_quote(uuid),crm_private.approve_quote(uuid),public.get_crm_quote(uuid),public.approve_crm_quote(uuid) to authenticated;
commit;
