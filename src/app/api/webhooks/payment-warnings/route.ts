import {verifyEvent} from '@/lib/support/inbound';
import {createAdminClient} from '@/lib/supabase/admin';
export const runtime='nodejs';
const events=new Set(['email.delivered','email.bounced','email.failed','email.complained','email.suppressed']);
export async function POST(request:Request){
 const secret=process.env.RESEND_WARNING_WEBHOOK_SECRET;if(!secret)return new Response('Unavailable',{status:503});
 if(Number(request.headers.get('content-length') || 0)>262144)return new Response('Too large',{status:413});const raw=await request.text();if(Buffer.byteLength(raw)>262144)return new Response('Too large',{status:413});
 let event;try{event=verifyEvent(raw,request.headers,secret);if(!event.data?.email_id || !event.created_at || !request.headers.get('svix-id'))throw Error('Malformed event');}catch{return new Response('Invalid event',{status:400});}
 if(!events.has(event.type))return new Response('Ignored');
 try{const db=createAdminClient();const result=await db.rpc('record_crm_warning_event',{p_event:request.headers.get('svix-id'),p_provider:event.data.email_id,p_type:event.type,p_occurred:event.created_at});if(result.error)throw Error('Recording failed');return new Response('Recorded');}catch{return new Response('Retry later',{status:503});}
}
