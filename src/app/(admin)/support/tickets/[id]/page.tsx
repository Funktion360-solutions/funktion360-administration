import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import { mailConfigured } from "@/lib/support/resend";
import {
  statusLabels,
  type SupportCase,
  type SupportMessage,
  type OutboxEmail,
} from "@/lib/support/types";
import {
  addSupportNote,
  sendMail,
  updateSupportStatus,
} from "@/app/actions/support";
import { SubmitMail } from "@/components/support/submit-mail";
const notices: Record<string, string> = {
  "status-saved": "Sagens status er opdateret.",
  "status-error": "Status kunne ikke opdateres.",
  accepted:
    "Mailen er accepteret af Resend. Det bekræfter afsendelsen, ikke levering i kundens indbakke.",
  uncertain:
    "Afsendelsen kunne ikke bekræftes. Brug Kontrollér / prøv igen på den samme mail nedenfor. Opret ikke en ny kopi.",
  config: "Mailopsætningen mangler.",
  invalid: "Kontrollér modtager, emne og tekst.",
  "prepare-error":
    "Mailen kunne ikke klargøres. Et genforsøg kan være udløbet eller mangle rettigheder.",
  "note-saved": "Intern note gemt.",
  "note-error": "Noten kunne ikke gemmes.",
};
const date = (s: string) =>
  new Date(s).toLocaleString("da-DK", { timeZone: "Europe/Copenhagen" });
