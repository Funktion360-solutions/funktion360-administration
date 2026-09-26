import { CustomerProductsSection } from "@/components/customer-360/customer-products-section";
import { createClient } from "@/lib/supabase/server";

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

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: productsData, error: productsError },
    { data: customerProductsData, error: customerProductsError },
    { data: productPlansData, error: productPlansError },
    { data: entitlementsData, error: entitlementsError },
    { data: productPlanPricesData, error: productPlanPricesError },
    { data: commercialTermsData, error: commercialTermsError },
  ] = await Promise.all([
    supabase.rpc("list_crm_products"),
    supabase.rpc("list_crm_customer_products", {
      target_organization_id: id,
    }),
    supabase.rpc("list_crm_product_plans"),
    supabase.rpc("list_crm_customer_entitlements", {
      target_organization_id: id,
    }),
    supabase.rpc("list_crm_product_plan_prices"),
    supabase.rpc("list_crm_customer_commercial_terms", {
      target_organization_id: id,
    }),
  ]);

  if (productsError) {
    throw new Error(
      `Kunne ikke hente produktkatalog: ${productsError.message}`
    );
  }

  if (customerProductsError) {
    throw new Error(
      `Kunne ikke hente kundeprodukter: ${customerProductsError.message}`
    );
  }

  if (productPlansError) {
    throw new Error(
      `Kunne ikke hente produktplaner: ${productPlansError.message}`
    );
  }

  if (entitlementsError) {
    throw new Error(
      `Kunne ikke hente abonnementer/licenser: ${entitlementsError.message}`
    );
  }

  if (productPlanPricesError) {
    throw new Error(
      `Kunne ikke hente produktpriser: ${productPlanPricesError.message}`
    );
  }

  if (commercialTermsError) {
    throw new Error(
      `Kunne ikke hente kommercielle vilkår: ${commercialTermsError.message}`
    );
  }

  const products = (productsData ?? []) as CrmProduct[];
  const customerProducts =
    (customerProductsData ?? []) as CustomerProduct[];
  const productPlans = (productPlansData ?? []) as ProductPlan[];
  const entitlements =
    (entitlementsData ?? []) as CustomerEntitlement[];
  const productPlanPrices =
    (productPlanPricesData ?? []) as ProductPlanPrice[];
  const commercialTerms =
    (commercialTermsData ?? []) as CustomerCommercialTerm[];

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-black/40">
          Kundeområde
        </div>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Produkter & licenser
        </h2>

        <p className="mt-2 max-w-2xl text-sm text-black/50">
          Administrér kundens produkter, abonnementer, licenser,
          katalogpriser og kommercielle vilkår.
        </p>
      </div>

      <CustomerProductsSection
        organizationId={id}
        products={products}
        customerProducts={customerProducts}
        productPlans={productPlans}
        entitlements={entitlements}
        productPlanPrices={productPlanPrices}
        commercialTerms={commercialTerms}
      />
    </div>
  );
}
