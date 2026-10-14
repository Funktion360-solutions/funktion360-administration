'use server';
import {randomBytes} from 'node:crypto';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requirePermission} from '@/lib/auth/require-permission';
import {requireStaffMfa} from '@/lib/auth/require-staff-mfa';
import {createClient} from '@/lib/supabase/server';
import {mailConfigured,sendSupportEmail} from '@/lib/support/resend';
export async function sendQuote(form:FormData){
 await requirePermission('quotes.manage');await requirePermission('people.read');await requireStaffMfa();
 const id=String(form.get('quote_id') || '');const deliveryId=String(form.get('delivery_id') || '');const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(id) || !uuid.test(deliveryId))redirect('/sales/quotes');const path='/sales/quotes/'+id;
 if(!mailConfigured())redirect(path+'?notice=mail_config');
 const db=await createClient();const prepared=await db.rpc('prepare_crm_quote_mail',{p_quote:id,p_id:deliveryId,p_url:'https://administration.funktion360.dk/offers/'+randomBytes(32).toString('hex')});
 if(prepared.error || !prepared.data)redirect(path+'?notice=mail_failed');const mail=prepared.data;
 if(mail.status==='sent')redirect(path+'?notice=sent');
 let provider:string;try{provider=await sendSupportEmail({id:mail.id,support_case_id:id,recipient:mail.recipient,sender:process.env.SUPPORT_MAIL_FROM!,reply_to:process.env.SUPPORT_MAIL_REPLY_TO!,subject:mail.subject,body:mail.body,status:'pending',provider_id:null,created_at:mail.created_at},fetch,'quote/'+mail.id);}catch{revalidatePath(path);redirect(path+'?notice=mail_uncertain');}
 const recorded=await db.rpc('mark_crm_quote_mail_sent',{p_id:mail.id,p_provider:provider});revalidatePath(path);redirect(path+'?notice='+(recorded.error?'mail_uncertain':'sent'));
}
