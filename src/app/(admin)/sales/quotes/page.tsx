import {randomUUID} from 'node:crypto';
import Link from 'next/link';
import {requirePermission} from '@/lib/auth/require-permission';
import {createClient} from '@/lib/supabase/server';
import {QuoteForm} from '@/components/quote-form';
import {quoteTotals,type QuoteLine} from '@/lib/crm/quote-lines';
import styles from '../../products/catalog.module.css';
export const dynamic='force-dynamic';
export default async function Quotes({searchParams}:{searchParams:Promise<{notice?:string}>}){
 await requirePermission('quotes.read');await requirePermission('people.read');const db=await createClient();
 const [quotes,people,manage]=await Promise.all([db.rpc('list_crm_quote_drafts'),db.rpc('list_crm_people'),db.rpc('current_user_has_permission',{required_permission:'quotes.manage'})]);
 const {notice}=await searchParams;const customers=((people.data || []) as Array<{id:string,first_name:string,last_name:string|null,primary_email:string|null,status:string}>).filter(p=>p.status==='active' && p.primary_email).map(p=>({id:p.id,name:[p.first_name,p.last_name].filter(Boolean).join(' ')+' · '+p.primary_email}));
 const drafts=(quotes.data || []) as Array<{id:string,person_id:string,person_name:string,title:string,lines:QuoteLine[],vat_mode:string,valid_until:string}>;
 return <div className={styles.workspace}><p className="font-mono text-xs uppercase tracking-widest text-black/40">Funktion360 · Salg</p><h1 className="mt-2 text-3xl font-semibold">Tilbud til Favn360</h1><p>Interne udkast med prislinjer og gyldighed. Kunden modtager endnu ingen mail, og tilbuddet giver ikke adgang.</p>{notice?<p role="status" className="rounded-xl bg-[#f0f2eb] p-4">{notice==='created'?'Tilbudsudkastet er gemt.':'Udkastet kunne ikke gemmes. Kontrollér felter, databaseopsætning og rettigheder.'}</p>:null}<section><h2>Tilbudsudkast</h2>{quotes.error?<p role="status">Udkastene kunne ikke hentes. Installér databasepakken, hvis den mangler.</p>:drafts.length?<ul>{drafts.map(draft=><li key={draft.id}><strong><Link href={'/sales/quotes/'+draft.id}>{draft.title}</Link></strong><p><Link href={'/customers/people/'+draft.person_id}>{draft.person_name}</Link> · Gyldigt til {draft.valid_until}</p><p>{draft.vat_mode==='inclusive'?'Inklusive moms':'Eksklusive moms'}</p>{Object.entries(quoteTotals(draft.lines)).map(([period,amount])=><p key={period}>{new Intl.NumberFormat('da-DK',{style:'currency',currency:'DKK'}).format(amount/100)} · {period==='month'?'måned':period==='year'?'år':period==='one_time'?'engangsbetaling':'særskilt aftale'}</p>)}</li>)}</ul>:<p>Ingen tilbudsudkast endnu.</p>}</section>{manage.data===true && !quotes.error && !people.error?<section><h2>Opret tilbudsudkast</h2><QuoteForm people={customers} requestId={randomUUID()}/></section>:null}</div>;
}
