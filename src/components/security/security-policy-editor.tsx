"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type SecurityPolicy = {
  id: string;
  policy_key: string;
  name: string;
  description: string | null;
  policy_type: "boolean" | "integer" | "text";
  boolean_value: boolean | null;
  integer_value: number | null;
  text_value: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type SecurityPolicyEditorProps = {
  policies: SecurityPolicy[];
};

type EditState = {
  policy: SecurityPolicy;
  booleanValue: boolean;
  integerValue: string;
  textValue: string;
  reason: string;
};

function formatPolicyValue(policy: SecurityPolicy) {
  if (!policy.is_active) {
    return "Inaktiv";
  }

  if (policy.policy_type === "boolean") {
    return policy.boolean_value ? "Aktiv" : "Deaktiveret";
  }

  if (
    policy.policy_key === "impersonation_max_minutes" &&
    policy.integer_value !== null
  ) {
    return `${policy.integer_value} minutter`;
  }

  if (policy.policy_type === "integer") {
    return policy.integer_value?.toString() ?? "Ikke angivet";
  }

  return policy.text_value ?? "Ikke angivet";
}

export function SecurityPolicyEditor({
  policies,
}: SecurityPolicyEditorProps) {
  const router = useRouter();

  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function beginEdit(policy: SecurityPolicy) {
    setError(null);
    setSuccess(null);

    setEditing({
      policy,
      booleanValue: policy.boolean_value ?? false,
      integerValue:
        policy.integer_value !== null
          ? String(policy.integer_value)
          : "",
      textValue: policy.text_value ?? "",
      reason: "",
    });
  }

  function cancelEdit() {
    if (saving) {
      return;
    }

    setEditing(null);
    setError(null);
  }

  async function savePolicy() {
    if (!editing) {
      return;
    }

    const reason = editing.reason.trim();

    if (!reason) {
      setError("Du skal angive en begrundelse for ændringen.");
      return;
    }

    let integerValue: number | null = null;

    if (editing.policy.policy_type === "integer") {
      integerValue = Number(editing.integerValue);

      if (!Number.isInteger(integerValue)) {
        setError("Værdien skal være et helt tal.");
        return;
      }

      if (
        editing.policy.policy_key === "impersonation_max_minutes" &&
        (integerValue < 5 || integerValue > 120)
      ) {
        setError(
          "Impersonation-sessionen skal være mellem 5 og 120 minutter."
        );
        return;
      }
    }

    if (
      editing.policy.policy_type === "text" &&
      !editing.textValue.trim()
    ) {
      setError("Tekstværdien må ikke være tom.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();

    const { error: updateError } = await supabase.rpc(
      "update_crm_security_policy",
      {
        target_policy_key: editing.policy.policy_key,
        new_boolean_value:
          editing.policy.policy_type === "boolean"
            ? editing.booleanValue
            : null,
        new_integer_value:
          editing.policy.policy_type === "integer"
            ? integerValue
            : null,
        new_text_value:
          editing.policy.policy_type === "text"
            ? editing.textValue.trim()
            : null,
        change_reason: reason,
      }
    );

    if (updateError) {
      console.error("Security policy update failed", {
        policy: editing.policy.policy_key,
        code: updateError.code,
        message: updateError.message,
      });

      if (
        updateError.message
          .toLowerCase()
          .includes("mfa step-up required")
      ) {
        setError(
          "Din session er ikke længere verificeret på AAL2-niveau. Log ind med MFA igen."
        );
      } else {
        setError(
          "Sikkerhedspolitikken kunne ikke ændres. Ingen ændring blev gemt."
        );
      }

      setSaving(false);
      return;
    }

    const changedPolicyName = editing.policy.name;

    setEditing(null);
    setSaving(false);
    setSuccess(
      `${changedPolicyName} blev opdateret og registreret i auditloggen.`
    );

    router.refresh();
  }

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-semibold">
          Sikkerhedspolitikker
        </h2>

        <p className="mt-1 max-w-3xl text-sm leading-6 text-black/50">
          Centrale sikkerhedsregler for medarbejderadgang,
          step-up authentication og impersonation.
        </p>
      </div>

      {success ? (
        <div
          role="status"
          className="mb-3 rounded-xl border border-black/10 bg-[#cfff69]/35 px-4 py-3 text-sm"
        >
          {success}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {policies.map((policy) => (
          <article
            key={policy.id}
            className="rounded-2xl border border-black/10 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold">
                  {policy.name}
                </h3>

                {policy.description ? (
                  <p className="mt-2 text-sm leading-6 text-black/55">
                    {policy.description}
                  </p>
                ) : null}
              </div>

              <span
                className={[
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                  policy.policy_type === "boolean" &&
                  policy.boolean_value === true &&
                  policy.is_active
                    ? "bg-[#cfff69] text-[#202120]"
                    : "border border-black/10 bg-black/[0.03] text-black/60",
                ].join(" ")}
              >
                {formatPolicyValue(policy)}
              </span>
            </div>

            <div className="mt-4 flex items-end justify-between gap-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/35">
                {policy.policy_key}
              </p>

              <button
                type="button"
                onClick={() => beginEdit(policy)}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium transition hover:bg-black/[0.04]"
              >
                Rediger
              </button>
            </div>
          </article>
        ))}
      </div>

      {editing ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
          role="presentation"
          data-security-policy-modal="true"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="security-policy-dialog-title"
            className="w-full max-w-lg rounded-2xl bg-[#f7f7f3] p-6 shadow-xl"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/40">
              Sikkerhedspolitik
            </p>

            <h3
              id="security-policy-dialog-title"
              className="mt-2 text-xl font-semibold"
            >
              {editing.policy.name}
            </h3>

            {editing.policy.description ? (
              <p className="mt-2 text-sm leading-6 text-black/55">
                {editing.policy.description}
              </p>
            ) : null}

            <div className="mt-6">
              {editing.policy.policy_type === "boolean" ? (
                <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold">
                      Policy-status
                    </p>

                    <p className="mt-1 text-xs text-black/50">
                      {editing.booleanValue
                        ? "Politikken er aktiveret."
                        : "Politikken er deaktiveret."}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={editing.booleanValue}
                    onClick={() =>
                      setEditing((current) =>
                        current
                          ? {
                              ...current,
                              booleanValue:
                                !current.booleanValue,
                            }
                          : current
                      )
                    }
                    className={[
                      "relative h-7 w-12 shrink-0 rounded-full transition",
                      editing.booleanValue
                        ? "bg-[#202120]"
                        : "bg-black/15",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-1 h-5 w-5 rounded-full bg-white transition",
                        editing.booleanValue
                          ? "left-6"
                          : "left-1",
                      ].join(" ")}
                    />
                  </button>
                </div>
              ) : null}

              {editing.policy.policy_type === "integer" ? (
                <div>
                  <label
                    htmlFor="security-policy-integer"
                    className="block text-sm font-semibold"
                  >
                    Værdi
                  </label>

                  <input
                    id="security-policy-integer"
                    type="number"
                    min={
                      editing.policy.policy_key ===
                      "impersonation_max_minutes"
                        ? 5
                        : undefined
                    }
                    max={
                      editing.policy.policy_key ===
                      "impersonation_max_minutes"
                        ? 120
                        : undefined
                    }
                    step={1}
                    value={editing.integerValue}
                    onChange={(event) =>
                      setEditing((current) =>
                        current
                          ? {
                              ...current,
                              integerValue:
                                event.target.value,
                            }
                          : current
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-black/15 bg-white px-3 outline-none focus:border-black/40"
                  />

                  {editing.policy.policy_key ===
                  "impersonation_max_minutes" ? (
                    <p className="mt-2 text-xs text-black/45">
                      Tilladt interval: 5–120 minutter.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {editing.policy.policy_type === "text" ? (
                <div>
                  <label
                    htmlFor="security-policy-text"
                    className="block text-sm font-semibold"
                  >
                    Værdi
                  </label>

                  <input
                    id="security-policy-text"
                    type="text"
                    value={editing.textValue}
                    onChange={(event) =>
                      setEditing((current) =>
                        current
                          ? {
                              ...current,
                              textValue:
                                event.target.value,
                            }
                          : current
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-black/15 bg-white px-3 outline-none focus:border-black/40"
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-6">
              <label
                htmlFor="security-policy-reason"
                className="block text-sm font-semibold"
              >
                Begrundelse
              </label>

              <textarea
                id="security-policy-reason"
                value={editing.reason}
                onChange={(event) =>
                  setEditing((current) =>
                    current
                      ? {
                          ...current,
                          reason: event.target.value,
                        }
                      : current
                  )
                }
                rows={3}
                placeholder="Hvorfor ændres denne sikkerhedspolitik?"
                className="mt-2 w-full resize-none rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-black/40"
              />

              <p className="mt-2 text-xs leading-5 text-black/45">
                Begrundelsen registreres permanent sammen med ændringen
                i auditloggen.
              </p>
            </div>

            {error ? (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-900/10 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/[0.04] disabled:opacity-50"
              >
                Annuller
              </button>

              <button
                type="button"
                onClick={savePolicy}
                disabled={saving || !editing.reason.trim()}
                className="rounded-xl bg-[#202120] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Gemmer…" : "Gem ændring"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
