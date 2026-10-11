export const SUPPORT_EMAIL_TEMPLATE_VERSION = "funktion360-support-v1";
export function escapeMailText(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
// Inline styles and presentation tables also work in clients that strip stylesheets.
// Plain user text is escaped; no arbitrary HTML or remote images are accepted.
export function renderSupportEmail(subject: string, body: string): string {
  const paragraphs = body
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map(
      (p) =>
        `<p style="margin:0 0 20px;font-size:16px;line-height:1.8;color:#293742;word-break:break-word">${escapeMailText(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  const title = escapeMailText(subject);
  const preheader = escapeMailText(body.replace(/\s+/g, " ").slice(0, 130));
  return `<!doctype html>
<html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#eef2f5;font-family:Arial,Helvetica,sans-serif;color:#172d3e">
<div style="display:none;font-size:1px;color:#eef2f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${preheader}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eef2f5"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:#fff;border:1px solid #dce4eb;border-radius:16px;overflow:hidden">
<tr><td style="padding:28px 28px;background:#142b3b;color:#fff;border-bottom:4px solid #8dccb8"><a href="https://funktion360.dk" style="color:#fff;text-decoration:none;font-size:25px;font-weight:bold;letter-spacing:-1px">funktion<span style="color:#a9dfcc">360</span></a><p style="margin:9px 0 0;color:#cfdae2;font-size:12px;letter-spacing:2px;text-transform:uppercase">Personlig kundeservice</p></td></tr>
<tr><td style="padding:32px 28px 12px"><p style="margin:0 0 12px;font-size:12px;color:#526978;text-transform:uppercase;letter-spacing:1px">Svar fra Funktion360</p><h1 style="margin:0 0 28px;font-size:24px;line-height:1.4;font-weight:bold;color:#172d3e;word-break:break-word">${title}</h1>${paragraphs}</td></tr>
<tr><td style="padding:4px 28px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #e3e9ee;padding-top:22px;font-size:14px;line-height:1.8;color:#526978">Venlig hilsen<br><strong style="color:#172d3e">Funktion360</strong><br>Kundeservice</td></tr></table></td></tr>
<tr><td style="padding:20px 28px;background:#f5f8fa;border-top:1px solid #e3e9ee"><p style="margin:0;font-size:13px;line-height:1.7;color:#526978">Har du flere spørgsmål? Besvar denne mail, så fortsætter vi samtalen.</p></td></tr>
</table><p style="margin:20px 0 0;font-size:12px;line-height:1.7;color:#657681">Funktion360 · <a href="https://funktion360.dk" style="color:#526978">funktion360.dk</a></p>
</td></tr></table></body></html>`;
}
