import {
  createCustomerProduct,
  deleteCustomerProduct,
  updateCustomerProduct,
} from "@/app/actions/customer-products";
import {
  createCustomerEntitlement,
  deleteCustomerEntitlement,
  updateCustomerEntitlement,
} from "@/app/actions/customer-entitlements";
import {
  closeCustomerCommercialTerm,
  createCustomerCommercialTerm,
  updateCustomerCommercialTerm,
} from "@/app/actions/customer-commercial-terms";

import {
  calculateEntitlementPrice,
  formatMoney,
  getActivePlanPrices,
} from "@/lib/crm/commercial-pricing";

type ProductPlanPrice = {
  id: string;
  product_plan_id: string;
  product_id: string;
  product_name: string;
  plan_name: string;
  plan_slug: string;
  name: string;
  price_type: string;
  amount: number | null;
  currency: string;
  billing_interval: string | null;
  unit_name: string | null;
  stripe_price_id: string | null;
  valid_from: string;
  valid_until: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type ProductPlan = {
  id: string;
  product_id: string;
  product_name: string;
  name: string;
  slug: string;
  description: string | null;
  plan_type: string;
  billing_model: string;
  currency: string;
  is_public: boolean;
  requires_sales_contact: boolean;
  status: string;
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

type CustomerEntitlement = {
  id: string;
  customer_product_id: string;
  product_id: string;
  product_name: string;
  product_plan_id: string;
  plan_name: string;
  plan_slug: string;
  plan_type: string;
  billing_model: string;
  entitlement_type: string;
  status: string;
  seat_quantity: number | null;
  starts_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  renews_at: string | null;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  ended_at: string | null;
  external_subscription_id: string | null;
  external_customer_id: string | null;
  billing_provider: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

type CrmProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
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
  onboarding_started_at: string | null;
  activated_at: string | null;
  suspended_at: string | null;
  terminated_at: string | null;
  created_at: string;
  updated_at: string;
};

function EntitlementStatus({
  status,
}: {
  status: string;
}) {
  const labels: Record<string, string> = {
    pending: "Afventer",
    trial: "Prøveperiode",
    active: "Aktiv",
    paused: "Pauset",
    cancel_at_period_end: "Opsiges",
    cancelled: "Opsagt",
    expired: "Udløbet",
  };

  return (
    <span className="w-fit rounded-full bg-white px-3 py-1 font-mono text-[10px] uppercase tracking-wide">
      {labels[status] ?? status}
    </span>
  );
}

function CustomerProductStatus({
  status,
}: {
  status: string;
}) {
  const labels: Record<string, string> = {
    planned: "Planlagt",
    onboarding: "Onboarding",
    active: "Aktiv",
    suspended: "Suspenderet",
    terminated: "Opsagt",
  };

  return (
    <span className="w-fit rounded-full bg-[#cfff69]/60 px-3 py-1 font-mono text-[10px] uppercase tracking-wide">
      {labels[status] ?? status}
    </span>
  );
}

type CustomerProductsSectionProps = {
  organizationId: string;
  products: CrmProduct[];
  customerProducts: CustomerProduct[];
  productPlans: ProductPlan[];
  entitlements: CustomerEntitlement[];
  productPlanPrices: ProductPlanPrice[];
  commercialTerms: CustomerCommercialTerm[];
};

export function CustomerProductsSection({
  organizationId,
  products,
  customerProducts,
  productPlans,
  entitlements,
  productPlanPrices,
  commercialTerms,
}: CustomerProductsSectionProps) {
  const linkedProductIds = new Set(
    customerProducts.map((product) => product.product_id)
  );

  const availableProducts = products.filter(
    (product) =>
      product.status === "active" &&
      !linkedProductIds.has(product.id)
  );

  return (
    <section
      id="products"
      className="rounded-2xl border border-black/10 bg-white p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
            Kundeprodukter
          </p>
    
          <h2 className="mt-2 text-xl font-semibold">
            Produkter
          </h2>
    
          <p className="mt-1 max-w-2xl text-sm text-black/50">
            Produkter som organisationen anvender eller er ved at
            blive onboardet til.
          </p>
        </div>
    
        <div className="rounded-xl bg-[#f8f8f4] px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">
            Tilknyttet
          </div>
    
          <div className="mt-1 text-xl font-semibold">
            {customerProducts.length}
          </div>
        </div>
      </div>
    
      {customerProducts.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {customerProducts.map((customerProduct) => (
            <div
              key={customerProduct.id}
              className="rounded-xl border border-black/10 p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold">
                    {customerProduct.product_name}
                  </h3>
    
                  <p className="mt-1 font-mono text-xs text-black/40">
                    {customerProduct.product_slug}
                  </p>
                </div>
    
                <CustomerProductStatus
                  status={customerProduct.status}
                />
              </div>
    
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-[#f8f8f4] p-3">
                  <div className="text-xs text-black/40">
                    Kundereference
                  </div>
    
                  <div className="mt-1 text-sm font-medium">
                    {customerProduct.customer_reference || "—"}
                  </div>
                </div>
    
                <div className="rounded-lg bg-[#f8f8f4] p-3">
                  <div className="text-xs text-black/40">
                    Aktiveret
                  </div>
    
                  <div className="mt-1 text-sm font-medium">
                    {customerProduct.activated_at
                      ? new Intl.DateTimeFormat("da-DK", {
                          dateStyle: "medium",
                        }).format(
                          new Date(customerProduct.activated_at)
                        )
                      : "—"}
                  </div>
                </div>
              </div>
    
              {customerProduct.internal_notes && (
                <div className="mt-3 rounded-lg bg-[#f8f8f4] p-3 text-sm text-black/60">
                  {customerProduct.internal_notes}
                </div>
              )}
    
              <div className="mt-5 border-t border-black/10 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold">
                      Abonnementer & licenser
                    </h4>
    
                    <p className="mt-1 text-xs text-black/45">
                      Kommercielle rettigheder knyttet til dette produkt.
                    </p>
                  </div>
    
                  <span className="rounded-full bg-[#f8f8f4] px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-black/50">
                    {
                      entitlements.filter(
                        (item) =>
                          item.customer_product_id ===
                          customerProduct.id
                      ).length
                    }{" "}
                    stk.
                  </span>
                </div>
    
                {entitlements
                  .filter(
                    (item) =>
                      item.customer_product_id ===
                      customerProduct.id
                  )
                  .map((entitlement) => {
                    const monthlyPrice =
                      calculateEntitlementPrice(
                        productPlanPrices,
                        entitlement.product_plan_id,
                        entitlement.seat_quantity,
                        "month"
                      );
    
                    const yearlyPrice =
                      calculateEntitlementPrice(
                        productPlanPrices,
                        entitlement.product_plan_id,
                        entitlement.seat_quantity,
                        "year"
                      );
    
                    return (
                    <div
                      key={entitlement.id}
                      className="mt-4 rounded-xl bg-[#f8f8f4] p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="font-semibold">
                            {entitlement.plan_name}
                          </div>
    
                          <div className="mt-1 text-xs text-black/45">
                            {entitlement.seat_quantity !== null
                              ? `${entitlement.seat_quantity} brugere/licenser`
                              : "Ingen seat-begrænsning"}
                          </div>
                        </div>
    
                        <EntitlementStatus
                          status={entitlement.status}
                        />
                      </div>
    
                      <div className="mt-3 grid gap-2 text-xs text-black/55 md:grid-cols-3">
                        <div>
                          Type:{" "}
                          <strong>
                            {entitlement.entitlement_type}
                          </strong>
                        </div>
    
                        <div>
                          Fakturering:{" "}
                          <strong>
                            {entitlement.billing_provider || "—"}
                          </strong>
                        </div>
    
                        <div>
                          Start:{" "}
                          <strong>
                            {entitlement.starts_at
                              ? new Intl.DateTimeFormat("da-DK", {
                                  dateStyle: "medium",
                                }).format(
                                  new Date(entitlement.starts_at)
                                )
                              : "—"}
                          </strong>
                        </div>
                      </div>
    
                      {(monthlyPrice.hasPricing ||
                        yearlyPrice.hasPricing) && (
                        <div className="mt-4 grid gap-3 border-t border-black/10 pt-4 md:grid-cols-2">
                          {monthlyPrice.hasPricing && (
                            <div className="rounded-lg bg-white p-4">
                              <div className="text-[10px] font-medium uppercase tracking-wider text-black/40">
                                Månedlig værdi
                              </div>
    
                              <div className="mt-1 text-xl font-semibold">
                                {formatMoney(
                                  monthlyPrice.total,
                                  monthlyPrice.currency
                                )}
                              </div>
    
                              <div className="mt-2 text-xs text-black/45">
                                {formatMoney(
                                  monthlyPrice.basePrice,
                                  monthlyPrice.currency
                                )}{" "}
                                grundpris
                                {monthlyPrice.perUserPrice > 0 &&
                                  ` + ${monthlyPrice.seats} × ${formatMoney(
                                    monthlyPrice.perUserPrice,
                                    monthlyPrice.currency
                                  )}`}
                              </div>
                            </div>
                          )}
    
                          {yearlyPrice.hasPricing && (
                            <div className="rounded-lg bg-white p-4">
                              <div className="text-[10px] font-medium uppercase tracking-wider text-black/40">
                                Årlig værdi
                              </div>
    
                              <div className="mt-1 text-xl font-semibold">
                                {formatMoney(
                                  yearlyPrice.total,
                                  yearlyPrice.currency
                                )}
                              </div>
    
                              <div className="mt-2 text-xs text-black/45">
                                {formatMoney(
                                  yearlyPrice.basePrice,
                                  yearlyPrice.currency
                                )}{" "}
                                grundpris
                                {yearlyPrice.perUserPrice > 0 &&
                                  ` + ${yearlyPrice.seats} × ${formatMoney(
                                    yearlyPrice.perUserPrice,
                                    yearlyPrice.currency
                                  )}`}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
    
                      <div className="mt-4 border-t border-black/10 pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold">
                              Kommercielle vilkår
                            </div>
                            <div className="mt-1 text-xs text-black/45">
                              Kundens aftalte prisvilkår oven på katalogets listepris.
                            </div>
                          </div>
    
                          <span className="rounded-full bg-white px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-black/50">
                            {
                              commercialTerms.filter(
                                (term) =>
                                  term.customer_entitlement_id ===
                                  entitlement.id
                              ).length
                            }{" "}
                            vilkår
                          </span>
                        </div>
    
                        {commercialTerms
                          .filter(
                            (term) =>
                              term.customer_entitlement_id ===
                              entitlement.id
                          )
                          .map((term) => {
                            const catalogPrice =
                              term.billing_interval === "month"
                                ? monthlyPrice
                                : term.billing_interval === "year"
                                  ? yearlyPrice
                                  : null;
    
                            let agreedPrice: number | null = null;
    
                            if (catalogPrice?.hasPricing) {
                              if (term.pricing_mode === "catalog") {
                                agreedPrice = catalogPrice.total;
                              }
    
                              if (
                                term.pricing_mode ===
                                  "discount_percentage" &&
                                term.discount_percentage !== null
                              ) {
                                agreedPrice =
                                  catalogPrice.total *
                                  (1 -
                                    Number(
                                      term.discount_percentage
                                    ) /
                                      100);
                              }
    
                              if (
                                term.pricing_mode ===
                                  "discount_amount" &&
                                term.discount_amount !== null
                              ) {
                                agreedPrice = Math.max(
                                  0,
                                  catalogPrice.total -
                                    Number(term.discount_amount)
                                );
                              }
    
                              if (
                                term.pricing_mode === "fixed_price" &&
                                term.fixed_amount !== null
                              ) {
                                agreedPrice = Number(
                                  term.fixed_amount
                                );
                              }
                            }
    
                            return (
                              <div
                                key={term.id}
                                className="mt-3 rounded-lg bg-white p-4"
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-black/45">
                                      {term.billing_interval ===
                                      "month"
                                        ? "Månedligt vilkår"
                                        : term.billing_interval ===
                                            "year"
                                          ? "Årligt vilkår"
                                          : term.billing_interval}
                                    </div>
    
                                    <div className="mt-1 font-semibold">
                                      {term.pricing_mode ===
                                        "catalog" &&
                                        "Katalogpris"}
    
                                      {term.pricing_mode ===
                                        "discount_percentage" &&
                                        `${term.discount_percentage} % rabat`}
    
                                      {term.pricing_mode ===
                                        "discount_amount" &&
                                        `${formatMoney(
                                          Number(
                                            term.discount_amount ??
                                              0
                                          ),
                                          term.currency
                                        )} rabat`}
    
                                      {term.pricing_mode ===
                                        "fixed_price" &&
                                        `Fast pris ${formatMoney(
                                          Number(
                                            term.fixed_amount ?? 0
                                          ),
                                          term.currency
                                        )}`}
    
                                      {term.pricing_mode ===
                                        "custom" &&
                                        "Specialvilkår"}
                                    </div>
                                  </div>
    
                                  <span className="rounded-full bg-[#f8f8f4] px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-black/55">
                                    {term.status}
                                  </span>
                                </div>
    
                                {catalogPrice?.hasPricing &&
                                  agreedPrice !== null && (
                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                      <div>
                                        <div className="text-[10px] uppercase tracking-wide text-black/40">
                                          Listepris
                                        </div>
                                        <div className="mt-1 font-semibold">
                                          {formatMoney(
                                            catalogPrice.total,
                                            term.currency
                                          )}
                                        </div>
                                      </div>
    
                                      <div>
                                        <div className="text-[10px] uppercase tracking-wide text-black/40">
                                          Aftalt pris
                                        </div>
                                        <div className="mt-1 font-semibold">
                                          {formatMoney(
                                            agreedPrice,
                                            term.currency
                                          )}
                                        </div>
                                      </div>
    
                                      <div>
                                        <div className="text-[10px] uppercase tracking-wide text-black/40">
                                          Forskel
                                        </div>
                                        <div className="mt-1 font-semibold">
                                          {formatMoney(
                                            Math.max(
                                              0,
                                              catalogPrice.total -
                                                agreedPrice
                                            ),
                                            term.currency
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
    
                                {term.custom_description && (
                                  <div className="mt-3 text-xs text-black/55">
                                    {term.custom_description}
                                  </div>
                                )}
    
                                <div className="mt-3 text-[11px] text-black/40">
                                  Kilde: {term.source_type}
                                  {term.source_reference
                                    ? ` · ${term.source_reference}`
                                    : ""}
                                </div>
    
                                <details className="mt-4 border-t border-black/10 pt-3">
                                  <summary className="cursor-pointer text-xs font-medium text-black/55">
                                    Redigér vilkår
                                  </summary>
    
                                  <form
                                    action={updateCustomerCommercialTerm.bind(
                                      null,
                                      organizationId
                                    )}
                                    className="mt-4 space-y-3"
                                  >
                                    <input
                                      type="hidden"
                                      name="term_id"
                                      value={term.id}
                                    />
    
                                    <div className="grid gap-3 md:grid-cols-3">
                                      <label className="text-xs text-black/55">
                                        Prismodel
                                        <select
                                          name="pricing_mode"
                                          defaultValue={term.pricing_mode}
                                          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                                        >
                                          <option value="catalog">
                                            Katalogpris
                                          </option>
                                          <option value="discount_percentage">
                                            Procentrabat
                                          </option>
                                          <option value="discount_amount">
                                            Beløbsrabat
                                          </option>
                                          <option value="fixed_price">
                                            Fast pris
                                          </option>
                                          <option value="custom">
                                            Specialvilkår
                                          </option>
                                        </select>
                                      </label>
    
                                      <label className="text-xs text-black/55">
                                        Interval
                                        <select
                                          name="billing_interval"
                                          defaultValue={
                                            term.billing_interval
                                          }
                                          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                                        >
                                          <option value="month">
                                            Måned
                                          </option>
                                          <option value="year">
                                            År
                                          </option>
                                          <option value="one_time">
                                            Engangsbeløb
                                          </option>
                                          <option value="custom">
                                            Special
                                          </option>
                                        </select>
                                      </label>
    
                                      <label className="text-xs text-black/55">
                                        Status
                                        <select
                                          name="status"
                                          defaultValue={term.status}
                                          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                                        >
                                          <option value="draft">
                                            Kladde
                                          </option>
                                          <option value="active">
                                            Aktiv
                                          </option>
                                          <option value="superseded">
                                            Erstattet
                                          </option>
                                          <option value="expired">
                                            Udløbet
                                          </option>
                                          <option value="cancelled">
                                            Annulleret
                                          </option>
                                        </select>
                                      </label>
                                    </div>
    
                                    <div className="grid gap-3 md:grid-cols-3">
                                      <label className="text-xs text-black/55">
                                        Rabat %
                                        <input
                                          name="discount_percentage"
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.01"
                                          defaultValue={
                                            term.discount_percentage ??
                                            ""
                                          }
                                          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                                        />
                                      </label>
    
                                      <label className="text-xs text-black/55">
                                        Rabatbeløb
                                        <input
                                          name="discount_amount"
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          defaultValue={
                                            term.discount_amount ?? ""
                                          }
                                          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                                        />
                                      </label>
    
                                      <label className="text-xs text-black/55">
                                        Fast pris
                                        <input
                                          name="fixed_amount"
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          defaultValue={
                                            term.fixed_amount ?? ""
                                          }
                                          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                                        />
                                      </label>
                                    </div>
    
                                    <div className="grid gap-3 md:grid-cols-2">
                                      <label className="text-xs text-black/55">
                                        Valuta
                                        <input
                                          name="currency"
                                          defaultValue={term.currency}
                                          maxLength={3}
                                          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm uppercase"
                                        />
                                      </label>
    
                                      <label className="text-xs text-black/55">
                                        Kilde
                                        <select
                                          name="source_type"
                                          defaultValue={term.source_type}
                                          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                                        >
                                          <option value="manual">
                                            Manuel
                                          </option>
                                          <option value="quote">
                                            Tilbud
                                          </option>
                                          <option value="contract">
                                            Kontrakt
                                          </option>
                                          <option value="migration">
                                            Migreret
                                          </option>
                                        </select>
                                      </label>
                                    </div>
    
                                    <label className="block text-xs text-black/55">
                                      Kildereference
                                      <input
                                        name="source_reference"
                                        defaultValue={
                                          term.source_reference ?? ""
                                        }
                                        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                                      />
                                    </label>
    
                                    <label className="block text-xs text-black/55">
                                      Beskrivelse af specialvilkår
                                      <textarea
                                        name="custom_description"
                                        rows={2}
                                        defaultValue={
                                          term.custom_description ?? ""
                                        }
                                        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                                      />
                                    </label>
    
                                    <label className="block text-xs text-black/55">
                                      Interne noter
                                      <textarea
                                        name="internal_notes"
                                        rows={2}
                                        defaultValue={
                                          term.internal_notes ?? ""
                                        }
                                        className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                                      />
                                    </label>
    
                                    <input
                                      type="hidden"
                                      name="valid_from"
                                      value={term.valid_from}
                                    />
    
                                    {term.valid_until && (
                                      <input
                                        type="hidden"
                                        name="valid_until"
                                        value={term.valid_until}
                                      />
                                    )}
    
                                    <button
                                      type="submit"
                                      className="rounded-lg bg-[#202120] px-4 py-2 text-xs font-semibold text-white"
                                    >
                                      Gem ændringer
                                    </button>
                                  </form>
                                </details>
    
                                {![
                                  "superseded",
                                  "expired",
                                  "cancelled",
                                ].includes(term.status) && (
                                  <details className="mt-3 border-t border-black/10 pt-3">
                                    <summary className="cursor-pointer text-xs font-medium text-black/45">
                                      Luk vilkår
                                    </summary>
    
                                    <form
                                      action={closeCustomerCommercialTerm.bind(
                                        null,
                                        organizationId
                                      )}
                                      className="mt-3 flex flex-col gap-3 md:flex-row md:items-end"
                                    >
                                      <input
                                        type="hidden"
                                        name="term_id"
                                        value={term.id}
                                      />
    
                                      <label className="flex-1 text-xs text-black/55">
                                        Afslut som
                                        <select
                                          name="closing_status"
                                          defaultValue="superseded"
                                          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                                        >
                                          <option value="superseded">
                                            Erstattet
                                          </option>
                                          <option value="expired">
                                            Udløbet
                                          </option>
                                          <option value="cancelled">
                                            Annulleret
                                          </option>
                                        </select>
                                      </label>
    
                                      <button
                                        type="submit"
                                        className="rounded-lg border border-black/15 px-4 py-2 text-xs font-semibold text-black/65"
                                      >
                                        Luk vilkår
                                      </button>
                                    </form>
                                  </details>
                                )}
                              </div>
                            );
                          })}
    
                        <details className="mt-3 rounded-lg bg-white p-4">
                          <summary className="cursor-pointer text-xs font-medium text-black/60">
                            Tilføj kommercielt vilkår
                          </summary>
    
                          <form
                            action={createCustomerCommercialTerm.bind(
                              null,
                              organizationId
                            )}
                            className="mt-4 space-y-3"
                          >
                            <input
                              type="hidden"
                              name="customer_entitlement_id"
                              value={entitlement.id}
                            />
    
                            <div className="grid gap-3 md:grid-cols-3">
                              <label className="text-xs text-black/55">
                                Prismodel
                                <select
                                  name="pricing_mode"
                                  defaultValue="catalog"
                                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                                >
                                  <option value="catalog">
                                    Katalogpris
                                  </option>
                                  <option value="discount_percentage">
                                    Procentrabat
                                  </option>
                                  <option value="discount_amount">
                                    Beløbsrabat
                                  </option>
                                  <option value="fixed_price">
                                    Fast pris
                                  </option>
                                  <option value="custom">
                                    Specialvilkår
                                  </option>
                                </select>
                              </label>
    
                              <label className="text-xs text-black/55">
                                Interval
                                <select
                                  name="billing_interval"
                                  defaultValue="month"
                                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                                >
                                  <option value="month">
                                    Måned
                                  </option>
                                  <option value="year">
                                    År
                                  </option>
                                  <option value="one_time">
                                    Engangsbeløb
                                  </option>
                                  <option value="custom">
                                    Special
                                  </option>
                                </select>
                              </label>
    
                              <label className="text-xs text-black/55">
                                Status
                                <select
                                  name="status"
                                  defaultValue="draft"
                                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                                >
                                  <option value="draft">
                                    Kladde
                                  </option>
                                  <option value="active">
                                    Aktiv
                                  </option>
                                </select>
                              </label>
                            </div>
    
                            <div className="grid gap-3 md:grid-cols-3">
                              <label className="text-xs text-black/55">
                                Rabat %
                                <input
                                  name="discount_percentage"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                                />
                              </label>
    
                              <label className="text-xs text-black/55">
                                Rabatbeløb
                                <input
                                  name="discount_amount"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                                />
                              </label>
    
                              <label className="text-xs text-black/55">
                                Fast pris
                                <input
                                  name="fixed_amount"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                                />
                              </label>
                            </div>
    
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="text-xs text-black/55">
                                Valuta
                                <input
                                  name="currency"
                                  defaultValue="DKK"
                                  maxLength={3}
                                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm uppercase"
                                />
                              </label>
    
                              <label className="text-xs text-black/55">
                                Kilde
                                <select
                                  name="source_type"
                                  defaultValue="manual"
                                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                                >
                                  <option value="manual">
                                    Manuel
                                  </option>
                                  <option value="quote">
                                    Tilbud
                                  </option>
                                  <option value="contract">
                                    Kontrakt
                                  </option>
                                  <option value="migration">
                                    Migreret
                                  </option>
                                </select>
                              </label>
                            </div>
    
                            <label className="block text-xs text-black/55">
                              Kildereference
                              <input
                                name="source_reference"
                                placeholder="Fx TILBUD-2026-001"
                                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                              />
                            </label>
    
                            <label className="block text-xs text-black/55">
                              Beskrivelse af specialvilkår
                              <textarea
                                name="custom_description"
                                rows={2}
                                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                              />
                            </label>
    
                            <label className="block text-xs text-black/55">
                              Interne noter
                              <textarea
                                name="internal_notes"
                                rows={2}
                                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                              />
                            </label>
    
                            <button
                              type="submit"
                              className="rounded-lg bg-[#202120] px-4 py-2 text-xs font-semibold text-white"
                            >
                              Opret vilkår
                            </button>
                          </form>
                        </details>
                      </div>
    
                      <details className="mt-4 border-t border-black/10 pt-3">
                        <summary className="cursor-pointer text-xs font-medium text-black/55">
                          Administrér abonnement/licens
                        </summary>
    
                        <form
                          action={updateCustomerEntitlement}
                          className="mt-4 space-y-3"
                        >
                          <input
                            type="hidden"
                            name="organization_id"
                            value={organizationId}
                          />
    
                          <input
                            type="hidden"
                            name="entitlement_id"
                            value={entitlement.id}
                          />
    
                          <div className="grid gap-3 md:grid-cols-3">
                            <select
                              name="status"
                              defaultValue={entitlement.status}
                              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                            >
                              <option value="pending">
                                Afventer
                              </option>
                              <option value="trial">
                                Prøveperiode
                              </option>
                              <option value="active">
                                Aktiv
                              </option>
                              <option value="paused">
                                Pauset
                              </option>
                              <option value="cancel_at_period_end">
                                Opsiges ved periodens udløb
                              </option>
                              <option value="cancelled">
                                Opsagt
                              </option>
                              <option value="expired">
                                Udløbet
                              </option>
                            </select>
    
                            <input
                              type="number"
                              min="0"
                              max="1000000"
                              name="seat_quantity"
                              defaultValue={
                                entitlement.seat_quantity ?? ""
                              }
                              placeholder="Antal brugere"
                              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                            />
    
                            <select
                              name="billing_provider"
                              defaultValue={
                                entitlement.billing_provider ?? ""
                              }
                              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                            >
                              <option value="">
                                Ingen
                              </option>
                              <option value="stripe">
                                Stripe
                              </option>
                              <option value="manual">
                                Manuel
                              </option>
                              <option value="invoice">
                                Faktura
                              </option>
                              <option value="ean">
                                EAN
                              </option>
                              <option value="other">
                                Anden
                              </option>
                            </select>
                          </div>
    
                          <div className="grid gap-3 md:grid-cols-2">
                            <input
                              name="external_customer_id"
                              defaultValue={
                                entitlement.external_customer_id ??
                                ""
                              }
                              placeholder="Eksternt kunde-ID"
                              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                            />
    
                            <input
                              name="external_subscription_id"
                              defaultValue={
                                entitlement.external_subscription_id ??
                                ""
                              }
                              placeholder="Eksternt abonnements-ID"
                              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                            />
                          </div>
    
                          <textarea
                            name="internal_notes"
                            defaultValue={
                              entitlement.internal_notes ?? ""
                            }
                            rows={2}
                            placeholder="Interne noter"
                            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                          />
    
                          <button
                            type="submit"
                            className="rounded-lg bg-[#202120] px-4 py-2 text-sm font-medium text-white"
                          >
                            Gem abonnement/licens
                          </button>
                        </form>
    
                        <form
                          action={deleteCustomerEntitlement}
                          className="mt-3"
                        >
                          <input
                            type="hidden"
                            name="organization_id"
                            value={organizationId}
                          />
    
                          <input
                            type="hidden"
                            name="entitlement_id"
                            value={entitlement.id}
                          />
    
                          <button
                            type="submit"
                            className="text-xs font-medium text-red-700"
                          >
                            Fjern abonnement/licens
                          </button>
                        </form>
                      </details>
                    </div>
                    );
                  })}
    
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    + Tilføj abonnement/licens
                  </summary>
    
                  <form
                    action={createCustomerEntitlement}
                    className="mt-4 space-y-3 rounded-xl border border-black/10 p-4"
                  >
                    <input
                      type="hidden"
                      name="organization_id"
                      value={organizationId}
                    />
    
                    <input
                      type="hidden"
                      name="customer_product_id"
                      value={customerProduct.id}
                    />
    
                    <div className="grid gap-3 md:grid-cols-2">
                      <select
                        name="product_plan_id"
                        required
                        defaultValue=""
                        className="rounded-lg border border-black/10 bg-[#f8f8f4] px-3 py-2 text-sm"
                      >
                        <option value="" disabled>
                          Vælg plan
                        </option>
    
                        {productPlans
                          .filter(
                            (plan) =>
                              plan.product_id ===
                                customerProduct.product_id &&
                              plan.status === "active"
                          )
                          .map((plan) => (
                            <option
                              key={plan.id}
                              value={plan.id}
                            >
                              {plan.name}
                            </option>
                          ))}
                      </select>
    
                      <select
                        name="entitlement_type"
                        defaultValue="subscription"
                        className="rounded-lg border border-black/10 bg-[#f8f8f4] px-3 py-2 text-sm"
                      >
                        <option value="subscription">
                          Abonnement
                        </option>
                        <option value="license">
                          Licens
                        </option>
                        <option value="enterprise">
                          Enterprise
                        </option>
                        <option value="white_label">
                          White Label
                        </option>
                        <option value="custom">
                          Specialaftale
                        </option>
                      </select>
                    </div>
    
                    <div className="grid gap-3 md:grid-cols-3">
                      <select
                        name="status"
                        defaultValue="pending"
                        className="rounded-lg border border-black/10 bg-[#f8f8f4] px-3 py-2 text-sm"
                      >
                        <option value="pending">
                          Afventer
                        </option>
                        <option value="trial">
                          Prøveperiode
                        </option>
                        <option value="active">
                          Aktiv
                        </option>
                        <option value="paused">
                          Pauset
                        </option>
                      </select>
    
                      <input
                        type="number"
                        min="0"
                        max="1000000"
                        name="seat_quantity"
                        placeholder="Antal brugere"
                        className="rounded-lg border border-black/10 bg-[#f8f8f4] px-3 py-2 text-sm"
                      />
    
                      <select
                        name="billing_provider"
                        defaultValue=""
                        className="rounded-lg border border-black/10 bg-[#f8f8f4] px-3 py-2 text-sm"
                      >
                        <option value="">
                          Ingen betalingsudbyder
                        </option>
                        <option value="stripe">
                          Stripe
                        </option>
                        <option value="manual">
                          Manuel
                        </option>
                        <option value="invoice">
                          Faktura
                        </option>
                        <option value="ean">
                          EAN
                        </option>
                        <option value="other">
                          Anden
                        </option>
                      </select>
                    </div>
    
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        name="external_customer_id"
                        placeholder="Eksternt kunde-ID (valgfri)"
                        className="rounded-lg border border-black/10 bg-[#f8f8f4] px-3 py-2 text-sm"
                      />
    
                      <input
                        name="external_subscription_id"
                        placeholder="Eksternt abonnements-ID (valgfri)"
                        className="rounded-lg border border-black/10 bg-[#f8f8f4] px-3 py-2 text-sm"
                      />
                    </div>
    
                    <textarea
                      name="internal_notes"
                      rows={2}
                      placeholder="Interne noter"
                      className="w-full rounded-lg border border-black/10 bg-[#f8f8f4] px-3 py-2 text-sm"
                    />
    
                    <button
                      type="submit"
                      className="rounded-lg bg-[#202120] px-4 py-2 text-sm font-medium text-white"
                    >
                      Opret abonnement/licens
                    </button>
                  </form>
                </details>
              </div>
    
              <details className="mt-5 border-t border-black/10 pt-4">
                <summary className="cursor-pointer text-sm font-medium text-black/55 transition hover:text-black">
                  Administrér produkt
                </summary>
    
                <form
                  action={updateCustomerProduct}
                  className="mt-4 space-y-4"
                >
                  <input
                    type="hidden"
                    name="customer_product_id"
                    value={customerProduct.id}
                  />
    
                  <input
                    type="hidden"
                    name="organization_id"
                    value={organizationId}
                  />
    
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      name="status"
                      defaultValue={customerProduct.status}
                      className="rounded-lg border border-black/10 bg-[#f8f8f4] px-3 py-2 text-sm"
                    >
                      <option value="planned">Planlagt</option>
                      <option value="onboarding">Onboarding</option>
                      <option value="active">Aktiv</option>
                      <option value="suspended">Suspenderet</option>
                      <option value="terminated">Opsagt</option>
                    </select>
    
                    <input
                      name="customer_reference"
                      defaultValue={
                        customerProduct.customer_reference ?? ""
                      }
                      placeholder="Kundereference"
                      className="rounded-lg border border-black/10 bg-[#f8f8f4] px-3 py-2 text-sm"
                    />
                  </div>
    
                  <textarea
                    name="internal_notes"
                    defaultValue={
                      customerProduct.internal_notes ?? ""
                    }
                    placeholder="Interne noter"
                    rows={3}
                    className="w-full rounded-lg border border-black/10 bg-[#f8f8f4] px-3 py-2 text-sm"
                  />
    
                  <button
                    type="submit"
                    className="rounded-lg bg-[#202120] px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
                  >
                    Gem produkt
                  </button>
                </form>
    
                <form
                  action={deleteCustomerProduct}
                  className="mt-3"
                >
                  <input
                    type="hidden"
                    name="customer_product_id"
                    value={customerProduct.id}
                  />
    
                  <input
                    type="hidden"
                    name="organization_id"
                    value={organizationId}
                  />
    
                  <button
                    type="submit"
                    className="text-xs font-medium text-red-700 transition hover:text-red-900"
                  >
                    Fjern produkt fra organisation
                  </button>
                </form>
              </details>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl bg-[#f8f8f4] p-4 text-sm text-black/50">
          Organisationen har endnu ingen tilknyttede produkter.
        </div>
      )}
    
      {availableProducts.length > 0 && (
        <form
          action={createCustomerProduct}
          className="mt-6 border-t border-black/10 pt-6"
        >
          <h3 className="text-sm font-semibold">
            Tilknyt produkt
          </h3>
    
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <select
              name="product_id"
              required
              defaultValue=""
              className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm"
            >
              <option value="" disabled>
                Vælg produkt
              </option>
    
              {availableProducts.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.name}
                </option>
              ))}
            </select>
    
            <select
              name="status"
              defaultValue="planned"
              className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm"
            >
              <option value="planned">Planlagt</option>
              <option value="onboarding">Onboarding</option>
              <option value="active">Aktiv</option>
              <option value="suspended">Suspenderet</option>
              <option value="terminated">Opsagt</option>
            </select>
    
            <input
              name="customer_reference"
              placeholder="Kundereference (valgfri)"
              className="rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm"
            />
          </div>
    
          <textarea
            name="internal_notes"
            placeholder="Interne noter (valgfri)"
            rows={3}
            className="mt-3 w-full rounded-xl border border-black/10 bg-[#f8f8f4] px-4 py-3 text-sm"
          />
    
          <input
            type="hidden"
            name="organization_id"
            value={organizationId}
          />
    
          <button
            type="submit"
            className="mt-4 rounded-xl bg-[#202120] px-5 py-3 text-sm font-medium text-white transition hover:bg-black"
          >
            Tilknyt produkt
          </button>
        </form>
      )}
    </section>
  );
}
