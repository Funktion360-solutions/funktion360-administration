import Link from "next/link";
import {
  createOrganization,
  deleteOrganization,
  updateOrganization,
} from "@/app/actions/organizations";
import { createClient } from "@/lib/supabase/server";

type CrmOrganization = {
  id: string;
  name: string;
  organization_type: string;
  cvr_number: string | null;
  primary_email: string | null;
  phone: string | null;
  website: string | null;
  status: string;
  created_at: string;
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

const statusLabels: Record<string, string> = {
  lead: "Lead",
  prospect: "Prospect",
  customer: "Kunde",
  inactive: "Inaktiv",
};

export default async function OrganizationsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "list_crm_organizations"
  );

  if (error) {
    throw new Error(
      `Organizations query failed: ${error.message}`
    );
  }

  const organizations = (data ?? []) as CrmOrganization[];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-black/45">
            Kunder
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Organisationer
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-black/55">
            Virksomheder, kommuner, myndigheder, foreninger og
            øvrige organisationer med relation til Funktion360.
          </p>
        </div>

        <div className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm">
          <strong>{organizations.length}</strong>
          <span className="ml-2 text-black/45">
            organisationer
          </span>
        </div>
      </div>

      <section className="rounded-2xl border border-black/10 bg-white p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">
            Opret organisation
          </h2>

          <p className="mt-1 text-sm text-black/50">
            Registrér en ny organisation i det centrale CRM.
          </p>
        </div>

        <form
          action={createOrganization}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <input
            name="name"
            required
            placeholder="Organisationsnavn"
            className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none focus:border-black/30"
          />

          <select
            name="organization_type"
            defaultValue="company"
            className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none focus:border-black/30"
          >
            <option value="company">Virksomhed</option>
            <option value="municipality">Kommune</option>
            <option value="region">Region</option>
            <option value="association">Forening</option>
            <option value="public_authority">
              Offentlig myndighed
            </option>
            <option value="nonprofit">Nonprofit</option>
            <option value="other">Andet</option>
          </select>

          <input
            name="cvr_number"
            placeholder="CVR"
            className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none focus:border-black/30"
          />

          <select
            name="status"
            defaultValue="prospect"
            className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none focus:border-black/30"
          >
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="customer">Kunde</option>
            <option value="inactive">Inaktiv</option>
          </select>

          <input
            name="email"
            type="email"
            placeholder="E-mail"
            className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none focus:border-black/30"
          />

          <input
            name="phone"
            type="tel"
            placeholder="Telefon"
            className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none focus:border-black/30"
          />

          <input
            name="website"
            type="url"
            placeholder="https://..."
            className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none focus:border-black/30"
          />

          <button
            type="submit"
            className="rounded-xl bg-[#202120] px-5 py-3 text-sm font-medium text-white transition hover:bg-black"
          >
            Opret organisation
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="border-b border-black/10 px-6 py-5">
          <h2 className="text-lg font-semibold">
            CRM-organisationer
          </h2>

          <p className="mt-1 text-sm text-black/45">
            Stamdata og kommerciel kundestatus.
          </p>
        </div>

        {organizations.length > 0 ? (
          <div className="divide-y divide-black/10">
            {organizations.map((organization) => (
              <article
                key={organization.id}
                className="p-6"
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/customers/organizations/${organization.id}`}
                        className="text-lg font-semibold transition hover:opacity-60"
                      >
                        {organization.name}
                      </Link>

                      <span className="rounded-full bg-[#cfff69] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide">
                        {statusLabels[organization.status] ??
                          organization.status}
                      </span>

                      <span className="rounded-full border border-black/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-black/50">
                        {organizationTypeLabels[
                          organization.organization_type
                        ] ?? organization.organization_type}
                      </span>
                    </div>

                    <p className="mt-1 font-mono text-[10px] text-black/30">
                      {organization.id}
                    </p>
                  </div>

                  {organization.status !== "inactive" && (
                    <form action={deleteOrganization}>
                      <input
                        type="hidden"
                        name="id"
                        value={organization.id}
                      />

                      <button
                        type="submit"
                        className="text-xs font-medium text-red-700 transition hover:text-red-900"
                      >
                        Deaktivér
                      </button>
                    </form>
                  )}
                </div>

                <form
                  action={updateOrganization}
                  className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
                >
                  <input
                    type="hidden"
                    name="id"
                    value={organization.id}
                  />

                  <input
                    name="name"
                    defaultValue={organization.name}
                    required
                    aria-label="Navn"
                    className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />

                  <select
                    name="organization_type"
                    defaultValue={organization.organization_type}
                    aria-label="Type"
                    className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                  >
                    <option value="company">Virksomhed</option>
                    <option value="municipality">Kommune</option>
                    <option value="region">Region</option>
                    <option value="association">Forening</option>
                    <option value="public_authority">
                      Offentlig myndighed
                    </option>
                    <option value="nonprofit">Nonprofit</option>
                    <option value="other">Andet</option>
                  </select>

                  <input
                    name="cvr_number"
                    defaultValue={organization.cvr_number ?? ""}
                    placeholder="CVR"
                    aria-label="CVR"
                    className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />

                  <select
                    name="status"
                    defaultValue={organization.status}
                    aria-label="Status"
                    className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                  >
                    <option value="lead">Lead</option>
                    <option value="prospect">Prospect</option>
                    <option value="customer">Kunde</option>
                    <option value="inactive">Inaktiv</option>
                  </select>

                  <input
                    name="email"
                    type="email"
                    defaultValue={organization.primary_email ?? ""}
                    placeholder="E-mail"
                    aria-label="E-mail"
                    className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />

                  <input
                    name="phone"
                    type="tel"
                    defaultValue={organization.phone ?? ""}
                    placeholder="Telefon"
                    aria-label="Telefon"
                    className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />

                  <input
                    name="website"
                    type="url"
                    defaultValue={organization.website ?? ""}
                    placeholder="Website"
                    aria-label="Website"
                    className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />

                  <button
                    type="submit"
                    className="rounded-lg border border-black/10 bg-[#f8f8f4] px-4 py-2 text-sm font-medium transition hover:bg-black/[0.04]"
                  >
                    Gem ændringer
                  </button>
                </form>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-black/45">
            Ingen organisationer oprettet endnu.
          </div>
        )}
      </section>
    </div>
  );
}
