"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status =
  | "loading"
  | "ready"
  | "enrolling"
  | "verifying"
  | "error";

type Enrollment = {
  factorId: string;
  qrCode: string;
};

export default function MfaSetupPage() {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("loading");
  const [enrollment, setEnrollment] =
    useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: policyData, error: policyError } =
        await supabase.rpc("get_crm_auth_policy");

      if (cancelled) return;

      if (policyError || !policyData || policyData.length !== 1) {
        await supabase.auth.signOut();
        router.replace("/login?error=unauthorized");
        return;
      }

      const mfaRequired =
        policyData[0].staff_mfa_required === true;

      if (!mfaRequired) {
        router.replace("/");
        router.refresh();
        return;
      }

      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (cancelled) return;

      if (assuranceError) {
        setError(
          "Kunne ikke kontrollere sessionens sikkerhedsniveau."
        );
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

      if (verifiedTotp) {
        router.replace("/login/mfa");
        router.refresh();
        return;
      }

      setStatus("ready");
    }

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function startEnrollment() {
    setStatus("enrolling");
    setError(null);

    const supabase = createClient();

    const { data, error: enrollError } =
      await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Funktion360 Administration",
      });

    if (enrollError) {
      setError(
        "MFA kunne ikke klargøres. Prøv igen."
      );
      setStatus("ready");
      return;
    }

    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
    });

    setStatus("enrolling");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!enrollment) return;

    const normalizedCode = code.replace(/\D/g, "");

    if (!/^\d{6}$/.test(normalizedCode)) {
      setError(
        "Indtast den 6-cifrede kode fra din authenticator-app."
      );
      return;
    }

    setStatus("verifying");
    setError(null);

    const supabase = createClient();

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: enrollment.factorId,
      });

    if (challengeError) {
      setError("MFA-challenge kunne ikke oprettes.");
      setStatus("enrolling");
      return;
    }

    const { error: verifyError } =
      await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId: challenge.id,
        code: normalizedCode,
      });

    if (verifyError) {
      setError(
        "Koden er ugyldig eller udløbet. Prøv igen."
      );
      setStatus("enrolling");
      return;
    }

    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (
      assuranceError ||
      assurance.currentLevel !== "aal2"
    ) {
      setError(
        "MFA blev aktiveret, men sessionen kunne ikke bekræftes som AAL2."
      );
      setStatus("enrolling");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#202120] px-5 py-10">
      <section className="w-full max-w-[520px] rounded-[26px] bg-[#f7f7f3] px-8 py-10 shadow-sm sm:px-12 sm:py-12">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#78983f]">
          Funktion360
        </p>

        <h1 className="mt-4 text-[42px] font-semibold leading-none tracking-[-0.045em] text-[#202120] sm:text-[52px]">
          Opsæt MFA
        </h1>

        <p className="mt-4 text-[15px] leading-6 text-[#73736e]">
          Funktion360 kræver multifaktorautentificering for
          medarbejdere. Opsæt din authenticator-app for at få
          adgang til Administration.
        </p>

        {status === "loading" ? (
          <p className="mt-10 text-sm text-[#73736e]">
            Kontrollerer sikkerhedspolitik…
          </p>
        ) : null}

        {status === "ready" ? (
          <div className="mt-10">
            <button
              type="button"
              onClick={startEnrollment}
              className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#cfff69] px-5 text-[15px] font-semibold text-[#202120] transition hover:bg-[#c5f75f]"
            >
              Opsæt authenticator
            </button>
          </div>
        ) : null}

        {(status === "enrolling" ||
          status === "verifying") &&
        enrollment ? (
          <div className="mt-8">
            <p className="text-sm font-semibold text-[#444440]">
              1. Scan QR-koden
            </p>

            <p className="mt-2 text-sm leading-6 text-[#73736e]">
              Scan koden med din authenticator-app.
            </p>

            <div className="mt-4 w-fit rounded-xl border border-black/10 bg-white p-3">
              <img
                src={enrollment.qrCode}
                alt="QR-kode til Funktion360 MFA"
                width={220}
                height={220}
              />
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-7"
            >
              <label
                htmlFor="mfa-setup-code"
                className="mb-2 block text-sm font-semibold text-[#444440]"
              >
                2. Indtast sikkerhedskoden
              </label>

              <input
                id="mfa-setup-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  )
                }
                disabled={status === "verifying"}
                placeholder="000000"
                className="h-[58px] w-full rounded-xl border border-[#d3d3ca] bg-white px-4 text-center font-mono text-xl tracking-[0.35em] text-[#202120] outline-none transition focus:border-[#202120] focus:ring-2 focus:ring-[#cfff69]/40 disabled:opacity-60"
                required
              />

              <button
                type="submit"
                disabled={
                  status === "verifying" ||
                  code.length !== 6
                }
                className="mt-5 flex h-[52px] w-full items-center justify-center rounded-full bg-[#cfff69] px-5 text-[15px] font-semibold text-[#202120] transition hover:bg-[#c5f75f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "verifying"
                  ? "Aktiverer…"
                  : "Aktivér MFA"}
              </button>
            </form>
          </div>
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
          <button
            type="button"
            onClick={signOut}
            className="text-sm font-medium text-[#73736e] underline decoration-black/20 underline-offset-4"
          >
            Log ud
          </button>
        </div>
      </section>
    </main>
  );
}
