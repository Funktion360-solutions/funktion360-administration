import { RunFavn360SyncButton } from "./RunFavn360SyncButton";

import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

type SyncRun = {
  id: string;
  integration_id: string;
  integration_key: string;
  integration_name: string;
  system_id: string;
  system_key: string;
  system_name: string;
  sync_type: string;
  direction: string;
  status: string;
  trigger_type: string;
  started_at: string | null;
  finished_at: string | null;
  records_discovered: number;
  records_processed: number;
  records_succeeded: number;
  records_failed: number;
  error_code: string | null;
  error_summary: string | null;
  triggered_by_staff_user_id: string | null;
  triggered_by_name: string | null;
  correlation_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function statusLabel(status: string) {
  switch (status) {
    case "queued":
      return "I kø";
    case "running":
      return "Kører";
    case "succeeded":
      return "Gennemført";
    case "partially_succeeded":
      return "Delvist gennemført";
    case "failed":
      return "Fejlet";
    case "cancelled":
      return "Annulleret";
    default:
      return status;
  }
}

function statusClasses(status: string) {
  switch (status) {
    case "succeeded":
      return "bg-[#e8f6cf] text-[#49631f]";
    case "running":
      return "bg-blue-100 text-blue-800";
    case "queued":
      return "bg-black/[0.06] text-black/55";
    case "partially_succeeded":
      return "bg-amber-100 text-amber-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "cancelled":
      return "bg-black/[0.06] text-black/45";
    default:
      return "bg-black/[0.06] text-black/55";
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Copenhagen",
  }).format(new Date(value));
}

export default async function SyncPage() {
  await requirePermission("systems.read");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "list_crm_sync_runs",
    {
      target_integration_id: null,
      target_status: null,
      result_limit: 100,
    }
  );

  if (error) {
    console.error("Could not load CRM sync runs", {
      code: error.code,
      message: error.message,
    });
  }

  const runs = (data ?? []) as SyncRun[];

  const running = runs.filter(
    (run) => run.status === "running"
  ).length;

  const succeeded = runs.filter(
    (run) => run.status === "succeeded"
  ).length;

  const failed = runs.filter(
    (run) => run.status === "failed"
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="flex flex-col gap-5 border-b border-black/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
            Drift
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#202120]">
            Synkronisering
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            Overvåg synkroniseringer mellem Funktion360
            Administration og tilknyttede systemer.
          </p>
        </div>

        <RunFavn360SyncButton />
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-900/10 bg-red-50 px-5 py-4 text-sm text-red-800">
          Synkroniseringshistorikken kunne ikke indlæses.
        </div>
      ) : null}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Seneste kørsler"
          value={runs.length}
          detail="Maks. 100 vist"
        />

        <SummaryCard
          label="Kører"
          value={running}
          detail="Aktive synkroniseringer"
        />

        <SummaryCard
          label="Gennemført"
          value={succeeded}
          detail="I den viste historik"
        />

        <SummaryCard
          label="Fejlet"
          value={failed}
          detail="Kræver muligvis handling"
        />
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#202120]">
            Sync-historik
          </h2>

          <p className="mt-1 text-sm text-black/50">
            Reelle kørsler vises her, når integrationsmotoren
            begynder at synkronisere data.
          </p>
        </div>

        {runs.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-14 text-center">
            <p className="text-sm font-semibold text-[#202120]">
              Ingen synkroniseringer endnu
            </p>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/45">
              Der oprettes ikke kunstig historik. Første post
              kommer, når en rigtig integration udfører en
              synkronisering.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="border-b border-black/10 bg-[#f7f7f3]">
                  <tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40">
                    <th className="px-5 py-3">Integration</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Start</th>
                    <th className="px-5 py-3">Behandlet</th>
                    <th className="px-5 py-3">Fejl</th>
                    <th className="px-5 py-3">Udløst af</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/[0.07]">
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-[#202120]">
                          {run.integration_name}
                        </p>
                        <p className="mt-1 text-xs text-black/45">
                          {run.system_name}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-xs text-black/55">
                        {run.sync_type}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClasses(
                            run.status
                          )}`}
                        >
                          {statusLabel(run.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-black/55">
                        {formatDate(
                          run.started_at ?? run.created_at
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-black/55">
                        {run.records_processed}
                      </td>

                      <td className="px-5 py-4 text-xs text-black/55">
                        {run.records_failed}
                      </td>

                      <td className="px-5 py-4 text-xs text-black/55">
                        {run.triggered_by_name ??
                          run.trigger_type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#202120]">
        {value}
      </p>

      <p className="mt-1 text-xs text-black/45">
        {detail}
      </p>
    </article>
  );
}
