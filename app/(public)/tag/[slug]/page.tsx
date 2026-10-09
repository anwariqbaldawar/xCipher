import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { tag as tagTable, article as articleTable } from "@/lib/db/schema";
import { publicFeedWhere } from "@/lib/feed";
import { getTagArticles } from "@/lib/cached-queries";
import PaginatedFeed from "@/components/article/PaginatedFeed";
import Sidebar from "@/components/layout/Sidebar";
import Link from "next/link";
import { siteConfig } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const getTagWithCount = cache(async (slug: string) => {
  const [tagResults, countResult] = await Promise.all([
    db.query.tag.findMany({ where: eq(tagTable.slug, slug), limit: 1 }),
    db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(articleTable)
      .where(publicFeedWhere({ tagSlug: slug })),
  ]);
  return {
    tag: tagResults[0] || null,
    totalCount: countResult[0]?.count || 0,
  };
});

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

  return {
    title: `${tag.name} News & Articles${pageSuffix} — xSypher`,
    description: tag.description || `Read the latest news and analysis about ${tag.name}.`,
    alternates: {
      canonical: page > 1 ? `${siteConfig.url}/tag/${tag.slug}?page=${page}` : `${siteConfig.url}/tag/${tag.slug}`,
    },
    robots: {
      index: count >= 3,
      follow: true,
    }
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

  return (
    <div className="wrap">
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
