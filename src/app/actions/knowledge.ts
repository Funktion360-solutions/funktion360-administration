'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requirePermission} from '@/lib/auth/require-permission';
import {requireStaffMfa} from '@/lib/auth/require-staff-mfa';
import {createClient} from '@/lib/supabase/server';
export async function saveKnowledge(form:FormData){
 await requirePermission('support.read');await requirePermission('support.manage');await requireStaffMfa();
 const id=String(form.get('id') || ''),product=String(form.get('product') || '');const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(id) || (product && !uuid.test(product)))redirect('/support/knowledge?notice=failed');
 const db=await createClient();const result=await db.rpc('save_crm_knowledge',{p_id:id,p_title:String(form.get('title') || ''),p_summary:String(form.get('summary') || ''),p_body:String(form.get('body') || ''),p_category:String(form.get('category') || ''),p_product:product || null,p_status:String(form.get('status') || '')});
 revalidatePath('/support/knowledge');revalidatePath('/support/knowledge/'+id);redirect(result.error?'/support/knowledge?notice=failed':'/support/knowledge/'+id+'?notice=saved');
}
