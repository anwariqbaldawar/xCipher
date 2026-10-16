"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { comment, article } from "@/lib/db/schema";
import { eq, and, asc, desc, inArray, sql } from "drizzle-orm";

import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { getCurrentUser } from "@/lib/auth";
import { hasRequiredRole } from "@/lib/permissions";
import { revalidatePath, revalidateTag } from "@/lib/revalidate";
import { CACHE_TAGS, commentsTag } from "@/lib/cache-tags";
import { Role } from "@/lib/types";
import crypto from "crypto";

// ─── Safe public shape returned to readers ──────────────────────────────────
export interface PublicComment {
  id: string;
  displayName: string;
  emailHash: string;
  body: string;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function sha256(input: string): Promise<string> {
  return crypto.createHash("sha256").update(input.toLowerCase().trim()).digest("hex");
}

const nameSchema = z.string().min(1).max(60).trim();
const emailSchema = z.string().email().max(320).toLowerCase().trim();
const bodySchema = z.string().min(10).max(1200).trim();

// ─── Get approved comments for an article ───────────────────────────────────
//
// This is the reader-facing read, and it is *the* hidden per-view database
// consumer: `CommentsSection` calls it from a client effect on every article
// page view, so a published story received one SELECT for every reader — and,
// for the crawlers that execute JavaScript, for every crawl as well.
//
// Cached per article, tagged `comments:<slug>`, with a short window. Comments
// are low-volume and reader-triggered, so five minutes of staleness on the list
// is invisible; the tag is what keeps it honest, because approving a comment
// drops exactly this article's entry (the moderation action calls
// `revalidateTag(commentsTag(slug))`).
//
// `createdAt` is serialized inside the cached function: the data cache stores
// JSON, so a `Date` would come back as a string on a hit and a `Date` on a miss,
// and `PublicComment.createdAt` is declared as a string.
function getCachedComments(articleSlug: string) {
  return unstable_cache(
    async () => {
      const comments = await db.select({
        id: comment.id,
        displayName: comment.displayName,
        emailHash: comment.emailHash,
        body: comment.body,
        createdAt: comment.createdAt,
      })
      .from(comment)
      .where(and(eq(comment.articleSlug, articleSlug), eq(comment.status, "APPROVED")))
      .orderBy(asc(comment.createdAt));

      return comments.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        emailHash: c.emailHash,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
      }));
    },
    ["approved-comments-v1", articleSlug],
    { tags: [commentsTag(articleSlug), CACHE_TAGS.articles], revalidate: 300 },
  )();
}

export async function getComments(articleSlug: string): Promise<PublicComment[]> {
  if (!articleSlug || typeof articleSlug !== "string") return [];
  try {
    return await getCachedComments(articleSlug);
  } catch (error) {
    // A cache-layer failure must not remove the discussion from the page; fall
    // back to the direct read this function used to do.
    console.warn("[comments] cached read failed, reading through:", error);
    const comments = await db.select({
      id: comment.id,
      displayName: comment.displayName,
      emailHash: comment.emailHash,
      body: comment.body,
      createdAt: comment.createdAt,
    })
    .from(comment)
    .where(and(eq(comment.articleSlug, articleSlug), eq(comment.status, "APPROVED")))
    .orderBy(asc(comment.createdAt));

    return comments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    }));
  }
}

// ─── Get comment count for an article (for SSR display) ─────────────────────
export async function getCommentCount(articleSlug: string): Promise<number> {
  if (!articleSlug || typeof articleSlug !== "string") return 0;
  const [res] = await db.select({ count: sql<number>`count(*)::int` })
    .from(comment)
    .where(and(eq(comment.articleSlug, articleSlug), eq(comment.status, "APPROVED")));
  return res?.count || 0;
}

