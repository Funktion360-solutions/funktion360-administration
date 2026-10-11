import "server-only";

// Stay below the deployment's response payload limit, including headers.
export const MAX_ATTACHMENT_BYTES = 4_000_000;
export const isMailId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export type AttachmentInfo = {
  id: string;
  filename: string;
  size: number;
  content_type: string;
};
export class AttachmentError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function info(value: unknown): AttachmentInfo {
  const item = value as Partial<AttachmentInfo> | null;
  if (
    !item ||
    typeof item.id !== "string" ||
    !isMailId(item.id) ||
    typeof item.size !== "number" ||
    !Number.isSafeInteger(item.size) ||
    item.size < 0 ||
    typeof item.filename !== "string" ||
    typeof item.content_type !== "string"
  )
    throw new AttachmentError(502, "Ugyldigt svar fra mailudbyderen.");
  return {
    id: item.id,
    filename: safeFilename(item.filename),
    size: item.size,
    content_type: item.content_type.slice(0, 100),
  };
}
export function safeFilename(value: string): string {
  return (
    value
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .split(/[\\/]/)
      .pop()
      ?.trim()
      .slice(0, 180) || "vedhaeftning"
  );
}
async function provider(path: string, key: string, request: typeof fetch) {
  const response = await request(
    `https://api.resend.com/emails/receiving/${path}`,
    {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw new AttachmentError(
      response.status === 404 ? 404 : 502,
      "Filen kunne ikke hentes fra mailudbyderen. Prøv igen.",
    );
  return response.json();
}
export async function listAttachments(
  mailId: string,
  key: string,
  request: typeof fetch = fetch,
) {
  if (!isMailId(mailId)) throw new AttachmentError(400, "Ugyldig mail.");
  const files: AttachmentInfo[] = [];
  let after = "";
  for (let page = 0; page < 5; page++) {
    const result = await provider(
      `${mailId}/attachments?limit=100${after ? `&after=${after}` : ""}`,
      key,
      request,
    );
    if (!Array.isArray(result?.data) || typeof result.has_more !== "boolean")
      throw new AttachmentError(502, "Filoversigten kunne ikke læses.");
    const items = result.data.map(info) as AttachmentInfo[];
    files.push(...items);
    if (!result.has_more) return files;
    const next = items.at(-1)?.id;
    if (!next || next === after) break;
    after = next;
  }
  throw new AttachmentError(
    502,
    "Filoversigten er ufuldstændig. Prøv igen senere.",
  );
}
export async function downloadAttachment(
  mailId: string,
  attachmentId: string,
  key: string,
  request: typeof fetch = fetch,
): Promise<Response> {
  if (!isMailId(mailId) || !isMailId(attachmentId))
    throw new AttachmentError(400, "Ugyldig fil.");
  const result = await provider(
    `${mailId}/attachments/${attachmentId}`,
    key,
    request,
  );
  const file = info(result);
  if (file.id !== attachmentId)
    throw new AttachmentError(502, "Filen kunne ikke bekræftes.");
  if (file.size > MAX_ATTACHMENT_BYTES)
    throw new AttachmentError(
      413,
      "Filen er større end 4 MB. Hent den i Resend.",
    );
  let url: URL;
  try {
    url = new URL(result.download_url);
  } catch {
    throw new AttachmentError(502, "Filens downloadadresse mangler.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "inbound-cdn.resend.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== `/${mailId}/attachments/${attachmentId}`
  )
    throw new AttachmentError(
      502,
      "Filens downloadadresse kunne ikke bekræftes.",
    );
  const response = await request(url.href, {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok || !response.body)
    throw new AttachmentError(502, "Download mislykkedes. Prøv igen.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ATTACHMENT_BYTES)
        throw new AttachmentError(413, "Filen er større end 4 MB.");
      chunks.push(value);
    }
    if (size !== file.size)
      throw new AttachmentError(502, "Download var ufuldstændigt. Prøv igen.");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const encoded = encodeURIComponent(file.filename).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="vedhaeftning"; filename*=UTF-8''${encoded}`,
      "Content-Length": String(size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
