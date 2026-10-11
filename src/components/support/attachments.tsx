"use client";
import { useState } from "react";
import type { AttachmentInfo } from "@/lib/support/attachments";
export function MailAttachments({
  mailId,
  count,
}: {
  mailId: string;
  count: number;
}) {
  const [files, setFiles] = useState<AttachmentInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const base = `/api/support/inbox/${mailId}/attachments`;
  async function showFiles() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(base, {
        cache: "no-store",
        redirect: "error",
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Filoversigten kunne ikke hentes.");
      setFiles(result.files);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Filoversigten kunne ikke hentes.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function download(file: AttachmentInfo) {
    setDownloading(file.id);
    setError("");
    try {
      const response = await fetch(`${base}/${file.id}`, {
        cache: "no-store",
        redirect: "error",
      });
      if (!response.ok) {
        const result = await response.json();
        throw Error(result.error || "Download mislykkedes.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download mislykkedes.");
    } finally {
      setDownloading(null);
    }
  }
  return (
    <section
      className="support-attachments"
      aria-label="Vedhæftninger"
      aria-busy={loading}
    >
      <header>
        <div>
          <h3>Vedhæftninger</h3>
          <p className="support-muted">
            {count} {count === 1 ? "fil" : "filer"} · Download op til 4 MB pr.
            fil
          </p>
        </div>
        <button
          type="button"
          className="support-button support-secondary"
          onClick={showFiles}
          disabled={loading}
        >
          {loading ? "Henter filer…" : files ? "Opdatér" : "Vis filer"}
        </button>
      </header>
      {error && (
        <p className="support-notice" role="alert">
          {error}
        </p>
      )}
      {files && (
        <ul>
          {files.map((file) => (
            <li key={file.id}>
              <span className="support-file-icon" aria-hidden="true">
                ↓
              </span>
              <div>
                <strong>{file.filename}</strong>
                <small>
                  {(file.size / 1000000).toLocaleString("da-DK", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  MB
                </small>
              </div>
              <button
                type="button"
                className="support-button support-secondary"
                disabled={downloading !== null || file.size > 4000000}
                onClick={() => download(file)}
              >
                {file.size > 4000000
                  ? "Over 4 MB"
                  : downloading === file.id
                    ? "Henter…"
                    : "Download"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {files?.length === 0 && (
        <p className="support-muted">Ingen tilgængelige vedhæftninger.</p>
      )}
    </section>
  );
}
