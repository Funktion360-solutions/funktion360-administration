import { MfaEnrollment } from "@/components/security/mfa-enrollment";
import {
  SecurityPolicyEditor,
  type SecurityPolicy,
} from "@/components/security/security-policy-editor";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

type SecurityOverview = {
  active_staff_count: number;
  staff_with_mfa_count: number;
  staff_without_mfa_count: number;
  active_session_count: number;
  aal1_session_count: number;
  aal2_session_count: number;
  staff_signed_in_last_24h_count: number;
  latest_staff_sign_in_at: string | null;
};



function formatDateTime(value: string | null) {
  if (!value) {
    return "Ingen";
  }

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Copenhagen",
  }).format(new Date(value));
}

function Metric({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-black/45">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold">{value}</p>

      {description ? (
        <p className="mt-2 text-xs leading-5 text-black/45">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default async function SecurityPage() {
  await requirePermission("security.manage");

  const supabase = await createClient();

  const [
    { data, error },
    { data: policyData, error: policyError },
  ] = await Promise.all([
    supabase.rpc("get_crm_security_overview"),
    supabase.rpc("list_crm_security_policies"),
  ]);

  const overview = (data?.[0] ?? null) as SecurityOverview | null;
  const policies = (policyData ?? []) as SecurityPolicy[];

  return (
    <main className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-black/50">
          Administration / Sikkerhed
        </p>

        <div className="mt-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Sikkerhed
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/60">
            Centralt overblik over administrativ adgang, MFA og aktive
            autentificeringssessioner i Funktion360 Administration.
          </p>
        </div>
      </header>

      {error ? (
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="font-semibold">
            Sikkerhedsdata kunne ikke indlæses
          </h2>

          <p className="mt-2 text-sm text-black/60">
            {error.message}
          </p>
        </section>
      ) : !overview ? (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center">
          <h2 className="font-semibold">
            Ingen sikkerhedsdata tilgængelige
          </h2>
        </section>
      ) : (
        <>
          <section>
            <div className="mb-3">
              <h2 className="text-lg font-semibold">
                Identitet & adgang
              </h2>
              <p className="mt-1 text-sm text-black/50">
                Status for medarbejdere og multifaktorautentificering.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Metric
                label="Aktive medarbejdere"
                value={Number(overview.active_staff_count)}
              />

              <Metric
                label="Med verificeret MFA"
                value={Number(overview.staff_with_mfa_count)}
                description="Medarbejdere med mindst én verificeret MFA-faktor."
              />

              <Metric
                label="Uden verificeret MFA"
                value={Number(overview.staff_without_mfa_count)}
                description="Aktive medarbejdere uden verificeret MFA-faktor."
              />
            </div>
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-lg font-semibold">
                Sessioner
              </h2>
              <p className="mt-1 text-sm text-black/50">
                Aktuelle Supabase Auth-sessioner for aktive medarbejdere.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Metric
                label="Aktive sessioner"
                value={Number(overview.active_session_count)}
              />

              <Metric
                label="AAL1"
                value={Number(overview.aal1_session_count)}
                description="Sessioner uden MFA step-up på AAL2-niveau."
              />

              <Metric
                label="AAL2"
                value={Number(overview.aal2_session_count)}
                description="Sessioner autentificeret på MFA-niveau."
              />
            </div>
          </section>

          <section>
            <div className="mb-3">
              <h2 className="text-lg font-semibold">
                Loginaktivitet
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Metric
                label="Login seneste 24 timer"
                value={Number(
                  overview.staff_signed_in_last_24h_count
                )}
                description="Aktive medarbejdere med login inden for de seneste 24 timer."
              />

              <Metric
                label="Seneste medarbejderlogin"
                value={formatDateTime(
                  overview.latest_staff_sign_in_at
                )}
              />
            </div>
          </section>

          <MfaEnrollment />

          {policyError ? (
            <section className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="font-semibold">
                Sikkerhedspolitikker kunne ikke indlæses
              </h2>

              <p className="mt-2 text-sm text-black/55">
                {policyError.message}
              </p>
            </section>
          ) : policies.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-black/15 bg-white p-6">
              <h2 className="font-semibold">
                Sikkerhedspolitikker
              </h2>

              <p className="mt-2 text-sm text-black/55">
                Ingen sikkerhedspolitikker er konfigureret.
              </p>
            </section>
          ) : (
            <SecurityPolicyEditor policies={policies} />
          )}
        </>
      )}
    </main>
  );
}
