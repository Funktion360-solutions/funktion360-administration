"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

const PRICING_MODES = [
  "catalog",
  "discount_percentage",
  "discount_amount",
  "fixed_price",
  "custom",
] as const;

const BILLING_INTERVALS = [
  "month",
  "year",
  "one_time",
  "custom",
] as const;

const SOURCE_TYPES = [
  "manual",
  "quote",
  "contract",
  "migration",
] as const;

const STATUSES = [
  "draft",
  "active",
  "superseded",
  "expired",
  "cancelled",
] as const;

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const number = Number(text.replace(",", "."));

  if (!Number.isFinite(number)) {
    throw new Error("Ugyldigt tal.");
  }

  return number;
}

function revalidateCommercialPaths(organizationId: string) {
  revalidatePath("/");
  revalidatePath("/customers/organizations");
  revalidatePath(`/customers/organizations/${organizationId}`);
  revalidatePath("/contracts");
  revalidatePath("/subscriptions");
  revalidatePath("/billing");
}

export async function createCustomerCommercialTerm(
  organizationId: string,
  formData: FormData
) {
  await requireStaff();
  const supabase = await createClient();

  const customerEntitlementId = String(
    formData.get("customer_entitlement_id") ?? ""
  ).trim();

  const pricingMode = String(
    formData.get("pricing_mode") ?? ""
  ).trim();

  const billingInterval = String(
    formData.get("billing_interval") ?? ""
  ).trim();

  const currency = String(
    formData.get("currency") ?? "DKK"
  )
    .trim()
    .toUpperCase();

  const sourceType = String(
    formData.get("source_type") ?? "manual"
  ).trim();

  const status = String(
    formData.get("status") ?? "draft"
  ).trim();

  if (!customerEntitlementId) {
    throw new Error("Entitlement mangler.");
  }

  if (
    !PRICING_MODES.includes(
      pricingMode as (typeof PRICING_MODES)[number]
    )
  ) {
    throw new Error("Ugyldig prismodel.");
  }

  if (
    !BILLING_INTERVALS.includes(
      billingInterval as (typeof BILLING_INTERVALS)[number]
    )
  ) {
    throw new Error("Ugyldigt betalingsinterval.");
  }

  if (
    !SOURCE_TYPES.includes(
      sourceType as (typeof SOURCE_TYPES)[number]
    )
  ) {
    throw new Error("Ugyldig kilde.");
  }

  if (
    !STATUSES.includes(
      status as (typeof STATUSES)[number]
    )
  ) {
    throw new Error("Ugyldig status.");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Valuta skal være en ISO-kode på 3 bogstaver.");
  }

  const { error } = await supabase.rpc(
    "create_crm_customer_commercial_term",
    {
      target_customer_entitlement_id: customerEntitlementId,
      pricing_mode_value: pricingMode,
      billing_interval_value: billingInterval,
      currency_value: currency,
      discount_percentage_value: optionalNumber(
        formData.get("discount_percentage")
      ),
      discount_amount_value: optionalNumber(
        formData.get("discount_amount")
      ),
      fixed_amount_value: optionalNumber(
        formData.get("fixed_amount")
      ),
      custom_description_value: optionalText(
        formData.get("custom_description")
      ),
      source_type_value: sourceType,
      source_reference_value: optionalText(
        formData.get("source_reference")
      ),
      valid_from_value:
        optionalText(formData.get("valid_from")) ??
        new Date().toISOString(),
      valid_until_value: optionalText(
        formData.get("valid_until")
      ),
      status_value: status,
      internal_notes_value: optionalText(
        formData.get("internal_notes")
      ),
    }
  );

  if (error) {
    throw new Error(
      `Kunne ikke oprette kommercielt vilkår: ${error.message}`
    );
  }

  revalidateCommercialPaths(organizationId);
}

export async function updateCustomerCommercialTerm(
  organizationId: string,
  formData: FormData
) {
  await requireStaff();
  const supabase = await createClient();

  const termId = String(formData.get("term_id") ?? "").trim();
  const pricingMode = String(
    formData.get("pricing_mode") ?? ""
  ).trim();
  const billingInterval = String(
    formData.get("billing_interval") ?? ""
  ).trim();
  const currency = String(
    formData.get("currency") ?? "DKK"
  )
    .trim()
    .toUpperCase();
  const sourceType = String(
    formData.get("source_type") ?? "manual"
  ).trim();
  const status = String(
    formData.get("status") ?? "draft"
  ).trim();

  if (!termId) {
    throw new Error("Commercial term ID mangler.");
  }

  if (
    !PRICING_MODES.includes(
      pricingMode as (typeof PRICING_MODES)[number]
    ) ||
    !BILLING_INTERVALS.includes(
      billingInterval as (typeof BILLING_INTERVALS)[number]
    ) ||
    !SOURCE_TYPES.includes(
      sourceType as (typeof SOURCE_TYPES)[number]
    ) ||
    !STATUSES.includes(status as (typeof STATUSES)[number])
  ) {
    throw new Error("Ugyldige kommercielle vilkår.");
  }

  const { error } = await supabase.rpc(
    "update_crm_customer_commercial_term",
    {
      target_term_id: termId,
      pricing_mode_value: pricingMode,
      billing_interval_value: billingInterval,
      currency_value: currency,
      discount_percentage_value: optionalNumber(
        formData.get("discount_percentage")
      ),
      discount_amount_value: optionalNumber(
        formData.get("discount_amount")
      ),
      fixed_amount_value: optionalNumber(
        formData.get("fixed_amount")
      ),
      custom_description_value: optionalText(
        formData.get("custom_description")
      ),
      source_type_value: sourceType,
      source_reference_value: optionalText(
        formData.get("source_reference")
      ),
      valid_from_value:
        optionalText(formData.get("valid_from")) ??
        new Date().toISOString(),
      valid_until_value: optionalText(
        formData.get("valid_until")
      ),
      status_value: status,
      internal_notes_value: optionalText(
        formData.get("internal_notes")
      ),
    }
  );

  if (error) {
    throw new Error(
      `Kunne ikke opdatere kommercielt vilkår: ${error.message}`
    );
  }

  revalidateCommercialPaths(organizationId);
}

export async function closeCustomerCommercialTerm(
  organizationId: string,
  formData: FormData
) {
  await requireStaff();
  const supabase = await createClient();

  const termId = String(formData.get("term_id") ?? "").trim();
  const closingStatus = String(
    formData.get("closing_status") ?? "superseded"
  ).trim();

  if (!termId) {
    throw new Error("Commercial term ID mangler.");
  }

  if (
    !["superseded", "expired", "cancelled"].includes(
      closingStatus
    )
  ) {
    throw new Error("Ugyldig afslutningsstatus.");
  }

  const { error } = await supabase.rpc(
    "close_crm_customer_commercial_term",
    {
      target_term_id: termId,
      closing_status: closingStatus,
    }
  );

  if (error) {
    throw new Error(
      `Kunne ikke lukke kommercielt vilkår: ${error.message}`
    );
  }

  revalidateCommercialPaths(organizationId);
}
