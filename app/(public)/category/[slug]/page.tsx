import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCategoryArticles } from "@/lib/cached-queries";
import { eq, sql, isNull } from "drizzle-orm";
import { category as categoryTable } from "@/lib/db/schema";
import { brandBannerUrl, siteConfig } from "@/lib/seo";
import { generateCollectionPageJsonLd } from "@/lib/entity-schema";
import { serializeJsonLd } from "@/lib/article-schema";
import { IMAGE_WIDTHS, resolveImageSrc } from "@/lib/image-url";
import { headers } from "next/headers";
import PaginatedFeed from "@/components/article/PaginatedFeed";
import ArticleByline from "@/components/article/ArticleByline";
import { LISTING_ARTICLE_LIMIT } from "@/lib/queries";
import Sidebar from "@/components/layout/Sidebar";
import RelativeTime from "@/components/common/RelativeTime";
import AdUnit from "@/components/common/AdUnit";
import SubcategoryStrip from "@/components/category/SubcategoryStrip";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sub?: string }>;
}

const getCategoryBySlug = cache(async (slug: string) => {
  const [cat] = await db.query.category.findMany({
    where: eq(categoryTable.slug, slug),
    with: { parent: { columns: { slug: true, name: true } } },
    limit: 1,
  });
  if (!cat) return null;
  const result = await db.execute(sql`SELECT count(*) FROM "Article" a WHERE (a."categoryId" = ${cat.id} OR a."categoryId" IN (SELECT id FROM "Category" WHERE "parentId" = ${cat.id})) AND a."status" = 'PUBLISHED'`);
  const count = result.rows[0]?.count || 0;
  return { ...cat, publishedArticleCount: Number(count) };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);

  const catName = cat?.name;
  const catDesc = cat?.description;

  if (!catName) return { title: `Category — ${siteConfig.name}` };

  return {
    title: `${catName} — ${siteConfig.name}`,
    description: catDesc || `${catName} news and updates on ${siteConfig.name}.`,
    alternates: {
      canonical: `${siteConfig.url}/category/${slug}`,
    },
    // IMPORTANT (Google Images): a category archive lists dozens of stories and
    // therefore renders dozens of featured images. Even an empty archive stays
    // crawlable via `follow`, so link equity still flows to the articles.
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
        // Do not let the archive's cards be indexed as images of this page.
        "max-image-preview": "none",
      },
    },
    // The archive's own social card is the brand banner. It never borrows a
    // story's featured image, which is what previously made Google Images bind
    // article photographs to "… — xSypher" category titles.
    openGraph: {
      title: `${catName} — ${siteConfig.name}`,
      description: catDesc || `${catName} news and updates on ${siteConfig.name}.`,
      url: `${siteConfig.url}/category/${slug}`,
      siteName: siteConfig.name,
      images: [
        {
          url: brandBannerUrl(),
          width: 1200,
          height: 630,
          alt: `${catName} — ${siteConfig.name}`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${catName} — ${siteConfig.name}`,
      description: catDesc || `${catName} news and updates on ${siteConfig.name}.`,
      images: [brandBannerUrl()],
      site: siteConfig.twitter,
    },
  };
}

export async function generateStaticParams() {
  try {
    const categories = await db.query.category.findMany({
      where: isNull(categoryTable.parentId),
      columns: { slug: true },
    });
    return categories.map((category) => ({ slug: category.slug }));
  } catch (error) {
    console.warn("[category] Failed to fetch slugs for generateStaticParams:", error);
    return [];
  }
}

// Pre-built at deploy time. force-static keeps unknown slugs off the SSR path
// so a cache miss cannot spend Worker CPU rendering a listing on request.
export const dynamic = "force-static";
export const revalidate = 300; // category listing

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sub } = await searchParams;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  if (category.parentId && category.parent?.slug) {
    permanentRedirect(`/category/${category.parent.slug}?sub=${category.slug}`);
  }

  const subcategories = await db.query.category.findMany({
    where: sql`${categoryTable.parentId} IN (SELECT id FROM "Category" WHERE slug = ${slug}) AND EXISTS (SELECT 1 FROM "Article" WHERE "Article"."categoryId" = ${categoryTable.id} AND "Article"."status" = 'PUBLISHED')`,
    orderBy: (c, { asc }) => [asc(c.name)],
    columns: { name: true, slug: true }
  });

  const catName = category.name || slug;
  const catFullTitle = category.fullTitle || catName;
  const catDesc = category.description || `${catName} news and updates on xSypher.`;

  // Tagged per category, so an article landing in AI does not invalidate the
  // twelve other sections.
  const articles = await getCategoryArticles(slug, sub);

  const feat = articles[0];
  const rest = articles.slice(1);

  const nonce = (await headers()).get("x-csp-nonce") || undefined;
  const canonical = `${siteConfig.url}/category/${slug}${sub ? `?sub=${sub}` : ""}`;

  return (
    <div className="wrap">
      {/* CollectionPage, not an article: the only ImageObject on this page is
          the brand banner, and the story list is a bare URL ItemList. A crawler
          reading this JSON-LD has no path from a card thumbnail to this URL. */}
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(generateCollectionPageJsonLd({
            url: canonical,
            name: `${catFullTitle} — ${siteConfig.name}`,
            description: catDesc,
            items: articles.slice(0, 20).map(article => ({
              url: `${siteConfig.url}/article/${article.slug}`,
              name: article.title,
            })),
          })),
        }}
      />
      <section className="cat-hero">
        <span className="kicker">xSypher section</span>
        <h1>{catFullTitle}</h1>
        <p>{catDesc}</p>
        <div className="ch-meta">
          <span>{articles.length} {articles.length === 1 ? "story" : "stories"}</span>
          <span>Updated {feat ? <RelativeTime dateTime={new Date(feat.createdAt).toISOString()} /> : "recently"}</span>
        </div>
      </section>

      <SubcategoryStrip subcategories={subcategories} parentSlug={slug} />

      {/* Category Top Ad */}
      {/* Category Top Ad */}
      <AdUnit location="category-top" size="728 × 90" slotClass="ad-leaderboard" />

      <div className="cat-body">
        <div>
          {feat ? (
            <article className="cat-feat story" style={{ marginBottom: "34px" }} data-reveal>
              <Link href={`/article/${feat.slug}`} className="ph r-219" tabIndex={-1} aria-hidden="true">
                {/* Archive cards are width-capped well below the article hero
                    (1400px): a listing renders 20-40 of these, and a full-size
                    original per card is both slow and a stronger image signal
                    than the archive deserves. */}
                <Image
                  src={resolveImageSrc(feat.img, IMAGE_WIDTHS.cardHero, 471)}
                  alt={feat.title}
                  fill
                  sizes="(max-width: 1023px) 100vw, 66vw"
                  className="object-cover"
                />
              </Link>
              <div>
                <Link href={`/category/${slug}`} className="kicker plain">Featured</Link>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem,2.6vw,1.9rem)", fontWeight: 660, lineHeight: 1.12, letterSpacing: "-.015em", margin: "12px 0 10px" }}>
                  <Link href={`/article/${feat.slug}`}>
                    <span className="hlink">{feat.title}</span>
                  </Link>
                </h3>
                <p className="story-deck" style={{ fontSize: "15.5px" }}>{feat.deck}</p>
                <div className="byline" style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ArticleByline article={feat} />
                  <span><span className="dot">·</span> {<RelativeTime dateTime={new Date(feat.createdAt).toISOString()} />} <span className="dot">·</span> {feat.readingTime || 1} min read</span>
                </div>
              </div>
            </article>
          ) : null}

          {rest.length > 0 ? (
            <>
              <div className="day-label" style={{ marginBottom: "6px" }}>More in {catName}</div>
              <PaginatedFeed
                initialArticles={rest}
                initialOffset={1}
                initialHasMore={articles.length === LISTING_ARTICLE_LIMIT}
                filter={{ categorySlug: slug, subcategorySlug: sub || undefined }}
              />
            </>
          ) : !feat ? (
            <p className="muted" style={{ padding: "40px 0" }}>No stories published in {catName} yet.</p>
          ) : null}
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
