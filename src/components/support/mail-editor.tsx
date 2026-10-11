"use client";
import { useDeferredValue, useState } from "react";
import { renderSupportEmail } from "@/lib/support/email-template";
export function MailEditor({ initialSubject }: { initialSubject: string }) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const previewSubject = useDeferredValue(subject);
  const previewBody = useDeferredValue(body);
  return (
    <>
      <label>
        Emne
        <input
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          required
        />
      </label>
      <label>
        Besked
        <textarea
          name="body"
          rows={10}
          maxLength={20000}
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Skriv dit svar til kunden…"
        />
      </label>
      <div className="support-editor-footer">
        <p className="support-muted">
          Afsnit og linjeskift bevares. Funktion360-design og signatur tilføjes
          automatisk.
        </p>
        <button
          type="button"
          className="support-button support-secondary"
          aria-expanded={preview}
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Skjul mailvisning" : "Se mailens udseende"}
        </button>
      </div>
      {preview && (
        <section className="support-email-preview">
          <p className="support-eyebrow">Forhåndsvisning · Ikke afsendt</p>
          <iframe
            title="Forhåndsvisning af din mail"
            sandbox=""
            referrerPolicy="no-referrer"
            srcDoc={renderSupportEmail(
              previewSubject || "Dit emne",
              previewBody || "Din besked vises her.",
            )}
          />
        </section>
      )}
    </>
  );
}
