import { createClient } from "@/lib/supabase/server";
import {
  linkPersonToOrganization,
  unlinkPersonFromOrganization,
  updateOrganizationPerson,
} from "@/app/actions/organization-people";

type CrmPerson = {
  id: string;
  first_name: string;
  last_name: string | null;
  primary_email: string | null;
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

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: peopleData, error: peopleError },
    { data: crmPeopleData, error: crmPeopleError },
  ] = await Promise.all([
    supabase.rpc("get_crm_organization_people", {
      target_organization_id: id,
    }),
    supabase.rpc("list_crm_people"),
  ]);

  if (peopleError) {
    throw new Error(
      `Kunne ikke hente kontaktpersoner: ${peopleError.message}`
    );
  }

  if (crmPeopleError) {
    throw new Error(
      `Kunne ikke hente CRM-personer: ${crmPeopleError.message}`
    );
  }

  const people = (peopleData ?? []) as OrganizationPerson[];
  const crmPeople = (crmPeopleData ?? []) as CrmPerson[];

  const linkedPersonIds = new Set(
    people.map((person) => person.person_id)
  );

  const availablePeople = crmPeople.filter(
    (person) => !linkedPersonIds.has(person.id)
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
          Kundeområde
        </p>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Kontakter
        </h2>

        <p className="mt-2 max-w-2xl text-sm text-black/50">
          Administrér kontaktpersoner, roller og kontaktfunktioner for
          organisationen.
        </p>
      </div>

      <section className="rounded-2xl border border-black/10 bg-white">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
              Relationer
            </p>

            <h3 className="mt-2 text-xl font-semibold">
              Kontaktpersoner
            </h3>
          </div>

          <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/50">
            {people.length}
          </span>
        </div>

        {people.length > 0 ? (
          <div className="divide-y divide-black/10">
            {people.map((person) => {
              const contactTypes = [
                person.is_primary_contact && "Primær",
                person.is_billing_contact && "Fakturering",
                person.is_contract_contact && "Kontrakt",
                person.is_technical_contact && "Teknisk",
                person.is_dpo_contact && "DPO",
              ].filter(Boolean) as string[];

              return (
                <div key={person.id} className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        {person.person_name}
                      </p>

                      {person.job_title && (
                        <p className="mt-1 text-sm text-black/50">
                          {person.job_title}
                        </p>
                      )}

                      {person.person_email && (
                        <p className="mt-1 text-sm text-black/40">
                          {person.person_email}
                        </p>
                      )}
                    </div>

                    {person.role && (
                      <span className="rounded-full border border-black/10 px-3 py-1 text-xs">
                        {person.role}
                      </span>
                    )}
                  </div>

                  {contactTypes.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
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

                  <details className="mt-5 border-t border-black/10 pt-4">
                    <summary className="cursor-pointer text-sm font-medium text-black/55 transition hover:text-black">
                      Administrér kontakt
                    </summary>

                    <form
                      action={updateOrganizationPerson}
                      className="mt-4 space-y-4"
                    >
                      <input
                        type="hidden"
                        name="relation_id"
                        value={person.id}
                      />

                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          name="role"
                          defaultValue={person.role ?? ""}
                          placeholder="Rolle"
                          aria-label="Rolle"
                          className="rounded-lg border border-black/10 bg-[#f8f8f4] px-3 py-2 text-sm"
                        />

                        <input
                          name="job_title"
                          defaultValue={person.job_title ?? ""}
                          placeholder="Jobtitel"
                          aria-label="Jobtitel"
                          className="rounded-lg border border-black/10 bg-[#f8f8f4] px-3 py-2 text-sm"
                        />
                      </div>

                      <fieldset>
                        <legend className="mb-3 text-sm font-medium">
                          Kontaktfunktioner
                        </legend>

                        <div className="flex flex-wrap gap-3">
                          <ContactCheckbox
                            name="is_primary_contact"
                            label="Primær kontakt"
                            defaultChecked={person.is_primary_contact}
                          />

                          <ContactCheckbox
                            name="is_billing_contact"
                            label="Fakturering"
                            defaultChecked={person.is_billing_contact}
                          />

                          <ContactCheckbox
                            name="is_contract_contact"
                            label="Kontrakt"
                            defaultChecked={person.is_contract_contact}
                          />

                          <ContactCheckbox
                            name="is_technical_contact"
                            label="Teknisk"
                            defaultChecked={person.is_technical_contact}
                          />

                          <ContactCheckbox
                            name="is_dpo_contact"
                            label="DPO"
                            defaultChecked={person.is_dpo_contact}
                          />
                        </div>
                      </fieldset>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          className="rounded-lg bg-[#202120] px-4 py-2 text-sm font-medium text-white"
                        >
                          Gem kontakt
                        </button>
                      </div>
                    </form>

                    <form
                      action={unlinkPersonFromOrganization}
                      className="mt-3"
                    >
                      <input
                        type="hidden"
                        name="relation_id"
                        value={person.id}
                      />

                      <button
                        type="submit"
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Fjern fra organisation
                      </button>
                    </form>
                  </details>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-sm text-black/45">
            Organisationen har endnu ingen kontaktpersoner.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-6">
        <div className="mb-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
            Kontaktpersoner
          </p>

          <h3 className="mt-2 text-xl font-semibold">
            Tilknyt person
          </h3>

          <p className="mt-1 text-sm text-black/50">
            Knyt en eksisterende CRM-person til organisationen og angiv
            personens funktion i kunderelationen.
          </p>
        </div>

        {availablePeople.length > 0 ? (
          <form
            action={linkPersonToOrganization}
            className="space-y-5"
          >
            <input
              type="hidden"
              name="organization_id"
              value={id}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <select
                name="person_id"
                required
                defaultValue=""
                className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none focus:border-black/30"
              >
                <option value="" disabled>
                  Vælg CRM-person
                </option>

                {availablePeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.first_name} {person.last_name ?? ""}
                    {person.primary_email
                      ? ` — ${person.primary_email}`
                      : ""}
                  </option>
                ))}
              </select>

              <input
                name="role"
                placeholder="Rolle, fx beslutningstager"
                className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none focus:border-black/30"
              />

              <input
                name="job_title"
                placeholder="Jobtitel, fx socialchef"
                className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm outline-none focus:border-black/30"
              />
            </div>

            <fieldset>
              <legend className="mb-3 text-sm font-medium">
                Kontaktfunktioner
              </legend>

              <div className="flex flex-wrap gap-3">
                <ContactCheckbox
                  name="is_primary_contact"
                  label="Primær kontakt"
                  defaultChecked={false}
                />

                <ContactCheckbox
                  name="is_billing_contact"
                  label="Fakturering"
                  defaultChecked={false}
                />

                <ContactCheckbox
                  name="is_contract_contact"
                  label="Kontrakt"
                  defaultChecked={false}
                />

                <ContactCheckbox
                  name="is_technical_contact"
                  label="Teknisk"
                  defaultChecked={false}
                />

                <ContactCheckbox
                  name="is_dpo_contact"
                  label="DPO"
                  defaultChecked={false}
                />
              </div>
            </fieldset>

            <button
              type="submit"
              className="rounded-xl bg-[#202120] px-5 py-3 text-sm font-medium text-white transition hover:bg-black"
            >
              Tilknyt kontaktperson
            </button>
          </form>
        ) : (
          <div className="rounded-xl bg-[#f8f8f4] p-4 text-sm text-black/50">
            Alle eksisterende CRM-personer er allerede tilknyttet
            organisationen. Opret først en ny person under Kunder →
            Personer, hvis der skal tilføjes flere.
          </div>
        )}
      </section>
    </div>
  );
}

function ContactCheckbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4"
      />

      {label}
    </label>
  );
}
