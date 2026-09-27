import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

type IntegrationRow = {
  id: string;
  system_id: string;
  system_key: string;
  system_name: string;
  integration_key: string;
  name: string;
  description: string | null;
  integration_type: string;
  direction: string;
  status: string;
  environment: string;
  sync_supported: boolean;
  health_check_supported: boolean;
  last_connected_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_summary: string | null;
  configuration: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

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

function statusLabel(status: string) {
  switch (status) {
    case "operational":
      return "Operationel";
    case "degraded":
      return "Forringet";
    case "outage":
      return "Nedbrud";
    case "maintenance":
      return "Vedligeholdelse";
    default:
      return "Ukendt";
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
    case "maintenance":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-black/[0.06] text-black/55";
  }
}

function typeLabel(type: string) {
  switch (type) {
    case "internal":
      return "Internt system";
    case "product":
      return "Produkt";
    case "infrastructure":
      return "Infrastruktur";
    case "external_service":
      return "Ekstern tjeneste";
    default:
      return type;
  }
}

function environmentLabel(environment: string) {
  switch (environment) {
    case "production":
      return "Produktion";
    case "staging":
      return "Staging";
    case "development":
      return "Udvikling";
    default:
      return environment;
  }
}

function formatDate(value: string | null) {
  if (!value) return "Ikke kontrolleret";

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Copenhagen",
  }).format(new Date(value));
}

export default async function IntegrationsPage() {
  await requirePermission("systems.read");

  const supabase = await createClient();

  const [
    { data: systemsData, error: systemsError },
    { data: integrationsData, error: integrationsError },
  ] = await Promise.all([
    supabase.rpc("list_crm_systems"),
    supabase.rpc("list_crm_system_integrations"),
  ]);

  if (systemsError) {
    console.error("Could not load CRM systems", {
      code: systemsError.code,
      message: systemsError.message,
    });
  }

  if (integrationsError) {
    console.error("Could not load CRM integrations", {
      code: integrationsError.code,
      message: integrationsError.message,
    });
  }

  const systems = (systemsData ?? []) as SystemRow[];
  const integrations = (integrationsData ?? []) as IntegrationRow[];
  const error = systemsError ?? integrationsError;

  const operationalCount = systems.filter(
    (system) => system.status === "operational"
  ).length;

  const apiCount = systems.filter(
    (system) => system.api_enabled
  ).length;

  const syncCount = systems.filter(
    (system) => system.sync_enabled
  ).length;

  const healthCount = systems.filter(
    (system) => system.health_check_enabled
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="flex flex-col gap-5 border-b border-black/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
            Drift
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#202120]">
            Systemer & integrationer
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            Centralt register over Funktion360s produkter,
            interne systemer, infrastruktur og eksterne
            integrationer.
          </p>
        </div>

        <div className="rounded-full border border-black/10 bg-white px-4 py-2 font-mono text-[11px] text-black/50">
          {systems.length} systemer registreret
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-900/10 bg-red-50 px-5 py-4 text-sm text-red-800">
          Systemregisteret kunne ikke indlæses.
        </div>
      ) : null}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Systemer"
          value={systems.length}
          detail="Registreret i CRM"
        />

        <SummaryCard
          label="Operationelle"
          value={operationalCount}
          detail="Aktuel registry-status"
        />

        <SummaryCard
          label="API"
          value={apiCount}
          detail="API-aktiverede systemer"
        />

        <SummaryCard
          label="Synkronisering"
          value={syncCount}
          detail={`${healthCount} med health check`}
        />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#202120]">
              Integrationer
            </h2>

            <p className="mt-1 text-sm text-black/50">
              Konkrete forbindelser mellem Administrationen og
              Funktion360s øvrige systemer og tjenester.
            </p>
          </div>

          <div className="rounded-full border border-black/10 bg-white px-3 py-1.5 font-mono text-[10px] text-black/45">
            {integrations.length} integrationer
          </div>
        </div>

        {integrations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-[#202120]">
              Ingen integrationer registreret
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-black/10 bg-[#f7f7f3]">
                  <tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40">
                    <th className="px-5 py-3">Integration</th>
                    <th className="px-5 py-3">System</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Retning</th>
                    <th className="px-5 py-3">Sync</th>
                    <th className="px-5 py-3">Health</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/[0.07]">
                  {integrations.map((integration) => (
                    <tr key={integration.id}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-[#202120]">
                          {integration.name}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-black/35">
                          {integration.integration_key}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-black/60">
                        {integration.system_name}
                      </td>

                      <td className="px-5 py-4 text-xs font-medium uppercase text-black/55">
                        {integration.integration_type}
                      </td>

                      <td className="px-5 py-4 text-xs text-black/55">
                        {integration.direction === "bidirectional"
                          ? "Begge veje"
                          : integration.direction === "inbound"
                            ? "Indgående"
                            : "Udgående"}
                      </td>

                      <td className="px-5 py-4 text-xs text-black/55">
                        {integration.sync_supported ? "Understøttet" : "—"}
                      </td>

                      <td className="px-5 py-4 text-xs text-black/55">
                        {integration.health_check_supported
                          ? "Understøttet"
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[10px] font-semibold text-black/55">
                          {integration.status === "not_configured"
                            ? "Ikke konfigureret"
                            : integration.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#202120]">
              System Registry
            </h2>

            <p className="mt-1 text-sm text-black/50">
              Metadata og integrationskapabiliteter. Credentials
              og secrets eksponeres ikke her.
            </p>
          </div>
        </div>

        {systems.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-[#202120]">
              Ingen systemer registreret
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {systems.map((system) => (
              <article
                key={system.id}
                className="rounded-2xl border border-black/10 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[#202120]">
                        {system.name}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClasses(
                          system.status
                        )}`}
                      >
                        {statusLabel(system.status)}
                      </span>
                    </div>

                    <p className="mt-1 font-mono text-[10px] text-black/35">
                      {system.system_key}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-black/10 px-2.5 py-1 text-[10px] font-medium text-black/50">
                    {environmentLabel(system.environment)}
                  </span>
                </div>

                <p className="mt-4 min-h-10 text-sm leading-5 text-black/55">
                  {system.description ?? "Ingen beskrivelse."}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-black/10 pt-4 text-xs">
                  <Detail
                    label="Type"
                    value={typeLabel(system.system_type)}
                  />

                  <Detail
                    label="Ejer"
                    value={system.owner_name ?? "Ikke angivet"}
                  />

                  <Detail
                    label="API"
                    value={system.api_enabled ? "Aktiveret" : "Ikke aktiveret"}
                  />

                  <Detail
                    label="Sync"
                    value={system.sync_enabled ? "Aktiveret" : "Ikke aktiveret"}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f7f7f3] px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">
                      Health check
                    </p>

                    <p className="mt-1 text-xs text-black/60">
                      {system.health_check_enabled
                        ? formatDate(system.last_health_check_at)
                        : "Deaktiveret"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      system.health_check_enabled
                        ? "bg-[#e8f6cf] text-[#49631f]"
                        : "bg-black/[0.06] text-black/45"
                    }`}
                  >
                    {system.health_check_enabled
                      ? "Overvågning aktiv"
                      : "Ingen overvågning"}
                  </span>
                </div>
              </article>
            ))}
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
      <p className="mt-1 font-medium text-[#202120]">{value}</p>
    </div>
  );
}
