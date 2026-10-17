// ─────────────────────────────────────────────────────────────────────────────
// xSypher email template system
// ─────────────────────────────────────────────────────────────────────────────
//
// Table-safe, responsive HTML email architecture for the
// invitation, welcome and digest templates.
//
// Design constraints that shaped every choice below:
//  • Tables, not divs — Outlook (Word rendering engine) ignores
//    flexbox/grid, so the layout is a 600px table stack.
//  • Inline styles — Gmail strips <style> blocks in many contexts;
//    every critical style is inline, with <style> used only for
//    the two things it cannot do: media queries and prefers-color-scheme.
//  • The 4-boxes mark is rendered as a nested table of coloured
//    cells, not an SVG or an image — the one logo technique that
//    renders identically in every client from Outlook 2007 up.
//  • Dark/light compatibility: the default scheme is the
//    publication's dark ink; a prefers-color-scheme: light block
//    flips the surfaces for clients that honour it. Clients that
//    strip the block keep the dark default, which is the brand's
//    native environment.
// ─────────────────────────────────────────────────────────────────────────────

export const EMAIL_BRAND = {
  crimson: "#f04552",
  crimsonDeep: "#b91c1c",
  ink: "#f4f4f5",
  muted: "#a1a1aa",
  faint: "#6b7280",
  surface: "#0c0d10",
  surface2: "#14171c",
  line: "#26292f",
  cell: "#2b2e35",
  cellSoft: "#3a3d45",
} as const;

/** The official publication social profiles, in display order. */
const SOCIAL_LINKS = [
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61594767646306" },
  { label: "Threads", href: "https://www.threads.net/@thexsypher" },
  { label: "Instagram", href: "https://www.instagram.com/thexsypher" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/xsypher/" },
  { label: "X", href: "https://x.com/ThexSypher" },
  { label: "Reddit", href: "https://www.reddit.com/r/xsypher/" },
] as const;

/**
 * The 4-boxes xSypher mark + wordmark, as a table.
 * Three neutral quadrants and the crimson quadrant carrying
 * the X — the same geometry the site logo renders.
 */
export function emailLogo({ compact = false }: { compact?: boolean } = {}): string {
  const cell = compact ? 10 : 13;
  const textSize = compact ? 17 : 21;
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:2px;">
        <tr>
          <td width="${cell}" height="${cell}" bgcolor="${EMAIL_BRAND.cell}" style="border-radius:2px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="${cell}" height="${cell}" bgcolor="${EMAIL_BRAND.cellSoft}" style="border-radius:2px;line-height:0;font-size:0;">&nbsp;</td>
        </tr>
        <tr>
          <td width="${cell}" height="${cell}" bgcolor="${EMAIL_BRAND.cellSoft}" style="border-radius:2px;line-height:0;font-size:0;">&nbsp;</td>
          <td width="${cell}" height="${cell}" bgcolor="${EMAIL_BRAND.crimson}" style="border-radius:2px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:${Math.round(cell * 0.62)}px;font-weight:bold;text-align:center;line-height:${cell}px;">X</td>
        </tr>
      </table>
    </td>
    <td style="padding:0 0 0 ${compact ? 6 : 8}px;">&nbsp;</td>
    <td style="padding:0;">
      <span style="font-family:Arial,Helvetica,sans-serif;font-size:${textSize}px;font-weight:bold;letter-spacing:-0.02em;color:${EMAIL_BRAND.ink};">x<span style="color:${EMAIL_BRAND.crimson};">Sypher</span></span>
    </td>
  </tr>
</table>`;
}

/**
 * The six official social profiles as linked pills. Each pill
 * carries the platform name as real text — the bulletproof
 * label every client renders — so the row never depends on
 * image or SVG support.
 */
export function emailSocialRow(): string {
  const pills = SOCIAL_LINKS.map(
    ({ label, href }) =>
      `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 3px;padding:6px 10px;border:1px solid ${EMAIL_BRAND.line};border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.06em;color:${EMAIL_BRAND.muted};text-decoration:none;">${label}</a>`,
  ).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;"><tr><td style="padding:0;">${pills}</td></tr></table>`;
}

/** A small uppercase section label, in the console's telemetry voice. */
function sectionLabel(text: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:bold;letter-spacing:0.22em;text-transform:uppercase;color:${EMAIL_BRAND.faint};margin:0 0 6px 0;">${text}</div>`;
}

/**
 * Structured metadata pill — "ASSIGNED ROLE: AUTHOR" — so the
 * invitation's facts are machine-readable at a glance.
 */
