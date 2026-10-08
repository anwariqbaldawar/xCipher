"use server";

import { db } from "@/lib/db";
import { article, auditLog, category, articleRevision, _articleToTag, tag, benchmarkLeaderboard, author as authorTable, user as userTable, notification } from "@/lib/db/schema";
import { eq, inArray, or, and, not, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "@/lib/revalidate";
import { articleMutationTags, authorTag } from "@/lib/cache-tags";
import { isOwnerAuthoredArticle } from "@/lib/article-ownership";
import { getCurrentUser } from "@/lib/auth";
import { canEditArticle } from "@/lib/permissions";
import { sanitizeArticleHtml, isValidSafeUrl } from "@/lib/sanitize";
import { calculateReadTime, deriveIsFeatured, slugify } from "@/lib/utils";
import { authorize } from "@/lib/capabilities";
import { handleServerError } from "@/lib/errors";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { headers } from "next/headers";
import { after } from "next/server";
import { uploadToR2, deleteKeyFromR2 } from "@/lib/storage";
import { notifyGoogleIndexing } from "@/lib/google-indexing";
import { siteConfig } from "@/lib/seo";
import { publishingQueue } from "@/lib/queue";

import type { Role } from "@/lib/types";

// Do not return the article's full search text over Neon HTTP and serialize
// it again in the save response. Revisions and the editor only need metadata.
const savedArticleColumns = {
  id: article.id,
  slug: article.slug,
  title: article.title,
  deck: article.deck,
  contentUrl: article.contentUrl,
  authorId: article.authorId,
  isAnonymous: article.isAnonymous,
  status: article.status,
  updatedAt: article.updatedAt,
};
type SavedArticle = Pick<typeof article.$inferSelect, keyof typeof savedArticleColumns>;

async function logAudit(action: string, entityType: string, entityId?: string, details?: unknown, actorId?: string) {
  try {
    const userId = actorId ?? (await getCurrentUser())?.id ?? null;
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId,
      action,
      entityType,
      entityId: entityId || null,
      details,
    });
  } catch (e) {
    console.error("Failed to log audit event:", e);
  }
}

async function getUniqueSlug(baseSlug: string, currentId?: string): Promise<string> {
  let slug = baseSlug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) slug = "article-" + Math.floor(Math.random() * 10000);

  let candidate = slug;
  let count = 1;
  while (true) {
    const [existing] = await db.select({ id: article.id }).from(article).where(eq(article.slug, candidate)).limit(1);
    if (!existing || (currentId && existing.id === currentId)) {
      return candidate;
    }
    candidate = `${slug}-${count}`;
    count++;
  }
}

// Every article must carry a real authorId. The console scopes article
// queries by authorId (buildArticleScope), so a story saved with a null
// byline becomes unreachable to its own writer — the editor page 404s the
// moment the autosave adopts the new id and re-renders. A writer with no
// linked profile gets a minimal one created and linked on first save.
async function resolveArticleAuthorId(
  user: { id: string; name?: string | null; email?: string | null; role: Role; authorId?: string | null },
  requestedAuthorId?: string | null,
): Promise<string | null> {
  // An explicit byline (editorial roles assigning an author) wins.
  if (requestedAuthorId) return requestedAuthorId;
  if (user.authorId) return user.authorId;

  const baseSlug = slugify(user.name || (user.email ? user.email.split("@")[0] : "") || "writer") || "writer";
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const [existing] = await db.select({ id: authorTable.id }).from(authorTable).where(eq(authorTable.slug, slug)).limit(1);
    if (!existing) break;
    slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
  }

  const [created] = await db.insert(authorTable).values({
    id: crypto.randomUUID(),
    slug,
    name: user.name || user.email || "xSypher Staff",
    role: user.role,
    email: user.email || null,
  }).returning({ id: authorTable.id });

  await db.update(userTable).set({ authorId: created.id }).where(eq(userTable.id, user.id));
  return created.id;
}

