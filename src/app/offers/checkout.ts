'use server';
import {redirect} from 'next/navigation';
import {stripeTest} from '@/lib/crm/stripe-test';
import {offerHash} from '@/lib/crm/quote-code';
import {checkoutLines} from '@/lib/crm/quote-lines';
import {createAdminClient} from '@/lib/supabase/admin';
export async function startTestCheckout(form:FormData){
 const token=String(form.get('token') || '');if(!/^[0-9a-f]{64}$/.test(token))redirect('/');
 const path='/offers/'+token;let destination:string;
 try{
 const stripe=stripeTest();const db=createAdminClient();const record=await db.rpc('prepare_crm_test_checkout',{p_hash:offerHash(token)});if(record.error || !record.data)throw new Error('Checkout unavailable');
 const quote=record.data;const checked=checkoutLines(quote.lines,quote.vat_mode);
 if(quote.url){const url=new URL(quote.url);if(url.origin!=='https://checkout.stripe.com')throw new Error('Unsafe checkout URL');destination=quote.url;}
 else{
 const base='https://administration.funktion360.dk'+path;
 const session=await stripe.checkout.sessions.create({mode:checked.mode,customer_email:quote.email,locale:'da',allowed_payment_method_types:['card'],adaptive_pricing:{enabled:false},success_url:base+'?notice=payment_return',cancel_url:base+'?notice=payment_cancelled',client_reference_id:quote.id,metadata:{quote_id:quote.id,f360_mode:'test'},...(checked.mode==='subscription'?{subscription_data:{metadata:{quote_id:quote.id,f360_mode:'test'}}}:{}),line_items:checked.lines.map(line=>({quantity:line.quantity,price_data:{currency:'dkk',unit_amount:line.unit_minor,tax_behavior:'inclusive',product_data:{name:line.description},...(line.interval==='month' || line.interval==='year'?{recurring:{interval:line.interval}}:{})}}))},{idempotencyKey:'f360-quote-test/'+quote.id});
 if(session.livemode || !session.url || new URL(session.url).origin!=='https://checkout.stripe.com')throw new Error('Unexpected checkout response');
 const saved=await db.rpc('save_crm_test_checkout',{p_quote:quote.id,p_session:session.id,p_url:session.url,p_expires:new Date(session.expires_at*1000).toISOString()});if(saved.error)throw new Error('Session not saved');destination=session.url;
 }
 }catch{redirect(path+'?notice=payment_unavailable');}
 redirect(destination!);
}
