"use server";
import {requirePermission} from '@/lib/auth/require-permission';
import {createClient} from '@/lib/supabase/server';
export type LookupState={error?:string,identity?:{subject:string,email:string|null,emailVerified:boolean,checkedAt:string}};
export async function lookupIdentity(_state:LookupState,form:FormData):Promise<LookupState>{
 await requirePermission('people.read');
 const subject=String(form.get('subject') || '').trim();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subject))return {error:'Indtast et gyldigt Funktion360 ID-bruger-ID.'};
 const base=process.env.FUNKTION360_ID_BASE_URL;
 const issuer=process.env.FUNKTION360_ID_ISSUER;
 if(!base || !issuer)return {error:'Forbindelsen til Funktion360 ID er ikke konfigureret.'};
 let url:URL;try{url=new URL(base);}catch{return {error:'ID-adressen er ikke korrekt konfigureret.'};}if(url.protocol!=='https:' || url.username || url.password || url.pathname!=='/' || url.search || url.hash)return {error:'ID-adressen er ikke korrekt konfigureret.'};
 const db=await createClient();const {data:{session},error}=await db.auth.getSession();
 if(error || !session)return {error:'Log ind i administrationen igen.'};
 try{
  const response=await fetch(url.origin+'/api/administration/identity-lookup',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({subject}),cache:'no-store',signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!response.ok)return {error:response.status===404?'Bruger-ID’et findes ikke i Funktion360 ID.':response.status===403?'Du har ikke adgang til ID-opslag.':'ID-opslaget kunne ikke gennemføres. Kontrollér integrationsopsætningen.'};
  const data=await response.json();
  if(data.contract_version!==1 || data.issuer!==issuer || typeof data.subject!=='string' || data.subject.toLowerCase()!==subject.toLowerCase() || !(data.email===null || typeof data.email==='string') || typeof data.email_verified!=='boolean' || typeof data.checked_at!=='string')return {error:'ID-svaret kunne ikke verificeres.'};
  return {identity:{subject:data.subject,email:data.email,emailVerified:data.email_verified,checkedAt:data.checked_at}};
 }catch{return {error:'Funktion360 ID kunne ikke kontaktes. Prøv igen.'};}
}