export async function upsertArticle(data: any) {
  try {
    const userSession = await getCurrentUser();
    if (!userSession) {
      return { success: false, error: "Unauthenticated" };
    }

    // getCurrentUser already checks the database for the active user's role,
    // authorId and sessionVersion. Do not decode the session or fetch it again.
    const userWithAuth = {
      id: userSession.id,
      role: userSession.role as Role,
      authorId: userSession.authorId,
      name: userSession.name,
      email: userSession.email,
    };

    let existingArticle = null;
    if (data.id) {
      existingArticle = await db.query.article.findFirst({
        where: eq(article.id, data.id),
        columns: { id: true, authorId: true, author: true, role: true, isAnonymous: true, updatedAt: true, status: true, publishedAt: true, slug: true, previousSlugs: true, contentUrl: true }
      });
      if (!existingArticle) {
        return { success: false, error: "Article not found" };
      }
    }

    const editPolicy = canEditArticle(userWithAuth, existingArticle || undefined);
    if (!editPolicy.success) {
      return { success: false, error: editPolicy.error };
    }

    if (existingArticle && data.lastUpdatedAt && !data.isAutosave && existingArticle.status !== "DRAFT") {
      const clientDate = new Date(data.lastUpdatedAt);
      if (existingArticle.updatedAt.getTime() - clientDate.getTime() > 1000) {
        return { 
          success: false,
          serverUpdatedAt: existingArticle.updatedAt.toISOString(),
          error: "Conflict: This article has been modified by someone else since you opened it. Please refresh and integrate your changes." 
        };
      }
    }

    if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
      return { success: false, error: "Article title is required." };
    }

    if (data.img && !isValidSafeUrl(data.img)) {
      return { success: false, error: "Featured image URL is invalid." };
    }

    if (data.isAnonymous !== undefined && typeof data.isAnonymous !== "boolean") {
      return { success: false, error: "Anonymous publication must be a boolean." };
    }

    const categorySlug = (data.cat || "technology").toLowerCase().trim();
    
    const [catRecord] = await db.select({ id: category.id }).from(category).where(eq(category.slug, categorySlug)).limit(1);

    if (!catRecord) {
      return { success: false, error: "Invalid category selected." };
    }

    const uniqueSlug = existingArticle && data.slug === existingArticle.slug
      ? existingArticle.slug
      : await getUniqueSlug(data.slug || data.title, data.id);
    const articleId = data.id || crypto.randomUUID();

    const scheduledFor = data.scheduledFor ? new Date(data.scheduledFor) : null;
    const sanitizedBodyHtml = sanitizeArticleHtml(data.bodyHtml);

    let contentUrl = existingArticle?.contentUrl || null;
    if (sanitizedBodyHtml || data.bodyJson) {
      const contentPayload = JSON.stringify({
        html: sanitizedBodyHtml || "",
        json: data.bodyJson || null,
      });
      const key = `articles/content-${articleId}.json`;
      contentUrl = await uploadToR2(key, contentPayload, "application/json");
    }

    // ── Byline resolution ─────────────────────────────────────────────────
    // Only roles with article.manage.byline (the owner) may assign or
    // transfer a byline. For everyone else the stored byline is pinned, so a
    // crafted request cannot move attribution. When a byline manager assigns
    // one, the name and title are derived from the author profile server-side
    // — the form's strings are display-only. Deriving them here is what keeps
    // article.author, article.role and article.authorId from drifting apart,
    // which is how the homepage ended up showing one byline while the article
    // page showed another.
    const canManageByline = authorize(userWithAuth.role, "article.manage.byline");
    let resolvedByline: { author: string; role: string | null; authorId: string } | null = null;
    if (canManageByline && data.authorId) {
      const [profile] = await db
        .select({ id: authorTable.id, name: authorTable.name, role: authorTable.role })
        .from(authorTable)
        .where(eq(authorTable.id, data.authorId))
        .limit(1);
      if (profile) {
        resolvedByline = { author: profile.name, role: profile.role || null, authorId: profile.id };
      }
    }

    const payload = {
      title: data.title.trim(),
      slug: uniqueSlug,
      status: data.status || "DRAFT",
      deck: data.deck || null,
      contentUrl,
      textContent: typeof sanitizedBodyHtml === 'string' ? sanitizedBodyHtml.replace(/<[^>]+>/g, ' ') : null,
      author: resolvedByline?.author ?? existingArticle?.author ?? (data.author?.trim() || userSession.name || "xSypher Staff"),
      isAnonymous: data.isAnonymous ?? existingArticle?.isAnonymous ?? false,
      role: resolvedByline?.role ?? existingArticle?.role ?? (data.role?.trim() || userSession.role || null),
      featured: typeof data.featured === "boolean" ? data.featured : deriveIsFeatured(data.homepagePlacement || null),
      img: data.img || null,
      seoTitle: data.seoTitle || null,
      seoDesc: data.seoDesc || null,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      ogImage: data.ogImage || null,
      focusKeyword: data.focusKeyword || null,
      canonicalUrl: data.canonicalUrl || null,
      featuredImageAlt: data.featuredImageAlt || null,
      featuredImageCaption: data.featuredImageCaption || null,
      featuredImageCredit: data.featuredImageCredit || null,
      homepagePlacement: data.homepagePlacement || null,
      categoryId: catRecord.id,
      scheduledFor,
      readingTime: calculateReadTime(sanitizedBodyHtml || data.bodyHtml),
      updatedAt: new Date(),
      ...(resolvedByline ? { authorId: resolvedByline.authorId } : {}),
      ...(data.status === "PUBLISHED" && (!existingArticle || existingArticle.status !== "PUBLISHED") 
          ? { publishedAt: new Date() } 
          : {}),
    };

    if (payload.featured || payload.homepagePlacement === "featured" || payload.homepagePlacement === "HERO") {
      await db.update(article)
        .set({ featured: false, homepagePlacement: null, updatedAt: new Date() })
        .where(
          and(
            or(eq(article.featured, true), eq(article.homepagePlacement, "featured"), eq(article.homepagePlacement, "HERO")),
            existingArticle?.id ? not(eq(article.id, existingArticle.id)) : undefined
          )
        );
    }

    let actionType = "";
    let existingArticleStatus = "NEW";
    let finalArticle: SavedArticle;

    const tagsData: { slug: string }[] = Array.isArray(data.tags) ? data.tags.filter(Boolean).map((s: string) => ({ slug: s })) : [];

    try {
      // neon-http is a one-shot driver and does not support interactive
      // transactions. Keep these writes ordered and remove the newly uploaded
      // R2 object if any database step fails.
      if (tagsData.length > 0) {
        await db.insert(tag).values(tagsData.map(t => ({ id: crypto.randomUUID(), slug: t.slug, name: t.slug }))).onConflictDoNothing({ target: tag.slug });
      }

      const tagRecs = tagsData.length > 0
        ? await db.select({ id: tag.id }).from(tag).where(inArray(tag.slug, tagsData.map(t => t.slug)))
        : [];

      if (data.id) {
        existingArticleStatus = existingArticle?.status || "NEW";
        let finalStatusUpdate: "SUBMITTED" | undefined;
        // An owner-authored article keeps its owner in control of the live
        // state: anyone else editing it (admins included) is demoted to
        // SUBMITTED, so the change goes back to the owner for approval
        // instead of going live directly. The ownership lookup only runs when
        // it can change the outcome — a publisher editing a live article —
        // so draft autosaves stay on the same query budget as before.
        const isLiveStatus = ["PUBLISHED", "APPROVED", "SCHEDULED"].includes(existingArticleStatus);
        const canPublishLive = authorize(userWithAuth.role, "article.publish");
        const ownerAuthored =
          isLiveStatus && canPublishLive && userWithAuth.role !== "OWNER"
            ? await isOwnerAuthoredArticle(existingArticle?.authorId)
            : false;
        const mustRouteThroughReview =
          isLiveStatus && (!canPublishLive || (ownerAuthored && userWithAuth.role !== "OWNER"));
        if (mustRouteThroughReview) {
          finalStatusUpdate = "SUBMITTED";
        }

        const currentPreviousSlugs = existingArticle?.previousSlugs || [];
        const updatedPreviousSlugs = existingArticle && existingArticle.slug !== uniqueSlug
          ? Array.from(new Set([...currentPreviousSlugs, existingArticle.slug]))
          : currentPreviousSlugs;

        const [updated] = await db.update(article).set({
          ...payload,
          ...(finalStatusUpdate ? { status: finalStatusUpdate } : {}),
          previousSlugs: updatedPreviousSlugs,
        }).where(eq(article.id, data.id)).returning(savedArticleColumns);

        // When a non-owner's edit was routed back to the owner, tell the owner:
        // their article changed and is waiting on them. Fail-soft — a missing
        // notification must never fail the save.
        if (finalStatusUpdate === "SUBMITTED" && ownerAuthored && existingArticle?.authorId) {
          const [ownerUser] = await db
            .select({ id: userTable.id })
            .from(userTable)
            .where(eq(userTable.authorId, existingArticle.authorId))
            .limit(1);
          if (ownerUser && ownerUser.id !== userSession.id) {
            await db.insert(notification).values({
              id: crypto.randomUUID(),
              userId: ownerUser.id,
              message: `"${updated.title || "Untitled"}" was edited by ${userSession.name || "a reviewer"} and awaits your review.`,
              link: `/admin/review/${updated.id}`,
            }).catch((error) => console.error("[article] owner notification failed:", error));
          }
        }

        await db.delete(_articleToTag).where(eq(_articleToTag.A, updated.id));
        if (tagRecs.length > 0) {
          await db.insert(_articleToTag).values(tagRecs.map(tr => ({ A: updated.id, B: tr.id })));
        }

        finalArticle = updated;
        actionType = finalStatusUpdate ? `DEMOTED_TO_${finalStatusUpdate}` : `UPDATE_ARTICLE_${updated.status}`;
      } else {
        const resolvedAuthorId = await resolveArticleAuthorId(
          userWithAuth,
          authorize(userWithAuth.role, "article.publish") ? data.authorId : null,
        );

        const [created] = await db.insert(article).values({
          id: articleId,
          ...payload,
          authorId: resolvedAuthorId,
        }).returning(savedArticleColumns);

        if (tagRecs.length > 0) {
          await db.insert(_articleToTag).values(tagRecs.map(tr => ({ A: created.id, B: tr.id })));
        }

        finalArticle = created;
        actionType = `CREATE_ARTICLE_${created.status}`;
      }

      if (!data.isAutosave) {
        await db.insert(articleRevision).values({
          id: crypto.randomUUID(),
          articleId: finalArticle.id,
          userId: userSession.id,
          title: finalArticle.title,
          deck: finalArticle.deck,
          contentUrl: finalArticle.contentUrl,
          notes: data.notes || null,
          statusChange: null,
          createdAt: new Date(),
        });
      }
    } catch (dbErr) {
      if (contentUrl && contentUrl !== existingArticle?.contentUrl) {
        await deleteKeyFromR2(contentUrl).catch(console.error);
      }
      throw dbErr;
    }

    await logAudit(actionType, "Article", finalArticle.id, { title: finalArticle.title, status: finalArticle.status }, userSession.id);

    // Keep durable content, metadata, revisions and audit writes above. Next's
    // after() uses the platform request lifetime for secondary work; it does
    // not grant an additional Cloudflare CPU allowance.
    after(async () => {
      if (finalArticle.status === "PUBLISHED" && data.bodyJson) {
        try {
          const bodyObj = typeof data.bodyJson === "string" ? JSON.parse(data.bodyJson) : data.bodyJson;
          const metricsToUpsert: (typeof benchmarkLeaderboard.$inferInsert)[] = [];
          const extractScores = (node: any) => {
            if (node.type === "scoreBreakdownBlock" && node.attrs?.items) {
              try {
                const items = typeof node.attrs.items === "string" ? JSON.parse(node.attrs.items) : node.attrs.items;
                for (const item of items) {
                  if (item.tab && item.subCategory && item.metric && typeof item.score === "number") {
                    metricsToUpsert.push({
                      id: crypto.randomUUID(),
                      category: item.tab,
                      subCategory: item.subCategory,
                      metric: item.metric,
                      topScore: item.score,
                      deviceName: finalArticle.title,
                      articleId: finalArticle.id,
                      updatedAt: new Date()
                    });
                  }
                }
              } catch (e) {
                console.error("Failed to parse items in scoreBreakdownBlock", e);
              }
            }
            if (node.content && Array.isArray(node.content)) {
              node.content.forEach(extractScores);
            }
          };
          extractScores(bodyObj);

          if (metricsToUpsert.length > 0) {
            for (const metric of metricsToUpsert) {
              await db.insert(benchmarkLeaderboard).values(metric).onConflictDoUpdate({
                target: [benchmarkLeaderboard.category, benchmarkLeaderboard.subCategory, benchmarkLeaderboard.metric],
                set: {
                  topScore: metric.topScore,
                  deviceName: metric.deviceName,
                  articleId: metric.articleId,
                  updatedAt: metric.updatedAt,
                },
                where: sql`${benchmarkLeaderboard.topScore} < ${metric.topScore}`,
              });
            }
            await revalidateTag('benchmark-leaderboard', 'max');
          }
        } catch (err) {
          console.error("Error processing benchmark leaderboard", err);
        }
      }

      const invalidations = [
        revalidatePath(`/admin/editor/${finalArticle.id}`),
        revalidatePath("/admin/drafts"),
        revalidatePath("/admin/articles"),
      ];
      // Draft autosaves cannot affect a public page. Avoid discarding the
      // publication's caches or every route under its root layout for them.
      if (finalArticle.status === "PUBLISHED" || existingArticle?.status === "PUBLISHED") {
        publishingQueue.add('pingGoogleIndexing', { url: `${siteConfig.url}/article/${finalArticle.slug}` }).catch(console.error);
        const slugs = new Set([finalArticle.slug, existingArticle?.slug].filter((slug): slug is string => !!slug));
        const tagSlugs = Array.from(new Set(tagsData.map((t) => t.slug)));
        const tags = new Set([
          ...[...slugs].flatMap(slug => articleMutationTags({ slug, tagSlugs })),
        ]);
        // A byline change moves the article between author profiles. Stats
        // (views, article count, words) are derived from authorId, so they
        // follow automatically — both author pages just need re-rendering,
        // plus the tags their cached listings subscribe to.
        const previousAuthorId = existingArticle?.authorId || null;
        const nextAuthorId = finalArticle.authorId || null;
        if (nextAuthorId) {
          const authorIds = previousAuthorId && previousAuthorId !== nextAuthorId
            ? [previousAuthorId, nextAuthorId]
            : [nextAuthorId];
          const authorRows = await db
            .select({ id: authorTable.id, slug: authorTable.slug })
            .from(authorTable)
            .where(inArray(authorTable.id, authorIds))
            .limit(authorIds.length);
          invalidations.push(
            ...authorRows.flatMap((row) => [
              revalidateTag(authorTag(row.slug), "max"),
              revalidatePath(`/author/${row.slug}`, "page"),
            ]),
          );
        }
        invalidations.push(
          ...[...tags].map(tag => revalidateTag(
            tag,
            // Expire cached real bylines when an editorial desk is involved.
            payload.isAnonymous || existingArticle?.isAnonymous ? { expire: 0 } : 'max',
          )),
          ...[...slugs].map(slug => revalidatePath(`/article/${slug}`, "page")),
          revalidatePath("/", "page"),
          revalidatePath("/latest", "page"),
          revalidatePath("/sitemap.xml"),
          revalidatePath("/feed.xml"),
        );
      }
      await Promise.all(invalidations);
    });

    return { success: true, article: finalArticle };
  } catch (error: any) {
    console.error("[ARTICLE_SAVE_ERROR]", error);
    return handleServerError(error, "Failed to save article");
  }
}