export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  await requirePermission("support.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const search = await searchParams,
    db = await createClient();
  const [
    caseResult,
    messagesResult,
    outboxResult,
    respondResult,
    notesResult,
    manageResult,
  ] = await Promise.all([
    db.rpc("get_crm_support_case", { target_support_case_id: id }),
    db.rpc("list_crm_support_messages", { target_support_case_id: id }),
    db.rpc("crm_support_email", {
      operation: "list",
      payload: { case_id: id },
    }),
    db.rpc("current_user_has_permission", {
      required_permission: "support.respond",
    }),
    db.rpc("current_user_has_permission", {
      required_permission: "support.internal_notes",
    }),
    db.rpc("current_user_has_permission", {
      required_permission: "support.manage",
    }),
  ]);
  if (caseResult.error || messagesResult.error || outboxResult.error)
    throw new Error("Sagen kunne ikke hentes.");
  const ticket = (caseResult.data as SupportCase[])[0];
  if (!ticket) notFound();
  const messages = (messagesResult.data ?? []) as SupportMessage[],
    emails = (outboxResult.data ?? []) as OutboxEmail[];
  // Read the customer's current email only when the staff has person-read permission.
  const people =
    respondResult.data === true
      ? await db.rpc("list_crm_people")
      : { data: [] };
  const person = (people.data ?? []).find(
    (p: { id: string }) => p.id === ticket.person_id,
  ) as { primary_email?: string } | undefined;
  return (
    <div className="support-workspace">
      <Link className="support-back" href="/support/tickets">
        ← Alle supportsager
      </Link>
      <header className="support-heading">
        <div>
          <p className="support-eyebrow">
            {ticket.case_number} ·{" "}
            {ticket.person_name || ticket.organization_name}
          </p>
          <h1>{ticket.subject}</h1>
          <p>Oprettet {date(ticket.created_at)}</p>
        </div>
        <span className="support-badge">
          {statusLabels[ticket.status] ?? ticket.status}
        </span>
      </header>
      {search.notice && (
        <p className="support-notice" role="status">
          {notices[search.notice] ?? "Handlingen kunne ikke gennemføres."}
        </p>
      )}
      <div className="support-columns">
        <section className="support-card support-padding">
          <h2>Samtale og historik</h2>
          {ticket.description && (
            <p className="support-body support-description">
              {ticket.description}
            </p>
          )}
          <div className="support-timeline">
            {messages.length ? (
              messages.map((m) => (
                <article
                  className={`support-message ${m.message_type === "internal_note" ? "support-internal" : ""}`}
                  key={m.id}
                >
                  <header>
                    <strong>
                      {m.author_staff_name || m.author_person_name || "System"}
                    </strong>
                    <small>
                      {m.message_type === "internal_note"
                        ? "Intern note · "
                        : ""}
                      {date(m.created_at)}
                    </small>
                  </header>
                  <p className="support-body">{m.body}</p>
                </article>
              ))
            ) : (
              <p className="support-muted">Ingen beskeder endnu.</p>
            )}
          </div>
          {emails.length > 0 && (
            <div className="support-outbox">
              <h3>Mailstatus</h3>
              {emails.map((e) => (
                <article key={e.id}>
                  <p>
                    <strong>{e.subject}</strong> → {e.recipient}
                  </p>
                  <p className="support-muted">
                    {date(e.created_at)} ·{" "}
                    {e.status === "accepted"
                      ? "Accepteret af Resend"
                      : "Afsendelse ikke bekræftet"}
                  </p>
                  {e.status !== "accepted" && respondResult.data === true && (
                    <form action={sendMail}>
                      <input type="hidden" name="case_id" value={id} />
                      <input type="hidden" name="request_id" value={e.id} />
                      <input type="hidden" name="retry" value="yes" />
                      <SubmitMail
                        label="Kontrollér / prøv igen"
                        disabled={!mailConfigured() || !e.retry_allowed}
                      />
                    </form>
                  )}
                </article>
              ))}
              <p className="support-muted">
                Genforsøg bruger samme mail-ID i op til 23 timer. Ved udløb skal
                status kontrolleres i Resend før en ny mail oprettes.
              </p>
            </div>
          )}
        </section>
        <aside className="support-stack">
          {manageResult.data === true && (
            <section className="support-card support-padding">
              <h2>Sagens status</h2>
              <form action={updateSupportStatus} className="support-form">
                <input type="hidden" name="case_id" value={id} />
                <label>
                  Status
                  <select name="status" defaultValue={ticket.status}>
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="support-button support-secondary">
                  Gem status
                </button>
              </form>
            </section>
          )}
          {respondResult.data === true && (
            <section className="support-card support-padding">
              <h2>Send en mail</h2>
              <p className="support-muted">
                Kontrollér modtageren før afsendelse. Svaret går til den
                konfigurerede supportadresse.
              </p>
              <form action={sendMail} className="support-form">
                <input type="hidden" name="case_id" value={id} />
                <input type="hidden" name="request_id" value={randomUUID()} />
                <label>
                  Modtager
                  <input
                    type="email"
                    name="recipient"
                    defaultValue={person?.primary_email ?? ""}
                    required
                    maxLength={254}
                  />
                </label>
                <label>
                  Emne
                  <input
                    name="subject"
                    defaultValue={`[${ticket.case_number}] ${ticket.subject}`.slice(
                      0,
                      200,
                    )}
                    maxLength={200}
                    required
                  />
                </label>
                <label>
                  Besked
                  <textarea
                    name="body"
                    rows={10}
                    maxLength={20000}
                    required
                    placeholder="Skriv dit svar til kunden…"
                  />
                </label>
                <SubmitMail disabled={!mailConfigured()} />
              </form>
              {!mailConfigured() && (
                <p className="support-muted">
                  Resend skal konfigureres før afsendelse.
                </p>
              )}
            </section>
          )}
          {notesResult.data === true && (
            <section className="support-card support-padding">
              <h2>Intern note</h2>
              <p className="support-muted">Noten sendes ikke til kunden.</p>
              <form action={addSupportNote} className="support-form">
                <input type="hidden" name="case_id" value={id} />
                <label>
                  Note
                  <textarea required name="body" maxLength={20000} rows={4} />
                </label>
                <button className="support-button support-secondary">
                  Gem intern note
                </button>
              </form>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
