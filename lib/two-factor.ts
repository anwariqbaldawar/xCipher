import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyTotp } from "@/lib/totp";

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
    return { ok: true };
  }

  // Recovery path: a single-use backup code. Consumed on use so a leaked code
  // cannot be replayed.
  const normalized = clean.toUpperCase();
  const remaining = (row.backupCodes || []).filter((c) => c.toUpperCase() !== normalized);
  if (remaining.length !== (row.backupCodes || []).length) {
    await db
      .update(userTable)
      .set({ backupCodes: remaining })
      .where(eq(userTable.id, userId));
    return { ok: true };
  }

  return { ok: false, error: "Invalid authentication code." };
}