export async function restoreRevision(revisionId: string) {
  const userSession = await getCurrentUser();
  if (!userSession) return { success: false, error: "Unauthorized" };

  try {
    const rev = await db.query.articleRevision.findFirst({
      where: eq(articleRevision.id, revisionId),
      with: {
        article: {
          columns: { id: true, slug: true, title: true, status: true, authorId: true },
        },
      },
    });

    if (!rev || !rev.article) return { success: false, error: "Revision not found" };

    const articleData = rev.article;

    const policy = canEditArticle(
      { id: userSession.id, role: userSession.role as Role, authorId: userSession.authorId },
      { id: articleData.id, authorId: articleData.authorId }
    );
    if (!policy.success) {
      return { success: false, error: policy.error || "Unauthorized" };
    }

    if (articleData.status === "PUBLISHED") {
      return {
        success: false,
        error: "This article is published. Unpublish it before restoring an earlier version, so the change is reviewed before readers see it.",
      };
    }

    const restoredUrl = rev.contentUrl;

      await db.update(article).set({
        title: rev.title ?? articleData.title,
        deck: rev.deck,
        contentUrl: restoredUrl,
        updatedAt: new Date(),
      }).where(eq(article.id, articleData.id));

      await db.insert(articleRevision).values({
        id: crypto.randomUUID(),
        articleId: articleData.id,
        userId: userSession.id,
        title: rev.title ?? articleData.title,
        deck: rev.deck,
        contentUrl: restoredUrl,
        notes: `Restored the version saved on ${new Date(rev.createdAt).toLocaleString("en-US")}.`,
        statusChange: null,
        createdAt: new Date(),
      });

    await logAudit("RESTORE_REVISION", "Article", articleData.id, {
      revisionId,
      revisionCreatedAt: rev.createdAt,
      title: rev.title,
    }, userSession.id);

    revalidatePath(`/admin/articles/${articleData.id}`);
    revalidatePath(`/admin/editor/${articleData.id}`);
    revalidatePath("/admin/articles");

    return { success: true, articleId: articleData.id };
  } catch (error: unknown) {
    return handleServerError(error, "Failed to restore revision");
  }
}

export async function incrementArticleView(id: string) {
  try {
    const reqHeaders = await headers();
    const ip = getClientIp(reqHeaders);
    const rl = await checkRateLimit("view", `${id}:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
    
    if (!rl.allowed) {
      return { success: false };
    }

    // Count the view in Redis and let the worker flush it to Postgres once a
    // minute — one INCR instead of one UPDATE round trip per view over the
    // Neon HTTP driver. Falls back to a direct update when Redis is down.
    const { bufferArticleView } = await import("@/lib/article-views");
    const buffered = await bufferArticleView(id);
    if (buffered) {
      return { success: true };
    }

    // In Drizzle we can increment with sql`...`
    await db.update(article)
      .set({ views: sql`${article.views} + 1` })
      .where(eq(article.id, id));

    return { success: true };
  } catch (error) {
    return handleServerError(error, "Failed to increment view");
  }
}
