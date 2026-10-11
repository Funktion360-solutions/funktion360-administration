"use client";
import { useFormStatus } from "react-dom";
export function SubmitMail({
  disabled = false,
  label = "Send mail til kunden",
}: {
  disabled?: boolean;
  label?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className="support-button"
      type="submit"
      disabled={disabled || pending}
    >
      {pending ? "Afventer bekræftelse…" : label}
    </button>
  );
}
