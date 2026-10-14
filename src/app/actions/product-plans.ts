"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/require-staff";

export async function createProductPlan(formData: FormData) {
  await requireStaff();

  const supabase = await createClient();

  const productId = String(formData.get("product_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description =
    String(formData.get("description") ?? "").trim() || null;

  const planType =
    String(formData.get("plan_type") ?? "subscription").trim();

  const billingModel =
    String(formData.get("billing_model") ?? "fixed").trim();

  const currency =
    String(formData.get("currency") ?? "DKK").trim();

  const isPublic = formData.get("is_public") === "on";

  const requiresSalesContact =
    formData.get("requires_sales_contact") === "on";

  const status =
    String(formData.get("status") ?? "draft").trim();

  if (!productId) {
    throw new Error("Produkt mangler.");
  }

  if (!name) {
    throw new Error("Plannavn mangler.");
  }

  if (!slug) {
    throw new Error("Slug mangler.");
  }

  const { error } = await supabase.rpc(
    "create_crm_product_plan",
    {
      plan_product_id: productId,
      plan_name: name,
      plan_slug: slug,
      plan_description: description,
      plan_type_value: planType,
      billing_model_value: billingModel,
      plan_currency: currency,
      plan_is_public: isPublic,
      plan_requires_sales_contact: requiresSalesContact,
      plan_status: status,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/products/plans");
}

export async function updateProductPlan(formData: FormData) {
  await requireStaff();

  const supabase = await createClient();

  const planId = String(formData.get("plan_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description =
    String(formData.get("description") ?? "").trim() || null;

  const planType =
    String(formData.get("plan_type") ?? "subscription").trim();

  const billingModel =
    String(formData.get("billing_model") ?? "fixed").trim();

  const currency =
    String(formData.get("currency") ?? "DKK").trim();

  const isPublic = formData.get("is_public") === "on";

  const requiresSalesContact =
    formData.get("requires_sales_contact") === "on";

  const status =
    String(formData.get("status") ?? "draft").trim();

  if (!planId) {
    throw new Error("Produktplan mangler.");
  }

  if (!name) {
    throw new Error("Plannavn mangler.");
  }

  if (!slug) {
    throw new Error("Slug mangler.");
  }

  const { error } = await supabase.rpc(
    "update_crm_product_plan",
    {
      target_plan_id: planId,
      plan_name: name,
      plan_slug: slug,
      plan_description: description,
      plan_type_value: planType,
      billing_model_value: billingModel,
      plan_currency: currency,
      plan_is_public: isPublic,
      plan_requires_sales_contact: requiresSalesContact,
      plan_status: status,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/products/plans");
}

export async function deleteProductPlan(formData: FormData) {
  await requireStaff();

  const supabase = await createClient();

  const planId = String(formData.get("plan_id") ?? "").trim();

  if (!planId) {
    throw new Error("Produktplan mangler.");
  }

  const { error } = await supabase.rpc(
    "delete_crm_product_plan",
    {
      target_plan_id: planId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/products/plans");
}
