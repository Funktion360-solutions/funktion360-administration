import {createHash} from 'node:crypto';
import {notFound} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {quoteTotals,type QuoteLine} from '@/lib/crm/quote-lines';
export const dynamic='force-dynamic';
export const metadata={title:'Dit tilbud · Funktion360',robots:{index:false,follow:false},referrer:'no-referrer' as const};
const periods:Record<string,string>={month:'Pr. måned',year:'Pr. år',one_time:'Engangsbetaling',custom:'Særskilt aftale'};
const money=(amount:number)=>new Intl.NumberFormat('da-DK',{style:'currency',currency:'DKK'}).format(amount/100);
export default async function PublicQuote({params}:{params:Promise<{token:string}>}){
 const {token}=await params;if(!/^[0-9a-f]{64}$/.test(token))notFound();const db=await createClient();const result=await db.rpc('read_crm_public_quote',{p_hash:createHash('sha256').update(token).digest('hex')});
 if(result.error || !result.data)return <main className="mx-auto max-w-3xl p-8"><h1 className="text-3xl font-semibold">Tilbuddet kan ikke åbnes</h1><p className="mt-4">Linket kan være udløbet. Kontakt Funktion360 via den mail, du modtog.</p></main>;
 const quote=result.data as {title:string,lines:QuoteLine[],vat_mode:string,valid_until:string};
 return <main className="mx-auto max-w-3xl space-y-6 px-5 py-12"><p className="text-sm font-semibold uppercase tracking-widest">Funktion360 · Favn360</p><h1 className="text-3xl font-semibold">{quote.title}</h1><p>Gyldigt til {quote.valid_until}</p><section className="rounded-2xl border border-black/10 bg-white p-6"><h2 className="text-xl font-semibold">Dit tilbud</h2><ul className="mt-5 divide-y divide-black/10">{quote.lines.map((line,index)=><li key={index} className="py-4"><strong>{line.description}</strong><p className="mt-2 text-sm">{line.quantity} × {money(line.unit_minor)} = {money(line.quantity*line.unit_minor)} · {periods[line.interval]}</p></li>)}</ul><div className="mt-4 border-t border-black/10 pt-4">{Object.entries(quoteTotals(quote.lines)).map(([period,amount])=><p key={period}>{periods[period]}: <strong>{money(amount)}</strong></p>)}<p className="mt-3 text-sm">{quote.vat_mode==='inclusive'?'Priser inklusive moms':'Priser eksklusive moms'}</p></div></section><p className="rounded-xl bg-[#f0f2eb] p-5 text-sm">Du kan læse tilbuddet her. Accept og betaling via denne side er endnu ikke tilgængelig. Kontakt Funktion360 ved spørgsmål.</p></main>;
}
