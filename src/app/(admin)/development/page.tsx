import { ProductPlanPricesSection } from "@/components/product-plan-prices-section";
import { ProductPlansSection } from "@/components/product-plans-section";
import { ProductsSection } from "@/components/products-section";
import { OrganizationPeopleSection } from "@/components/organization-people-section";
import { OrganizationsSection } from "@/components/organizations-section";
import { createPerson, deletePerson, updatePerson } from "@/app/actions/people";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

type CrmPerson = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

export default async function Home() {
  const staff = await requireStaff();
  const supabase = await createClient();

  const { data: people, error } = await supabase.rpc(
    "list_crm_people"
  );

  if (error) {
    throw new Error(`People query failed: ${error.message}`);
  }

  return (
    <main>
      <h1>Funktion360 Administration</h1>

      <p>
        Logget ind som <strong>{staff.display_name}</strong>
      </p>

      <p>{staff.email}</p>

      <p>
        Rolle: <strong>{staff.roles.join(", ")}</strong>
      </p>

      <hr />

      <h2>Opret person</h2>

      <form action={createPerson}>
        <div>
          <label htmlFor="first_name">Fornavn</label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            required
          />
        </div>

        <div>
          <label htmlFor="last_name">Efternavn</label>
          <input
            id="last_name"
            name="last_name"
            type="text"
          />
        </div>

        <div>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
          />
        </div>

        <div>
          <label htmlFor="phone">Telefon</label>
          <input
            id="phone"
            name="phone"
            type="tel"
          />
        </div>

        <button type="submit">
          Opret person
        </button>
      </form>

      <hr />

      <h2>CRM-personer</h2>

      <p>
        CRM-personer: <strong>{people?.length ?? 0}</strong>
      </p>

      {people && people.length > 0 ? (
        <ul>
          {people.map((person: CrmPerson) => (
            <li key={person.id}>
              <form action={updatePerson}>
                <input
                  type="hidden"
                  name="id"
                  value={person.id}
                />

                <input
                  name="first_name"
                  defaultValue={person.first_name ?? ""}
                  required
                  aria-label="Fornavn"
                />

                <input
                  name="last_name"
                  defaultValue={person.last_name ?? ""}
                  aria-label="Efternavn"
                />

                <input
                  name="email"
                  type="email"
                  defaultValue={person.primary_email ?? ""}
                  aria-label="E-mail"
                />

                <input
                  name="phone"
                  type="tel"
                  defaultValue={person.phone ?? ""}
                  aria-label="Telefon"
                />

                <button type="submit">
                  Gem ændringer
                </button>
              </form>

              <form action={deletePerson}>
                <input
                  type="hidden"
                  name="id"
                  value={person.id}
                />

                <button type="submit">
                  Slet person
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p>Ingen personer oprettet endnu.</p>
      )}
      <OrganizationsSection />
      <OrganizationPeopleSection />
      <ProductsSection />
      <ProductPlansSection />
      <ProductPlanPricesSection />
    </main>
  );
}
