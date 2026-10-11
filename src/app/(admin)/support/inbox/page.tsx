import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import type { InboxMail } from "@/lib/support/inbox-types";
export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("support.read");
  const db = await createClient();
  const search = await searchParams;
  const status = ["unassigned", "attached", "archived"].includes(
    search.status ?? "",
  )
    ? search.status
    : "unassigned";
  const { data, error } = await db.rpc("crm_support_inbox", {
    operation: "list",
    payload: { status },
  });
  if (error) throw Error("Indbakken kunne ikke hentes.");
  const mails = (data ?? []) as InboxMail[];
  return (
    <div className="support-workspace">
      <header className="support-heading">
        <div>
          <p className="support-eyebrow">Funktion360 · Kundeservice</p>
          <h1>Indbakke</h1>
          <p>Nye henvendelser og svar fra kunder.</p>
        </div>
        <Link className="support-button" href="/support/tickets">
          Supportsager
        </Link>
      </header>
      <nav className="support-inbox-tabs" aria-label="Mailstatus">
        {[
          ["unassigned", "Nye henvendelser"],
          ["attached", "På supportsager"],
          ["archived", "Arkiverede"],
        ].map(([key, label]) => (
          <Link
            aria-current={key === status ? "page" : undefined}
            key={key}
            href={`/support/inbox?status=${key}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <section className="support-card">
        {mails.length ? (
          mails.map((m) => (
            <Link
              key={m.id}
              className="support-case"
              href={`/support/inbox/${m.id}`}
            >
              <div>
                <small>{m.sender}</small>
                <h2>{m.subject || "Uden emne"}</h2>
                <p>
                  {new Date(m.received_at).toLocaleString("da-DK", {
                    timeZone: "Europe/Copenhagen",
                  })}
                  {m.attachment_count
                    ? ` · ${m.attachment_count} vedhæftninger`
                    : ""}
                </p>
              </div>
              <span className="support-badge">
                {m.status === "attached" ? "Tilknyttet sag" : "Åbn mail"}
              </span>
            </Link>
          ))
        ) : (
          <p className="support-empty">Ingen mails i denne visning.</p>
        )}
      </section>
      <p className="support-muted">
        Viser de seneste 200 mails. Svar med en sikker sagshenvisning og
        godkendt afsender tilknyttes automatisk.
      </p>
    </div>
  );
}
