"use client";

import { useState, useTransition } from "react";

import { runFavn360IdentitySync } from "@/app/actions/systems";

export function RunFavn360SyncButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function handleSync() {
    setMessage(null);
    setIsError(false);

    startTransition(async () => {
      try {
        const { result } = await runFavn360IdentitySync();

        setMessage(
          `${result.recordsSucceeded} synkroniseret` +
            (result.recordsFailed > 0
              ? ` · ${result.recordsFailed} fejlet`
              : "")
        );
      } catch (error) {
        console.error("Manual Favn360 sync failed", error);

        setIsError(true);
        setMessage(
          "Synkroniseringen kunne ikke gennemføres"
        );
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        className="rounded-xl bg-[#202120] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending
          ? "Synkroniserer…"
          : "Synkroniser Favn360"}
      </button>

      {message ? (
        <p
          className={`text-xs ${
            isError
              ? "text-red-700"
              : "text-black/50"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
