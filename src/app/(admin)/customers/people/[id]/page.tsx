import {PersonIdLink} from '@/components/customer-360/person-id-link';
import {StripeTestInvoices} from '@/components/customer-360/stripe-test-invoices';
import {StripeTestSubscriptions} from '@/components/customer-360/stripe-test-subscriptions';
import {PersonPayments} from '@/components/customer-360/person-payments';
import {PersonProducts} from '@/components/customer-360/person-products';
import {PersonSupport} from '@/components/customer-360/person-support';
import {requirePermission} from '@/lib/auth/require-permission';
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Person = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type ExternalIdentity = {
  id: string;
  system: string;
  external_user_id: string;
  email: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  source_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

type PersonOrganization = {
  relation_id: string;
  organization_id: string;
  organization_name: string;
  organization_type: string;
  cvr_number: string | null;
  organization_email: string | null;
  organization_phone: string | null;
  organization_status: string;
  role: string | null;
  job_title: string | null;
  is_primary_contact: boolean;
  is_billing_contact: boolean;
  is_contract_contact: boolean;
  is_technical_contact: boolean;
  is_dpo_contact: boolean;
  relation_created_at: string;
  relation_updated_at: string;
};

const personStatusLabels: Record<string, string> = {
  active: "Aktiv",
  inactive: "Inaktiv",
  lead: "Lead",
  prospect: "Prospect",
  customer: "Kunde",
};

const organizationTypeLabels: Record<string, string> = {
  company: "Virksomhed",
  municipality: "Kommune",
  region: "Region",
  association: "Forening",
  public_authority: "Offentlig myndighed",
  nonprofit: "Nonprofit",
  other: "Andet",
};

const systemLabels: Record<string, string> = {
  favn360: "Favn360",
  funktion360_id: "Funktion360 ID",
  vores_kok: "Vores Kok",
  studiemakker: "Studiemakker",
  dej: "Dej",
};

function formatDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function PersonPage({
  searchParams,
  params,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{product_notice?:string,id_notice?:string}>;
}) {
  await requirePermission("people.read");
  const { id } = await params;
  const {product_notice,id_notice}=await searchParams;
  const supabase = await createClient();

  const [
    { data: personData, error: personError },
    { data: identitiesData, error: identitiesError },
    { data: organizationsData, error: organizationsError },
  ] = await Promise.all([
    supabase.rpc("get_crm_person", {
      target_person_id: id,
    }),
    supabase.rpc("get_crm_person_external_identities", {
      target_person_id: id,
    }),
    supabase.rpc("get_crm_person_organizations", {
      target_person_id: id,
    }),
  ]);

  if (personError) {
    throw new Error(`Kunne ikke hente person: ${personError.message}`);
  }

  if (identitiesError) {
    throw new Error(
      `Kunne ikke hente systemidentiteter: ${identitiesError.message}`
    );
  }

  if (organizationsError) {
    throw new Error(
      `Kunne ikke hente organisationer: ${organizationsError.message}`
    );
  }

  const person = (personData as Person[] | null)?.[0];

  if (!person) {
    notFound();
  }

  const identities = (identitiesData ?? []) as ExternalIdentity[];
  const organizations = (organizationsData ?? []) as PersonOrganization[];

  const fullName =
    [person.first_name, person.last_name].filter(Boolean).join(" ") ||
    person.primary_email ||
    "Unavngiven person";

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/customers/people"
          className="text-xs text-black/45 hover:text-black"
        >
          ← Tilbage til personer
        </Link>

        <p className="mt-6 font-mono text-xs uppercase tracking-[0.16em] text-black/40">
          Unified Person Profile
        </p>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {fullName}
            </h1>

            <p className="mt-2 text-sm text-black/50">
              Samlet personprofil på tværs af Funktion360s kunderelationer og
              systemer.
            </p>
          </div>

          <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-black/55">
            {personStatusLabels[person.status] ?? person.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <div className="mb-6">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
              Stamdata
            </p>

            <h2 className="mt-2 text-xl font-semibold">Person</h2>
          </div>

          <dl className="divide-y divide-black/10">
            <InfoRow label="Navn" value={fullName} />
            <InfoRow label="E-mail" value={person.primary_email} />
            <InfoRow label="Telefon" value={person.phone} />
            <InfoRow
              label="Status"
              value={personStatusLabels[person.status] ?? person.status}
            />
            <InfoRow label="Oprettet" value={formatDate(person.created_at)} />
            <InfoRow label="Opdateret" value={formatDate(person.updated_at)} />
          </dl>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white">
          <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
                Relationer
              </p>

              <h2 className="mt-2 text-xl font-semibold">Organisationer</h2>
            </div>

            <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/50">
              {organizations.length}
            </span>
          </div>

          {organizations.length > 0 ? (
            <div className="divide-y divide-black/10">
              {organizations.map((organization) => {
                const contactTypes = [
                  organization.is_primary_contact && "Primær",
                  organization.is_billing_contact && "Fakturering",
                  organization.is_contract_contact && "Kontrakt",
                  organization.is_technical_contact && "Teknisk",
                  organization.is_dpo_contact && "DPO",
                ].filter(Boolean) as string[];

                return (
                  <Link
                    key={organization.relation_id}
                    href={`/customers/organizations/${organization.organization_id}`}
                    className="block px-6 py-5 transition hover:bg-black/[0.02]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">
                          {organization.organization_name}
                        </p>

                        <p className="mt-1 text-xs text-black/45">
                          {organization.job_title ||
                            organization.role ||
                            organizationTypeLabels[
                              organization.organization_type
                            ] ||
                            organization.organization_type}
                        </p>
                      </div>

                      {contactTypes.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-2">
                          {contactTypes.map((type) => (
                            <span
                              key={type}
                              className="rounded-full bg-[#cfff69]/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-5">
              <p className="text-sm text-black/45">
                Personen er ikke tilknyttet en organisation.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-black/10 bg-white">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
              Produkter & systemer
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              ID og produktkonti
            </h2>
          </div>

          <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/50">
            {identities.length}
          </span>
        </div>

        <p className="px-6 py-4 text-sm text-black/50">Registrerede identiteter forbinder personen med produktkonti. De dokumenterer ikke i sig selv abonnement, betaling eller produktadgang.</p>
        {identities.length > 0 ? (
          <div className="divide-y divide-black/10">
            {identities.map((identity) => (
              <div
                key={identity.id}
                className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_1fr_auto]"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {systemLabels[identity.system] ?? identity.system}
                  </p>

                  <p className="mt-1 font-mono text-[11px] text-black/40">
                    {identity.external_user_id}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-black/45">Systemkonto</p>
                  <p className="mt-1 text-sm">
                    {identity.email ?? "Ingen e-mail"}
                  </p>

                  <p className="mt-2 text-[11px] text-black/35">
                    Senest synkroniseret:{" "}
                    {formatDate(identity.last_synced_at) ?? "Ikke registreret"}
                  </p>
                </div>

                <div className="md:text-right">
                  <span
                    className={
                      identity.is_active
                        ? "inline-block rounded-full bg-[#cfff69]/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide"
                        : "inline-block rounded-full border border-black/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-black/45"
                    }
                  >
                    {identity.is_active ? "Registrering aktiv" : "Registrering inaktiv"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-5">
            <p className="text-sm text-black/45">
              Ingen eksterne systemidentiteter er registreret.
            </p>
          </div>
        )}
      </section>

      <PersonIdLink personId={person.id} notice={id_notice}/>
      <PersonPayments personId={person.id}/><StripeTestSubscriptions personId={person.id}/><StripeTestInvoices personId={person.id}/>
      <PersonProducts personId={person.id} notice={product_notice}/>
      <PersonSupport personId={person.id}/>
      <section className="grid gap-4 md:grid-cols-2">

        <PlaceholderCard
          eyebrow="Aktivitet"
          title="Historik"
          description="Audit- og aktivitetshistorik kan senere samles på tværs af CRM og produkter."
        />

        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/35">
            CRM
          </p>

          <p className="mt-3 text-sm font-semibold">Person-ID</p>

          <p className="mt-2 break-all font-mono text-[11px] text-black/40">
            {person.id}
          </p>
        </section>
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-4 py-3 text-sm">
      <dt className="text-black/40">{label}</dt>
      <dd className="min-w-0 break-words font-medium">
        {value || "—"}
      </dd>
    </div>
  );
}

function PlaceholderCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-black/15 bg-white/50 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/35">
        {eyebrow}
      </p>

      <p className="mt-3 text-sm font-semibold">{title}</p>

      <p className="mt-2 text-xs leading-5 text-black/45">
        {description}
      </p>
    </section>
  );
}
