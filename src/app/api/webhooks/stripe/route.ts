import type Stripe from 'stripe';
import {stripeTest} from '@/lib/crm/stripe-test';
import {createAdminClient} from '@/lib/supabase/admin';
export const runtime='nodejs';
export async function POST(request:Request){
 const signature=request.headers.get('stripe-signature');if(!signature)return new Response('Missing signature',{status:400});
 let stripe:Stripe;try{stripe=stripeTest();}catch{return new Response('Unavailable',{status:503});}
 let event:Stripe.Event;try{event=stripe.webhooks.constructEvent(await request.text(),signature,process.env.STRIPE_WEBHOOK_SECRET!);}catch{return new Response('Invalid signature',{status:400});}
 if(event.livemode)return new Response('Test mode only',{status:400});

 try{
 const db=createAdminClient();
 async function syncSubscription(id:string){
  const subscription=await stripe!.subscriptions.retrieve(id);
  if(subscription.livemode || subscription.metadata.f360_mode!=='test')return true;
  const periods=subscription.items.data.map(item=>item.current_period_end);const period=periods.length?Math.min(...periods):null;
  const result=await db.rpc('sync_crm_test_subscription',{p_subscription:subscription.id,p_status:subscription.status,p_cancel:subscription.cancel_at_period_end,p_period:period?new Date(period*1000).toISOString():null,p_created:event.created});
  return !result.error && result.data===true;
 }
 if(event.type==='customer.subscription.created' || event.type==='customer.subscription.updated' || event.type==='customer.subscription.deleted' || event.type==='customer.subscription.paused' || event.type==='customer.subscription.resumed'){
  return await syncSubscription(event.data.object.id)?new Response('Synced'):new Response('Retry later',{status:500});
 }
 async function syncInvoice(id:string){
  const invoice=await stripe.invoices.retrieve(id);const related=invoice.parent?.subscription_details?.subscription;const subscriptionId=typeof related==='string'?related:related?.id;
  if(invoice.livemode || invoice.currency!=='dkk' || !subscriptionId || !invoice.status)return true;
  const subscription=await stripe.subscriptions.retrieve(subscriptionId);if(subscription.livemode || subscription.metadata.f360_mode!=='test')return true;
  const result=await db.rpc('sync_crm_test_invoice',{p_invoice:{id:invoice.id,livemode:invoice.livemode,currency:invoice.currency,subscription_id:subscriptionId,status:invoice.status,amount_due:invoice.amount_due,amount_paid:invoice.amount_paid,amount_remaining:invoice.amount_remaining,attempt_count:invoice.attempt_count,billing_reason:invoice.billing_reason,created_at:new Date(invoice.created*1000).toISOString()},p_event:event.type,p_created:event.created});
  return !result.error && result.data===true;
 }
 if(event.type==='invoice.paid' || event.type==='invoice.payment_failed' || event.type==='invoice.payment_action_required' || event.type==='invoice.voided' || event.type==='invoice.marked_uncollectible')return await syncInvoice(event.data.object.id)?new Response('Invoice synced'):new Response('Retry later',{status:500});
 if(event.type!=='checkout.session.completed')return new Response('Ignored');
 const session=await stripe.checkout.sessions.retrieve(event.data.object.id);
 if(session.livemode || session.payment_status!=='paid' || session.currency!=='dkk' || session.metadata?.f360_mode!=='test' || !session.metadata.quote_id || session.amount_total===null)return new Response('Ignored');
 const subscription=typeof session.subscription==='string'?session.subscription:session.subscription?.id || null;
 const result=await db.rpc('confirm_crm_test_checkout',{p_quote:session.metadata.quote_id,p_session:session.id,p_amount:session.amount_total,p_subscription:subscription});
 if(result.error)return new Response('Retry later',{status:500});if(subscription && !await syncSubscription(subscription))return new Response('Retry later',{status:500});const invoiceId=typeof session.invoice==='string'?session.invoice:session.invoice?.id;if(subscription && invoiceId && !await syncInvoice(invoiceId))return new Response('Retry later',{status:500});return new Response('Recorded');
 }catch{return new Response('Retry later',{status:500});}
}
