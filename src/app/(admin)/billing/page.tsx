import Link from 'next/link';
import {requirePermission} from '@/lib/auth/require-permission';
import {createClient} from '@/lib/supabase/server';
import {quoteTotals,type QuoteLine} from '@/lib/crm/quote-lines';
import styles from '../products/catalog.module.css';
export const dynamic='force-dynamic';
type PaymentQuote={id:string,person_id:string,person_name:string,person_status:string,title:string,lines:QuoteLine[],vat_mode:string,accepted_at:string,test_paid_at:string|null,test_subscription_id:string|null,accepted_email:string};
const periods:Record<string,string>={month:'Pr. måned',year:'Pr. år',one_time:'Engangsbetaling',custom:'Særskilt aftale'};
const money=(amount:number)=>new Intl.NumberFormat('da-DK',{style:'currency',currency:'DKK'}).format(amount/100);
export default async function Billing({searchParams}:{searchParams:Promise<{q?:string}>}){
 await requirePermission('quotes.read');await requirePermission('people.read');
 const db=await createClient();const result=await db.rpc('list_crm_quote_payment_queue');
 const quotes=(result.data || []) as PaymentQuote[];const {q}=await searchParams;const search=(q || '').trim().slice(0,200);
 const visible=quotes.filter(quote=>[quote.title,quote.person_name,quote.accepted_email].join(' ').toLocaleLowerCase('da-DK').includes(search.toLocaleLowerCase('da-DK')));
 return <div className={styles.workspace}>
 <header><p className="font-mono text-xs uppercase tracking-widest text-black/40">Funktion360 · Favn360</p><h1 className="mt-2 text-3xl font-semibold">Betaling</h1><p className="mt-3">Accepterede tilbud til opfølgning på betaling og abonnement.</p></header>
 <section><h2>Stripe-testbetaling</h2><p>Oversigten viser kundens accept. Stripe-testbetalinger vises særskilt. Oversigten aktiverer ikke adgang til Favn360.</p><p>Før opkrævning skal tilbuddet kobles til den rigtige abonnementsplan, betaler og momsopsætning. Betaling skal bekræftes fra Stripe, før aktivering sættes i gang.</p><Link href="/products/plans">Åbn abonnementsplaner</Link></section>
 <form method="get" role="search"><label htmlFor="billing-search">Find accepteret tilbud</label><input id="billing-search" type="search" name="q" maxLength={200} defaultValue={search} placeholder="Tilbud, person eller email"/><button type="submit">Søg</button>{search?<Link href="/billing">Ryd søgning</Link>:null}</form>
 <section><h2>Accepterede tilbud</h2>{result.error?<p role="status">Tilbuddene kunne ikke hentes. Kontrollér databaseopsætning og rettigheder.</p>:<><p>{visible.length} af {quotes.length} tilbud i oversigten. Der vises højst de 200 senest accepterede tilbud.</p>{visible.length?<ul>{visible.map(quote=><li key={quote.id}><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-semibold"><Link href={'/sales/quotes/'+quote.id}>{quote.title}</Link></h3><span className="rounded-full bg-[#f0f2eb] px-3 py-1 text-xs">{quote.test_paid_at?'Testbetaling registreret':'Afventer testbetaling'}</span></div><p><Link href={'/customers/people/'+quote.person_id}>{quote.person_name}</Link></p><p className="text-sm">Accepteret {new Date(quote.accepted_at).toLocaleString('da-DK')} · Bekræftet email: {quote.accepted_email}</p>{Object.entries(quoteTotals(quote.lines)).map(([period,amount])=><p key={period}>{periods[period]}: <strong>{money(amount)}</strong></p>)}{quote.test_paid_at?<p className="text-sm">Testbetaling bekræftet {new Date(quote.test_paid_at).toLocaleString('da-DK')}. Favn360 er endnu ikke aktiveret.{quote.test_subscription_id?' Stripe-testabonnement: '+quote.test_subscription_id:''}</p>:null}<p className="text-sm">{quote.vat_mode==='inclusive'?'Priser inklusive moms':'Priser eksklusive moms'}</p>{quote.person_status!=='active'?<p className="text-sm font-semibold">Personen er ikke aktiv. Afklar kundestatus før næste trin.</p>:null}{quote.lines.some(line=>line.interval==='custom')?<p className="text-sm">Tilbuddet har en særskilt betalingsperiode, som skal afklares.</p>:null}</li>)}</ul>:<p>{search?'Ingen tilbud matcher søgningen.':'Ingen accepterede tilbud endnu.'}</p>}</>}</section>
 </div>;
}
