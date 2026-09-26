"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

export async function createPerson(formData: FormData) {
  await requireStaff();

  const firstName = String(formData.get("first_name") ?? "");
  const lastName = String(formData.get("last_name") ?? "");
  const email = String(formData.get("email") ?? "");
  const phone = String(formData.get("phone") ?? "");

  const supabase = await createClient();

  const { error } = await supabase.rpc("create_crm_person", {
    person_first_name: firstName,
    person_last_name: lastName,
    person_email: email || null,
    person_phone: phone || null,
  });

  if (error) {
    throw new Error(`Kunne ikke oprette person: ${error.message}`);
  }

  revalidatePath("/");
}

export async function updatePerson(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const firstName = String(formData.get("first_name") ?? "");
  const lastName = String(formData.get("last_name") ?? "");
  const email = String(formData.get("email") ?? "");
  const phone = String(formData.get("phone") ?? "");

  if (!id) {
    throw new Error("Person-ID mangler.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("update_crm_person", {
    person_id: id,
    person_first_name: firstName,
    person_last_name: lastName || null,
    person_email: email || null,
    person_phone: phone || null,
  });

  if (error) {
    throw new Error(`Kunne ikke opdatere person: ${error.message}`);
  }

  revalidatePath("/");
}

export async function deletePerson(formData: FormData) {
  await requireStaff();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Person-ID mangler.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("delete_crm_person", {
    person_id: id,
  });

  if (error) {
    throw new Error(`Kunne ikke slette person: ${error.message}`);
  }

  revalidatePath("/");
}
