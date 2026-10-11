import {
  authorizedMailProviderId,
  attachmentFailure,
} from "@/lib/support/attachment-access";
import { AttachmentError, downloadAttachment } from "@/lib/support/attachments";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const { id, attachmentId } = await context.params;
  const providerId = await authorizedMailProviderId(id).catch((error) => {
    if (error instanceof AttachmentError) return attachmentFailure(error);
    throw error;
  });
  if (providerId instanceof Response) return providerId;
  try {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new AttachmentError(503, "Mailopsætningen mangler.");
    return await downloadAttachment(providerId, attachmentId, key);
  } catch (error) {
    return attachmentFailure(error);
  }
}
