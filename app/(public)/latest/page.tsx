import type { Metadata } from "next";
import { getLatestArticles } from "@/lib/cached-queries";
import PaginatedFeed from "@/components/article/PaginatedFeed";
import { LATEST_ARTICLE_LIMIT } from "@/lib/queries";
import Sidebar from "@/components/layout/Sidebar";
import { brandBannerUrl, siteConfig } from "@/lib/seo";
import { generateCollectionPageJsonLd } from "@/lib/entity-schema";
import { serializeJsonLd } from "@/lib/article-schema";
import { headers } from "next/headers";

const latestTitle = `Latest — ${siteConfig.name}`;
const latestDescription = "Every xSypher story, newest first — reporting, analysis, reviews and guides as they publish.";

export const metadata: Metadata = {
  title: latestTitle,
  description: latestDescription,
  alternates: {
    canonical: `${siteConfig.url}/latest`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // /latest is a complete duplicate of the published article set, so it is
      // never allowed to represent itself with a photograph. Without this the
      // feed's card thumbnails were eligible to be bound to "Latest — xSypher"
      // in Google Images, which is the same hijack the category archives had.
      "max-image-preview": "none",
    },
  },
  // The feed page's own social card is the brand banner — it never borrows a
  // story's featured image.
  openGraph: {
    title: latestTitle,
    description: latestDescription,
    url: `${siteConfig.url}/latest`,
    siteName: siteConfig.name,
    images: [
      {
        url: brandBannerUrl(),
        width: 1200,
        height: 630,
        alt: latestTitle,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: latestTitle,
    description: latestDescription,
    images: [brandBannerUrl()],
    site: siteConfig.twitter,
  },
};

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
export const revalidate = 3600; // latest listing

/** Read once per server render to bucket stories by day.
 *
 *  Declared outside the component because react-hooks/purity treats a clock
 *  read in a component body as impure, and rightly: the value must not vary
 *  between reconciliation passes. Here it is captured once and every article in
 *  the pass is measured against the same instant. */
function currentTimestamp(): number {
  return Date.now();
}

export default async function LatestPage() {
  const articles = await getLatestArticles();

  // Bucketing is a data decision, so unlike the relative labels it genuinely
  // has to happen here. The clock is read once, before the JSX, rather than
  // during render -- that is what react-hooks/purity objects to, and it also
  // keeps every article in this pass measured against the same instant instead
  // of a value that drifts as the list is walked.
  //
  // The buckets are still only as fresh as the 180s revalidate window, which is
  // correct for day-granularity headings.
  const renderedAt = currentTimestamp();

  const nonce = (await headers()).get("x-csp-nonce") || undefined;

  return (
    <div className="wrap">
      {/* CollectionPage with a bare-URL ItemList: the first image a crawler can
          reach from this page's structured data is the brand banner, never a
          story's own photograph. */}
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(generateCollectionPageJsonLd({
            url: `${siteConfig.url}/latest`,
            name: latestTitle,
            description: latestDescription,
            items: articles.slice(0, 20).map(article => ({
              url: `${siteConfig.url}/article/${article.slug}`,
              name: article.title,
            })),
          })),
        }}
      />
      <section className="cat-hero" style={{ marginBottom: 0 }}>
        <span className="kicker">The wire</span>
        <h1>Latest</h1>
        <p>Every xSypher story, newest first — reporting, analysis, reviews and guides as they publish.</p>
      </section>
      <div className="cat-body">
        <div>
          {articles.length > 0 ? (
            <PaginatedFeed initialArticles={articles} initialPageSize={LATEST_ARTICLE_LIMIT} bucketAt={renderedAt} />
          ) : (
            <p className="muted" style={{ padding: "40px 0" }}>No published stories yet. Check back soon.</p>
          )}
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
