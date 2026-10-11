"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-permission";
import { requireStaffMfa } from "@/lib/auth/require-staff-mfa";
import { createClient } from "@/lib/supabase/server";
export async function manageInbox(form: FormData) {
  await requirePermission("support.manage");
  await requireStaffMfa();
  const id = String(form.get("id") ?? ""),
    operation = String(form.get("operation") ?? "");
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !["attach", "create", "archive"].includes(operation)
  )
    redirect("/support/inbox");
  const db = await createClient();
  const { data, error } = await db.rpc("crm_support_inbox", {
    operation,
    payload: {
      id,
      case_id: form.get("case_id"),
      person_id: form.get("person_id"),
    },
  });
  if (error) redirect(`/support/inbox/${id}?notice=error`);
  revalidatePath("/support/inbox");
  revalidatePath("/support/tickets");
  if (data?.case_id) {
    revalidatePath(`/support/tickets/${data.case_id}`);
    redirect(`/support/tickets/${data.case_id}`);
  }
  redirect("/support/inbox");
}
