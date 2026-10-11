import { Webhook } from "svix";
export const handledEvents = new Set([
  "email.received",
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.failed",
  "email.complained",
  "email.suppressed",
]);
export type MailEvent = {
  type: string;
  created_at: string;
  data: { email_id: string };
};
export function verifyEvent(
  body: string,
  headers: Headers,
  secret: string,
): MailEvent {
  new Webhook(secret).verify(body, {
    "svix-id": headers.get("svix-id") ?? "",
    "svix-timestamp": headers.get("svix-timestamp") ?? "",
    "svix-signature": headers.get("svix-signature") ?? "",
  });
  const event = JSON.parse(body) as MailEvent;
  if (!event || typeof event.type !== "string") throw Error("Invalid event");
  return event;
}
export function mailbox(value: string): string {
  const match = value.match(/^[^<>]*<([^<>]+)>$/);
  const address = (match?.[1] ?? value).trim().toLowerCase();
  if (
    !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(address) ||
    address.length > 254
  )
    throw Error("Invalid sender");
  return address;
}
export function plainMail(text: unknown, html: unknown): string {
  if (typeof text === "string" && text.trim()) return text.slice(0, 100000);
  if (typeof html !== "string") return "[Mail uden tekstindhold]";
  return (
    html
      .slice(0, 1000000)
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<(br|\/p|\/div|\/li)\b[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(
        /&(nbsp|amp|lt|gt|quot|apos);/g,
        (_, name: string) =>
          ({ nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[
            name
          ] ?? "",
      )
      .trim()
      .slice(0, 100000) || "[Mail uden tekstindhold]"
  );
}
export type ReceivedMail = {
  id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
  text?: string | null;
  html?: string | null;
  authentication?: { dkim?: string; dmarc?: string } | null;
  attachments?: unknown[];
};
export async function retrieveMail(
  id: string,
  key: string,
  request: typeof fetch = fetch,
): Promise<ReceivedMail> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw Error("Invalid provider ID");
  const response = await request(
    `https://api.resend.com/emails/receiving/${id}?html_format=cid`,
    {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    },
  );
  if (!response.ok) throw Error("Provider retrieval failed");
  const data = (await response.json()) as ReceivedMail;
  if (
    data.id !== id ||
    typeof data.from !== "string" ||
    !Array.isArray(data.to)
  )
    throw Error("Invalid provider response");
  return data;
}
