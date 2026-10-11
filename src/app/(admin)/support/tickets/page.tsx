import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import { createSupportCase } from "@/app/actions/support";
import { mailConfigured } from "@/lib/support/resend";
import { statusLabels, type SupportCase } from "@/lib/support/types";

type Person = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_email: string | null;
};
export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; notice?: string }>;
}) {
  await requirePermission("support.read");
  const search = await searchParams;
  const db = await createClient();
  const [casesResult, manageResult] = await Promise.all([
    db.rpc("list_crm_support_cases"),
    db.rpc("current_user_has_permission", {
      required_permission: "support.manage",
    }),
  ]);
  if (casesResult.error) throw new Error("Supportsager kunne ikke hentes.");
  const peopleResult =
    manageResult.data === true
      ? await db.rpc("list_crm_people")
      : { data: [], error: null };
  const people = (peopleResult.data ?? []) as Person[];
  const cases = (casesResult.data ?? []) as SupportCase[];
  const query = (search.q ?? "").toLocaleLowerCase("da");
  const filtered = cases.filter(
    (c) =>
      (!search.status || c.status === search.status) &&
      [c.case_number, c.subject, c.person_name, c.organization_name]
        .join(" ")
        .toLocaleLowerCase("da")
        .includes(query),
  );
  return (
    <div className="support-workspace">
      <header className="support-heading">
        <div>
          <p className="support-eyebrow">Funktion360 · Kundeservice</p>
          <h1>Supportsager</h1>
          <p>Personlig kundeservice og mailhistorik på tværs af produkterne.</p>
        </div>
        <span className="support-count">{cases.length} sager</span>
      </header>
      {!mailConfigured() && (
        <aside className="support-notice">
          Mail er ikke aktiveret endnu. Opsæt Resend-nøglen, afsenderen og
          svaradressen på serveren. Supportsager kan allerede oprettes.
        </aside>
      )}
      {search.notice && (
        <p role="status" className="support-notice">
          Sagen kunne ikke oprettes. Kontrollér kunde, emne og dine rettigheder.
        </p>
      )}
      <section className="support-card">
        <form className="support-filters" method="get">
          <label>
            Søg
            <input
              name="q"
              defaultValue={search.q}
              placeholder="Sag, kunde eller emne"
            />
          </label>
          <label>
            Status
            <select name="status" defaultValue={search.status ?? ""}>
              <option value="">Alle statusser</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="support-button">Vis sager</button>
        </form>
        <div className="support-list">
          {filtered.length ? (
            filtered.map((c) => (
              <Link
                className="support-case"
                key={c.id}
                href={`/support/tickets/${c.id}`}
              >
                <div>
                  <small>{c.case_number}</small>
                  <h2>{c.subject}</h2>
                  <p>{c.person_name || c.organization_name || "Kunde"}</p>
                </div>
                <span className="support-badge">
                  {statusLabels[c.status] ?? c.status}
                </span>
              </Link>
            ))
          ) : (
            <p className="support-empty">Ingen sager matcher din søgning.</p>
          )}
        </div>
      </section>
      {manageResult.data === true && (
        <section className="support-card support-padding">
          <h2>Opret en supportsag</h2>
          <p className="support-muted">
            Vælg kunden, og send din første mail fra sagen.
          </p>
          {peopleResult.error ? (
            <p role="alert">Kundelisten kunne ikke hentes.</p>
          ) : (
            <form action={createSupportCase} className="support-form">
              <label>
                Kunde
                <select required name="person_id" defaultValue="">
                  <option value="" disabled>
                    Vælg en person
                  </option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {[p.first_name, p.last_name].filter(Boolean).join(" ")}{" "}
                      {p.primary_email ? `· ${p.primary_email}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Emne
                <input required maxLength={200} name="subject" />
              </label>
              <label>
                Prioritet
                <select name="priority" defaultValue="normal">
                  <option value="low">Lav</option>
                  <option value="normal">Normal</option>
                  <option value="high">Høj</option>
                  <option value="urgent">Haster</option>
                </select>
              </label>
              <label>
                Beskrivelse
                <textarea name="description" rows={4} maxLength={20000} />
              </label>
              <button className="support-button">Opret supportsag</button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
