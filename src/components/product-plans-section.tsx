import {
  createProductPlan,
  updateProductPlan,
  deleteProductPlan,
} from "@/app/actions/product-plans";
import { createClient } from "@/lib/supabase/server";

type CrmProduct = {
  id: string;
  name: string;
  status: string;
};

type CrmProductPlan = {
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

export async function ProductPlansSection() {
  const supabase = await createClient();

  const [
    { data: products, error: productsError },
    { data: plans, error: plansError },
  ] = await Promise.all([
    supabase.rpc("list_crm_products"),
    supabase.rpc("list_crm_product_plans"),
  ]);

  if (productsError) {
    throw new Error(
      `Kunne ikke hente produkter: ${productsError.message}`
    );
  }

  if (plansError) {
    throw new Error(
      `Kunne ikke hente produktplaner: ${plansError.message}`
    );
  }

  const activeProducts = (
    (products ?? []) as CrmProduct[]
  ).filter((product) => product.status === "active");

  const productPlans = (plans ?? []) as CrmProductPlan[];

  return (
    <section>
      <hr />

      <h2>Produktplaner</h2>

      <p>
        Planer: <strong>{productPlans.length}</strong>
      </p>

      <h3>Opret produktplan</h3>

      {activeProducts.length > 0 ? (
        <form action={createProductPlan}>
          <div>
            <label htmlFor="plan_product">
              Produkt
            </label>

            <select
              id="plan_product"
              name="product_id"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Vælg produkt
              </option>

              {activeProducts.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="plan_name">Navn</label>
            <input
              id="plan_name"
              name="name"
              required
            />
          </div>

          <div>
            <label htmlFor="plan_slug">Slug</label>
            <input
              id="plan_slug"
              name="slug"
              placeholder="enterprise"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
          </div>

          <div>
            <label htmlFor="plan_description">
              Beskrivelse
            </label>
            <textarea
              id="plan_description"
              name="description"
            />
          </div>

          <div>
            <label htmlFor="plan_type">
              Plantype
            </label>

            <select
              id="plan_type"
              name="plan_type"
              defaultValue="subscription"
            >
              <option value="subscription">
                Abonnement
              </option>
              <option value="enterprise">
                Enterprise
              </option>
              <option value="white_label">
                White Label
              </option>
              <option value="one_time">
                Engangskøb
              </option>
              <option value="custom">
                Individuel
              </option>
            </select>
          </div>

          <div>
            <label htmlFor="billing_model">
              Betalingsmodel
            </label>

            <select
              id="billing_model"
              name="billing_model"
              defaultValue="fixed"
            >
              <option value="fixed">
                Fast pris
              </option>
              <option value="per_user">
                Pris pr. bruger
              </option>
              <option value="usage">
                Forbrugsbaseret
              </option>
              <option value="tiered">
                Trinbaseret
              </option>
              <option value="custom">
                Individuel
              </option>
            </select>
          </div>

          <div>
            <label htmlFor="plan_currency">
              Valuta
            </label>

            <input
              id="plan_currency"
              name="currency"
              defaultValue="DKK"
              maxLength={3}
              required
            />
          </div>

          <div>
            <label>
              <input
                type="checkbox"
                name="is_public"
              />
              Offentligt tilgængelig plan
            </label>
          </div>

          <div>
            <label>
              <input
                type="checkbox"
                name="requires_sales_contact"
              />
              Kræver kontakt til salg
            </label>
          </div>

          <div>
            <label htmlFor="plan_status">
              Status
            </label>

            <select
              id="plan_status"
              name="status"
              defaultValue="draft"
            >
              <option value="draft">
                Kladde
              </option>
              <option value="active">
                Aktiv
              </option>
              <option value="inactive">
                Inaktiv
              </option>
            </select>
          </div>

          <button type="submit">
            Opret produktplan
          </button>
        </form>
      ) : (
        <p>
          Der skal være mindst ét aktivt produkt,
          før en produktplan kan oprettes.
        </p>
      )}

      <h3>Eksisterende produktplaner</h3>

      {productPlans.length > 0 ? (
        <div>
          {productPlans.map((plan) => (
            <div key={plan.id}>
              <h4>
                {plan.product_name} → {plan.name}
              </h4>

              <form action={updateProductPlan}>
                <input
                  type="hidden"
                  name="plan_id"
                  value={plan.id}
                />

                <div>
                  <label htmlFor={`plan-name-${plan.id}`}>
                    Navn
                  </label>
                  <input
                    id={`plan-name-${plan.id}`}
                    name="name"
                    defaultValue={plan.name}
                    required
                  />
                </div>

                <div>
                  <label htmlFor={`plan-slug-${plan.id}`}>
                    Slug
                  </label>
                  <input
                    id={`plan-slug-${plan.id}`}
                    name="slug"
                    defaultValue={plan.slug}
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    required
                  />
                </div>

                <div>
                  <label htmlFor={`plan-description-${plan.id}`}>
                    Beskrivelse
                  </label>
                  <textarea
                    id={`plan-description-${plan.id}`}
                    name="description"
                    defaultValue={plan.description ?? ""}
                  />
                </div>

                <div>
                  <label htmlFor={`plan-type-${plan.id}`}>
                    Plantype
                  </label>
                  <select
                    id={`plan-type-${plan.id}`}
                    name="plan_type"
                    defaultValue={plan.plan_type}
                  >
                    <option value="subscription">
                      Abonnement
                    </option>
                    <option value="enterprise">
                      Enterprise
                    </option>
                    <option value="white_label">
                      White Label
                    </option>
                    <option value="one_time">
                      Engangskøb
                    </option>
                    <option value="custom">
                      Individuel
                    </option>
                  </select>
                </div>

                <div>
                  <label htmlFor={`billing-model-${plan.id}`}>
                    Betalingsmodel
                  </label>
                  <select
                    id={`billing-model-${plan.id}`}
                    name="billing_model"
                    defaultValue={plan.billing_model}
                  >
                    <option value="fixed">
                      Fast pris
                    </option>
                    <option value="per_user">
                      Pris pr. bruger
                    </option>
                    <option value="usage">
                      Forbrugsbaseret
                    </option>
                    <option value="tiered">
                      Trinbaseret
                    </option>
                    <option value="custom">
                      Individuel
                    </option>
                  </select>
                </div>

                <div>
                  <label htmlFor={`plan-currency-${plan.id}`}>
                    Valuta
                  </label>
                  <input
                    id={`plan-currency-${plan.id}`}
                    name="currency"
                    defaultValue={plan.currency}
                    maxLength={3}
                    required
                  />
                </div>

                <div>
                  <label>
                    <input
                      type="checkbox"
                      name="is_public"
                      defaultChecked={plan.is_public}
                    />
                    Offentligt tilgængelig plan
                  </label>
                </div>

                <div>
                  <label>
                    <input
                      type="checkbox"
                      name="requires_sales_contact"
                      defaultChecked={plan.requires_sales_contact}
                    />
                    Kræver kontakt til salg
                  </label>
                </div>

                <div>
                  <label htmlFor={`plan-status-${plan.id}`}>
                    Status
                  </label>
                  <select
                    id={`plan-status-${plan.id}`}
                    name="status"
                    defaultValue={plan.status}
                  >
                    <option value="draft">
                      Kladde
                    </option>
                    <option value="active">
                      Aktiv
                    </option>
                    <option value="inactive">
                      Inaktiv
                    </option>
                  </select>
                </div>

                <button type="submit">
                  Gem ændringer
                </button>
              </form>

              {plan.status !== "inactive" && (
                <form action={deleteProductPlan}>
                  <input
                    type="hidden"
                    name="plan_id"
                    value={plan.id}
                  />

                  <button type="submit">
                    Deaktivér plan
                  </button>
                </form>
              )}

              <hr />
            </div>
          ))}
        </div>
      ) : (
        <p>Ingen produktplaner oprettet endnu.</p>
      )}
    </section>
  );
}
