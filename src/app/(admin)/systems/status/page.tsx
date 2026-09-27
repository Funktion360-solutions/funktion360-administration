import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import { RunHealthCheckButton } from "@/components/systems/run-health-check-button";

type SystemRow = {
  id: string;
  system_key: string;
  name: string;
  description: string | null;
  system_type: string;
  environment: string;
  status: string;
  owner_name: string | null;
  api_enabled: boolean;
  sync_enabled: boolean;
  health_check_enabled: boolean;
  last_health_check_at: string | null;
  created_at: string;
  updated_at: string;
};

type HealthCheck = {
  id: string;
  system_id: string;
  system_key: string;
  system_name: string;
  integration_id: string | null;
  integration_key: string | null;
  integration_name: string | null;
  check_type: string;
  status: string;
  response_time_ms: number | null;
  status_code: number | null;
  error_code: string | null;
  error_summary: string | null;
  checked_at: string;
  correlation_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function statusLabel(status: string) {
  switch (status) {
    case "operational":
      return "Operationel";
    case "degraded":
      return "Forringet";
    case "outage":
      return "Nedbrud";
    case "unknown":
      return "Ukendt";
    default:
      return status;
  }
}

function statusClasses(status: string) {
  switch (status) {
    case "operational":
      return "bg-[#e8f6cf] text-[#49631f]";
    case "degraded":
      return "bg-amber-100 text-amber-800";
    case "outage":
      return "bg-red-100 text-red-800";
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

export default async function SystemStatusPage() {
  await requirePermission("systems.read");

  const supabase = await createClient();

  const [
    { data: systemsData, error: systemsError },
    { data: checksData, error: checksError },
  ] = await Promise.all([
    supabase.rpc("list_crm_systems"),
    supabase.rpc("list_crm_health_checks", {
      target_system_id: null,
      target_integration_id: null,
      result_limit: 100,
    }),
  ]);

  if (systemsError) {
    console.error("Could not load CRM systems", {
      code: systemsError.code,
      message: systemsError.message,
    });
  }

  if (checksError) {
    console.error("Could not load CRM health checks", {
      code: checksError.code,
      message: checksError.message,
    });
  }

  const systems = (systemsData ?? []) as SystemRow[];
  const checks = (checksData ?? []) as HealthCheck[];

  const latestBySystem = new Map<string, HealthCheck>();

  for (const check of checks) {
    if (!latestBySystem.has(check.system_id)) {
      latestBySystem.set(check.system_id, check);
    }
  }

  const monitoredSystems = systems.filter(
    (system) => system.health_check_enabled
  );

  const checkedSystems = monitoredSystems.filter((system) =>
    latestBySystem.has(system.id)
  );

  const operational = checkedSystems.filter(
    (system) =>
      latestBySystem.get(system.id)?.status === "operational"
  ).length;

  const incidents = checkedSystems.filter((system) => {
    const status = latestBySystem.get(system.id)?.status;
    return status === "degraded" || status === "outage";
  }).length;

  const pending = monitoredSystems.length - checkedSystems.length;

  const error = systemsError ?? checksError;

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="flex flex-col gap-5 border-b border-black/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
            Drift
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#202120]">
            Systemstatus
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            Teknisk status baseret på registrerede health checks
            fra Funktion360s systemer og integrationer.
          </p>
        </div>

        <div className="flex flex-wrap items-start justify-end gap-2">
          <RunHealthCheckButton
            system="funktion360-administration"
            label="Kontrollér Administration"
          />

          <RunHealthCheckButton
            system="favn360"
            label="Kontrollér Favn360"
          />

          <RunHealthCheckButton
            system="supabase"
            label="Kontrollér Supabase"
          />

          <RunHealthCheckButton
            system="vercel"
            label="Kontrollér Vercel"
          />
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-900/10 bg-red-50 px-5 py-4 text-sm text-red-800">
          Systemstatus kunne ikke indlæses fuldt ud.
        </div>
      ) : null}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Overvåges"
          value={monitoredSystems.length}
          detail="Systemer med health checks"
        />

        <SummaryCard
          label="Operationelle"
          value={operational}
          detail="Seneste kontrol bestået"
        />

        <SummaryCard
          label="Hændelser"
          value={incidents}
          detail="Forringet eller nede"
        />

        <SummaryCard
          label="Afventer"
          value={pending}
          detail="Ingen kontrol registreret endnu"
        />
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#202120]">
            Overvågede systemer
          </h2>

          <p className="mt-1 text-sm text-black/50">
            Status kommer fra den senest registrerede faktiske
            health check og ikke fra manuel registry-status.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {monitoredSystems.map((system) => {
            const check = latestBySystem.get(system.id);

            return (
              <article
                key={system.id}
                className="rounded-2xl border border-black/10 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#202120]">
                      {system.name}
                    </h3>

                    <p className="mt-1 font-mono text-[10px] text-black/35">
                      {system.system_key}
                    </p>
                  </div>

                  {check ? (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClasses(
                        check.status
                      )}`}
                    >
                      {statusLabel(check.status)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[10px] font-semibold text-black/50">
                      Afventer første kontrol
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-black/10 pt-4">
                  <Detail
                    label="Seneste kontrol"
                    value={formatDate(check?.checked_at ?? null)}
                  />

                  <Detail
                    label="Svartid"
                    value={
                      check?.response_time_ms != null
                        ? `${check.response_time_ms} ms`
                        : "—"
                    }
                  />

                  <Detail
                    label="Kontroltype"
                    value={check?.check_type ?? "—"}
                  />

                  <Detail
                    label="HTTP-status"
                    value={
                      check?.status_code != null
                        ? String(check.status_code)
                        : "—"
                    }
                  />
                </div>

                {check?.error_summary ? (
                  <div className="mt-4 rounded-xl bg-red-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-red-700/60">
                      Seneste fejl
                    </p>
                    <p className="mt-1 text-xs text-red-800">
                      {check.error_summary}
                    </p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#202120]">
            Seneste health checks
          </h2>
        </div>

        {checks.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-14 text-center">
            <p className="text-sm font-semibold text-[#202120]">
              Ingen health checks endnu
            </p>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/45">
              Status bliver først udfyldt, når systemerne
              kontrolleres af den kommende health-check-motor.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-black/10 bg-[#f7f7f3]">
                  <tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40">
                    <th className="px-5 py-3">System</th>
                    <th className="px-5 py-3">Kontrol</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Svartid</th>
                    <th className="px-5 py-3">Tidspunkt</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/[0.07]">
                  {checks.map((check) => (
                    <tr key={check.id}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-[#202120]">
                          {check.system_name}
                        </p>
                        {check.integration_name ? (
                          <p className="mt-1 text-xs text-black/45">
                            {check.integration_name}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-5 py-4 text-xs text-black/55">
                        {check.check_type}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClasses(
                            check.status
                          )}`}
                        >
                          {statusLabel(check.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-black/55">
                        {check.response_time_ms != null
                          ? `${check.response_time_ms} ms`
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-xs text-black/55">
                        {formatDate(check.checked_at)}
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

      <p className="mt-1 text-xs text-black/45">{detail}</p>
    </article>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/35">
        {label}
      </p>
      <p className="mt-1 text-xs font-medium text-[#202120]">
        {value}
      </p>
    </div>
  );
}
