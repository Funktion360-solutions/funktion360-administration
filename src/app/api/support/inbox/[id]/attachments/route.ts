import {
  authorizedMailProviderId,
  attachmentFailure,
} from "@/lib/support/attachment-access";
import { AttachmentError, listAttachments } from "@/lib/support/attachments";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  // Keep auth redirects outside the error handler; never turn them into provider errors.
  const providerId = await authorizedMailProviderId(id).catch((error) => {
    if (error instanceof AttachmentError) return attachmentFailure(error);
    throw error;
  });
  if (providerId instanceof Response) return providerId;
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new AttachmentError(503, "Mailopsætningen mangler.");
    const files = await listAttachments(providerId, key);
    return Response.json(
      { files },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return attachmentFailure(error);
  }
}
