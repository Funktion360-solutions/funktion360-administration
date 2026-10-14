import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {createAdminClient} from '@/lib/supabase/admin';
export const dynamic='force-dynamic';
const issuer='https://fthalqavjmsydmqszvkk.supabase.co/auth/v1';
function reply(body:unknown,status=200){return NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store','Vary':'Authorization'}});}
export async function GET(request:NextRequest){
 const authorization=request.headers.get('authorization')||'';
 if(!/^Bearer [^\s]{1,8192}$/.test(authorization))return reply({error:'unauthorized'},401);
 const key=process.env.FUNKTION360_ID_PUBLISHABLE_KEY;
 if(!key)return reply({error:'unavailable'},503);
 try{
 const provider=createClient(issuer.replace('/auth/v1',''),key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data:{user},error}=await provider.auth.getUser(authorization.slice(7));
 if(error||!user||!user.email_confirmed_at)return reply({error:'unauthorized'},401);
 if(user.factors?.some(f=>f.status==='verified')){const claims=await provider.auth.getClaims(authorization.slice(7));if(claims.error||claims.data?.claims.aal!=='aal2')return reply({error:'unauthorized'},401);}
 const db=createAdminClient();const result=await db.rpc('get_identity_products',{p_issuer:issuer,p_subject:user.id});
 if(result.error)return reply({error:'unavailable'},503);
 return reply({version:1,issuer,subject:user.id,products:result.data});
 }catch{return reply({error:'unavailable'},503);}
}
