import {OrganizationIdMembers} from '@/components/customer-360/organization-id-members';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireStaff} from '@/lib/auth/require-staff';
import {createClient} from '@/lib/supabase/server';
import {identityStatus,type ExternalIdentity} from '@/lib/funktion360-id/identity-status';
export const dynamic='force-dynamic';
type Contact={id:string,person_id:string,person_name:string,person_email:string|null};
export default async function IdentityPage({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{membership_notice?:string}>}){
 await requireStaff();const {id}=await params;const {membership_notice}=await searchParams;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const db=await createClient();
 const {data,error}=await db.rpc('get_crm_organization_people',{target_organization_id:id});
 if(error)return <section className="rounded-2xl border border-black/10 bg-white p-6"><h2 className="text-2xl font-semibold">Funktion360 ID</h2><p role="status" className="mt-4">Kontaktpersonerne kunne ikke hentes. Kontrollér din adgang, og prøv igen.</p></section>;
 const contacts=(data || []) as Contact[];
 const people=[...new Map(contacts.map(person=>[person.person_id,person])).values()];
 const rows=await Promise.all(people.map(async person=>{const result=await db.rpc('get_crm_person_external_identities',{target_person_id:person.person_id});return {person,identity:result.error?undefined:identityStatus((result.data || []) as ExternalIdentity[])};}));
 return <div className="space-y-6"><div><p className="font-mono text-xs uppercase tracking-widest text-black/40">Customer 360 · Funktion360 ID</p><h2 className="mt-2 text-2xl font-semibold">Organisationens ID-tilknytninger</h2><p className="mt-3 max-w-2xl text-sm text-black/60">Teamet administrerer organisationen og dens personer her. Brugerne skal kunne se deres godkendte medlemskaber på Funktion360 ID.</p></div><section className="rounded-2xl border border-black/10 bg-[#f8f8f4] p-6"><h3 className="font-semibold">Forbindelsen til ID er under opbygning</h3><p className="mt-2 text-sm text-black/60">Oversigten viser CRM-kontakter og registrerede eksterne identiteter. Brug ID-opslaget nedenfor til at kontrollere en central bruger. Medlemskaber synkroniseres endnu ikke.</p><Link className="mt-3 inline-block text-sm underline" href={`/customers/organizations/${id}/contacts`}>Administrér organisationens kontaktpersoner</Link></section><OrganizationIdMembers organizationId={id} notice={membership_notice}/><section className="overflow-hidden rounded-2xl border border-black/10 bg-white"><h3 className="border-b border-black/10 px-6 py-4 font-semibold">Personer og identiteter</h3>{rows.length?<ul className="divide-y divide-black/10">{rows.map(({person,identity})=><li key={person.person_id} className="flex flex-wrap items-start justify-between gap-4 px-6 py-5"><div><Link href={`/customers/people/${person.person_id}`} className="font-medium underline decoration-black/20">{person.person_name}</Link><p className="mt-1 text-sm text-black/50">{person.person_email || 'Ingen email registreret'}</p></div><div className="max-w-full text-sm"><span className="rounded-full bg-[#f0f2eb] px-3 py-1">{identity?.label || 'Identiteter kunne ikke hentes'}</span>{identity?.status==='registered'?<code className="mt-3 block break-all text-xs text-black/50">{identity.subject}</code>:null}</div></li>)}</ul>:<p className="px-6 py-5 text-sm text-black/50">Organisationen har endnu ingen tilknyttede CRM-personer.</p>}</section></div>;
}
