import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  calculateAgreedPrice,
  calculateEntitlementPrice,
  formatMoney,
} from "@/lib/crm/commercial-pricing";

type Organization = {
  id: string;
  name: string;
  organization_type: string;
  cvr_number: string | null;
  primary_email: string | null;
  phone: string | null;
  website: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type CustomerProduct = {
  id: string;
  organization_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  status: string;
  customer_reference: string | null;
  internal_notes: string | null;
};

type CustomerCommercialTerm = {
  id: string;
  customer_entitlement_id: string;
  customer_product_id: string;
  organization_id: string;
  product_id: string;
  product_name: string;
  product_plan_id: string;
  plan_name: string;
  pricing_mode: string;
  billing_interval: string;
  currency: string;
  discount_percentage: number | null;
  discount_amount: number | null;
  fixed_amount: number | null;
  custom_description: string | null;
  source_type: string;
  source_reference: string | null;
  valid_from: string;
  valid_until: string | null;
  status: string;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

type ProductPlanPrice = {
  id: string;
  product_plan_id: string;
  product_id: string;
  product_name: string;
  plan_name: string;
  price_type: string;
  amount: number | null;
  currency: string;
  billing_interval: string | null;
  unit_name: string | null;
  valid_from: string;
  valid_until: string | null;
  status: string;
};

type CustomerEntitlement = {
  id: string;
  customer_product_id: string;
  product_id: string;
  product_name: string;
  product_plan_id: string;
  product_plan_name: string;
  entitlement_type: string;
  status: string;
  seat_quantity: number | null;
  billing_provider: string | null;
  starts_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  cancelled_at: string | null;
  external_subscription_id: string | null;
  external_customer_id: string | null;
  internal_notes: string | null;
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

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: organizationData, error: organizationError },
    { data: peopleData, error: peopleError },
    { data: customerProductsData, error: customerProductsError },
    { data: entitlementsData, error: entitlementsError },
    { data: commercialTermsData, error: commercialTermsError },
    { data: productPlanPricesData, error: productPlanPricesError },
  ] = await Promise.all([
    supabase.rpc("get_crm_organization", {
      target_organization_id: id,
    }),
    supabase.rpc("get_crm_organization_people", {
      target_organization_id: id,
    }),
    supabase.rpc("list_crm_customer_products", {
      target_organization_id: id,
    }),
    supabase.rpc("list_crm_customer_entitlements", {
      target_organization_id: id,
    }),
    supabase.rpc("list_crm_customer_commercial_terms", {
      target_organization_id: id,
    }),
    supabase.rpc("list_crm_product_plan_prices"),
  ]);

  if (organizationError) {
    throw new Error(
      `Kunne ikke hente organisation: ${organizationError.message}`
    );
  }

  if (peopleError) {
    throw new Error(
      `Kunne ikke hente kontaktpersoner: ${peopleError.message}`
    );
  }

  if (customerProductsError) {
    throw new Error(
      `Kunne ikke hente kundeprodukter: ${customerProductsError.message}`
    );
  }

  if (entitlementsError) {
    throw new Error(
      `Kunne ikke hente licenser og abonnementer: ${entitlementsError.message}`
    );
  }

  if (commercialTermsError) {
    throw new Error(
      `Kunne ikke hente kommercielle vilkår: ${commercialTermsError.message}`
    );
  }

  if (productPlanPricesError) {
    throw new Error(
      `Kunne ikke hente produktpriser: ${productPlanPricesError.message}`
    );
  }








  const organization = (
    organizationData as Organization[] | null
  )?.[0];

  if (!organization) {
    notFound();
  }

  const people = (peopleData ?? []) as OrganizationPerson[];
  const customerProducts = (
    customerProductsData ?? []
  ) as CustomerProduct[];

  const entitlements = (
    entitlementsData ?? []
  ) as CustomerEntitlement[];

  const commercialTerms = (
    commercialTermsData ?? []
  ) as CustomerCommercialTerm[];

  const productPlanPrices = (
    productPlanPricesData ?? []
  ) as ProductPlanPrice[];

  const activeCommercialTerms = commercialTerms.filter(
    (term) =>
      term.status === "active" &&
      !term.valid_until
  );

  const activePlanPrices = productPlanPrices.filter(
    (price) =>
      price.status === "active" &&
      !price.valid_until
  );


  const activeCustomerProducts = customerProducts.filter(
    (product) => product.status === "active"
  );

  const activeEntitlements = entitlements.filter(
    (entitlement) =>
      entitlement.status === "active" ||
      entitlement.status === "trial"
  );


const monthlyCommercialValues = activeEntitlements
    .map((entitlement) => {
      const catalogPrice = calculateEntitlementPrice(
        productPlanPrices,
        entitlement.product_plan_id,
        entitlement.seat_quantity,
        "month"
      );

      if (!catalogPrice.hasPricing) {
        return null;
      }

      const activeTerm = activeCommercialTerms.find(
        (term) =>
          term.customer_entitlement_id === entitlement.id &&
          term.billing_interval === "month"
      );

      const agreedPrice = activeTerm
        ? calculateAgreedPrice(
            catalogPrice.total,
            activeTerm
          )
        : null;

      return {
        entitlement,
        catalogPrice: catalogPrice.total,
        agreedPrice,
        currency: activeTerm?.currency ?? catalogPrice.currency,
        hasCommercialTerm: Boolean(activeTerm),
      };
    })
    .filter(
      (
        value
      ): value is NonNullable<typeof value> => value !== null
    );

  const monthlyCatalogValue = monthlyCommercialValues.reduce(
    (sum, value) => sum + value.catalogPrice,
    0
  );

  const monthlyAgreedValue = monthlyCommercialValues.reduce(
    (sum, value) =>
      sum +
      (value.agreedPrice !== null
        ? value.agreedPrice
        : value.catalogPrice),
    0
  );

  const monthlyCurrency =
    monthlyCommercialValues[0]?.currency ?? "DKK";

  const hasMonthlyCommercialTerms =
    monthlyCommercialValues.some(
      (value) => value.hasCommercialTerm
    );
  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
          Kundeoverblik
        </p>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Overblik
        </h2>

        <p className="mt-2 max-w-2xl text-sm text-black/50">
          Centrale oplysninger, kontaktpunkter og status for kunden.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <div className="mb-6">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
              Stamdata
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Organisation
            </h2>
          </div>

          <dl className="divide-y divide-black/10">
            <InfoRow
              label="Type"
              value={
                organizationTypeLabels[
                  organization.organization_type
                ] ?? organization.organization_type
              }
            />

            <InfoRow
              label="CVR"
              value={organization.cvr_number}
            />

            <InfoRow
              label="E-mail"
              value={organization.primary_email}
            />

            <InfoRow
              label="Telefon"
              value={organization.phone}
            />

            <InfoRow
              label="Website"
              value={organization.website}
            />

            <InfoRow
              label="Status"
              value={
                statusLabels[organization.status] ??
                organization.status
              }
            />
          </dl>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white">
          <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
                Relationer
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Kontaktpersoner
              </h2>
            </div>

            <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/50">
              {people.length}
            </span>
          </div>

          {people.length > 0 ? (
            <div className="divide-y divide-black/10">
              {people.slice(0, 4).map((person) => {
                const contactTypes = [
                  person.is_primary_contact && "Primær",
                  person.is_billing_contact && "Fakturering",
                  person.is_contract_contact && "Kontrakt",
                  person.is_technical_contact && "Teknisk",
                  person.is_dpo_contact && "DPO",
                ].filter(Boolean) as string[];

                return (
                  <div
                    key={person.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {person.person_name}
                      </p>

                      <p className="mt-1 text-xs text-black/45">
                        {person.job_title ||
                          person.person_email ||
                          person.role ||
                          "Kontaktperson"}
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
                );
              })}

              <div className="px-6 py-4">
                <a
                  href={`/customers/organizations/${organization.id}/contacts`}
                  className="text-sm font-medium underline decoration-black/20 underline-offset-4 hover:decoration-black"
                >
                  Administrér kontakter →
                </a>
              </div>
            </div>
          ) : (
            <div className="px-6 py-5">
              <p className="text-sm text-black/45">
                Ingen kontaktpersoner er tilknyttet endnu.
              </p>

              <a
                href={`/customers/organizations/${organization.id}/contacts`}
                className="mt-3 inline-block text-sm font-medium underline decoration-black/20 underline-offset-4 hover:decoration-black"
              >
                Tilknyt kontaktperson →
              </a>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/35">
                Produkter & licenser
              </p>

              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {activeCustomerProducts.length}
              </p>

              <p className="mt-1 text-xs text-black/45">
                aktive produkter
              </p>
            </div>

            <div className="rounded-xl bg-[#cfff69]/50 px-3 py-2 text-center">
              <p className="text-lg font-semibold">
                {activeEntitlements.length}
              </p>

              <p className="font-mono text-[9px] uppercase tracking-wide text-black/50">
                licenser
              </p>
            </div>
          </div>

          {activeEntitlements.length > 0 ? (
            <div className="mt-5 space-y-2 border-t border-black/10 pt-4">
              {activeEntitlements.slice(0, 3).map((entitlement) => (
                <div
                  key={entitlement.id}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {entitlement.product_name}
                    </p>

                    <p className="mt-0.5 truncate text-black/40">
                      {entitlement.product_plan_name}
                      {entitlement.seat_quantity
                        ? ` · ${entitlement.seat_quantity} seats`
                        : ""}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-[#cfff69]/60 px-2 py-1 font-mono text-[9px] uppercase tracking-wide">
                    {entitlement.status === "trial"
                      ? "Prøve"
                      : "Aktiv"}
                  </span>
                </div>
              ))}

              {activeEntitlements.length > 3 && (
                <p className="pt-1 text-[11px] text-black/35">
                  + {activeEntitlements.length - 3} flere
                </p>
              )}
            </div>
          ) : (
            <p className="mt-5 border-t border-black/10 pt-4 text-xs text-black/40">
              Ingen aktive licenser eller abonnementer.
            </p>
          )}

          <a
            href={`/customers/organizations/${organization.id}/products`}
            className="mt-5 inline-block text-xs font-medium underline decoration-black/20 underline-offset-4 hover:decoration-black"
          >
            Se produkter & licenser →
          </a>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/35">
                Kommerciel værdi
              </p>

              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {monthlyCommercialValues.length > 0
                  ? formatMoney(
                      monthlyAgreedValue,
                      monthlyCurrency
                    )
                  : "—"}
              </p>

              <p className="mt-1 text-xs text-black/45">
                pr. måned
              </p>
            </div>

            <span className="rounded-full border border-black/10 px-3 py-1 font-mono text-[9px] uppercase tracking-wide text-black/45">
              {hasMonthlyCommercialTerms
                ? "Aftalt"
                : monthlyCommercialValues.length > 0
                  ? "Katalog"
                  : "Uafklaret"}
            </span>
          </div>

          {monthlyCommercialValues.length > 0 ? (
            <div className="mt-5 border-t border-black/10 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wide text-black/35">
                    Katalogværdi
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatMoney(
                      monthlyCatalogValue,
                      monthlyCurrency
                    )}
                  </p>
                </div>

                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wide text-black/35">
                    Aftalt værdi
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatMoney(
                      monthlyAgreedValue,
                      monthlyCurrency
                    )}
                  </p>
                </div>
              </div>

              {monthlyCatalogValue !== monthlyAgreedValue && (
                <p className="mt-3 text-xs text-black/45">
                  Forskel{" "}
                  {formatMoney(
                    monthlyCatalogValue -
                      monthlyAgreedValue,
                    monthlyCurrency
                  )}{" "}
                  pr. måned
                </p>
              )}
            </div>
          ) : (
            <p className="mt-5 border-t border-black/10 pt-4 text-xs text-black/45">
              Ingen månedlig pris er registreret.
            </p>
          )}

          <a
            href={`/customers/organizations/${organization.id}/products`}
            className="mt-5 inline-block text-xs font-medium underline decoration-black/20 underline-offset-4 hover:decoration-black"
          >
            Se produkter & licenser →
          </a>
        </section>

        <PlaceholderCard
          title="Support"
          description="Tickets, SLA og tekniske hændelser."
        />

        <PlaceholderCard
          title="Aktivitet"
          description="Samlet historik og kundehændelser."
        />
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 py-4 first:pt-0 last:pb-0">
      <dt className="text-sm text-black/40">
        {label}
      </dt>

      <dd className="break-words text-sm font-medium">
        {value || "—"}
      </dd>
    </div>
  );
}

function PlaceholderCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-black/15 bg-white/50 p-5">
      <h3 className="text-sm font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-black/45">
        {description}
      </p>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-wide text-black/30">
        Kommer senere
      </p>
    </section>
  );
}
