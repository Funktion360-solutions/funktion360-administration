"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  runAdministrationHealthCheck,
  runFavn360HealthCheck,
  runSupabaseHealthCheck,
  runVercelHealthCheck,
} from "@/app/actions/systems";

type HealthSystem =
  | "funktion360-administration"
  | "favn360"
  | "supabase"
  | "vercel";

type Props = {
  system: HealthSystem;
  label?: string;
};

export function RunHealthCheckButton({
  system,
  label = "Kør health check",
}: Props) {
  const router = useRouter();

  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleRun() {
    if (running) return;

    setRunning(true);
    setMessage(null);
    setIsError(false);

    try {
      const result =
        system === "favn360"
          ? await runFavn360HealthCheck()
          : system === "supabase"
            ? await runSupabaseHealthCheck()
            : system === "vercel"
              ? await runVercelHealthCheck()
              : await runAdministrationHealthCheck();

      setMessage(
        result.status === "operational"
          ? `Kontrol gennemført · ${result.responseTimeMs} ms`
          : `Kontrol gennemført · ${result.status}`
      );

      router.refresh();
    } catch (error) {
      console.error("Health check failed", error);

      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Health check kunne ikke gennemføres."
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleRun}
        disabled={running}
        className="rounded-xl bg-[#202120] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {running ? "Kontrollerer…" : label}
      </button>

      {message ? (
        <p
          className={`max-w-sm text-right text-xs ${
            isError ? "text-red-700" : "text-black/50"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
