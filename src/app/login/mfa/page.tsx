"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "loading" | "ready" | "verifying" | "error";

export default function MfaChallengePage() {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      const supabase = createClient();

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !userData.user) {
        router.replace("/login");
        return;
      }

      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (cancelled) return;

      if (assuranceError) {
        setError("Kunne ikke kontrollere sessionens sikkerhedsniveau.");
        setStatus("error");
        return;
      }

      if (assurance.currentLevel === "aal2") {
        router.replace("/");
        router.refresh();
        return;
      }

      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (cancelled) return;

      if (factorsError) {
        setError("Kunne ikke hente MFA-faktorer.");
        setStatus("error");
        return;
      }

      const verifiedTotp = factors.totp.find(
        (factor) => factor.status === "verified"
      );

      if (!verifiedTotp) {
        router.replace("/login/mfa/setup");
        router.refresh();
        return;
      }

      setFactorId(verifiedTotp.id);
      setStatus("ready");
    }

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!factorId) return;

    const normalizedCode = code.replace(/\D/g, "");

    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("Indtast den 6-cifrede kode fra din authenticator-app.");
      return;
    }

    setStatus("verifying");
    setError(null);

    const supabase = createClient();

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId,
      });

    if (challengeError) {
      setError("MFA-challenge kunne ikke oprettes.");
      setStatus("ready");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: normalizedCode,
    });

    if (verifyError) {
      setError("Koden er ugyldig eller udløbet. Prøv igen.");
      setStatus("ready");
      return;
    }

    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (
      assuranceError ||
      assurance.currentLevel !== "aal2"
    ) {
      setError(
        "MFA blev verificeret, men sessionen kunne ikke bekræftes som AAL2."
      );
      setStatus("ready");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#202120] px-5 py-10">
      <section className="w-full max-w-[520px] rounded-[26px] bg-[#f7f7f3] px-8 py-10 shadow-sm sm:px-12 sm:py-12">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#78983f]">
          Funktion360
        </p>

        <h1 className="mt-4 text-[42px] font-semibold leading-none tracking-[-0.045em] text-[#202120] sm:text-[52px]">
          Bekræft login
        </h1>

        <p className="mt-4 text-[15px] leading-6 text-[#73736e]">
          Indtast koden fra din authenticator-app for at fortsætte til
          Administration.
        </p>

        {status === "loading" ? (
          <div className="mt-10">
            <p className="text-sm text-[#73736e]">
              Kontrollerer session…
            </p>
          </div>
        ) : null}

        {(status === "ready" || status === "verifying") && factorId ? (
          <form onSubmit={handleSubmit} className="mt-10">
            <label
              htmlFor="mfa-login-code"
              className="mb-2 block text-sm font-semibold text-[#444440]"
            >
              6-cifret sikkerhedskode
            </label>

            <input
              id="mfa-login-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              className="h-[58px] w-full rounded-xl border border-[#d3d3ca] bg-white px-4 text-center font-mono text-xl tracking-[0.35em] text-[#202120] outline-none transition focus:border-[#202120] focus:ring-2 focus:ring-[#cfff69]/40 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="000000"
              disabled={status === "verifying"}
              autoFocus
              required
            />

            <button
              type="submit"
              disabled={status === "verifying" || code.length !== 6}
              className="mt-5 flex h-[52px] w-full items-center justify-center rounded-full bg-[#cfff69] px-5 text-[15px] font-semibold text-[#202120] transition hover:bg-[#c5f75f] focus:outline-none focus:ring-2 focus:ring-[#202120] focus:ring-offset-2 focus:ring-offset-[#f7f7f3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "verifying"
                ? "Bekræfter…"
                : "Bekræft og log ind"}
            </button>
          </form>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-900/10 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-8 border-t border-black/10 pt-5">
          <p className="text-xs leading-5 text-[#85857f]">
            Multifaktorautentificering beskytter adgangen til Funktion360
            Administration.
          </p>
        </div>
      </section>
    </main>
  );
}
