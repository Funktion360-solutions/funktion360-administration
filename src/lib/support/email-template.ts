export const SUPPORT_EMAIL_TEMPLATE_VERSION = "funktion360-support-v2";
export function escapeMailText(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function renderSupportEmail(
  subject: string,
  body: string,
  supportId?: string,
): string {
  const paragraphs = body
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map(
      (p) =>
        `<p style="margin:0 0 20px;font-size:16px;line-height:1.85;color:#344352;word-break:break-word">${escapeMailText(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  const title = escapeMailText(subject),
    preheader = escapeMailText(body.replace(/\s+/g, " ").slice(0, 130));
  const reference = supportId ? escapeMailText(supportId) : "";
  const supportHeading = reference
    ? `<p style="margin:20px 0 0;font-size:12px;letter-spacing:1px;color:#b9dfe7">SUPPORT-ID&nbsp; <strong style="color:#fff;letter-spacing:1px">${reference}</strong></p>`
    : "";
  const supportFooter = reference
    ? `<p style="margin:0 0 10px;font-size:13px;color:#445e71">Support-ID: <strong style="color:#162b3d">${reference}</strong></p>`
    : "";
  return `<!doctype html>
<html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#eaf0f5;font-family:Arial,Helvetica,sans-serif;color:#162b3d">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${preheader}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#eaf0f5" style="background:#eaf0f5"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" bgcolor="#ffffff" style="width:100%;max-width:620px;background:#fff;border:1px solid #d8e3ec;border-radius:20px;overflow:hidden">
<tr><td bgcolor="#112a3c" style="padding:30px 26px;background:#112a3c;border-radius:20px 20px 0 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="color:#fff;font-size:30px;line-height:1.2;font-weight:bold;letter-spacing:-1.2px"><a href="https://funktion360.dk" style="color:#fff;text-decoration:none">funktion<span style="color:#8fdfc8">360</span></a></td><td align="right" style="font-size:11px;letter-spacing:1px;color:#bdd3e1">KUNDESERVICE</td></tr></table>
<p style="margin:24px 0 0;font-size:22px;line-height:1.4;font-weight:bold;color:#ffffff">Vi er her for at hjælpe.</p>
<p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:#c2d7e4">Et personligt svar fra Funktion360.</p>${supportHeading}</td></tr>
<tr><td height="5" bgcolor="#8fdfc8" style="height:5px;background:#8fdfc8;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:32px 26px 10px"><p style="margin:0 0 10px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#52738a">DIN HENVENDELSE</p><h1 style="margin:0 0 26px;font-size:24px;line-height:1.45;font-weight:bold;color:#162b3d;word-break:break-word">${title}</h1>${paragraphs}</td></tr>
<tr><td style="padding:4px 26px 30px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-top:1px solid #e0e9f0;padding-top:22px;font-size:14px;line-height:1.85;color:#536b7b">Venlig hilsen<br><strong style="font-size:16px;color:#162b3d">Funktion360 Kundeservice</strong><br><span style="font-size:13px">Sammen finder vi en løsning.</span></td></tr></table></td></tr>
<tr><td bgcolor="#eff6f9" style="padding:24px 26px;background:#eff6f9;border-top:1px solid #dce8ee">
<p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#214960">Vil du fortsætte samtalen?</p><p style="margin:0;font-size:14px;line-height:1.8;color:#536b7b">Tryk på svar i dit mailprogram. Din besked sendes tilbage til os og kan knyttes til den samme supportsag.</p></td></tr>
<tr><td style="padding:22px 26px;background:#ffffff;border-radius:0 0 20px 20px">${supportFooter}<p style="margin:0;font-size:12px;line-height:1.8;color:#647b8b">Gem gerne dit Support-ID, hvis du kontakter os igen. Denne mail vedrører din henvendelse til Funktion360. Hvis du har modtaget den ved en fejl, kan du give os besked ved at svare på mailen.</p></td></tr>
</table><p style="margin:20px 0 0;font-size:12px;line-height:1.8;color:#62798a"><a href="https://funktion360.dk" style="color:#41627a;text-decoration:none;font-weight:bold">Funktion360</a> &nbsp;·&nbsp; Personlig hjælp på tværs af vores produkter</p>
</td></tr></table></body></html>`;
}
