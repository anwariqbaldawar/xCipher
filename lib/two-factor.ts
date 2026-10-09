import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encryptTotpSecret, hashBackupCode, matchesBackupCode, verifyTotp } from "@/lib/totp";

// ─────────────────────────────────────────────────────────────────────────────
// Server-side 2FA verification for the login flow.
//
// Kept out of lib/auth.ts so the Credentials provider stays readable: this
// module owns the database side (fetch the secret, accept a TOTP code or a
// single-use backup code, consume the backup code on use).
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyLoginCode(
  userId: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const [row] = await db
    .select({
      totpSecret: userTable.totpSecret,
      backupCodes: userTable.backupCodes,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!row?.totpSecret) {
    return { ok: false, error: "Two-factor authentication is not configured." };
  }

  const clean = code.replace(/\s+/g, "");

  // Primary path: a 6-digit TOTP code from the authenticator app.
  if (verifyTotp(row.totpSecret, clean)) {
    // Transparently upgrade legacy plaintext TOTP secret at rest when a key is present.
    const encryptedSecret = encryptTotpSecret(row.totpSecret);
    if (encryptedSecret !== row.totpSecret) {
      await db
        .update(userTable)
        .set({ totpSecret: encryptedSecret })
        .where(eq(userTable.id, userId))
        .catch(() => undefined);
    }
    return { ok: true };
  }

  // Recovery path: a single-use backup code (supports both SHA-256 hashed and legacy plaintext codes).
  const normalized = clean.toUpperCase();
  const storedCodes = row.backupCodes || [];
  const remaining = storedCodes.filter((c) => !matchesBackupCode(c, normalized));
  if (remaining.length !== storedCodes.length) {
    await db
      .update(userTable)
      .set({
        backupCodes: remaining.map((c) => (c.startsWith("sha256:") ? c : hashBackupCode(c))),
      })
      .where(eq(userTable.id, userId));
    return { ok: true };
  }

  return { ok: false, error: "Invalid authentication code." };
}
