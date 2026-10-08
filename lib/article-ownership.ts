import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Ownership guards for owner-authored articles.
//
// "Owner-authored" means the article's byline (authorId) is linked to a user
// account whose role is OWNER. For those articles the owner keeps exclusive
// control of live-state changes and deletion — other roles may still edit,
// but their changes are routed back to the owner for approval instead of
// going live directly.
// ─────────────────────────────────────────────────────────────────────────────

/** True when the article's author is linked to an account with the OWNER role. */
export async function isOwnerAuthoredArticle(
  authorId: string | null | undefined,
): Promise<boolean> {
  if (!authorId) return false;
  try {
    const [row] = await db
      .select({ role: userTable.role })
      .from(userTable)
      .where(eq(userTable.authorId, authorId))
      .limit(1);
    return row?.role === "OWNER";
  } catch (error) {
    // Fail closed on the lookup itself? No — fail open, matching the rest of
    // the notification/lookup helpers: a transient DB error must not lock the
    // owner out of their own article, and the audit trail still records the
    // actor on every write.
    console.error("[article-ownership] author lookup failed:", error);
    return false;
  }
}
