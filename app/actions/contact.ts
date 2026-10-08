"use server";

import { db } from "@/lib/db";
import { contactMessage } from "@/lib/db/schema";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { notificationQueue } from "@/lib/queue";
import { headers } from "next/headers";

// ─────────────────────────────────────────────────────────────────────────────
// Public contact form.
//
// The form used to be a client-side simulation: the message was never stored
// and never delivered. Now every submission is (1) validated, (2) rate limited
// per IP, (3) written to the ContactMessage table so nothing is lost, and (4)
// emailed to the desk through the notification queue.
// ─────────────────────────────────────────────────────────────────────────────

const DEPARTMENTS: Record<string, string> = {
  editorial: "Editorial Desk & News Tips",
  partnerships: "Partnerships, Press & PR",
  support: "Technical Support & Bug Report",
  general: "General Inquiries & Feedback",
};

const MAX_NAME = 120;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function submitContactMessage(input: {
  name: string;
  email: string;
  department: string;
  message: string;
}) {
  try {
    const name = input?.name?.trim().slice(0, MAX_NAME) || "";
    const email = input?.email?.trim().toLowerCase().slice(0, MAX_EMAIL) || "";
    const department = DEPARTMENTS[input?.department] ? input.department : "general";
    const message = input?.message?.trim().slice(0, MAX_MESSAGE) || "";

    if (!name || !email || !message) {
      return { success: false, error: "Please fill in your name, email and message." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: "Please enter a valid email address." };
    }
    if (message.length < 10) {
      return { success: false, error: "Your message is too short (minimum 10 characters)." };
    }

    const reqHeaders = await headers();
    const ip = getClientIp(reqHeaders);

    const rl = await checkRateLimit("contact", ip, { limit: 3, windowMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
      return { success: false, error: "Too many messages sent. Please try again later." };
    }

    await db.insert(contactMessage).values({
      id: crypto.randomUUID(),
      name,
      email,
      department,
      message,
      ip,
      userAgent: reqHeaders.get("user-agent")?.slice(0, 500) || null,
    });

    // Notify the desk. Delivery is best-effort: the row above is the durable
    // record, so a missing RESEND_API_KEY or a worker outage loses no message.
    const to = process.env.CONTACT_EMAIL || "editor@xsypher.com";
    const departmentLabel = DEPARTMENTS[department];
    await notificationQueue
      .add("sendEmail", {
        options: {
          to,
          subject: `[Contact] ${departmentLabel} — ${name}`,
          html: [
            `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>`,
            `<p><strong>Department:</strong> ${escapeHtml(departmentLabel)}</p>`,
            `<p><strong>Message:</strong></p>`,
            `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
            `<hr>`,
            `<p style="color:#888;font-size:12px">IP: ${escapeHtml(ip)}${reqHeaders.get("user-agent") ? ` · UA: ${escapeHtml(reqHeaders.get("user-agent")!.slice(0, 200))}` : ""}</p>`,
          ].join(""),
        },
      })
      .catch((error) => {
        console.error("[contact] Failed to queue notification email:", error);
      });

    return { success: true };
  } catch (error) {
    console.error("[contact] Failed to save message:", error);
    return { success: false, error: "Something went wrong. Please try again later." };
  }
}
