export type ExternalIdentity={system:string,external_user_id:string,is_active:boolean};
export function identityStatus(rows:ExternalIdentity[]){
 const identities=rows.filter(row=>row.system==='funktion360_id');
 if(!identities.length)return {status:'missing' as const,label:'Ingen ID-identitet registreret'};
 const active=identities.filter(row=>row.is_active);
 if(!active.length)return {status:'inactive' as const,label:'ID-identitet inaktiv'};
 if(active.length!==1)return {status:'conflict' as const,label:'Flere aktive ID-identiteter – kræver kontrol'};
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(active[0].external_user_id))return {status:'invalid' as const,label:'ID-identiteten har ugyldigt format'};
 return {status:'registered' as const,label:'ID-identitet registreret i CRM',subject:active[0].external_user_id};
}
