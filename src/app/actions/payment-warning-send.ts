'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requirePermission} from '@/lib/auth/require-permission';
import {requireStaffMfa} from '@/lib/auth/require-staff-mfa';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {stripeTest} from '@/lib/crm/stripe-test';
import {mailConfigured,sendSupportEmail} from '@/lib/support/resend';
export async function sendWarningTest(form:FormData){
 const staff=await requirePermission('quotes.manage');await requirePermission('licenses.manage');await requirePermission('quotes.read');await requirePermission('licenses.read');await requirePermission('people.read');await requirePermission('organizations.read');await requireStaffMfa();
 const id=String(form.get('draft_id') || '');if(!/^[0-9a-f-]{36}$/i.test(id) || form.get('confirm')!=='yes')redirect('/tasks?notice=warning_confirm');
 if(process.env.F360_WARNING_TEST_SEND!=='true' || !process.env.SUPABASE_SECRET_KEY || !process.env.RESEND_WARNING_WEBHOOK_SECRET || !mailConfigured())redirect('/tasks?notice=warning_mail_config');
 let mail;let draft;
 const db=await createClient();const admin=createAdminClient();
 try{
 const listed=await db.rpc('list_crm_warning_drafts');if(listed.error)throw Error('Draft unavailable');draft=(listed.data || []).find((row:{id:string})=>row.id===id);if(!draft || !draft.is_current)throw Error('Draft stale');
 const [assignment,quote]=await Promise.all([db.rpc('get_crm_quote_assignment',{p_quote:draft.quote_id}),db.rpc('get_crm_quote',{p_id:draft.quote_id})]);if(assignment.error || quote.error || !assignment.data?.assignment || !quote.data?.test_subscription_id)throw Error('Assignment unavailable');
 const stripe=stripeTest();const invoice=await stripe.invoices.retrieve(draft.invoice_id);const parent=invoice.parent?.subscription_details?.subscription;const subscriptionId=typeof parent==='string'?parent:parent?.id;
 if(invoice.livemode || invoice.currency!=='dkk' || !['open','uncollectible'].includes(invoice.status || '') || invoice.amount_remaining!==draft.amount_remaining || subscriptionId!==quote.data?.test_subscription_id)throw Error('Invoice changed');
 const customerId=typeof invoice.customer==='string'?invoice.customer:invoice.customer?.id;if(!customerId || customerId!==assignment.data.assignment.stripe_customer_id)throw Error('Customer changed');
 const customer=await stripe.customers.retrieve(customerId);if(customer.deleted || customer.livemode || !customer.email || customer.email.trim().toLowerCase()!==draft.recipient.trim().toLowerCase())throw Error('Recipient changed');
 const prepared=await admin.rpc('prepare_crm_warning_mail',{p_draft:id,p_sender:process.env.SUPPORT_MAIL_FROM!,p_reply:process.env.SUPPORT_MAIL_REPLY_TO!,p_actor:staff.staff_user_id});if(prepared.error || !prepared.data)throw Error('Preparation failed');mail=prepared.data;
 }catch{redirect('/tasks?notice=warning_send_blocked');}
 if(mail.status!=='prepared')redirect('/tasks?notice=warning_sent');
 let provider:string;try{provider=await sendSupportEmail({id,support_case_id:draft.quote_id,recipient:draft.recipient,sender:mail.sender,reply_to:mail.reply_to,subject:mail.subject,body:mail.body,status:'pending',provider_id:null,created_at:mail.created_at},fetch,'payment-warning-test/'+id);}catch{revalidatePath('/tasks');redirect('/tasks?notice=warning_mail_uncertain');}
 const result=await admin.rpc('mark_crm_warning_sent',{p_draft:id,p_provider:provider});revalidatePath('/tasks');redirect('/tasks?notice='+(result.error?'warning_mail_uncertain':'warning_sent'));
}
