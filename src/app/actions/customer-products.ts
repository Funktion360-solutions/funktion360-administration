"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

const validStatuses = [
  "planned",
  "onboarding",
  "active",
  "suspended",
  "terminated",
] as const;

type CustomerProductStatus = (typeof validStatuses)[number];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getStatus(formData: FormData): CustomerProductStatus {
  const value = getString(formData, "status");

  if (!validStatuses.includes(value as CustomerProductStatus)) {
    throw new Error("Ugyldig produktstatus.");
  }

  return value as CustomerProductStatus;
}

function revalidateCustomerProductPages(organizationId: string) {
  revalidatePath("/");
  revalidatePath("/customers/organizations");
  revalidatePath(`/customers/organizations/${organizationId}`);
}

export async function createCustomerProduct(formData: FormData) {
  await requireStaff();

  const organizationId = getString(formData, "organization_id");
  const productId = getString(formData, "product_id");
  const status = getStatus(formData);
  const customerReference = getString(formData, "customer_reference");
  const internalNotes = getString(formData, "internal_notes");

  if (!organizationId) {
    throw new Error("Organisation mangler.");
  }

  if (!productId) {
    throw new Error("Produkt mangler.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("create_crm_customer_product", {
    target_organization_id: organizationId,
    target_product_id: productId,
    target_status: status,
    target_customer_reference: customerReference || null,
    target_internal_notes: internalNotes || null,
  });

  if (error) {
    throw new Error(`Kunne ikke tilknytte produkt: ${error.message}`);
  }

  revalidateCustomerProductPages(organizationId);
}

export async function updateCustomerProduct(formData: FormData) {
  await requireStaff();

  const id = getString(formData, "customer_product_id");
  const organizationId = getString(formData, "organization_id");
  const status = getStatus(formData);
  const customerReference = getString(formData, "customer_reference");
  const internalNotes = getString(formData, "internal_notes");

  if (!id) {
    throw new Error("Kundeprodukt mangler.");
  }

  if (!organizationId) {
    throw new Error("Organisation mangler.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("update_crm_customer_product", {
    target_id: id,
    target_status: status,
    target_customer_reference: customerReference || null,
    target_internal_notes: internalNotes || null,
  });

  if (error) {
    throw new Error(`Kunne ikke opdatere kundeprodukt: ${error.message}`);
  }

  revalidateCustomerProductPages(organizationId);
}

export async function deleteCustomerProduct(formData: FormData) {
  await requireStaff();

  const id = getString(formData, "customer_product_id");
  const organizationId = getString(formData, "organization_id");

  if (!id) {
    throw new Error("Kundeprodukt mangler.");
  }

  if (!organizationId) {
    throw new Error("Organisation mangler.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("delete_crm_customer_product", {
    target_id: id,
  });

  if (error) {
    throw new Error(`Kunne ikke fjerne kundeprodukt: ${error.message}`);
  }

  revalidateCustomerProductPages(organizationId);
}
