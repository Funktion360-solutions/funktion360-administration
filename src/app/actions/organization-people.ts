"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

export async function linkPersonToOrganization(formData: FormData) {
  await requireStaff();

  const organizationId = String(
    formData.get("organization_id") ?? ""
  );
  const personId = String(
    formData.get("person_id") ?? ""
  );
  const role = String(
    formData.get("role") ?? ""
  );
  const jobTitle = String(
    formData.get("job_title") ?? ""
  );

  if (!organizationId || !personId) {
    throw new Error(
      "Organisation og person skal vælges."
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "link_crm_person_to_organization",
    {
      organization_id: organizationId,
      person_id: personId,
      organization_role: role || null,
      organization_job_title: jobTitle || null,
      primary_contact:
        formData.get("is_primary_contact") === "on",
      billing_contact:
        formData.get("is_billing_contact") === "on",
      contract_contact:
        formData.get("is_contract_contact") === "on",
      technical_contact:
        formData.get("is_technical_contact") === "on",
      dpo_contact:
        formData.get("is_dpo_contact") === "on",
    }
  );

  if (error) {
    throw new Error(
      `Kunne ikke tilknytte personen: ${error.message}`
    );
  }

  revalidatePath("/");
  revalidatePath("/customers/organizations");
  revalidatePath("/customers/organizations/[id]", "page");
}

export async function updateOrganizationPerson(formData: FormData) {
  await requireStaff();

  const relationId = String(
    formData.get("relation_id") ?? ""
  );
  const role = String(
    formData.get("role") ?? ""
  );
  const jobTitle = String(
    formData.get("job_title") ?? ""
  );

  if (!relationId) {
    throw new Error("Relations-ID mangler.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "update_crm_organization_person",
    {
      relation_id: relationId,
      organization_role: role || null,
      organization_job_title: jobTitle || null,
      primary_contact:
        formData.get("is_primary_contact") === "on",
      billing_contact:
        formData.get("is_billing_contact") === "on",
      contract_contact:
        formData.get("is_contract_contact") === "on",
      technical_contact:
        formData.get("is_technical_contact") === "on",
      dpo_contact:
        formData.get("is_dpo_contact") === "on",
    }
  );

  if (error) {
    throw new Error(
      `Kunne ikke opdatere organisationstilknytningen: ${error.message}`
    );
  }

  revalidatePath("/");
  revalidatePath("/customers/organizations");
  revalidatePath("/customers/organizations/[id]", "page");
}

export async function unlinkPersonFromOrganization(formData: FormData) {
  await requireStaff();

  const relationId = String(
    formData.get("relation_id") ?? ""
  );

  if (!relationId) {
    throw new Error("Relations-ID mangler.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "unlink_crm_person_from_organization",
    {
      relation_id: relationId,
    }
  );

  if (error) {
    throw new Error(
      `Kunne ikke fjerne organisationstilknytningen: ${error.message}`
    );
  }

  revalidatePath("/");
  revalidatePath("/customers/organizations");
  revalidatePath("/customers/organizations/[id]", "page");
}
