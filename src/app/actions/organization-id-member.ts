"use server";
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requirePermission} from '@/lib/auth/require-permission';
import {requireStaffMfa} from '@/lib/auth/require-staff-mfa';
import {createClient} from '@/lib/supabase/server';
export async function saveOrganizationMember(form:FormData){
 await requirePermission('organizations.update');await requirePermission('organizations.read');await requirePermission('people.read');await requirePermission('licenses.manage');await requireStaffMfa();
 const org=String(form.get('organization_id')||'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(org))redirect('/customers/organizations');
 const path=`/customers/organizations/${org}/identity`;const db=await createClient();
 const {error}=await db.rpc('save_crm_organization_id_member',{p_org:org,p_person:String(form.get('person_id')||''),p_role:String(form.get('role')||''),p_status:String(form.get('status')||''),p_reason:String(form.get('reason')||'')});
 if(error)redirect(path+'?membership_notice=failed');revalidatePath(path);redirect(path+'?membership_notice=saved');
}
