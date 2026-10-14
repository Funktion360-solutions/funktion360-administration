export type QuoteLine={description:string,quantity:number,unit_minor:number,interval:'month'|'year'|'one_time'|'custom'};
export function priceMinor(value:string){const match=/^(0|[1-9][0-9]{0,6})(?:[.,]([0-9]{1,2}))?$/.exec(value.trim());if(!match)return undefined;const amount=Number(match[1])*100+Number((match[2] || '').padEnd(2,'0'));return amount<=100000000?amount:undefined;}
export function quoteLines(value:unknown):QuoteLine[]|undefined{if(!Array.isArray(value) || value.length<1 || value.length>50)return undefined;const result:QuoteLine[]=[];for(const item of value){if(!item || typeof item!=='object' || typeof item.description!=='string' || !item.description.trim() || item.description.trim().length>300 || !Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>1000000 || !Number.isInteger(item.unit_minor) || item.unit_minor<0 || item.unit_minor>100000000 || !['month','year','one_time','custom'].includes(item.interval))return undefined;result.push({description:item.description.trim(),quantity:item.quantity,unit_minor:item.unit_minor,interval:item.interval});}return result;}
export function quoteTotals(lines:QuoteLine[]){const totals:Record<string,number>={};for(const line of lines)totals[line.interval]=(totals[line.interval] || 0)+line.quantity*line.unit_minor;return totals;}

export function checkoutLines(value:unknown,vat:string){
 const lines=quoteLines(value);if(!lines || vat!=='inclusive')throw new Error('Inclusive VAT prices required');
 const recurring=new Set(lines.filter(l=>l.interval!=='one_time').map(l=>l.interval));
 if(recurring.has('custom') || recurring.size>1 || lines.filter(l=>l.interval!=='one_time').length>20 || lines.filter(l=>l.interval==='one_time').length>20)throw new Error('Unsupported billing period');
 const total=lines.reduce((sum,l)=>sum+l.quantity*l.unit_minor,0);if(total<=0 || total>99999999)throw new Error('Unsupported total');
 return {lines,mode:recurring.size?'subscription' as const:'payment' as const,total};
}
