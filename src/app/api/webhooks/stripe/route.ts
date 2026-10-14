import {stripeTest} from '@/lib/crm/stripe-test';
import {createAdminClient} from '@/lib/supabase/admin';
export const runtime='nodejs';
export async function POST(request:Request){
 const signature=request.headers.get('stripe-signature');if(!signature)return new Response('Missing signature',{status:400});
 let stripe;try{stripe=stripeTest();}catch{return new Response('Unavailable',{status:503});}
 let event;try{event=stripe.webhooks.constructEvent(await request.text(),signature,process.env.STRIPE_WEBHOOK_SECRET!);}catch{return new Response('Invalid signature',{status:400});}
 if(event.livemode)return new Response('Test mode only',{status:400});
 if(event.type!=='checkout.session.completed')return new Response('Ignored');
 try{
 const session=await stripe.checkout.sessions.retrieve(event.data.object.id);
 if(session.livemode || session.payment_status!=='paid' || session.currency!=='dkk' || session.metadata?.f360_mode!=='test' || !session.metadata.quote_id || session.amount_total===null)return new Response('Ignored');
 const subscription=typeof session.subscription==='string'?session.subscription:session.subscription?.id || null;
 const db=createAdminClient();const result=await db.rpc('confirm_crm_test_checkout',{p_quote:session.metadata.quote_id,p_session:session.id,p_amount:session.amount_total,p_subscription:subscription});
 if(result.error)return new Response('Retry later',{status:500});return new Response('Recorded');
 }catch{return new Response('Retry later',{status:500});}
}
