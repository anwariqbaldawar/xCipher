"use server";

import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/crypto";
import {
  encryptTotpSecret,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  otpauthUri,
  verifyTotp,
} from "@/lib/totp";
import QRCode from "qrcode";

// ─────────────────────────────────────────────────────────────────────────────
// Two-factor authentication (TOTP) management actions.
//
// Flow: startTwoFactorSetup() generates a secret and returns it with a QR code
// → the user scans it and enters a code → verifyTwoFactorSetup() enables 2FA
// and returns single-use backup codes (shown exactly once) → the login flow
// (lib/auth.ts) then requires a code on every sign-in. disableTwoFactor()
// requires the account password.
// ─────────────────────────────────────────────────────────────────────────────

export async function startTwoFactorSetup() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthenticated" };

    const [row] = await db
      .select({ totpEnabled: userTable.totpEnabled })
      .from(userTable)
      .where(eq(userTable.id, user.id))
      .limit(1);

    if (!row) return { success: false, error: "User not found" };
    if (row.totpEnabled) {
      return { success: false, error: "Two-factor authentication is already enabled." };
    }

    // A fresh secret per attempt: re-running setup replaces a pending one
    // instead of leaving two valid secrets for the same account.
    const secret = generateTotpSecret();
    await db
      .update(userTable)
      .set({ totpSecret: encryptTotpSecret(secret) })
      .where(eq(userTable.id, user.id));

    const uri = otpauthUri(secret, user.email || "");
    let qrDataUrl: string | null = null;
    try {
      qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
    } catch (error) {
      // The secret is still returned, so manual entry remains possible.
      console.error("[2fa] Failed to render QR code:", error);
    }

    return { success: true, secret, otpauthUri: uri, qrDataUrl };
  } catch (error) {
    console.error("[2fa] startTwoFactorSetup failed:", error);
    return { success: false, error: "Failed to start two-factor setup." };
  }
}

export async function verifyTwoFactorSetup(code: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthenticated" };

    const [row] = await db
      .select({ totpSecret: userTable.totpSecret, totpEnabled: userTable.totpEnabled })
      .from(userTable)
      .where(eq(userTable.id, user.id))
      .limit(1);

    if (!row?.totpSecret || row.totpEnabled) {
      return { success: false, error: "No pending two-factor setup. Start setup first." };
    }

    if (!verifyTotp(row.totpSecret, code)) {
      return {
        success: false,
        error: "Invalid code. Check your authenticator app and try again.",
      };
    }

    const backupCodes = generateBackupCodes(8);
    const hashedBackupCodes = backupCodes.map(hashBackupCode);
    await db
      .update(userTable)
      .set({
        totpEnabled: true,
        totpSecret: encryptTotpSecret(row.totpSecret),
        backupCodes: hashedBackupCodes,
      })
      .where(eq(userTable.id, user.id));

    // Backup codes are shown in plaintext exactly once here, while only their
    // SHA-256 hashes are persisted in the database.
    return { success: true, backupCodes };
  } catch (error) {
    console.error("[2fa] verifyTwoFactorSetup failed:", error);
    return { success: false, error: "Failed to verify the code." };
  }
}

export async function disableTwoFactor(password: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthenticated" };

    const [row] = await db
      .select({
        password: userTable.password,
        totpEnabled: userTable.totpEnabled,
      })
      .from(userTable)
      .where(eq(userTable.id, user.id))
      .limit(1);

    if (!row?.totpEnabled) {
      return { success: false, error: "Two-factor authentication is not enabled." };
    }

    // Disabling 2FA is a sensitive change: require the account password so a
    // stolen session alone cannot weaken the account.
    if (!row.password || !(await verifyPassword(password, row.password))) {
      return { success: false, error: "Password is incorrect." };
    }

    await db
      .update(userTable)
      .set({ totpEnabled: false, totpSecret: null, backupCodes: [] })
      .where(eq(userTable.id, user.id));

    return { success: true };
  } catch (error) {
    console.error("[2fa] disableTwoFactor failed:", error);
    return { success: false, error: "Failed to disable two-factor authentication." };
  }
}
