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

export async function OrganizationsSection() {
  const supabase = await createClient();

  const { data: organizations, error } = await supabase.rpc(
    "list_crm_organizations"
  );

  if (error) {
    throw new Error(
      `Organizations query failed: ${error.message}`
    );
  }

  return (
    <section>
      <hr />

      <h2>Organisationer</h2>

      <p>
        Organisationer:{" "}
        <strong>{organizations?.length ?? 0}</strong>
      </p>

      <h3>Opret organisation</h3>

      <form action={createOrganization}>
        <div>
          <label htmlFor="organization_name">Navn</label>
          <input
            id="organization_name"
            name="name"
            required
          />
        </div>

        <div>
          <label htmlFor="organization_type">Type</label>
          <select
            id="organization_type"
            name="organization_type"
            defaultValue="company"
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
        </div>

        <div>
          <label htmlFor="cvr_number">CVR</label>
          <input
            id="cvr_number"
            name="cvr_number"
          />
        </div>

        <div>
          <label htmlFor="organization_email">
            E-mail
          </label>
          <input
            id="organization_email"
            name="email"
            type="email"
          />
        </div>

        <div>
          <label htmlFor="organization_phone">
            Telefon
          </label>
          <input
            id="organization_phone"
            name="phone"
            type="tel"
          />
        </div>

        <div>
          <label htmlFor="organization_website">
            Website
          </label>
          <input
            id="organization_website"
            name="website"
            type="url"
          />
        </div>

        <div>
          <label htmlFor="organization_status">
            Status
          </label>
          <select
            id="organization_status"
            name="status"
            defaultValue="prospect"
          >
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="customer">Kunde</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </div>

        <button type="submit">
          Opret organisation
        </button>
      </form>

      <h3>CRM-organisationer</h3>

      {organizations && organizations.length > 0 ? (
        <ul>
          {organizations.map(
            (organization: CrmOrganization) => (
              <li key={organization.id}>
                <form action={updateOrganization}>
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
                  />

                  <select
                    name="organization_type"
                    defaultValue={organization.organization_type}
                    aria-label="Type"
                  >
                    <option value="company">
                      Virksomhed
                    </option>
                    <option value="municipality">
                      Kommune
                    </option>
                    <option value="region">
                      Region
                    </option>
                    <option value="association">
                      Forening
                    </option>
                    <option value="public_authority">
                      Offentlig myndighed
                    </option>
                    <option value="nonprofit">
                      Nonprofit
                    </option>
                    <option value="other">
                      Andet
                    </option>
                  </select>

                  <input
                    name="cvr_number"
                    defaultValue={
                      organization.cvr_number ?? ""
                    }
                    aria-label="CVR"
                  />

                  <input
                    name="email"
                    type="email"
                    defaultValue={
                      organization.primary_email ?? ""
                    }
                    aria-label="E-mail"
                  />

                  <input
                    name="phone"
                    type="tel"
                    defaultValue={
                      organization.phone ?? ""
                    }
                    aria-label="Telefon"
                  />

                  <input
                    name="website"
                    type="url"
                    defaultValue={
                      organization.website ?? ""
                    }
                    aria-label="Website"
                  />

                  <select
                    name="status"
                    defaultValue={organization.status}
                    aria-label="Status"
                  >
                    <option value="lead">Lead</option>
                    <option value="prospect">
                      Prospect
                    </option>
                    <option value="customer">
                      Kunde
                    </option>
                    <option value="inactive">
                      Inaktiv
                    </option>
                  </select>

                  <button type="submit">
                    Gem ændringer
                  </button>
                </form>

                {organization.status !== "inactive" && (
                  <form action={deleteOrganization}>
                    <input
                      type="hidden"
                      name="id"
                      value={organization.id}
                    />
                    <button type="submit">
                      Deaktivér organisation
                    </button>
                  </form>
                )}
              </li>
            )
          )}
        </ul>
      ) : (
        <p>Ingen organisationer oprettet endnu.</p>
      )}
    </section>
  );
}
