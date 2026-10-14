'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requirePermission} from '@/lib/auth/require-permission';
import {requireStaffMfa} from '@/lib/auth/require-staff-mfa';
import {createClient} from '@/lib/supabase/server';
import {quoteLines} from '@/lib/crm/quote-lines';
export async function createQuote(form:FormData){
 await requirePermission('quotes.manage');await requirePermission('people.read');await requireStaffMfa();
 let lines;try{lines=quoteLines(JSON.parse(String(form.get('lines') || '')));}catch{redirect('/sales/quotes?notice=invalid');}
 const id=String(form.get('request_id') || '');const person=String(form.get('person_id') || '');const title=String(form.get('title') || '').trim();const reason=String(form.get('reason') || '').trim();const until=String(form.get('valid_until') || '');const vat=String(form.get('vat_mode') || '');
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(id) || !uuid.test(person) || !lines || !title || title.length>200 || !reason || reason.length>500 || !/^\d{4}-\d{2}-\d{2}$/.test(until) || !['inclusive','exclusive'].includes(vat))redirect('/sales/quotes?notice=invalid');
 const db=await createClient();const products=await db.rpc('list_crm_products');const product=products.data?.find((p:{slug:string,status:string})=>p.slug==='favn360' && p.status==='active');
 if(products.error || !product)redirect('/sales/quotes?notice=config');
 const {error}=await db.rpc('create_crm_quote_draft',{p_id:id,p_person:person,p_product:product.id,p_title:title,p_lines:lines,p_vat:vat,p_until:until,p_reason:reason});
 revalidatePath('/sales/quotes');redirect('/sales/quotes?notice='+(error?'failed':'created'));
}
