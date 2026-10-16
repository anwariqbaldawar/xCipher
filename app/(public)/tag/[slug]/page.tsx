import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { tag as tagTable, article as articleTable } from "@/lib/db/schema";
import { publicFeedWhere } from "@/lib/feed";
import { getTagArticles } from "@/lib/cached-queries";
import { CACHE_TAGS, tagTag } from "@/lib/cache-tags";
import PaginatedFeed from "@/components/article/PaginatedFeed";
import Sidebar from "@/components/layout/Sidebar";
import Link from "next/link";
import { brandBannerUrl, siteConfig } from "@/lib/seo";
import { generateCollectionPageJsonLd } from "@/lib/entity-schema";
import { serializeJsonLd } from "@/lib/article-schema";
import { headers } from "next/headers";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// The tag row and its published count were two queries on every render of this
// route — and `generateMetadata` and the page each ran the pair, so four. The
// listing itself was already cached (getTagArticles); this closes the remaining
// gap so a tag archive, which is a favourite crawl target, costs nothing after
// the first fill. Tagged `taxonomy`, `articles` and `tag:<slug>`, matching what
// a taxonomy rename or a publish into this tag already invalidates.
function getCachedTagWithCount(slug: string) {
  return unstable_cache(
    async () => {
      const [tagResults, countResult] = await Promise.all([
        db.query.tag.findMany({ where: eq(tagTable.slug, slug), limit: 1 }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(articleTable)
          .where(publicFeedWhere({ tagSlug: slug })),
      ]);
      return {
        tag: tagResults[0] || null,
        totalCount: countResult[0]?.count || 0,
      };
    },
    ["tag-with-count-v1", slug],
    { tags: [CACHE_TAGS.taxonomy, CACHE_TAGS.articles, tagTag(slug)], revalidate: 3600 },
  )();
}

const getTagWithCount = cache(async (slug: string) => getCachedTagWithCount(slug));

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const requestedPage = typeof sp?.page === "string" ? Number(sp.page) : 1;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 1 ? requestedPage : 1;
  const { tag, totalCount: count } = await getTagWithCount(slug);
  
  if (!tag) {
    return { title: "Tag Not Found — xSypher" };
  }

  const pageSuffix = page > 1 ? ` (Page ${page})` : "";
  const title = `${tag.name} News & Articles${pageSuffix} — ${siteConfig.name}`;
  const description = tag.description || `Read the latest news and analysis about ${tag.name}.`;
  const url = `${siteConfig.url}/tag/${tag.slug}`;

  // The thin-content rule is unchanged: a tag with fewer than three stories is
  // not worth indexing. What is new is everything else — this is an archive of
  // other people's stories, so it must not present itself as owning their
  // photographs (the same reason category archives are noindexed).
  const indexable = count >= 3;

  return {
    title,
    description,
    alternates: {
      canonical: page > 1 ? `${url}?page=${page}` : url,
    },
    robots: {
      index: indexable,
      follow: true,
      googleBot: {
        index: indexable,
        follow: true,
        // A thin tag archive is never an image destination.
        "max-image-preview": indexable ? "standard" : "none",
      },
    },
    // The tag archive's own social card is the brand banner. Without this the
    // page declared no image at all, which left a card thumbnail free to be
    // bound to "${tag.name} News & Articles — xSypher" in Google Images.
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      images: [
        {
          url: brandBannerUrl(),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [brandBannerUrl()],
      site: siteConfig.twitter,
    },
  };
}

export const revalidate = 300; // tag listing

export default async function TagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const requestedPage = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 107374179 ? requestedPage : 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const [{ tag, totalCount }, articles] = await Promise.all([
    getTagWithCount(slug),
    getTagArticles(slug, skip, limit),
  ]);
  if (!tag) {
    notFound();
  }

  const filter = { tagSlug: slug };

  const hasNextPage = skip + limit < totalCount;
  const hasPrevPage = page > 1;

  const nonce = (await headers()).get("x-csp-nonce") || undefined;

  return (
    <div className="wrap">
      {/* CollectionPage whose only ImageObject is the brand banner and whose
          ItemList entries are bare article URLs: the tag archive has no
          structured path from a card thumbnail to this URL. */}
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(generateCollectionPageJsonLd({
            url: siteConfig.url + "/tag/" + tag.slug,
            name: `${tag.name} — ${siteConfig.name}`,
            description: tag.description || `Stories tagged ${tag.name} on ${siteConfig.name}.`,
            items: articles.slice(0, 20).map(article => ({
              url: `${siteConfig.url}/article/${article.slug}`,
              name: article.title,
            })),
          })),
        }}
      />
      <section className="cat-hero">
        <span className="kicker">Tag</span>
        <h1>{tag.name}</h1>
        <p>{tag.description || `Explore ${totalCount} stories tagged with ${tag.name}.`}</p>
      </section>
      
      <div className="cat-body">
        <div>
          <div className="day-group">
            <div className="day-label" style={{ marginBottom: "16px" }}>Latest Stories</div>
            {articles.length > 0 ? (
              <PaginatedFeed initialArticles={articles} filter={filter} initialOffset={skip + articles.length} initialHasMore={hasNextPage} />
            ) : (
              <p className="muted" style={{ padding: "40px 0" }}>No published articles found with this tag.</p>
            )}
            
            {(hasPrevPage || hasNextPage) && (
              <nav aria-label="Tag archive pagination" style={{ display: "flex", justifyContent: "space-between", marginTop: "32px", padding: "16px 0", borderTop: "1px solid var(--line)" }}>
                {hasPrevPage ? (
                  <Link href={page === 2 ? `/tag/${tag.slug}` : `/tag/${tag.slug}?page=${page - 1}`} className="btn-cs">← Previous Page</Link>
                ) : <span />}
                {hasNextPage ? (
                  <Link href={`/tag/${tag.slug}?page=${page + 1}`} className="btn-cs">Next Page →</Link>
                ) : <span />}
              </nav>
            )}
          </div>
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
