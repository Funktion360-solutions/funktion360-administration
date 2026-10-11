"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-permission";
import { requireStaffMfa } from "@/lib/auth/require-staff-mfa";
import { createClient } from "@/lib/supabase/server";
import { mailConfigured, sendSupportEmail } from "@/lib/support/resend";
import type { OutboxEmail } from "@/lib/support/types";

async function authorize(permission: string) {
  await requirePermission(permission);
  await requireStaffMfa();
  return createClient();
}
const value = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
const uuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function createSupportCase(form: FormData) {
  const db = await authorize("support.manage");
  const person = value(form, "person_id");
  const subject = value(form, "subject");
  if (!uuid(person) || !subject || subject.length > 200)
    redirect("/support/tickets?notice=invalid");
  const { data, error } = await db.rpc("create_crm_support_case", {
    support_subject: subject,
    support_description: value(form, "description").slice(0, 20000),
    target_person_id: person,
    target_organization_id: null,
    support_channel: "email",
    support_priority: value(form, "priority") || "normal",
  });
  if (error || !data) redirect("/support/tickets?notice=create-error");
  revalidatePath("/support/tickets");
  redirect(`/support/tickets/${data}`);
}

export async function addSupportNote(form: FormData) {
  const db = await authorize("support.internal_notes");
  const id = value(form, "case_id");
  if (!uuid(id)) redirect("/support/tickets");
  const body = value(form, "body");
  if (!body || body.length > 20000)
    redirect(`/support/tickets/${id}?notice=invalid`);
  const { error } = await db.rpc("add_crm_support_internal_note", {
    target_support_case_id: id,
    note_body: body,
  });
  revalidatePath(`/support/tickets/${id}`);
  redirect(
    `/support/tickets/${id}?notice=${error ? "note-error" : "note-saved"}`,
  );
}

export async function sendMail(form: FormData) {
  const db = await authorize("support.respond");
  const id = value(form, "case_id"),
    requestId = value(form, "request_id");
  if (!uuid(id) || !uuid(requestId)) redirect("/support/tickets");
  const path = `/support/tickets/${id}`;
  if (!mailConfigured()) redirect(`${path}?notice=config`);
  const retry = value(form, "retry") === "yes";
  const recipient = value(form, "recipient"),
    subject = value(form, "subject"),
    body = value(form, "body");
  if (
    !retry &&
    (!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(recipient) ||
      recipient.length > 254 ||
      !subject ||
      subject.length > 200 ||
      /[\r\n]/.test(subject) ||
      !body ||
      body.length > 20000)
  )
    redirect(`${path}?notice=invalid`);
  const { data, error } = await db.rpc("crm_support_email", {
    operation: retry ? "retry" : "prepare",
    payload: {
      id: requestId,
      case_id: id,
      recipient,
      subject,
      body,
      sender: process.env.SUPPORT_MAIL_FROM,
      reply_to: process.env.SUPPORT_MAIL_REPLY_TO,
    },
  });
  if (error || !data) redirect(`${path}?notice=prepare-error`);
  const email = data as OutboxEmail;
  if (email.support_case_id !== id) redirect(`${path}?notice=prepare-error`);
  let notice = "accepted";
  if (email.status !== "accepted") {
    try {
      const providerId = await sendSupportEmail(email);
      const result = await db.rpc("crm_support_email", {
        operation: "accept",
        payload: { id: email.id, provider_id: providerId },
      });
      if (result.error) notice = "uncertain";
    } catch {
      await db.rpc("crm_support_email", {
        operation: "uncertain",
        payload: { id: email.id },
      });
      notice = "uncertain";
    }
  }
  revalidatePath(path);
  revalidatePath("/support/tickets");
  redirect(`${path}?notice=${notice}`);
}

export async function updateSupportStatus(form: FormData) {
  const db = await authorize("support.manage");
  const id = value(form, "case_id"),
    status = value(form, "status");
  if (!uuid(id)) redirect("/support/tickets");
  const path = `/support/tickets/${id}`;
  if (
    ![
      "new",
      "open",
      "waiting_customer",
      "waiting_internal",
      "resolved",
      "closed",
      "cancelled",
    ].includes(status)
  )
    redirect(`${path}?notice=invalid`);
  const current = await db.rpc("get_crm_support_case", {
    target_support_case_id: id,
  });
  const ticket = current.data?.[0];
  if (current.error || !ticket) redirect(`${path}?notice=status-error`);
  const { error } = await db.rpc("manage_crm_support_case", {
    target_support_case_id: id,
    support_status: status,
    support_priority: ticket.priority,
    target_assigned_staff_user_id: ticket.assigned_staff_user_id,
    support_escalation_level: ticket.escalation_level,
  });
  revalidatePath(path);
  revalidatePath("/support/tickets");
  redirect(`${path}?notice=${error ? "status-error" : "status-saved"}`);
}
