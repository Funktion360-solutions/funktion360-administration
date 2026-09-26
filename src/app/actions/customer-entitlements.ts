"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

const validTypes = [
  "subscription",
  "license",
  "enterprise",
  "white_label",
  "custom",
] as const;

const validStatuses = [
  "pending",
  "trial",
  "active",
  "paused",
  "cancel_at_period_end",
  "cancelled",
  "expired",
] as const;

const validBillingProviders = [
  "stripe",
  "manual",
  "invoice",
  "ean",
  "other",
] as const;

type EntitlementType = (typeof validTypes)[number];
type EntitlementStatus = (typeof validStatuses)[number];
type BillingProvider = (typeof validBillingProviders)[number];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getType(formData: FormData): EntitlementType {
  const value = getString(formData, "entitlement_type");

  if (!validTypes.includes(value as EntitlementType)) {
    throw new Error("Ugyldig abonnement-/licenstype.");
  }

  return value as EntitlementType;
}

function getStatus(formData: FormData): EntitlementStatus {
  const value = getString(formData, "status");

  if (!validStatuses.includes(value as EntitlementStatus)) {
    throw new Error("Ugyldig abonnement-/licensstatus.");
  }

  return value as EntitlementStatus;
}

function getBillingProvider(
  formData: FormData
): BillingProvider | null {
  const value = getString(formData, "billing_provider");

  if (!value) {
    return null;
  }

  if (!validBillingProviders.includes(value as BillingProvider)) {
    throw new Error("Ugyldig betalingsudbyder.");
  }

  return value as BillingProvider;
}

function getSeatQuantity(formData: FormData): number | null {
  const value = getString(formData, "seat_quantity");

  if (!value) {
    return null;
  }

  const quantity = Number(value);

  if (
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    quantity > 1000000
  ) {
    throw new Error("Ugyldigt antal brugere/licenser.");
  }

  return quantity;
}

function revalidateEntitlementPages(organizationId: string) {
  revalidatePath("/");
  revalidatePath("/customers/organizations");
  revalidatePath(`/customers/organizations/${organizationId}`);
  revalidatePath("/subscriptions");
}

export async function createCustomerEntitlement(
  formData: FormData
) {
  await requireStaff();

  const organizationId = getString(formData, "organization_id");
  const customerProductId = getString(
    formData,
    "customer_product_id"
  );
  const productPlanId = getString(formData, "product_plan_id");

  const entitlementType = getType(formData);
  const status = getStatus(formData);
  const seatQuantity = getSeatQuantity(formData);
  const billingProvider = getBillingProvider(formData);

  const externalSubscriptionId = getString(
    formData,
    "external_subscription_id"
  );
  const externalCustomerId = getString(
    formData,
    "external_customer_id"
  );
  const internalNotes = getString(formData, "internal_notes");

  if (!organizationId) {
    throw new Error("Organisation mangler.");
  }

  if (!customerProductId) {
    throw new Error("Kundeprodukt mangler.");
  }

  if (!productPlanId) {
    throw new Error("Produktplan mangler.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "create_crm_customer_entitlement",
    {
      target_customer_product_id: customerProductId,
      target_product_plan_id: productPlanId,
      target_entitlement_type: entitlementType,
      target_status: status,
      target_seat_quantity: seatQuantity,
      target_billing_provider: billingProvider,
      target_external_subscription_id:
        externalSubscriptionId || null,
      target_external_customer_id:
        externalCustomerId || null,
      target_internal_notes: internalNotes || null,
    }
  );

  if (error) {
    throw new Error(
      `Kunne ikke oprette abonnement/licens: ${error.message}`
    );
  }

  revalidateEntitlementPages(organizationId);
}

export async function updateCustomerEntitlement(
  formData: FormData
) {
  await requireStaff();

  const organizationId = getString(formData, "organization_id");
  const entitlementId = getString(formData, "entitlement_id");

  const status = getStatus(formData);
  const seatQuantity = getSeatQuantity(formData);
  const billingProvider = getBillingProvider(formData);

  const externalSubscriptionId = getString(
    formData,
    "external_subscription_id"
  );
  const externalCustomerId = getString(
    formData,
    "external_customer_id"
  );
  const internalNotes = getString(formData, "internal_notes");

  if (!organizationId) {
    throw new Error("Organisation mangler.");
  }

  if (!entitlementId) {
    throw new Error("Abonnement/licens mangler.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "update_crm_customer_entitlement",
    {
      target_id: entitlementId,
      target_status: status,
      target_seat_quantity: seatQuantity,
      target_billing_provider: billingProvider,
      target_external_subscription_id:
        externalSubscriptionId || null,
      target_external_customer_id:
        externalCustomerId || null,
      target_internal_notes: internalNotes || null,
    }
  );

  if (error) {
    throw new Error(
      `Kunne ikke opdatere abonnement/licens: ${error.message}`
    );
  }

  revalidateEntitlementPages(organizationId);
}

export async function deleteCustomerEntitlement(
  formData: FormData
) {
  await requireStaff();

  const organizationId = getString(formData, "organization_id");
  const entitlementId = getString(formData, "entitlement_id");

  if (!organizationId) {
    throw new Error("Organisation mangler.");
  }

  if (!entitlementId) {
    throw new Error("Abonnement/licens mangler.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "delete_crm_customer_entitlement",
    {
      target_id: entitlementId,
    }
  );

  if (error) {
    throw new Error(
      `Kunne ikke fjerne abonnement/licens: ${error.message}`
    );
  }

  revalidateEntitlementPages(organizationId);
}
