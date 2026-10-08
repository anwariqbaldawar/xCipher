import { siteConfig } from "@/lib/seo";

// ─────────────────────────────────────────────────────────────────────────────
// Sitemap index.
//
// /sitemap.xml is now an index pointing at two child sitemaps:
//   /sitemap/pages.xml    — regular sitemap (static pages, categories, authors,
//                           all published articles)
//   /sitemap/articles.xml — Google News sitemap (articles from the last 48h,
//                           with the <news:news> namespace Google requires)
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 3600;

export async function GET() {
  const base = siteConfig.url;
  const now = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${base}/sitemap/pages.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${base}/sitemap/articles.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
