import { createClient } from "@/lib/supabase/server";
import {
  createProductPlanPrice,
  updateProductPlanPrice,
  deleteProductPlanPrice,
} from "@/app/actions/product-plan-prices";

type ProductPlan = {
  id: string;
  product_name: string;
  name: string;
  slug: string;
  status: string;
};

type ProductPlanPrice = {
  id: string;
  product_plan_id: string;
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
};

export async function ProductPlanPricesSection() {
  const supabase = await createClient();

  const [
    { data: plans, error: plansError },
    { data: prices, error: pricesError },
  ] = await Promise.all([
    supabase.rpc("list_crm_product_plans"),
    supabase.rpc("list_crm_product_plan_prices"),
  ]);

  if (plansError) {
    throw new Error(plansError.message);
  }

  if (pricesError) {
    throw new Error(pricesError.message);
  }

  const productPlans = (plans ?? []) as ProductPlan[];
  const productPlanPrices = (prices ?? []) as ProductPlanPrice[];

  const activePlans = productPlans.filter(
    (plan) => plan.status !== "inactive"
  );

  return (
    <section className="space-y-6 rounded-2xl border border-black/10 bg-white p-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-black/50">
          Product catalog
        </p>

        <h2 className="mt-2 text-2xl font-semibold">
          Planpriser
        </h2>

        <p className="mt-2 max-w-3xl text-sm text-black/60">
          Administrér grundpriser, brugerpriser, årsbetaling,
          implementeringspriser og andre priskomponenter.
        </p>
      </div>

      {activePlans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/20 p-5 text-sm text-black/60">
          Opret mindst én produktplan, før der kan tilføjes priser.
        </div>
      ) : (
        <form
          action={createProductPlanPrice}
          className="grid gap-4 rounded-xl bg-black/[0.025] p-5 md:grid-cols-2 xl:grid-cols-4"
        >
          <label className="space-y-2">
            <span className="text-sm font-medium">Produktplan</span>

            <select
              name="product_plan_id"
              required
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
            >
              <option value="">Vælg plan</option>

              {activePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.product_name} — {plan.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Prisnavn</span>

            <input
              name="name"
              required
              placeholder="Fx Grundpris måned"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Pristype</span>

            <select
              name="price_type"
              required
              defaultValue="base"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
            >
              <option value="base">Grundpris</option>
              <option value="per_user">Pr. bruger</option>
              <option value="usage">Forbrug</option>
              <option value="implementation">Implementering</option>
              <option value="addon">Tilvalg</option>
              <option value="custom">Individuel</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Beløb</span>

            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="799"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Valuta</span>

            <input
              name="currency"
              defaultValue="DKK"
              maxLength={3}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 uppercase"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Fakturering</span>

            <select
              name="billing_interval"
              defaultValue=""
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
            >
              <option value="">Ingen</option>
              <option value="month">Måned</option>
              <option value="year">År</option>
              <option value="one_time">Engangsbeløb</option>
              <option value="custom">Individuel</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Enhed</span>

            <input
              name="unit_name"
              placeholder="Fx bruger"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">Status</span>

            <select
              name="status"
              defaultValue="active"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
            >
              <option value="draft">Kladde</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </label>

          <label className="space-y-2 md:col-span-2 xl:col-span-3">
            <span className="text-sm font-medium">
              Stripe Price ID
            </span>

            <input
              name="stripe_price_id"
              placeholder="price_..."
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 font-mono text-sm"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-[#202120] px-4 py-2 font-medium text-white transition hover:opacity-85"
            >
              Opret pris
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {productPlanPrices.length === 0 ? (
          <p className="text-sm text-black/50">
            Der er endnu ikke oprettet planpriser.
          </p>
        ) : (
          productPlanPrices.map((price) => (
            <div
              key={price.id}
              className="space-y-4 rounded-xl border border-black/10 p-4"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-black/45">
                  {price.product_name} / {price.plan_name}
                </p>

                <p className="mt-1 font-medium">
                  {price.name}
                </p>
              </div>

              <form
                action={updateProductPlanPrice}
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
              >
                <input
                  type="hidden"
                  name="price_id"
                  value={price.id}
                />

                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Prisnavn
                  </span>
                  <input
                    name="name"
                    defaultValue={price.name}
                    required
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Pristype
                  </span>
                  <select
                    name="price_type"
                    defaultValue={price.price_type}
                    required
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
                  >
                    <option value="base">Grundpris</option>
                    <option value="per_user">Pr. bruger</option>
                    <option value="usage">Forbrug</option>
                    <option value="implementation">
                      Implementering
                    </option>
                    <option value="addon">Tilvalg</option>
                    <option value="custom">Individuel</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Beløb
                  </span>
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={price.amount ?? ""}
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Valuta
                  </span>
                  <input
                    name="currency"
                    defaultValue={price.currency}
                    maxLength={3}
                    required
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 uppercase"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Fakturering
                  </span>
                  <select
                    name="billing_interval"
                    defaultValue={price.billing_interval ?? ""}
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
                  >
                    <option value="">Ingen</option>
                    <option value="month">Måned</option>
                    <option value="year">År</option>
                    <option value="one_time">
                      Engangsbeløb
                    </option>
                    <option value="custom">Individuel</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Enhed
                  </span>
                  <input
                    name="unit_name"
                    defaultValue={price.unit_name ?? ""}
                    placeholder="Fx bruger"
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Gyldig fra
                  </span>
                  <input
                    name="valid_from"
                    type="datetime-local"
                    defaultValue={price.valid_from.slice(0, 16)}
                    required
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Gyldig til
                  </span>
                  <input
                    name="valid_until"
                    type="datetime-local"
                    defaultValue={
                      price.valid_until
                        ? price.valid_until.slice(0, 16)
                        : ""
                    }
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Status
                  </span>
                  <select
                    name="status"
                    defaultValue={price.status}
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2"
                  >
                    <option value="draft">Kladde</option>
                    <option value="active">Aktiv</option>
                    <option value="inactive">Inaktiv</option>
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2 xl:col-span-3">
                  <span className="text-sm font-medium">
                    Stripe Price ID
                  </span>
                  <input
                    name="stripe_price_id"
                    defaultValue={price.stripe_price_id ?? ""}
                    placeholder="price_..."
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 font-mono text-sm"
                  />
                </label>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-[#202120] px-4 py-2 font-medium text-white transition hover:opacity-85"
                  >
                    Gem ændringer
                  </button>
                </div>
              </form>

              {price.status !== "inactive" && (
                <form action={deleteProductPlanPrice}>
                  <input
                    type="hidden"
                    name="price_id"
                    value={price.id}
                  />

                  <button
                    type="submit"
                    className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5"
                  >
                    Deaktivér pris
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
