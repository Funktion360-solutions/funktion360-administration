import "server-only";
import type { OutboxEmail } from "./types";

export function mailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.SUPPORT_MAIL_FROM &&
      process.env.SUPPORT_MAIL_REPLY_TO,
  );
}

export async function sendSupportEmail(
  email: OutboxEmail,
  request: typeof fetch = fetch,
): Promise<string> {
  if (!mailConfigured()) throw new Error("Mailopsætningen mangler.");
  const response = await request("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `support/${email.id}`,
    },
    body: JSON.stringify({
      from: email.sender,
      to: [email.recipient],
      reply_to: email.reply_to,
      subject: email.subject,
      text: email.body,
      ...(email.html_body ? { html: email.html_body } : {}),
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  // Even an error/timeout can have an uncertain outcome. Keep the request ID for safe retry.
  if (!response.ok) throw new Error("Resend accepterede ikke forespørgslen.");
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("id" in data) ||
    typeof data.id !== "string" ||
    !data.id
  ) {
    throw new Error("Resend svarede uden mail-ID.");
  }
  return data.id;
}
