export type WarningInput={mail_status:string|null,invoice_status:string,invoice_remaining:number,binding_current:boolean|null,invoice_synced_at:string|null,payer_checked_at:string|null,delivered_at:string|null,test_deadline_at:string|null};
export function warningDecision(row:WarningInput,now=Date.now()){
 if(row.invoice_status==='paid' || row.invoice_status==='void' || row.invoice_remaining===0)return 'resolved';
 if(row.mail_status==='delivery_failed')return 'delivery_failed';
 if(row.mail_status!=='delivered')return 'awaiting_delivery';
 const delivered=Date.parse(row.delivered_at || ''),deadline=Date.parse(row.test_deadline_at || '');
 if(!Number.isFinite(now) || !Number.isFinite(delivered) || !Number.isFinite(deadline) || delivered>now || deadline-delivered<7*86400000 || row.invoice_remaining<0 || !['open','uncollectible'].includes(row.invoice_status))return 'review';
 if(!row.binding_current)return 'review';
 if(now<deadline)return 'notice_running';
 const synced=Date.parse(row.invoice_synced_at || ''),checked=Date.parse(row.payer_checked_at || '');
 if(!Number.isFinite(synced) || !Number.isFinite(checked) || synced>now+60000 || checked>now+60000 || now-synced>86400000 || now-checked>86400000)return 'review';
 return 'restriction_candidate';
}
