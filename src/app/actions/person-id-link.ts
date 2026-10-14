'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requirePermission} from '@/lib/auth/require-permission';
import {requireStaffMfa} from '@/lib/auth/require-staff-mfa';
import {createAdminClient} from '@/lib/supabase/admin';
import {lookupIdentity} from '@/app/actions/funktion360-id';
export async function linkPersonId(form:FormData){
 const staff=await requirePermission('people.update');await requirePermission('people.read');await requireStaffMfa();const person=String(form.get('person_id') || '');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(person))redirect('/customers/people');const path='/customers/people/'+person;
 if(form.get('confirm')!=='yes')redirect(path+'?id_notice=confirm');
 const state=await lookupIdentity({},form);if(!state.identity || !state.identity.emailVerified || !state.identity.email)redirect(path+'?id_notice=verification_failed');
 try{
 const db=createAdminClient();const result=await db.rpc('link_crm_person_id',{p_person:person,p_issuer:process.env.FUNKTION360_ID_ISSUER,p_subject:state.identity.subject,p_email:state.identity.email,p_checked:state.identity.checkedAt,p_actor:staff.staff_user_id});if(result.error)throw Error('Link not saved');
 }catch{redirect(path+'?id_notice=link_failed');}
 revalidatePath(path);redirect(path+'?id_notice=linked');
}
