import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/require-permission";

type AuditEvent = {
  id: string;
  occurred_at: string;
  actor_staff_user_id: string | null;
  actor_display_name: string | null;
  actor_email: string | null;
  action: string;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  organization_id: string | null;
  organization_name: string | null;
  result: "success" | "failure" | "denied";
  reason: string | null;
  metadata: Record<string, unknown>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Copenhagen",
  }).format(new Date(value));
}

function formatAction(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ResultBadge({ result }: { result: AuditEvent["result"] }) {
  const label =
    result === "success"
      ? "Gennemført"
      : result === "failure"
        ? "Fejlet"
        : "Afvist";

  return (
    <span className="inline-flex rounded-full border border-black/10 px-2.5 py-1 text-xs font-medium">
      {label}
    </span>
  );
}

export default async function AuditPage() {
  await requirePermission("audit.read");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("list_crm_audit_events", {
    target_organization_id: null,
    target_category: null,
    target_action: null,
    target_actor_staff_user_id: null,
    result_limit: 100,
  });

  const events = (data ?? []) as AuditEvent[];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-black/50">
          Administration / Sikkerhed
        </p>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Auditlog</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/60">
            Spor administrative og sikkerhedsrelevante handlinger på tværs af
            Funktion360 Administration.
          </p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-black/45">
            Viste hændelser
          </p>
          <p className="mt-2 text-2xl font-semibold">{events.length}</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-black/45">
            Datakilde
          </p>
          <p className="mt-2 text-sm font-medium">Append-only auditlog</p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-black/45">
            Adgang
          </p>
          <p className="mt-2 text-sm font-medium">audit.read</p>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-semibold">Auditloggen kunne ikke indlæses</h2>
          <p className="mt-2 text-sm text-black/60">
            {error.message}
          </p>
        </section>
      ) : events.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center">
          <h2 className="font-semibold">Ingen audit-hændelser endnu</h2>
          <p className="mt-2 text-sm text-black/55">
            Nye auditerede handlinger vises automatisk her.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-black/[0.025]">
                <tr>
                  <th className="px-4 py-3 font-medium text-black/55">
                    Tidspunkt
                  </th>
                  <th className="px-4 py-3 font-medium text-black/55">
                    Medarbejder
                  </th>
                  <th className="px-4 py-3 font-medium text-black/55">
                    Handling
                  </th>
                  <th className="px-4 py-3 font-medium text-black/55">
                    Kategori
                  </th>
                  <th className="px-4 py-3 font-medium text-black/55">
                    Kunde
                  </th>
                  <th className="px-4 py-3 font-medium text-black/55">
                    Resultat
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/[0.07]">
                {events.map((event) => (
                  <tr key={event.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-black/60">
                      {formatDateTime(event.occurred_at)}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-medium">
                        {event.actor_display_name ?? "Ukendt"}
                      </p>
                      {event.actor_email ? (
                        <p className="mt-1 text-xs text-black/45">
                          {event.actor_email}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-medium">
                        {formatAction(event.action)}
                      </p>
                      {event.entity_type ? (
                        <p className="mt-1 font-mono text-xs text-black/45">
                          {event.entity_type}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 capitalize text-black/65">
                      {event.category}
                    </td>

                    <td className="px-4 py-4 text-black/65">
                      {event.organization_name ?? "—"}
                    </td>

                    <td className="px-4 py-4">
                      <ResultBadge result={event.result} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
