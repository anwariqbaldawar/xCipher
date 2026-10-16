import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { getArticleRecommendations, getBenchmarkLeaderboard, getRecentArticleSlugs } from "@/lib/cached-queries";
import { CACHE_TAGS, articleTag } from "@/lib/cache-tags";
import { eq, and, sql } from "drizzle-orm";
import { article as articleTable } from "@/lib/db/schema";
import { articleFeaturedImageUrl, constructMetadata, generateNewsArticleJsonLd, siteConfig } from "@/lib/seo";
import { IMAGE_WIDTHS, isRasterImageUrl, resolveImageSrc } from "@/lib/image-url";
import { getArticleAuthor } from "@/lib/personas";
import nextDynamic from "next/dynamic";
import { serializeJsonLd, withEditorialSchema } from "@/lib/article-schema";
import ArticleBody from "@/components/article/ArticleBody";
import StoryCard from "@/components/article/StoryCard";
import ProgressBar from "@/components/article/ProgressBar";
import ListenButton from "@/components/article/ListenButton";
import { fetchFromR2 } from "@/lib/storage";
import ArticleMobileToolbar from "@/components/article/ArticleMobileToolbar";
import ViewCounter from "@/components/article/ViewCounter";
import ActiveCategorySetter from "@/components/layout/ActiveCategorySetter";
import ArticleByline from "@/components/article/ArticleByline";
import AuthorBox from "@/components/article/AuthorBox";

const CommentsSection = nextDynamic(() => import("@/components/article/CommentsSection"), {
  loading: () => (
    <section id="comments" className="comments scroll-mt-28" aria-labelledby="cmtH">
      <h2 id="cmtH">Discussion</h2>
      <p style={{ color: "var(--ink-muted)", fontSize: "14px" }}>Loading discussion…</p>
    </section>
  ),
});

const ShareRow = nextDynamic(() => import("@/components/article/ShareRow"));
const ArticleSidebar = nextDynamic(() => import("@/components/article/ArticleSidebar"));
const TableOfContents = nextDynamic(() => import("@/components/article/TableOfContents"));