export function emailMetaPill(label: string, value: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
  <tr>
    <td style="padding:10px 14px;background:${EMAIL_BRAND.surface2};border:1px solid ${EMAIL_BRAND.line};border-radius:6px;">
      ${sectionLabel(label)}
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${EMAIL_BRAND.ink};letter-spacing:0.04em;">${value}</div>
    </td>
  </tr>
</table>`;
}

export interface EmailShellOptions {
  /** Hidden preheader text shown next to the subject in inbox lists. */
  preheader?: string;
  title: string;
  bodyHtml: string;
  /** Primary call-to-action; rendered as a high-contrast crimson button. */
  cta?: { label: string; href: string };
  /** Rendered under the CTA — the plain-text URL fallback. */
  ctaPlainTextUrl?: string;
  footerNote?: string;
  siteUrl: string;
  unsubscribeUrl?: string;
}

/**
 * The executive shell every transactional and newsletter email
 * renders inside: brand header, title, body slot, CTA slot and
 * the compliant footer with social row and one-click unsubscribe.
 */
export function emailShell({
  preheader,
  title,
  bodyHtml,
  cta,
  ctaPlainTextUrl,
  footerNote,
  siteUrl,
  unsubscribeUrl,
}: EmailShellOptions): string {
  const ctaBlock = cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:28px auto 0 auto;">
        <tr>
          <td align="center" bgcolor="${EMAIL_BRAND.crimson}" style="border-radius:8px;box-shadow:0 6px 18px rgba(240,69,82,0.35);">
            <a href="${cta.href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 34px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;letter-spacing:0.02em;color:#ffffff;text-decoration:none;">${cta.label}</a>
          </td>
        </tr>
      </table>
      ${ctaPlainTextUrl ? `<p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:${EMAIL_BRAND.faint};text-align:center;word-break:break-all;">If the button above does not work, open this address directly:<br><a href="${ctaPlainTextUrl}" style="color:${EMAIL_BRAND.muted};text-decoration:underline;">${ctaPlainTextUrl}</a></p>` : ""}`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${title}</title>
  <!--[if mso]>
  <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  <![endif]-->
  <style>
    @media only screen and (max-width: 620px) {
      .xsypher-email-container { width: 100% !important; }
      .xsypher-email-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
    @media (prefers-color-scheme: light) {
      .xsypher-email-bg { background-color: #f4f4f5 !important; }
      .xsypher-email-card { background-color: #ffffff !important; border-color: #e4e4e7 !important; }
      .xsypher-email-ink { color: #18181b !important; }
      .xsypher-email-muted { color: #52525b !important; }
      .xsypher-email-faint { color: #71717a !important; }
      .xsypher-email-line { border-color: #e4e4e7 !important; }
      .xsypher-email-cell { background-color: #d4d4d8 !important; }
      .xsypher-email-cellsoft { background-color: #a1a1aa !important; }
      .xsypher-email-inverse { background-color: #ffffff !important; border-color: #e4e4e7 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_BRAND.surface};" class="xsypher-email-bg">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-family:Arial,Helvetica,sans-serif;font-size:1px;line-height:1px;color:${EMAIL_BRAND.surface};">${preheader}</div>` : ""}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:${EMAIL_BRAND.surface};">
    <tr>
      <td align="center" style="padding:36px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="xsypher-email-container" style="border-collapse:collapse;width:600px;max-width:600px;">
          <!-- Brand header -->
          <tr>
            <td class="xsypher-email-padding" align="center" style="padding:0 0 26px 0;">
              ${emailLogo()}
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="xsypher-email-card" style="border-collapse:collapse;background-color:${EMAIL_BRAND.surface2};border:1px solid ${EMAIL_BRAND.line};border-radius:14px;">
                <tr>
                  <td class="xsypher-email-padding" style="padding:36px 36px 30px 36px;">
                    ${bodyHtml}
                  </td>
                </tr>
                ${cta ? `<tr><td class="xsypher-email-padding" align="center" style="padding:0 36px 8px 36px;">${ctaBlock}</td></tr>` : ""}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="xsypher-email-padding" style="padding:26px 0 0 0;" align="center">
              ${emailSocialRow()}
              <p style="margin:18px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:${EMAIL_BRAND.faint};" class="xsypher-email-faint">
                ${footerNote || `You are receiving this because you are part of the xSypher editorial workspace.`}
              </p>
              ${unsubscribeUrl ? `<p style="margin:10px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${EMAIL_BRAND.faint};" class="xsypher-email-faint"><a href="${unsubscribeUrl}" target="_blank" rel="noopener noreferrer" style="color:${EMAIL_BRAND.muted};text-decoration:underline;">Unsubscribe</a> · <a href="${siteUrl}" target="_blank" rel="noopener noreferrer" style="color:${EMAIL_BRAND.muted};text-decoration:underline;">${siteUrl.replace(/^https?:\/\//, "")}</a></p>` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Correct article for a role acronym ("an AUTHOR", "a CONTRIBUTOR")
 * — the invitation line reads naturally for every role.
 */
export function articleForRole(role: string): string {
  const first = role.trim().charAt(0).toUpperCase();
  return ["A", "E", "I", "O", "U"].includes(first) ? "an" : "a";
}
