'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requirePermission} from '@/lib/auth/require-permission';
import {requireStaffMfa} from '@/lib/auth/require-staff-mfa';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {stripeTest} from '@/lib/crm/stripe-test';
export async function checkQuotePayer(form:FormData){
 const staff=await requirePermission('quotes.manage');await requirePermission('licenses.manage');await requirePermission('people.read');await requirePermission('organizations.read');await requireStaffMfa();
 const id=String(form.get('quote_id') || '');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))redirect('/sales/quotes');const path='/sales/quotes/'+id;
 let matches:boolean;
 try{
 const db=await createClient();const [assignment,quote]=await Promise.all([db.rpc('get_crm_quote_assignment',{p_quote:id}),db.rpc('get_crm_quote',{p_id:id})]);
 if(assignment.error || quote.error || !assignment.data?.assignment || !quote.data?.test_subscription_id)throw new Error('Assignment and subscription required');
 const stripe=stripeTest();const subscription=await stripe.subscriptions.retrieve(quote.data.test_subscription_id);
 if(subscription.livemode || subscription.metadata.f360_mode!=='test' || subscription.metadata.quote_id!==id)throw new Error('Unexpected subscription');
 const customerId=typeof subscription.customer==='string'?subscription.customer:subscription.customer.id;const customer=await stripe.customers.retrieve(customerId);
 if(customer.deleted || customer.livemode)throw new Error('Unavailable customer');
 const admin=createAdminClient();const recorded=await admin.rpc('record_crm_payer_check',{p_quote:id,p_version:assignment.data.assignment.updated_at,p_customer:customer.id,p_email:customer.email,p_name:customer.name,p_actor:staff.staff_user_id});
 if(recorded.error)throw new Error('Check not saved');matches=recorded.data===true;
 }catch{redirect(path+'?notice=payer_check_failed');}
 revalidatePath(path);redirect(path+'?notice='+(matches?'payer_matches':'payer_mismatch'));
}