interface Props {
  params: Promise<{ slug: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Article reads: two cache layers, one query
// ─────────────────────────────────────────────────────────────────────────────
//
// `generateMetadata` and the page component both need the same row, and both ran
// on every request this route was not served from the route cache — a Googlebot
// crawl, a Twitterbot unfurl, a Meta link preview, or any reader hitting a slug
// outside the pre-built set. Two identical queries per render, every render.
//
// Two layers, each doing the job the other cannot:
//
//   React.cache()      — request-level deduplication. `generateMetadata` and the
//                        page run in one render pass, so this makes the pair one
//                        query. It cannot help a *second* visitor.
//   unstable_cache()   — cross-request persistence. Tagged `articles` and
//                        `article:<slug>`, so publishing, editing or deleting the
//                        story drops exactly this entry (and nothing else), while
//                        a crawler re-fetching the URL a thousand times does not
//                        reach Postgres at all.
//
// The 3600s window matches the route's own `revalidate`, and is a ceiling rather
// than the freshness mechanism: the tag invalidation is what keeps an edited
// story current.
//
// Dates are rehydrated on the way out of the cache. `unstable_cache` stores its
// result as JSON, so a `Date` read back from a cache hit is an ISO string while
// one from a fresh read is a `Date`. The metadata builder, the JSON-LD and the
// "Updated <date>" line all call `Date` methods on these fields, so the boundary
// converts once here instead of at every use — that mismatch is otherwise only
// reproducible on a warm cache, i.e. in production and never in dev.
// ─────────────────────────────────────────────────────────────────────────────

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Same row, cached. `slug` is part of the key and of the invalidation tag. */
function getCachedPublishedArticle(slug: string) {
  return unstable_cache(
    async () => {
      const [article] = await db.query.article.findMany({
        where: and(eq(articleTable.slug, slug), eq(articleTable.status, "PUBLISHED")),
        limit: 1,
        columns: {
          id: true, slug: true, title: true, deck: true, img: true,
          featuredImageAlt: true, featuredImageCaption: true, featuredImageCredit: true,
          author: true, role: true, views: true, status: true, createdAt: true,
          publishedAt: true, updatedAt: true, categoryId: true, contentUrl: true,
          isAnonymous: true, readingTime: true, seoTitle: true, seoDesc: true,
          metaTitle: true, metaDescription: true, ogImage: true, canonicalUrl: true,
        },
        with: {
          category: { with: { parent: true } },
          authorModel: true,
          tags: { with: { tag: true } },
        },
      });
      return article ?? null;
    },
    ["published-article-v1", slug],
    { tags: [CACHE_TAGS.articles, articleTag(slug)], revalidate: 3600 },
  )();
}

const getPublishedArticleBySlug = cache(async (slug: string) => {
  const article = await getCachedPublishedArticle(slug);
  if (!article) return null;
  return {
    ...article,
    createdAt: toDate(article.createdAt),
    publishedAt: article.publishedAt ? toDate(article.publishedAt) : null,
    updatedAt: toDate(article.updatedAt),
  };
});

/**
 * A renamed article's *old* slug, used to 301 rather than 404.
 *
 * Only reached when the primary lookup misses, but that is precisely the case a
 * crawler keeps re-requesting once a story has been renamed — so it is cached on
 * the same terms, under the same `articles` tag.
 */
function getCachedHistoricalArticle(slug: string) {
  return unstable_cache(
    async () => {
      const [historicalArticle] = await db.query.article.findMany({
        where: and(
          sql`${slug} = ANY(${articleTable.previousSlugs})`,
          eq(articleTable.status, "PUBLISHED"),
        ),
        limit: 1,
        columns: { id: true, slug: true },
      });
      return historicalArticle ?? null;
    },
    ["historical-article-v1", slug],
    { tags: [CACHE_TAGS.articles, articleTag(slug)], revalidate: 3600 },
  )();
}

const getHistoricalArticleBySlug = cache(async (slug: string) => {
  return getCachedHistoricalArticle(slug);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);

  if (!article) {
    const historicalArticle = await getHistoricalArticleBySlug(slug);
    // A renamed article still resolves — the page below redirects to the
    // current slug — so metadata must return rather than throw. The old URL,
    // however, is not a page in its own right and must never be indexed.
    if (historicalArticle) return { robots: { index: false, follow: true } };

    // Unknown, unpublished or deleted slug. Throwing notFound() here is what
    // makes the response a 404 with the 404 document: without it Next served
    // the route's empty metadata, so a dead article URL answered with the
    // homepage <title> and social card while the body rendered "not found".
    // Crawlers treated those as soft 404s and kept the URLs alive.
    notFound();
  }

  // Scheduled for a future date. The page 404s it, so the title, description
  // and OG image must not be readable from the metadata either.
  if (article.publishedAt && article.publishedAt > new Date()) notFound();

  const authorName = getArticleAuthor(article).name;
  const catName = article.category?.parent?.name || article.category?.name || "News";
  const ogParams = new URLSearchParams();
  ogParams.set("title", article.metaTitle || article.seoTitle || article.title);
  ogParams.set("author", authorName);
  ogParams.set("category", catName);
  // `siteConfig.url` rather than the raw env var: it is the resolver that keeps
  // a localhost or www value out of published URLs (see lib/seo.ts).
  const ogUrl = `${siteConfig.url}/api/og?${ogParams.toString()}`;

  // The article's own featured image is the ONLY editorial image this route may
  // present. A stale placeholder resolves to undefined and the generated card
  // below covers social sharing; the brand banner is never substituted, because
  // that is what made article pages claim an image that is not theirs.
  //
  // The raster check is a social-platform constraint, not a preference: X,
  // Threads and WhatsApp refuse `image/svg+xml` and fall back to a bare text
  // link, so a vector asset in the featured slot is replaced by the generated
  // PNG card rather than shipped and silently dropped.
  const featuredImage = articleFeaturedImageUrl(article);
  const usableFeaturedImage = featuredImage && isRasterImageUrl(featuredImage) ? featuredImage : undefined;
  const resolvedImage = usableFeaturedImage || ogUrl;

  return constructMetadata({
    // TSEO-002/TSEO-003: the editor's PRIMARY fields are metaTitle/metaDescription
    // (they drive the character counters and the Google SERP preview). This call
    // previously read only the legacy seoTitle/seoDesc fields, so anything typed
    // into the primary inputs never shipped. Primary first, legacy fallback.
    // ogImage and canonicalUrl were saved but never consumed — now wired too.
    title: article.metaTitle || article.seoTitle || article.title,
    description: article.metaDescription || article.seoDesc || article.deck || "",
    image: resolvedImage,
    // Alt text: the editor's description when set (better for screen readers),
    // otherwise the exact headline, so the image is unambiguously tied to it.
    imageAlt: article.featuredImageAlt?.trim() || article.title,
    canonical: article.canonicalUrl || `/article/${article.slug}`,
    type: "article",
    publishedTime: article.publishedAt ? article.publishedAt.toISOString() : article.createdAt.toISOString(),
    modifiedTime: article.updatedAt.toISOString(),
    authors: [authorName],
    section: catName,
    tags: article.tags?.map(entry => entry.tag?.name || "").filter(Boolean),
  });
}

export async function generateStaticParams() {
  const articles = await getRecentArticleSlugs();
  return articles.map((article) => ({ slug: article.slug }));
}

// Pre-built at deploy time. force-static keeps unknown slugs off the SSR path
// so a cache miss cannot spend Worker CPU rendering an article on request.
export const dynamic = "force-static";
export const revalidate = 3600; // article



export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  
  if (!article) {
    const historicalArticle = await getHistoricalArticleBySlug(slug);
    if (historicalArticle) {
      redirect(`/article/${historicalArticle.slug}`);
    }
    notFound();
  }

  if (article.publishedAt && article.publishedAt > new Date()) {
    notFound();
  }
  
  const mainCat = article.category?.parent;
  const subCat = mainCat ? article.category : null;
  const catName = mainCat?.name || article.category?.name || "News";
  const catSlug = mainCat?.slug || article.category?.slug || "news";
  // Independent content and auxiliary reads can run concurrently.
  const [r2Content, globalLeaderboard, { related: relatedDb, discoverMore: discoverMoreDb }] = await Promise.all([
    fetchFromR2(article.contentUrl),
    getBenchmarkLeaderboard(),
    getArticleRecommendations(article.id, article.tags.map(tag => tag.B), mainCat?.id ?? article.categoryId, catSlug),
  ]);
  const articleHtml = typeof r2Content === "object" ? r2Content?.html : r2Content || "<p>Content could not be loaded.</p>";


  const related = relatedDb.map(a => ({
    ...a,
    mins: a.readingTime || 1,
    views: a.views,
    img: a.img || "",
    alt: a.title
  }));

  const discoverMore = discoverMoreDb.map(a => ({
    ...a,
    mins: a.readingTime || 1,
    views: a.views,
    img: a.img || "",
    alt: a.title
  }));

  const siteUrl = siteConfig.url;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl
      },
      ...(mainCat ? [{
        "@type": "ListItem",
        "position": 2,
        "name": mainCat.name,
        "item": `${siteUrl}/category/${mainCat.slug}`
      }] : []),
      {
        "@type": "ListItem",
        "position": mainCat ? 3 : 2,
        "name": subCat ? subCat.name : catName,
        "item": `${siteUrl}/category/${subCat ? `${catSlug}?sub=${subCat.slug}` : catSlug}`
      },
      {
        "@type": "ListItem",
        "position": mainCat ? 4 : 3,
        "name": article.title,
        "item": `${siteUrl}/article/${article.slug}`
      }
    ]
  };

  const nonce = (await headers()).get("x-csp-nonce") || undefined;

  return (
    <>
      <ActiveCategorySetter slug={catSlug} />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(withEditorialSchema(generateNewsArticleJsonLd(article), articleHtml)) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <ProgressBar />
      <ViewCounter articleId={article.id} />
      <article className="art pb-16" itemScope itemType="https://schema.org/NewsArticle">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
          
          {/* HEADER ROW */}
          <header className="mb-4 flex flex-col min-w-0 lg:col-start-2 lg:col-span-10 xl:col-start-2 xl:col-span-8">
              <nav className="crumb mb-6 hidden md:flex" aria-label="Breadcrumb">
                <Link href="/">Home</Link>
                <span className="sep">/</span>
                <Link href={`/category/${catSlug}`}>{catName}</Link>
                {subCat && (
                  <>
                    <span className="sep">/</span>
                    <Link href={`/category/${catSlug}?sub=${subCat.slug}`}>{subCat.name}</Link>
                  </>
                )}
              </nav>
              <Link className="kicker art-kicker" href={`/category/${catSlug}`}>
                {catName} {subCat && `/ ${subCat.name}`}
              </Link>
              <h1 className="art-title" itemProp="headline">{article.title}</h1>

              <p className="art-deck" itemProp="description">{article.deck}</p>

              <div className="py-4 my-6 border-t border-b border-[var(--line)]">
                <div className="flex items-center gap-3 mb-4"><ArticleByline article={article} size={40} showRole priority={true} /></div>
                <div className="font-mono text-[11px] text-[var(--muted)] tracking-tight flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Published <b><time itemProp="datePublished" className="text-[var(--ink)]">{(article.publishedAt || article.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time></b></span>
                  <span className="hidden sm:inline">·</span>
                  <span>Updated <b>{article.updatedAt.toLocaleDateString("en-US")}</b></span>
                  <span className="hidden sm:inline">·</span>
                  <span><b>{article.readingTime || 1} min</b> read</span>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "14px", marginBottom: "32px" }}>
                <ListenButton />
                <a
                  href="#comments"
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold !text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-sm shrink-0"
                  aria-label="Jump to comments section"
                >
                  <MessageSquare className="w-3.5 h-3.5 !text-white" aria-hidden="true" />
                  <span>Comments</span>
                </a>
              </div>

              {/* FEATURED (PRIMARY) IMAGE.
                  Read in order, the header is kicker → headline → deck →
                  byline and publication details → action bar → photograph:
                  the whole editorial block is together, and the picture opens
                  the story instead of standing between the headline and who
                  wrote it. It closes the <header>, so body copy still starts
                  below it.
                  `data-image-role="featured"` is the marker every metadata
                  builder reads to decide which image this page is allowed to
                  publish, so that binding survives any further layout change.
                  `preload` (Next 16's replacement for `priority`) writes the
                  <link rel="preload"> into <head>; fetchPriority="high" keeps it
                  ahead of every inline body image in the network queue. */}
              {/* No card framing: the photograph and its caption sit directly
                  in the article column — no border, background box or padded
                  wrapper around them. */}
              <figure className="art-hero my-8" data-image-role="featured">
                <div className="ph r-169 relative w-full aspect-[16/9]" style={{ aspectRatio: "16 / 9" }}>
                  <Image
                    src={resolveImageSrc(article.img, IMAGE_WIDTHS.articleHero, 788)}
                    alt={article.featuredImageAlt?.trim() || article.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    preload
                    fetchPriority="high"
                    className="object-cover"
                  />
                </div>
                <figcaption className="text-xs text-[var(--muted)] mt-3">
                  {article.featuredImageCaption || article.title}
                  {article.featuredImageCredit && (
                    <span className="credit block text-[10px] uppercase tracking-wider mt-1">
                      Image Credit: {article.featuredImageCredit}
                    </span>
                  )}
                </figcaption>
              </figure>

            </header>

          {/* LEFT SIDEBAR (Socials, 1 col) */}
          <div className="hidden lg:block lg:col-start-1 lg:col-span-1">
            <div className="sticky top-32">
              <ArticleSidebar title={article.title} />
            </div>
          </div>

          {/* MAIN ARTICLE BODY & FOOTER */}
          <div className="lg:col-start-2 lg:col-span-10 xl:col-start-2 xl:col-span-8 flex flex-col min-w-0">
            <div className="prose min-w-0 max-w-none w-full" id="prose" itemProp="articleBody">
              <ArticleBody html={articleHtml} globalLeaderboard={globalLeaderboard} deviceName={article.title} />
            </div>

            <div className="art-foot mt-4">
        {article.tags && article.tags.length > 0 && (
          <div className="border-t border-[var(--line)] pt-3 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] block mb-2">Tags</span>
            <div className="tag-row mt-0">
              {article.tags.map(t => (
                <Link key={t.B} className="chip" href={`/tag/${t.tag.slug}`}>
                  {t.tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        {(!article.tags || article.tags.length === 0) && <div className="border-t border-[var(--line)] my-4"></div>}

        <div className={article.tags && article.tags.length > 0 ? "border-t border-[var(--line)] pt-4 mb-4" : "mb-4"}>
          <ShareRow title={article.title} slug={article.slug} deck={article.deck || undefined} />
        </div>
        
        <div className="fact-note">
          <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="9"/>
          </svg>
          <span>
            <b>Fact-check & corrections:</b> This story was reported, edited and fact-checked by the xSypher desk. 
            If you spot an error, tell us via our <Link href="/page/corrections" style={{ textDecoration: "underline", color: "var(--accent)" }}>corrections page</Link> — we fix mistakes openly and note every material change.
          </span>
        </div>

        <AuthorBox article={article} />

        <CommentsSection articleSlug={article.slug} />

        <section aria-label="Read Next" style={{ marginTop: "48px", paddingTop: "40px", borderTop: "1px solid var(--line)" }}>
          <h2 style={{ fontFamily: "var(--f-ui)", fontSize: "16px", fontWeight: 700, letterSpacing: ".02em", marginBottom: "20px" }}>Read Next</h2>
          <div className="grid4">
            {related.map(a => (
              <StoryCard key={a.id} article={a} showDeck={false} />
            ))}
          </div>
        </section>

        <section aria-label="Discover More" style={{ marginTop: "48px", paddingTop: "40px", borderTop: "1px solid var(--line)" }}>
          <h2 style={{ fontFamily: "var(--f-ui)", fontSize: "16px", fontWeight: 700, letterSpacing: ".02em", marginBottom: "20px" }}>Discover More</h2>
          <div className="grid4">
            {discoverMore.map(a => (
              <StoryCard key={a.id} article={a} showDeck={false} />
            ))}
          </div>
        </section>
          </div>
        </div>

        {/* RIGHT SIDEBAR (TOC, 3 cols) */}
        <aside className="hidden xl:block xl:col-start-10 xl:col-span-3 shrink-0">
          <div className="sticky top-32 space-y-4">
            <TableOfContents containerSelector=".prose" />
          </div>
        </aside>

      </div>
      <ArticleMobileToolbar />
    </article>
  </>
  );
}
