'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requirePermission} from '@/lib/auth/require-permission';
import {requireStaffMfa} from '@/lib/auth/require-staff-mfa';
import {createClient} from '@/lib/supabase/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function assignQuote(form:FormData){
 await requirePermission('quotes.manage');await requirePermission('licenses.manage');await requirePermission('people.read');await requirePermission('organizations.read');await requireStaffMfa();
 const id=String(form.get('quote_id') || '');if(!uuid.test(id))redirect('/sales/quotes');const path='/sales/quotes/'+id;
 const plan=String(form.get('plan') || '');const org=String(form.get('organization') || '');const payer=String(form.get('payer') || '').split(':');const reason=String(form.get('reason') || '').trim();
 if(!uuid.test(plan) || (org && !uuid.test(org)) || payer.length!==2 || !['person','organization'].includes(payer[0]) || !uuid.test(payer[1]) || !reason || reason.length>500 || form.get('confirm')!=='yes')redirect(path+'?notice=assignment_invalid');
 const db=await createClient();const result=await db.rpc('assign_crm_quote',{p_quote:id,p_plan:plan,p_organization:org || null,p_payer_person:payer[0]==='person'?payer[1]:null,p_payer_organization:payer[0]==='organization'?payer[1]:null,p_reason:reason});
 revalidatePath(path);revalidatePath('/billing');redirect(path+'?notice='+(result.error?'assignment_failed':'assignment_saved'));
}
