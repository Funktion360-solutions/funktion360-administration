"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

export async function createOrganization(formData: FormData) {
  await requireStaff();

  const name = String(formData.get("name") ?? "");
  const organizationType = String(
    formData.get("organization_type") ?? "company"
  );
  const cvr = String(formData.get("cvr_number") ?? "");
  const email = String(formData.get("email") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const website = String(formData.get("website") ?? "");
  const status = String(formData.get("status") ?? "prospect");

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "create_crm_organization",
    {
      organization_name: name,
      organization_type_value: organizationType,
      organization_cvr: cvr || null,
      organization_email: email || null,
      organization_phone: phone || null,
      organization_website: website || null,
      organization_status: status,
    }
  );

  if (error) {
    throw new Error(
      `Kunne ikke oprette organisation: ${error.message}`
    );
  }

  revalidatePath("/");
  revalidatePath("/customers/organizations");
  revalidatePath("/customers/organizations/[id]", "page");
}

export async function updateOrganization(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const organizationType = String(
    formData.get("organization_type") ?? "company"
  );
  const cvr = String(formData.get("cvr_number") ?? "");
  const email = String(formData.get("email") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const website = String(formData.get("website") ?? "");
  const status = String(formData.get("status") ?? "prospect");

  if (!id) {
    throw new Error("Organisations-ID mangler.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "update_crm_organization",
    {
      organization_id: id,
      organization_name: name,
      organization_type_value: organizationType,
      organization_cvr: cvr || null,
      organization_email: email || null,
      organization_phone: phone || null,
      organization_website: website || null,
      organization_status: status,
    }
  );

  if (error) {
    throw new Error(
      `Kunne ikke opdatere organisation: ${error.message}`
    );
  }

  revalidatePath("/");
  revalidatePath("/customers/organizations");
  revalidatePath("/customers/organizations/[id]", "page");
}

export async function deleteOrganization(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Organisations-ID mangler.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "delete_crm_organization",
    {
      organization_id: id,
    }
  );

  if (error) {
    throw new Error(
      `Kunne ikke deaktivere organisation: ${error.message}`
    );
  }

  revalidatePath("/");
  revalidatePath("/customers/organizations");
  revalidatePath("/customers/organizations/[id]", "page");
}