// ─── Post a comment ──────────────────────────────────────────────────────────
export async function postComment(
  articleSlug: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  const rl = await checkRateLimit("comment", ip, { limit: 5, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    return { success: false, error: "Too many submissions. Please wait a few minutes and try again." };
  }

  const rawName = formData.get("name");
  const rawEmail = formData.get("email");
  const rawBody = formData.get("comment");

  const nameResult = nameSchema.safeParse(rawName);
  const emailResult = emailSchema.safeParse(rawEmail);
  const bodyResult = bodySchema.safeParse(rawBody);

  if (!nameResult.success) return { success: false, error: "Name is required (max 60 characters)." };
  if (!emailResult.success) return { success: false, error: "A valid email address is required." };
  if (!bodyResult.success) {
    return {
      success: false,
      error: bodyResult.error.issues[0]?.code === "too_small"
        ? "Comment must be at least 10 characters."
        : "Comment must be 1200 characters or fewer.",
    };
  }

  const [a] = await db.select({ id: article.id, status: article.status })
    .from(article)
    .where(eq(article.slug, articleSlug))
    .limit(1);

  if (!a || a.status !== "PUBLISHED") {
    return { success: false, error: "Article not found or not published." };
  }

  const emailHash = await sha256(emailResult.data);
  const ipHash = await sha256(ip);
  const ua = hdrs.get("user-agent") || undefined;

  try {
    await db.insert(comment).values({
      id: crypto.randomUUID(),
      articleId: a.id,
      articleSlug,
      displayName: nameResult.data,
      emailHash,
      body: bodyResult.data,
      status: "PENDING",
      ipHash,
      userAgent: ua?.slice(0, 500) ?? null,
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("[comments] postComment error:", error);
    return { success: false, error: "Failed to submit comment. Please try again." };
  }
}

// ─── Moderate a comment (MODERATOR+ only) ────────────────────────────────────
export async function moderateComment(
  commentId: string,
  action: "APPROVED" | "REJECTED" | "SPAM",
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthenticated" };

  const canModerate = hasRequiredRole(user.role as Role, "MODERATOR");
  if (!canModerate) return { success: false, error: "Insufficient permissions to moderate comments." };

  if (!commentId || typeof commentId !== "string") {
    return { success: false, error: "Invalid comment ID." };
  }

  const validActions = ["APPROVED", "REJECTED", "SPAM"];
  if (!validActions.includes(action)) {
    return { success: false, error: "Invalid moderation action." };
  }

  try {
    const [c] = await db.select().from(comment).where(eq(comment.id, commentId)).limit(1);
    if (!c) return { success: false, error: "Comment not found." };

    await db.update(comment).set({
      status: action as any,
      moderatorId: user.id,
      moderatorNote: note?.trim().slice(0, 500) || null,
      updatedAt: new Date(),
    }).where(eq(comment.id, commentId)).returning();

    // The route, and the cached comment list that route renders. Without the tag
    // the approved comment would appear up to five minutes later, or on the
    // reader's next hard reload — whichever came first.
    await Promise.all([
      revalidatePath(`/article/${c.articleSlug}`, "page"),
      revalidateTag(commentsTag(c.articleSlug), "max"),
    ]);
    return { success: true };
  } catch (error: any) {
    console.error("[comments] moderateComment error:", error);
    return { success: false, error: "Failed to update comment status." };
  }
}

// ─── Get pending comments queue (MODERATOR+ only) ────────────────────────────
export async function getPendingComments(page = 1) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthenticated", comments: [] };

  const canModerate = hasRequiredRole(user.role as Role, "MODERATOR");
  if (!canModerate) return { success: false, error: "Insufficient permissions.", comments: [] };

  const perPage = 20;
  const skip = (page - 1) * perPage;

  const [commentsRes, [{ count }]] = await Promise.all([
    db.query.comment.findMany({
      where: inArray(comment.status, ["PENDING", "SPAM"]),
      orderBy: [desc(comment.createdAt)],
      offset: skip,
      limit: perPage,
      with: { moderator: { columns: { name: true } } }
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(comment).where(inArray(comment.status, ["PENDING", "SPAM"])),
  ]);

  return { success: true, comments: commentsRes, total: count, pages: Math.ceil(count / perPage) };
}
