"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (signInError) {
      setError("Login mislykkedes. Kontrollér e-mail og adgangskode.");
      setLoading(false);
      return;
    }

    /*
     * Validate that the authenticated account belongs to an active
     * Funktion360 staff user before evaluating authentication policy.
     */
    const { data: staffData, error: staffError } =
      await supabase.rpc("get_current_staff_status");

    if (
      staffError ||
      !staffData ||
      staffData.length !== 1
    ) {
      await supabase.auth.signOut();

      setError(
        "Din konto har ikke adgang til Funktion360 Administration."
      );
      setLoading(false);
      return;
    }

    /*
     * The CRM security policy is authoritative for whether staff MFA
     * is required. The database function fails closed if the policy
     * is unavailable.
     */
    const { data: policyData, error: policyError } =
      await supabase.rpc("get_crm_auth_policy");

    if (
      policyError ||
      !policyData ||
      policyData.length !== 1
    ) {
      await supabase.auth.signOut();

      setError(
        "Sikkerhedspolitikken kunne ikke kontrolleres. Prøv igen."
      );
      setLoading(false);
      return;
    }

    const mfaRequired =
      policyData[0].staff_mfa_required === true;

    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (assuranceError) {
      await supabase.auth.signOut();

      setError(
        "Login lykkedes, men sikkerhedsniveauet kunne ikke kontrolleres. Prøv igen."
      );
      setLoading(false);
      return;
    }

    /*
     * An existing AAL2 session already satisfies the MFA policy.
     */
    if (assurance.currentLevel === "aal2") {
      router.replace("/");
      router.refresh();
      return;
    }

    /*
     * When MFA is not required, an AAL1 session may enter
     * Administration.
     */
    if (!mfaRequired) {
      router.replace("/");
      router.refresh();
      return;
    }

    /*
     * MFA is required. A verified factor means the user must complete
     * the normal MFA challenge before entering Administration.
     */
    if (assurance.nextLevel === "aal2") {
      router.replace("/login/mfa");
      router.refresh();
      return;
    }

    /*
     * MFA is required but no verified factor exists. The employee must
     * enroll MFA before Administration becomes accessible.
     */
    router.replace("/login/mfa/setup");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#202120] px-5 py-10">
      <section className="w-full max-w-[520px] rounded-[26px] bg-[#f7f7f3] px-8 py-10 shadow-sm sm:px-12 sm:py-12">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#78983f]">
          Funktion360
        </p>

        <h1 className="mt-4 text-[42px] font-semibold leading-none tracking-[-0.045em] text-[#202120] sm:text-[52px]">
          Administration
        </h1>

        <p className="mt-4 text-[15px] leading-6 text-[#73736e]">
          Log ind for at administrere Funktion360.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-[#444440]"
            >
              E-mail
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              className="h-[52px] w-full rounded-xl border border-[#d3d3ca] bg-white px-4 text-base text-[#202120] outline-none transition focus:border-[#202120] focus:ring-2 focus:ring-[#cfff69]/40 disabled:cursor-not-allowed disabled:opacity-60"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-[#444440]"
            >
              Adgangskode
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              className="h-[52px] w-full rounded-xl border border-[#d3d3ca] bg-white px-4 text-base text-[#202120] outline-none transition focus:border-[#202120] focus:ring-2 focus:ring-[#cfff69]/40 disabled:cursor-not-allowed disabled:opacity-60"
              required
            />
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-900/10 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-[52px] w-full items-center justify-center rounded-full bg-[#cfff69] px-5 text-[15px] font-semibold text-[#202120] transition hover:bg-[#c5f75f] focus:outline-none focus:ring-2 focus:ring-[#202120] focus:ring-offset-2 focus:ring-offset-[#f7f7f3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logger ind…" : "Log ind"}
          </button>
        </form>
      </section>
    </main>
  );
}
