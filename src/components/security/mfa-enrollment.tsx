"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MfaState =
  | "loading"
  | "not-enrolled"
  | "enrolling"
  | "enrolled"
  | "error";

type Enrollment = {
  factorId: string;
  qrCode: string;
};

export function MfaEnrollment() {
  const router = useRouter();

  const [state, setState] = useState<MfaState>("loading");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMfaStatus() {
      const supabase = createClient();

      const { data, error } = await supabase.auth.mfa.listFactors();

      if (cancelled) {
        return;
      }

      if (error) {
        setMessage("MFA-status kunne ikke indlæses.");
        setState("error");
        return;
      }

      const hasVerifiedTotp = data.totp.some(
        (factor) => factor.status === "verified"
      );

      setState(hasVerifiedTotp ? "enrolled" : "not-enrolled");
    }

    void loadMfaStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  async function startEnrollment() {
    setBusy(true);
    setMessage(null);

    const supabase = createClient();

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Funktion360 Administration",
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
    });

    setState("enrolling");
    setBusy(false);
  }

  async function verifyEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enrollment) {
      return;
    }

    const code = verificationCode.replace(/\s/g, "");

    if (!/^\d{6}$/.test(code)) {
      setMessage("Indtast den 6-cifrede kode fra din authenticator-app.");
      return;
    }

    setBusy(true);
    setMessage(null);

    const supabase = createClient();

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: enrollment.factorId,
      });

    if (challengeError) {
      setMessage(challengeError.message);
      setBusy(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrollment.factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      setMessage(
        "Koden kunne ikke verificeres. Kontrollér koden og prøv igen."
      );
      setBusy(false);
      return;
    }

    setVerificationCode("");
    setEnrollment(null);
    setState("enrolled");
    setMessage("MFA er aktiveret, og sessionen er opgraderet til AAL2.");
    setBusy(false);

    router.refresh();
  }

  if (state === "loading") {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <p className="text-sm text-black/55">Kontrollerer MFA-status…</p>
      </section>
    );
  }

  if (state === "enrolled") {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-semibold">Multifaktorautentificering</h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
              Din medarbejderkonto har en verificeret TOTP-faktor.
            </p>

            {message ? (
              <p className="mt-3 text-sm font-medium">{message}</p>
            ) : null}
          </div>

          <span className="w-fit rounded-full border border-black/10 px-2.5 py-1 text-xs font-medium">
            MFA aktiveret
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div>
        <h2 className="font-semibold">Multifaktorautentificering</h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
          Beskyt din administrative konto med en authenticator-app. MFA bliver
          senere påkrævet ved sikkerhedskritiske handlinger.
        </p>
      </div>

      {state === "not-enrolled" ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={startEnrollment}
            disabled={busy}
            className="rounded-xl bg-[#202120] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Forbereder…" : "Opsæt MFA"}
          </button>
        </div>
      ) : null}

      {state === "enrolling" && enrollment ? (
        <div className="mt-6 max-w-md">
          <p className="text-sm font-medium">
            1. Scan QR-koden med din authenticator-app
          </p>

          <div className="mt-3 w-fit rounded-xl border border-black/10 bg-white p-3">
            <img
              src={enrollment.qrCode}
              alt="QR-kode til Funktion360 MFA"
              width={220}
              height={220}
            />
          </div>

          <form onSubmit={verifyEnrollment} className="mt-5">
            <label
              htmlFor="mfa-code"
              className="block text-sm font-medium"
            >
              2. Indtast den 6-cifrede kode
            </label>

            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={verificationCode}
              onChange={(event) =>
                setVerificationCode(
                  event.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 font-mono text-lg tracking-[0.25em] outline-none focus:border-black/40"
              placeholder="000000"
              required
            />

            <button
              type="submit"
              disabled={busy || verificationCode.length !== 6}
              className="mt-3 rounded-xl bg-[#202120] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Verificerer…" : "Aktivér MFA"}
            </button>
          </form>
        </div>
      ) : null}

      {message ? (
        <p
          role={state === "error" ? "alert" : undefined}
          className="mt-4 text-sm text-black/65"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
