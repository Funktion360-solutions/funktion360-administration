begin;
create table crm.knowledge_articles(id uuid primary key,title text not null check(char_length(btrim(title)) between 1 and 200),summary text not null check(char_length(summary)<=1000),body text not null check(char_length(btrim(body)) between 1 and 50000),category text not null check(category in ('accounts','products','billing','support','technical')),product_id uuid references crm.products(id),status text not null check(status in ('draft','published','archived')),created_by uuid not null references crm.staff_users(id),updated_by uuid not null references crm.staff_users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table crm.knowledge_articles enable row level security;
revoke all on crm.knowledge_articles from public,anon,authenticated;
create function crm_private.list_knowledge(p_query text,p_status text) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('support.read') then raise exception 'Permission denied' using errcode='42501';end if;
 if char_length(coalesce(p_query,''))>200 then raise exception 'Search too long' using errcode='22023';end if;
 select coalesce(jsonb_agg(to_jsonb(items) order by items.updated_at desc,items.id),'[]'::jsonb) into result from (
 select a.id,a.title,a.summary,a.category,a.status,a.updated_at,p.name as product_name from crm.knowledge_articles a left join crm.products p on p.id=a.product_id where (a.status='published' or crm.has_permission('support.manage')) and (coalesce(p_status,'')='' or a.status=p_status) and (coalesce(p_query,'')='' or position(lower(p_query) in lower(a.title||' '||a.summary||' '||a.body))>0) order by a.updated_at desc,a.id limit 200
 ) items;return result;
end$$;
create function crm_private.get_knowledge(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null or not crm.has_permission('support.read') then raise exception 'Permission denied' using errcode='42501';end if;
 select to_jsonb(a)||jsonb_build_object('product_name',p.name) into result from crm.knowledge_articles a left join crm.products p on p.id=a.product_id where a.id=p_id and (a.status='published' or crm.has_permission('support.manage'));return result;
end$$;
create function crm_private.save_knowledge(p_id uuid,p_title text,p_summary text,p_body text,p_category text,p_product uuid,p_status text) returns uuid language plpgsql security definer set search_path='' as $$
declare staff uuid;a crm.knowledge_articles%rowtype;
begin
 if auth.uid() is null or not crm.has_permission('support.manage') then raise exception 'Permission denied' using errcode='42501';end if;
 perform public.require_crm_critical_action_aal2();select id into strict staff from crm.staff_users where auth_user_id=auth.uid() and status='active';
 if p_id is null or p_title is null or char_length(btrim(p_title)) not between 1 and 200 or p_summary is null or char_length(p_summary)>1000 or p_body is null or char_length(btrim(p_body)) not between 1 and 50000 or p_category is null or p_category not in ('accounts','products','billing','support','technical') or p_status is null or p_status not in ('draft','published','archived') then raise exception 'Invalid article' using errcode='22023';end if;
 if p_product is not null and not exists(select 1 from crm.products where id=p_product and status='active') and not exists(select 1 from crm.knowledge_articles where id=p_id and product_id=p_product) then raise exception 'Active product required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into a from crm.knowledge_articles where id=p_id;
 if found and a.title=btrim(p_title) and a.summary=btrim(p_summary) and a.body=btrim(p_body) and a.category=p_category and a.product_id is not distinct from p_product and a.status=p_status then return p_id;end if;
 insert into crm.knowledge_articles(id,title,summary,body,category,product_id,status,created_by,updated_by) values(p_id,btrim(p_title),btrim(p_summary),btrim(p_body),p_category,p_product,p_status,staff,staff) on conflict(id) do update set title=excluded.title,summary=excluded.summary,body=excluded.body,category=excluded.category,product_id=excluded.product_id,status=excluded.status,updated_by=staff,updated_at=now();
 insert into crm.audit_events(actor_staff_user_id,actor_auth_user_id,action,category,entity_type,entity_id,result,metadata) values(staff,auth.uid(),'SAVE_KNOWLEDGE_ARTICLE','support','knowledge_article',p_id,'success',jsonb_build_object('status',p_status,'previous_status',a.status,'product_id',p_product,'audience','internal'));
 return p_id;
end$$;
create function public.list_crm_knowledge(p_query text default '',p_status text default '') returns jsonb language sql security invoker set search_path='' as $$select crm_private.list_knowledge(p_query,p_status)$$;
create function public.get_crm_knowledge(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select crm_private.get_knowledge(p_id)$$;
create function public.save_crm_knowledge(p_id uuid,p_title text,p_summary text,p_body text,p_category text,p_product uuid,p_status text) returns uuid language sql security invoker set search_path='' as $$select crm_private.save_knowledge(p_id,p_title,p_summary,p_body,p_category,p_product,p_status)$$;
revoke all on function crm_private.list_knowledge(text,text),crm_private.get_knowledge(uuid),crm_private.save_knowledge(uuid,text,text,text,text,uuid,text),public.list_crm_knowledge(text,text),public.get_crm_knowledge(uuid),public.save_crm_knowledge(uuid,text,text,text,text,uuid,text) from public,anon,authenticated;
grant execute on function crm_private.list_knowledge(text,text),crm_private.get_knowledge(uuid),crm_private.save_knowledge(uuid,text,text,text,text,uuid,text),public.list_crm_knowledge(text,text),public.get_crm_knowledge(uuid),public.save_crm_knowledge(uuid,text,text,text,text,uuid,text) to authenticated;
commit;
