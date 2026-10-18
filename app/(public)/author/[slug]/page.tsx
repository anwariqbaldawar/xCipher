import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { eq, sum, sql } from "drizzle-orm";
import { author as authorTable, article as articleTable } from "@/lib/db/schema";
import { LISTING_ARTICLE_LIMIT } from "@/lib/queries";
import { getAuthorArticles } from "@/lib/cached-queries";
import { CACHE_TAGS, authorTag } from "@/lib/cache-tags";
import { publicFeedWhere } from "@/lib/feed";
import PaginatedFeed from "@/components/article/PaginatedFeed";
import { siteConfig } from "@/lib/seo";
import { isRasterImageUrl } from "@/lib/image-url";
import { generatePersonJsonLd, generateProfilePageJsonLd, parseAuthorSocialLinks } from "@/lib/entity-schema";
import { serializeJsonLd } from "@/lib/article-schema";
import AuthorProfileView from "@/components/author/AuthorProfileView";

interface Props {
  params: Promise<{ slug: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Author reads: request-deduped AND persisted.
//
// `generateMetadata` and the profile body both resolve the author, and both ran
// a query on every re-render of this route. Since the route re-renders on a
// 600s window, on every publish that touches the author, and once per crawler
// request, the same two statements (the profile, and the lifetime view total)
// were the most frequently repeated queries on the public site after search.
//
// Tagged `authors` and `author:<slug>`, so an editor's profile save invalidates
// exactly this author's page — the byline-masking helpers in
// app/actions/profile.ts already revalidate both tags.
// ─────────────────────────────────────────────────────────────────────────────

function getCachedAuthor(slug: string) {
  return unstable_cache(
    async () => {
      const [author] = await db.query.author.findMany({
        where: eq(authorTable.slug, slug),
        with: { user: true },
        limit: 1,
      });
      return author ?? null;
    },
    ["author-by-slug-v1", slug],
    { tags: [CACHE_TAGS.authors, authorTag(slug)], revalidate: 3600 },
  )();
}

const getAuthorBySlug = cache(async (slug: string) => getCachedAuthor(slug));

function getCachedAuthorWordTotal(authorId: string, slug: string) {
  return unstable_cache(async () => {
    const where = publicFeedWhere({ authorId });
    const [row] = await db.select({
      words: sql<number>`coalesce(sum(cardinality(regexp_split_to_array(nullif(trim(regexp_replace(coalesce(${articleTable.textContent}, ''), '<[^>]+>', ' ', 'g')), ''), '[[:space:]]+'))), 0)::int`,
    }).from(articleTable).where(where);
    return Number(row?.words) || 0;
  }, ["author-word-total-v1", authorId], { tags: [CACHE_TAGS.articles, authorTag(slug)], revalidate: 600 })();
}

/**
 * Lifetime view total for the profile's stat strip.
 *
 * A separate entry from the profile itself, and a shorter window: view counts
 * change without any editorial action (the worker flushes Redis deltas once a
 * minute), so this is the one author figure that legitimately drifts. Ten minutes
 * of drift on a lifetime total is invisible; a query per crawler hit is not.
 */
function getCachedAuthorViewTotal(authorId: string, slug: string) {
  return unstable_cache(
    async () => {
      const where = publicFeedWhere({ authorId });
      const rows = await db.select({ totalViews: sum(articleTable.views) }).from(articleTable).where(where);
      return Number(rows?.[0]?.totalViews) || 0;
    },
    ["author-views-v1", authorId],
    { tags: [CACHE_TAGS.articles, authorTag(slug)], revalidate: 600 },
  )();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return { title: `Author — ${siteConfig.name}` };
  
  const authorName = author.name || "Author";
  const articles = await getAuthorArticles(author.id, slug);
  const description = author.overview || author.bio?.slice(0, 160) || `${authorName} on ${siteConfig.name}.`;

  // Absolute avatar URL, resolved once. `imageUrl` is the browser-facing value
  // (public assets are root-relative in the database); `ogAvatar` is the same
  // URL only when it is a raster format, because X, Threads and WhatsApp reject
  // SVG in a card and fall back to no thumbnail at all.
  const imageUrl = author.avatar
    ? author.avatar.startsWith("http")
      ? author.avatar
      : `${siteConfig.url}${author.avatar.startsWith("/") ? "" : "/"}${author.avatar}`
    : undefined;
  const ogAvatar = imageUrl && isRasterImageUrl(imageUrl) ? imageUrl : undefined;

  return {
    title: `${authorName} — ${siteConfig.name}`,
    description,
    alternates: {
      canonical: `${siteConfig.url}/author/${slug}`,
    },
    // Empty profiles stay out of the index; a populated profile is a legitimate
    // entity page, but its image signal is capped at the avatar so the cards in
    // its grid cannot be read as this page's photograph (see the ProfilePage
    // JSON-LD below, which is the authoritative version of that rule).
    ...(articles.length === 0
      ? { robots: { index: false, follow: true } }
      : { robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "none" as const } } }),
    openGraph: {
      title: `${authorName} — ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/author/${slug}`,
      siteName: siteConfig.name,
      // A square avatar belongs in a `summary` card, not the 1.91:1 large card,
      // so it is emitted at its own dimensions rather than cropped to 1200×630.
      images: ogAvatar ? [{ url: ogAvatar, width: 400, height: 400, alt: authorName }] : [],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${authorName} — ${siteConfig.name}`,
      description,
      images: ogAvatar ? [ogAvatar] : undefined,
      site: siteConfig.twitter,
      creator: siteConfig.twitter,
    },
  };
}

// Cached and revalidated on a timer, rather than force-dynamic.
//
// force-dynamic meant every visitor triggered a fresh render and a fresh set of
// queries, and -- more importantly -- it made every revalidatePath() call in the
// workflow actions a no-op, because there was never a cached entry to
// invalidate. Publishing already calls revalidatePath for this route, so an
// editorial change still appears immediately; the window below is only the
// ceiling for anything that changes without an explicit revalidation, such as
// a view count.
export const dynamic = "force-static";
export const revalidate = 600; // author profile

export default async function AuthorProfile({ params }: Props) {
  const { slug } = await params;

  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const socials = parseAuthorSocialLinks(author.socialLinks);

  // Fetch articles
  // The list is capped, so the view total cannot be summed from it -- that
  // would silently under-report as soon as an author passes the cap. Postgres
  // does the sum over every row instead, which is one cheap indexed aggregate.
  const [articles, totalViews, totalWords] = await Promise.all([
    getAuthorArticles(author.id, slug),
    getCachedAuthorViewTotal(author.id, slug),
    getCachedAuthorWordTotal(author.id, slug),
  ]);

  const nonce = (await headers()).get("x-csp-nonce") || undefined;

  return (
    <>
    {/* ProfilePage: the author's avatar is the page's primary image. The
        article list is emitted as a bare URL ItemList (`hasPart`) with no
        image nodes, so the story thumbnails rendered by the grid below can
        never be resolved as this profile's image — the exact mis-attribution
        that put author names on article featured images in Google Images. */}
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(generateProfilePageJsonLd(author, articles.map(article => ({
          slug: article.slug,
          title: article.title,
        })))),
      }}
    />
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(generatePersonJsonLd(author)) }}
    />
    <AuthorProfileView 
      author={author} 
      articles={articles} 
      socials={socials} 
      totalViews={totalViews}
      totalWords={totalWords}
      articleFeed={
        <PaginatedFeed
          initialArticles={articles.slice(1)}
          initialOffset={articles.length ? 1 : 0}
          initialHasMore={articles.length === LISTING_ARTICLE_LIMIT}
          filter={{ authorId: author.id }}
        />
      }
    />
    </>
  );
}
