'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requirePermission} from '@/lib/auth/require-permission';
import {requireStaffMfa} from '@/lib/auth/require-staff-mfa';
import {createClient} from '@/lib/supabase/server';
export async function prepareWarningDraft(form:FormData){
 await requirePermission('quotes.manage');await requirePermission('licenses.manage');await requirePermission('people.read');await requirePermission('organizations.read');await requireStaffMfa();
 const invoice=String(form.get('invoice_id') || '');const reason=String(form.get('reason') || '').trim();if(!/^in_[A-Za-z0-9_]+$/.test(invoice) || !reason || reason.length>500)redirect('/tasks?notice=warning_invalid');
 const db=await createClient();const result=await db.rpc('prepare_crm_warning_draft',{p_invoice:invoice,p_reason:reason});revalidatePath('/tasks');redirect('/tasks?notice='+(result.error?'warning_failed':'warning_prepared'));
}
