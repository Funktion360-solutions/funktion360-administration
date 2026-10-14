"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/require-staff";

export async function createProductPlanPrice(formData: FormData) {
  await requireStaff();

  const supabase = await createClient();

  const productPlanId = String(formData.get("product_plan_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const priceType = String(formData.get("price_type") ?? "").trim();
  const currency = String(formData.get("currency") ?? "DKK").trim();
  const billingInterval =
    String(formData.get("billing_interval") ?? "").trim() || null;
  const unitName =
    String(formData.get("unit_name") ?? "").trim() || null;
  const stripePriceId =
    String(formData.get("stripe_price_id") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "active").trim();

  const amountValue = String(formData.get("amount") ?? "").trim();

  let amount: number | null = null;

  if (amountValue !== "") {
    amount = Number(amountValue);

    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("Prisen skal være et gyldigt positivt tal.");
    }
  }

  if (!productPlanId) {
    throw new Error("Produktplan mangler.");
  }

  if (!name) {
    throw new Error("Prisnavn mangler.");
  }

  const { error } = await supabase.rpc(
    "create_crm_product_plan_price",
    {
      price_product_plan_id: productPlanId,
      price_name: name,
      price_type_value: priceType,
      price_amount: amount,
      price_currency: currency,
      price_billing_interval: billingInterval,
      price_unit_name: unitName,
      price_stripe_price_id: stripePriceId,
      price_status: status,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/products/plans");
}

export async function updateProductPlanPrice(formData: FormData) {
  await requireStaff();

  const supabase = await createClient();

  const priceId = String(formData.get("price_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const priceType = String(formData.get("price_type") ?? "").trim();
  const currency = String(formData.get("currency") ?? "DKK").trim();

  const billingInterval =
    String(formData.get("billing_interval") ?? "").trim() || null;

  const unitName =
    String(formData.get("unit_name") ?? "").trim() || null;

  const stripePriceId =
    String(formData.get("stripe_price_id") ?? "").trim() || null;

  const status =
    String(formData.get("status") ?? "active").trim();

  const amountValue =
    String(formData.get("amount") ?? "").trim();

  const validFromValue =
    String(formData.get("valid_from") ?? "").trim();

  const validUntilValue =
    String(formData.get("valid_until") ?? "").trim();

  let amount: number | null = null;

  if (amountValue !== "") {
    amount = Number(amountValue);

    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(
        "Prisen skal være et gyldigt positivt tal."
      );
    }
  }

  if (!priceId) {
    throw new Error("Pris mangler.");
  }

  if (!name) {
    throw new Error("Prisnavn mangler.");
  }

  if (!priceType) {
    throw new Error("Pristype mangler.");
  }

  if (!validFromValue) {
    throw new Error("Gyldig fra-dato mangler.");
  }

  const validFrom = new Date(validFromValue);

  if (Number.isNaN(validFrom.getTime())) {
    throw new Error("Gyldig fra-dato er ugyldig.");
  }

  let validUntil: string | null = null;

  if (validUntilValue) {
    const parsedValidUntil = new Date(validUntilValue);

    if (Number.isNaN(parsedValidUntil.getTime())) {
      throw new Error("Gyldig til-dato er ugyldig.");
    }

    if (parsedValidUntil <= validFrom) {
      throw new Error(
        "Gyldig til skal ligge efter gyldig fra."
      );
    }

    validUntil = parsedValidUntil.toISOString();
  }

  const { error } = await supabase.rpc(
    "update_crm_product_plan_price",
    {
      target_price_id: priceId,
      price_name: name,
      price_type_value: priceType,
      price_amount: amount,
      price_currency: currency,
      price_billing_interval: billingInterval,
      price_unit_name: unitName,
      price_stripe_price_id: stripePriceId,
      price_valid_from: validFrom.toISOString(),
      price_valid_until: validUntil,
      price_status: status,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/products/plans");
}

export async function deleteProductPlanPrice(formData: FormData) {
  await requireStaff();

  const supabase = await createClient();

  const priceId =
    String(formData.get("price_id") ?? "").trim();

  if (!priceId) {
    throw new Error("Pris mangler.");
  }

  const { error } = await supabase.rpc(
    "delete_crm_product_plan_price",
    {
      target_price_id: priceId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/products/plans");
}
