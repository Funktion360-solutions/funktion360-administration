'use server';
import {randomInt,randomUUID} from 'node:crypto';
import {redirect} from 'next/navigation';
import {createAdminClient} from '@/lib/supabase/admin';
import {mailConfigured,sendSupportEmail} from '@/lib/support/resend';
import {offerHash,acceptanceHash} from '@/lib/crm/quote-code';
function config(){const secret=process.env.QUOTE_ACCEPTANCE_SECRET;if(!secret || !/^[0-9a-f]{64}$/i.test(secret) || !process.env.SUPABASE_SECRET_KEY || !mailConfigured())return undefined;return secret;}
function tokenFrom(form:FormData){const token=String(form.get('token') || '');if(!/^[0-9a-f]{64}$/.test(token))redirect('/');return token;}
export async function requestAcceptanceCode(form:FormData){
 const token=tokenFrom(form);const path='/offers/'+token;const secret=config();if(!secret)redirect(path+'?notice=unavailable');
 const challenge=randomUUID();const code=String(randomInt(0,1000000)).padStart(6,'0');const db=createAdminClient();
 const result=await db.rpc('prepare_crm_quote_acceptance',{p_hash:offerHash(token),p_challenge:challenge,p_code_hash:acceptanceHash(challenge,code,secret)});
 if(result.error || !result.data)redirect(path+'?notice=wait');
 try{await sendSupportEmail({id:challenge,support_case_id:challenge,recipient:result.data.recipient,sender:process.env.SUPPORT_MAIL_FROM!,reply_to:process.env.SUPPORT_MAIL_REPLY_TO!,subject:'Bekræft dit tilbud fra Funktion360',body:'Din kode er '+code+'.\n\nKoden gælder i 10 minutter til accept af tilbuddet '+result.data.title+'.\nDel ikke koden med andre.',status:'pending',provider_id:null,created_at:new Date().toISOString()},fetch,'quote-confirmation/'+challenge);}catch{redirect(path+'?challenge='+challenge+'&notice=mail_uncertain');}
 redirect(path+'?challenge='+challenge+'&notice=code_sent');
}
export async function acceptOffer(form:FormData){
 const token=tokenFrom(form);const path='/offers/'+token;const secret=config();if(!secret)redirect(path+'?notice=unavailable');const challenge=String(form.get('challenge') || '');const code=String(form.get('code') || '').trim();
 if(form.get('confirm')!=='yes')redirect(path+'?notice=confirm');
 let hash:string;try{hash=acceptanceHash(challenge,code,secret);}catch{redirect(path+'?notice=invalid');}
 const db=createAdminClient();const result=await db.rpc('accept_crm_quote',{p_hash:offerHash(token),p_challenge:challenge,p_code_hash:hash});
 if(result.error || result.data!==true)redirect(path+'?challenge='+encodeURIComponent(challenge)+'&notice=invalid');
 redirect(path+'?notice=accepted');
}
