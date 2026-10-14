import 'server-only';
import {createClient} from '@/lib/supabase/server';
export type Organization={id:string,name:string};
export type Agreement={id:string,status:string,title?:string,contract_number?:string,contract_type?:string,product_name?:string,plan_name?:string,entitlement_type?:string,billing_provider?:string|null,external_subscription_id?:string|null,seat_quantity?:number|null,current_period_end?:string|null,expires_at?:string|null,organization:Organization};
export async function listAgreements(kind:'contracts'|'subscriptions',organizationId?:string){
 const db=await createClient();const organizations=await db.rpc('list_crm_organizations');
 if(organizations.error)throw new Error('Organisationerne kunne ikke hentes.');
 const all=(organizations.data || []) as Organization[];
 const selected=organizationId?all.filter(org=>org.id===organizationId):all;
 const rows:Agreement[]=[];let failed=0;
 // Reuse permission-checked RPCs with bounded parallel requests.
 for(let offset=0;offset<selected.length;offset+=5){
  const results=await Promise.all(selected.slice(offset,offset+5).map(async org=>{const result=await db.rpc(kind==='contracts'?'list_crm_contracts':'list_crm_customer_entitlements',{target_organization_id:org.id});return {org,result};}));
  for(const {org,result} of results){if(result.error){failed++;continue;}rows.push(...(result.data || []).map((row:Omit<Agreement,'organization'>)=>({...row,organization:org})));}
 }
 return {organizations:all,rows,failed};
}
