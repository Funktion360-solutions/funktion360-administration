import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import { manageInbox } from "@/app/actions/support-inbox";
import type { InboxMail } from "@/lib/support/inbox-types";
import type { SupportCase } from "@/lib/support/types";
type Person = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_email: string | null;
};
export default async function InboxDetail({
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
  const [result, permission] = await Promise.all([
    db.rpc("crm_support_inbox", { operation: "get", payload: { id } }),
    db.rpc("current_user_has_permission", {
      required_permission: "support.manage",
    }),
  ]);
  if (result.error) throw Error("Mailen kunne ikke hentes.");
  if (!result.data) notFound();
  const mail = result.data as InboxMail;
  const [cases, people] =
    permission.data === true
      ? await Promise.all([
          db.rpc("list_crm_support_cases"),
          db.rpc("list_crm_people"),
        ])
      : [{ data: [] }, { data: [] }];
  return (
    <div className="support-workspace">
      <Link className="support-back" href="/support/inbox">
        ← Indbakke
      </Link>
      <header className="support-heading">
        <div>
          <p className="support-eyebrow">{mail.sender}</p>
          <h1>{mail.subject || "Uden emne"}</h1>
          <p>
            {new Date(mail.received_at).toLocaleString("da-DK", {
              timeZone: "Europe/Copenhagen",
            })}
          </p>
        </div>
      </header>
      {search.notice && (
        <p role="alert" className="support-notice">
          Handlingen kunne ikke gennemføres. Vælg en eksisterende kunde og en
          sag, der er knyttet til en person.
        </p>
      )}
      {!mail.authenticated_sender && (
        <p className="support-notice">
          Afsenderens mailgodkendelse kunne ikke bekræftes. Kontrollér
          afsenderen før du knytter mailen til en kunde.
        </p>
      )}
      <div className="support-columns">
        <section className="support-card support-padding">
          <h2>Modtaget mail</h2>
          <p className="support-body">{mail.body}</p>
          {mail.attachment_count > 0 && (
            <p className="support-notice">
              Mailen har {mail.attachment_count} vedhæftninger. Filerne kan
              endnu kun åbnes i Resends modtagelsesoversigt.
            </p>
          )}
        </section>
        <aside className="support-stack">
          {mail.support_case_id ? (
            <Link
              className="support-button"
              href={`/support/tickets/${mail.support_case_id}`}
            >
              Åbn supportsagen
            </Link>
          ) : (
            permission.data === true && (
              <>
                <section className="support-card support-padding">
                  <h2>Opret supportsag</h2>
                  <form className="support-form" action={manageInbox}>
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="operation" value="create" />
                    <label>
                      Kunde
                      <select required name="person_id" defaultValue="">
                        <option value="" disabled>
                          Vælg kunde
                        </option>
                        {((people.data ?? []) as Person[]).map((p) => (
                          <option key={p.id} value={p.id}>
                            {[p.first_name, p.last_name]
                              .filter(Boolean)
                              .join(" ")}{" "}
                            · {p.primary_email}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="support-button">
                      Opret sag med mailen
                    </button>
                  </form>
                </section>
                <section className="support-card support-padding">
                  <h2>Knyt til eksisterende sag</h2>
                  <form className="support-form" action={manageInbox}>
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="operation" value="attach" />
                    <label>
                      Supportsag
                      <select name="case_id" required defaultValue="">
                        <option value="" disabled>
                          Vælg sag
                        </option>
                        {((cases.data ?? []) as SupportCase[])
                          .filter((c) => c.person_id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.case_number} · {c.subject} · {c.person_name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button className="support-button">Tilknyt mail</button>
                  </form>
                </section>
                {mail.status !== "archived" && (
                  <form action={manageInbox}>
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="operation" value="archive" />
                    <button className="support-button support-secondary">
                      Arkivér henvendelsen
                    </button>
                  </form>
                )}
              </>
            )
          )}
        </aside>
      </div>
    </div>
  );
}
