// Edge-safe email utility using native fetch API against Resend REST endpoint

import {
  articleForRole,
  emailMetaPill,
  emailShell,
  EMAIL_BRAND,
} from "@/lib/email-templates";

export async function sendEmail({ to, subject, html, from }: { to: string; subject: string; html: string; from?: string }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("[email] RESEND_API_KEY is missing");
    throw new Error("RESEND_API_KEY is missing");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from || process.env.EMAIL_FROM_ADDRESS || "xSypher <noreply@xsypher.com>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[email] Resend API Error (${res.status} ${res.statusText}):`, errorText);
    throw new Error(`Failed to send email: ${res.status} - ${errorText}`);
  }
  return await res.json();
}

interface SendInvitationEmailParams {
  to: string;
  role: string;
  inviteUrl: string;
}

export async function sendInvitationEmail({ to, role, inviteUrl }: SendInvitationEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[email] RESEND_API_KEY is not set; invitation not sent to", to);
    return { success: false, error: "Email delivery is not configured." };
  }

  // The role arrives from user input; it is interpolated into
  // HTML, so it is escaped before it reaches the template.
  const safeRole = escapeHtml(String(role || "CONTRIBUTOR").toUpperCase());
  const safeInviteUrl = escapeHtml(inviteUrl);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.xsypher.com";

  try {
    const data = await sendEmail({
      to,
      subject: "You have been invited to join xSypher",
      html: emailShell({
        preheader: `You have been invited to join the xSypher team as ${articleForRole(safeRole)} ${safeRole}.`,
        title: "You have been invited to join xSypher",
        siteUrl,
        cta: { label: "Accept Invitation", href: safeInviteUrl },
        ctaPlainTextUrl: safeInviteUrl,
        footerNote: "This invitation is addressed to you alone. If you were not expecting it, you can safely ignore this email — the link expires on its own.",
        bodyHtml: `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
            <tr>
              <td align="center" style="padding:0 0 22px 0;">
                <span style="display:inline-block;padding:6px 14px;border:1px solid ${EMAIL_BRAND.crimson};border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:bold;letter-spacing:0.24em;text-transform:uppercase;color:${EMAIL_BRAND.crimson};">Editorial Workspace Invitation</span>
              </td>
            </tr>
          </table>
          <h2 style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;letter-spacing:-0.02em;line-height:1.3;margin:0 0 14px 0;color:${EMAIL_BRAND.ink};" class="xsypher-email-ink">Welcome to the newsroom.</h2>
          <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;margin:0 0 22px 0;color:${EMAIL_BRAND.muted};" class="xsypher-email-muted">
            You have been invited to join the xSypher team as <strong style="color:${EMAIL_BRAND.ink};" class="xsypher-email-ink">${articleForRole(safeRole)} ${safeRole}</strong>.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0 8px;width:100%;">
            <tr>
              <td style="padding:0;">${emailMetaPill("Assigned role", safeRole)}</td>
            </tr>
            <tr>
              <td style="padding:0;">${emailMetaPill("Workspace", "xSypher Editorial Console")}</td>
            </tr>
            <tr>
              <td style="padding:0;">${emailMetaPill("Link expires", "48 hours from now")}</td>
            </tr>
          </table>
          <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;margin:24px 0 0 0;color:${EMAIL_BRAND.muted};" class="xsypher-email-muted">
            Accept within 48 hours — after that the invitation expires and a new one has to be issued from the console.
          </p>
        `,
      }),
    });

    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to send invitation email:", error);
    return { success: false, error: error.message };
  }
}

export interface SendPasswordResetEmailParams {
  to: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({ to, resetUrl }: SendPasswordResetEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[email] RESEND_API_KEY is not set; password reset not sent to", to);
    return { success: false, error: "Email delivery is not configured." };
  }
  
  try {
    const safeResetUrl = escapeHtml(resetUrl);
    const data = await sendEmail({
      to,
      subject: "Reset your xSypher password",
      html: emailShell({
        preheader: "A password reset was requested for your xSypher account.",
        title: "Reset your xSypher password",
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.xsypher.com",
        cta: { label: "Reset Password", href: safeResetUrl },
        ctaPlainTextUrl: safeResetUrl,
        footerNote: "If you did not initiate this password reset, you can safely ignore this email — your current credentials remain intact.",
        bodyHtml: `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
            <tr>
              <td align="center" style="padding:0 0 22px 0;">
                <span style="display:inline-block;padding:6px 14px;border:1px solid ${EMAIL_BRAND.crimson};border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:bold;letter-spacing:0.24em;text-transform:uppercase;color:${EMAIL_BRAND.crimson};">Security Alert · Credential Reset</span>
              </td>
            </tr>
          </table>
          <h2 style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;letter-spacing:-0.02em;line-height:1.3;margin:0 0 14px 0;color:${EMAIL_BRAND.ink};" class="xsypher-email-ink">Credential reset requested.</h2>
          <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;margin:0 0 8px 0;color:${EMAIL_BRAND.muted};" class="xsypher-email-muted">
            We received a request to reset the master password for your xSypher account.
          </p>
          <p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;margin:0;color:${EMAIL_BRAND.muted};" class="xsypher-email-muted">
            This authentication token expires in exactly <strong style="color:${EMAIL_BRAND.ink};" class="xsypher-email-ink">1 hour</strong>.
          </p>
        `,
      }),
    });

    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to send password reset email:", error);
    return { success: false, error: error.message };
  }
}

interface SendNotificationEmailParams {
  to: string;
  recipientName?: string | null;
  message: string;
  link?: string | null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendNotificationEmail({
  to,
  recipientName,
  message,
  link,
}: SendNotificationEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, skipped: true as const, error: "RESEND_API_KEY is not set" };
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const absoluteLink = link && base ? `${base}${link}` : null;
  const safeMessage = escapeHtml(message);
  const greeting = recipientName ? `Hello ${escapeHtml(recipientName)},` : "Hello,";

  try {
    const data = await sendEmail({
      to,
      subject: message.length > 90 ? `${message.slice(0, 87)}...` : message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #111; color: #fff; padding: 20px; border-radius: 8px;">
          <h1 style="color: #fff; border-bottom: 1px solid #333; padding-bottom: 10px; font-weight: bold; letter-spacing: -0.05em;">x<span style="color: #f04552;">Sypher</span></h1>
          <p style="font-size: 16px; color: #ccc;">${greeting}</p>
          <p style="font-size: 16px; color: #ccc;">${safeMessage}</p>
          ${
            absoluteLink
              ? `<div style="margin: 30px 0;">
                   <a href="${absoluteLink}" style="background-color: #f04552; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Open in the newsroom</a>
                 </div>`
              : ""
          }
          <p style="font-size: 14px; color: #666; border-top: 1px solid #333; padding-top: 20px;">
            You are receiving this because email alerts are on for your account.
            Turn them off under Settings in the newsroom console.
          </p>
        </div>
      `,
    });

    return { success: true, data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to send notification email";
    console.error("[email] Failed to send notification email:", msg);
    return { success: false, error: msg };
  }
}
