'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requirePermission} from '@/lib/auth/require-permission';
import {createClient} from '@/lib/supabase/server';
export async function requestPersonProduct(form:FormData){
 await requirePermission('people.update');await requirePermission('licenses.manage');
 const person=String(form.get('person_id') || '');const product=String(form.get('product_id') || '');const reason=String(form.get('reason') || '').trim();
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(person))redirect('/customers/people');
 const path='/customers/people/'+person;
 if(!uuid.test(product) || !reason || reason.length>500)redirect(path+'?product_notice=invalid');
 const db=await createClient();const {error}=await db.rpc('request_crm_person_product',{p_person:person,p_product:product,p_reason:reason});
 revalidatePath(path);redirect(path+'?product_notice='+(error?'failed':'requested'));
}
