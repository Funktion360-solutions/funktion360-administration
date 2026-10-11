import "server-only";
import { requirePermission } from "@/lib/auth/require-permission";
import { requireStaffMfa } from "@/lib/auth/require-staff-mfa";
import { createClient } from "@/lib/supabase/server";
import { AttachmentError, isMailId } from "./attachments";

export async function authorizedMailProviderId(id: string): Promise<string> {
  await requirePermission("support.read");
  await requireStaffMfa();
  if (!isMailId(id)) throw new AttachmentError(400, "Ugyldig mail.");
  const db = await createClient();
  const { data, error } = await db.rpc("crm_support_inbox", {
    operation: "get",
    payload: { id },
  });
  if (error)
    throw new AttachmentError(403, "Du har ikke adgang til denne mail.");
  if (
    !data ||
    data.id !== id ||
    typeof data.provider_id !== "string" ||
    !isMailId(data.provider_id)
  )
    throw new AttachmentError(404, "Mailen findes ikke.");
  return data.provider_id;
}
export function attachmentFailure(error: unknown): Response {
  return Response.json(
    {
      error:
        error instanceof AttachmentError
          ? error.message
          : "Filen kunne ikke hentes. Prøv igen senere.",
    },
    {
      status: error instanceof AttachmentError ? error.status : 502,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
