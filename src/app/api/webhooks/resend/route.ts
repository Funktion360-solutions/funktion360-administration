import { createClient } from "@supabase/supabase-js";
import {
  handledEvents,
  verifyEvent,
  retrieveMail,
  mailbox,
  plainMail,
} from "@/lib/support/inbound";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET,
    token = process.env.SUPPORT_MAIL_INGEST_TOKEN;
  if (!secret || !token || !process.env.RESEND_API_KEY)
    return new Response("Webhook not configured", { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > 262144)
    return new Response("Payload too large", { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 262144)
    return new Response("Payload too large", { status: 413 });
  let event;
  try {
    event = verifyEvent(raw, request.headers, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (!handledEvents.has(event.type)) return Response.json({ ignored: true });
  try {
    const payload: Record<string, unknown> = {
      event_id: request.headers.get("svix-id"),
      event_type: event.type,
      provider_id: event.data.email_id,
      occurred_at: event.created_at,
    };
    if (event.type === "email.received") {
      const mail = await retrieveMail(
        event.data.email_id,
        process.env.RESEND_API_KEY,
      );
      const recipients = mail.to.map(mailbox);
      if (!recipients.some((a) => a.endsWith("@indbakke.funktion360.dk")))
        return Response.json({ ignored: true });
      Object.assign(payload, {
        sender: mailbox(mail.from),
        recipients,
        subject:
          typeof mail.subject === "string" && mail.subject.trim()
            ? mail.subject.trim()
            : "Uden emne",
        body: plainMail(mail.text, mail.html),
        received_at: mail.created_at,
        attachment_count: mail.attachments?.length ?? 0,
        authenticated_sender:
          mail.authentication?.dmarc === "pass" ||
          mail.authentication?.dkim === "pass",
      });
    }
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error } = await db.rpc("ingest_crm_support_mail", {
      ingest_token: token,
      payload,
    });
    if (error) throw Error("Database ingestion failed");
    return Response.json({ ok: true });
  } catch {
    // Generic error only: never log email bodies, credentials or provider signed URLs.
    console.error("Resend webhook processing failed; provider retry required");
    return new Response("Processing failed", { status: 503 });
  }
}
