import {
  linkPersonToOrganization,
  unlinkPersonFromOrganization,
  updateOrganizationPerson,
} from "@/app/actions/organization-people";
import { createClient } from "@/lib/supabase/server";

type CrmPerson = {
  id: string;
  first_name: string;
  last_name: string | null;
  primary_email: string | null;
};

type CrmOrganization = {
  id: string;
  name: string;
  status: string;
};

type OrganizationPerson = {
  id: string;
  organization_id: string;
  organization_name: string;
  person_id: string;
  person_name: string;
  person_email: string | null;
  role: string | null;
  job_title: string | null;
  is_primary_contact: boolean;
  is_billing_contact: boolean;
  is_contract_contact: boolean;
  is_technical_contact: boolean;
  is_dpo_contact: boolean;
};

export async function OrganizationPeopleSection() {
  const supabase = await createClient();

  const [
    { data: people, error: peopleError },
    { data: organizations, error: organizationsError },
    { data: relations, error: relationsError },
  ] = await Promise.all([
    supabase.rpc("list_crm_people"),
    supabase.rpc("list_crm_organizations"),
    supabase.rpc("list_crm_organization_people"),
  ]);

  if (peopleError) {
    throw new Error(
      `Kunne ikke hente personer: ${peopleError.message}`
    );
  }

  if (organizationsError) {
    throw new Error(
      `Kunne ikke hente organisationer: ${organizationsError.message}`
    );
  }

  if (relationsError) {
    throw new Error(
      `Kunne ikke hente organisationstilknytninger: ${relationsError.message}`
    );
  }

  const activeOrganizations = (
    (organizations ?? []) as CrmOrganization[]
  ).filter((organization) => organization.status !== "inactive");

  const crmPeople = (people ?? []) as CrmPerson[];
  const organizationPeople = (relations ?? []) as OrganizationPerson[];

  return (
    <section>
      <hr />

      <h2>Kontaktpersoner og organisationstilknytninger</h2>

      <p>
        Tilknytninger: <strong>{organizationPeople.length}</strong>
      </p>

      <h3>Tilknyt person til organisation</h3>

      {crmPeople.length > 0 && activeOrganizations.length > 0 ? (
        <form action={linkPersonToOrganization}>
          <div>
            <label htmlFor="relation_organization">
              Organisation
            </label>

            <select
              id="relation_organization"
              name="organization_id"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Vælg organisation
              </option>

              {activeOrganizations.map((organization) => (
                <option
                  key={organization.id}
                  value={organization.id}
                >
                  {organization.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="relation_person">
              Person
            </label>

            <select
              id="relation_person"
              name="person_id"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Vælg person
              </option>

              {crmPeople.map((person) => (
                <option
                  key={person.id}
                  value={person.id}
                >
                  {person.first_name} {person.last_name ?? ""}
                  {person.primary_email
                    ? ` — ${person.primary_email}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="relation_role">
              Rolle
            </label>

            <input
              id="relation_role"
              name="role"
              placeholder="Fx beslutningstager"
            />
          </div>

          <div>
            <label htmlFor="relation_job_title">
              Jobtitel
            </label>

            <input
              id="relation_job_title"
              name="job_title"
              placeholder="Fx socialchef"
            />
          </div>

          <fieldset>
            <legend>Kontaktfunktioner</legend>

            <label>
              <input
                type="checkbox"
                name="is_primary_contact"
              />
              Primær kontakt
            </label>

            <label>
              <input
                type="checkbox"
                name="is_billing_contact"
              />
              Fakturering
            </label>

            <label>
              <input
                type="checkbox"
                name="is_contract_contact"
              />
              Kontrakt
            </label>

            <label>
              <input
                type="checkbox"
                name="is_technical_contact"
              />
              Teknisk
            </label>

            <label>
              <input
                type="checkbox"
                name="is_dpo_contact"
              />
              DPO
            </label>
          </fieldset>

          <button type="submit">
            Tilknyt person
          </button>
        </form>
      ) : (
        <p>
          Der skal være mindst én aktiv person og én aktiv
          organisation, før en tilknytning kan oprettes.
        </p>
      )}

      <h3>Eksisterende tilknytninger</h3>

      {organizationPeople.length > 0 ? (
        <ul>
          {organizationPeople.map((relation) => {
            const contactTypes = [
              relation.is_primary_contact && "Primær",
              relation.is_billing_contact && "Fakturering",
              relation.is_contract_contact && "Kontrakt",
              relation.is_technical_contact && "Teknisk",
              relation.is_dpo_contact && "DPO",
            ].filter(Boolean);

            return (
              <li key={relation.id}>
                <p>
                  <strong>{relation.person_name}</strong>
                  {" → "}
                  <strong>{relation.organization_name}</strong>

                  {relation.person_email && (
                    <> — {relation.person_email}</>
                  )}

                  {contactTypes.length > 0 && (
                    <> — {contactTypes.join(", ")}</>
                  )}
                </p>

                <form action={updateOrganizationPerson}>
                  <input
                    type="hidden"
                    name="relation_id"
                    value={relation.id}
                  />

                  <div>
                    <label>Rolle</label>
                    <input
                      name="role"
                      defaultValue={relation.role ?? ""}
                    />
                  </div>

                  <div>
                    <label>Jobtitel</label>
                    <input
                      name="job_title"
                      defaultValue={relation.job_title ?? ""}
                    />
                  </div>

                  <fieldset>
                    <legend>Kontaktfunktioner</legend>

                    <label>
                      <input
                        type="checkbox"
                        name="is_primary_contact"
                        defaultChecked={relation.is_primary_contact}
                      />
                      Primær kontakt
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        name="is_billing_contact"
                        defaultChecked={relation.is_billing_contact}
                      />
                      Fakturering
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        name="is_contract_contact"
                        defaultChecked={relation.is_contract_contact}
                      />
                      Kontrakt
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        name="is_technical_contact"
                        defaultChecked={relation.is_technical_contact}
                      />
                      Teknisk
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        name="is_dpo_contact"
                        defaultChecked={relation.is_dpo_contact}
                      />
                      DPO
                    </label>
                  </fieldset>

                  <button type="submit">
                    Gem tilknytning
                  </button>
                </form>

                <form action={unlinkPersonFromOrganization}>
                  <input
                    type="hidden"
                    name="relation_id"
                    value={relation.id}
                  />

                  <button type="submit">
                    Fjern tilknytning
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>Ingen organisationstilknytninger endnu.</p>
      )}
    </section>
  );
}
