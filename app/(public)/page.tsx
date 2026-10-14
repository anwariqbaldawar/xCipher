import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getImgSrc, fmtViews } from "@/lib/utils";
import RelativeTime from "@/components/common/RelativeTime";
import { getHomeArticles, getHomeHeroArticle, getHomeBriefing, getHomePicks } from "@/lib/cached-queries";
import StoryCard from "@/components/article/StoryCard";
import StoryRow from "@/components/article/StoryRow";
import ArticleByline from "@/components/article/ArticleByline";
import BreakingTicker from "@/components/home/BreakingTicker";
import EditorialTicker from "@/components/home/EditorialTicker";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import AdUnit from "@/components/common/AdUnit";
import { siteConfig } from "@/lib/seo";
import { getReadingTimeMinutes } from "@/lib/reading-time";

export const metadata: Metadata = {
  alternates: {
    canonical: siteConfig.url,
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
export const revalidate = 300; // homepage

export default async function Home() {
  // Tagged read: publishing invalidates the `articles` tag, which drops this
  // entry and nothing else. Previously the same event dropped every cached
  // route in the app.
  const dbArticles = await getHomeArticles();

  if (!dbArticles.length) return <div className="wrap py-20 text-center">No articles published yet.</div>;

  // homepagePlacement decides these, not array position.
  //
  // Previously `breaking` was `i === 1 || i === 2` and `pick` was
  // `i === 0 || i === 3` -- the second and third newest articles were
  // "breaking" purely by virtue of being second and third. Meanwhile the
  // editor has offered a Homepage Placement select (Hero / Featured Stories /
  // Editor's Picks) all along, the save action wrote it and the query selected
  // it, and absolutely nothing read it. Editors were setting a control that
  // did nothing, which is worse than not offering the control.
  //
  // Each section falls back to recency when no article carries that placement,
  // so a newsroom that never touches the field sees the homepage it saw
  // before.
  const mappedArticles = dbArticles.map((a) => ({
    ...a,
    // No Date.now() here: this page is cached for 300s, so a relative age
    // computed at render time is frozen into the cached HTML and served stale
    // to everyone in that window. The absolute createdAt is passed through and
    // <RelativeTime> does the arithmetic in the browser.
    age: 0,
    mins: a.readingTime || 1,
    alt: a.title,
    breaking: a.homepagePlacement === "featured",
    pick: a.homepagePlacement === "picks",
  }));

  const dbHeroArticle = await getHomeHeroArticle();
  const heroArticle = dbHeroArticle || dbArticles[0];
  const dbBriefingRaw = await getHomeBriefing(heroArticle.id);
  const dbPicksRaw = await getHomePicks();

  const lead = {
    ...heroArticle,
    age: 0,
    mins: heroArticle.readingTime || 1,
    alt: heroArticle.title,
    breaking: heroArticle.homepagePlacement === "featured",
    pick: heroArticle.homepagePlacement === "picks",
  };

  const briefing = dbBriefingRaw.map(a => ({
    ...a,
    age: 0,
    mins: a.readingTime || 1,
    alt: a.title,
    breaking: a.homepagePlacement === "featured",
    pick: a.homepagePlacement === "picks",
  }));
  const briefingIds = briefing.map(a => a.id);
  const excludedIds = [lead.id, ...briefingIds];
  const latest = mappedArticles.filter((a) => !excludedIds.includes(a.id)).slice(0, 15);
  
  const byCat = (slug: string) => mappedArticles.filter(a => {
    const mainCat = a.category?.parent || a.category;
    return mainCat?.slug === slug;
  });
  const gd = byCat("gadgets");
  const gm = byCat("gaming");
  
  const mainCategoryCounts = new Map<string, { slug: string, name: string, count: number }>();
  for (const a of mappedArticles) {
    const mainCat = a.category?.parent || a.category;
    if (mainCat && !['gadgets', 'gaming'].includes(mainCat.slug)) {
      const existing = mainCategoryCounts.get(mainCat.slug) || { slug: mainCat.slug, name: mainCat.name, count: 0 };
      existing.count += 1;
      mainCategoryCounts.set(mainCat.slug, existing);
    }
  }
  const topCategories = Array.from(mainCategoryCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  
  const mostRead = [...mappedArticles].sort((a, b) => b.views - a.views).slice(0, 5).map((a, i) => ({ ...a, most: i + 1 }));
  const trending = mostRead.map((a, i) => ({ ...a, trend: i + 1 }));
  
  const placedPicks = dbPicksRaw.map(a => ({
    ...a,
    age: 0,
    mins: a.readingTime || 1,
    alt: a.title,
    breaking: false,
    pick: true,
  }));
  
  let picks = [...placedPicks];
  if (picks.length < 4) {
    const pickIds = picks.map(a => a.id);
    const fallbackPicks = latest.filter(a => !pickIds.includes(a.id)).slice(0, 4 - picks.length);
    picks = [...picks, ...fallbackPicks.map(a => ({ ...a, pick: true }))];
  }
  
  const pickFeat = picks[0];
  const pickGrid = picks.slice(1, 4);

  return (
    <>
      {/* Uses the topped-up briefing list rather than the raw placement
          filter: BreakingTicker returns null on an empty array, so keying it
          off placement alone would make the ticker disappear entirely on any
          site that has not set the field. */}
      <BreakingTicker articles={briefing} />
      
      {/* Top Ad */}
      {/* Top Ad */}
      <AdUnit location="top" size="728 × 90" slotClass="ad-leaderboard" />

      {/* Lead Story & Briefing */}
      <section className="lead-grid wrap" aria-label="Lead story">
        <article className="lead-story story">
          <Link href={`/article/${lead.slug}`} className="ph r-169" tabIndex={-1} aria-hidden="true">
              <Image 
                src={getImgSrc(lead.img || "", 1280, 720)} 
                alt={lead.alt || lead.title} 
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 900px) 100vw, 66vw"
                priority 
                className="object-cover"
              />
          </Link>
          <Link href={`/category/${(lead.category as any)?.parent?.slug || lead.category?.slug || "news"}`} className="kicker">
            {(lead.category as any)?.parent ? `${(lead.category as any).parent.name} / ${lead.category?.name}` : lead.category?.name || "News"}
          </Link>
          <h1>
            <Link href={`/article/${lead.slug}`}>
              <span className="hlink">{lead.title}</span>
            </Link>
          </h1>
          <p className="story-deck">{lead.deck}</p>
          <div className="byline">
            <ArticleByline article={lead} size={56} showRole>
              <RelativeTime dateTime={new Date(lead.createdAt).toISOString()} /> <span className="dot">·</span> {lead.mins} min read
            </ArticleByline>
          </div>
        </article>
        
        <aside className="briefing" aria-label="The briefing">
          <div className="briefing-title">
            <h2>The Briefing</h2>
            <span>Updated {briefing[0]?.createdAt ? <RelativeTime dateTime={new Date(briefing[0].createdAt).toISOString()} /> : null}</span>
          </div>
          {briefing.map(a => (
            <StoryRow key={a.id} article={a} showDeck={false} />
          ))}
        </aside>
      </section>

      {/* Latest & Sidebar */}
      <div className="wrap feed-grid">
        <section aria-labelledby="latestH">
          <div className="sec-head" style={{ marginTop: "8px" }}>
            <h2 id="latestH">
              <span className="sec-rule"></span>Latest<span className="sec-sub">Every story, newest first</span>
            </h2>
            <Link href="/latest" className="view-all">
              View all 
              <svg className="ic-s" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </Link>
          </div>
          {latest.map(a => (
            <StoryRow key={a.id} article={a} />
          ))}
        </section>

        <aside className="side-col" aria-label="Sidebar">
          {/* Most Read */}
          <section className="panel" aria-labelledby="mrH">
            <h2 className="panel-h" id="mrH">Most Read</h2>
            <ol className="mostread">
              {mostRead.map(a => (
                <li key={a.id}>
                  <span className="rank">{String(a.most).padStart(2, "0")}</span>
                  <div>
                    <h3>
                      <Link href={`/article/${a.slug}`}>
                        <span className="hlink">{a.title}</span>
                      </Link>
                    </h3>
                    <span className="mr-cat">{a.category?.name || "News"}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Sidebar Ad */}
          <AdUnit location="sidebar" size="300 × 250" slotClass="ad-mrec" style={{ padding: 0 }} />

          <div className="trust-card">
            <h3>How we work</h3>
            <p>xSypher stories are reported, fact-checked and edited before publication. We correct errors openly and label opinion clearly. We buy our own review units and accept no payment for coverage.</p>
            <Link href="/page/editorial-standards">Read our editorial standards →</Link>
          </div>
        </aside>
      </div>

      {/* Ad */}
      <AdUnit location="between-sections" size="970 × 250" slotClass="ad-billboard" />

      {/* Dynamic Cat Split 1 & 2 */}
      {topCategories[0] && <CatSplit cat={topCategories[0].slug} articles={byCat(topCategories[0].slug)} />}
      
      {topCategories[1] && <CatSplit cat={topCategories[1].slug} articles={byCat(topCategories[1].slug)} reverse />}

      {/* Ad */}
      <AdUnit location="mid-feed" size="728 × 90" slotClass="ad-leaderboard" />

      {/* Gadgets Grid */}
      <section aria-label="Gadgets & Devices">
        <div className="wrap">
          <div className="sec-head">
            <h2><span className="sec-rule"></span>Gadgets & Devices</h2>
            <Link href="/category/gadgets" className="view-all">
              View all 
              <svg className="ic-s" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div className="grid4">
            {gd.slice(0, 4).map(a => (
              <StoryCard key={a.id} article={a} />
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Cat Split 3 */}
      {topCategories[2] && <CatSplit cat={topCategories[2].slug} articles={byCat(topCategories[2].slug)} reverse />}

      {/* Gaming Band */}
      <section className="band" aria-label="Gaming">
        <div>
          <div className="sec-head">
            <h2><span className="sec-rule"></span>Gaming</h2>
            <Link href="/category/gaming" className="view-all">
              View all 
              <svg className="ic-s" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div className="band-grid">
            {gm.slice(0, 3).map(a => (
              <StoryCard key={a.id} article={a} />
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Cat Split 4 */}
      {topCategories[3] && <CatSplit cat={topCategories[3].slug} articles={byCat(topCategories[3].slug)} />}

      {/* Trending */}
      <div className="trend-wrap">
        <div className="wrap">
          <div className="sec-head">
            <h2><span className="sec-rule"></span>Trending on xSypher</h2>
            <Link href="/latest" className="view-all">
              All stories 
              <svg className="ic-s" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div className="trend-grid">
            {trending.map(a => (
              <article key={a.id} className="trend" data-reveal>
                <span className="num">{String(a.trend).padStart(2, "0")}</span>
                <Link className="tr-cat" href={`/category/${a.category?.slug || "news"}`}>{a.category?.name || "News"}</Link>
                <h3>
                  <Link href={`/article/${a.slug}`}>
                    <span className="hlink">{a.title}</span>
                  </Link>
                </h3>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Editor's Picks Showcase */}
      {picks.length > 0 && (
        <section className="wrap" aria-label="Editor's picks">
          <div className="picks" data-reveal>
            {/* Section Header */}
            <div className="picks-head">
              <div className="picks-header-row">
                <div className="flex items-center gap-2.5">
                  <span className="pick-badge">
                    <svg className="ic-s" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l2.6 6.6L21 9.3l-5 4.4 1.5 6.8L12 16.9 6.5 20.5 8 13.7 3 9.3l6.4-.7L12 2z"/>
                    </svg>
                    Editor&apos;s Picks
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                    Curated Deep Dives &amp; Analysis
                  </span>
                </div>
                <span className="text-xs text-[var(--muted)] hidden sm:inline-block font-mono">
                  {picks.length} Curated Stories
                </span>
              </div>
            </div>

            <div className="picks-in">
              {/* Featured Lead Pick */}
              {pickFeat && (
                <article className="pick-feat story">
                  <Link href={`/article/${pickFeat.slug}`} className="ph r-169" tabIndex={-1} aria-hidden="true">
                    <Image 
                      src={getImgSrc(pickFeat.img || "", 900, 506)} 
                      alt={pickFeat.alt || pickFeat.title} 
                      fill 
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                    />
                  </Link>
                  <Link href={`/category/${pickFeat.category?.slug || "news"}`} className="kicker" style={{ marginTop: "16px" }}>
                    {pickFeat.category?.name || "News"}
                  </Link>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)] leading-tight mb-2">
                    <Link href={`/article/${pickFeat.slug}`}>
                      <span className="hlink">{pickFeat.title}</span>
                    </Link>
                  </h3>
                  <p className="story-deck line-clamp-3 text-[var(--ink-2)] text-sm sm:text-base leading-relaxed mb-4">
                    {pickFeat.deck}
                  </p>
                  <div className="byline">
                    <ArticleByline article={pickFeat} size={32} />
                    <span className="text-xs text-[var(--muted)]">
                      <span className="dot mx-1">·</span>
                      <RelativeTime dateTime={new Date(pickFeat.createdAt).toISOString()} />
                      <span className="dot mx-1">·</span>
                      {getReadingTimeMinutes(pickFeat)} min read
                    </span>
                  </div>
                </article>
              )}

              {/* Multi-Item Editorial Grid */}
              <div className="pick-grid">
                {pickGrid.map((a) => (
                  <article key={a.id} className="pick-card group">
                    <Link href={`/article/${a.slug}`} className="ph r-169 mb-3 block" tabIndex={-1} aria-hidden="true">
                      <Image 
                        src={getImgSrc(a.img || "", 600, 338)} 
                        alt={a.title} 
                        fill 
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </Link>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <Link href={`/category/${(a.category?.parent || a.category)?.slug || "news"}`} className="kicker plain !text-[11px] mb-1 inline-block">
                          {a.category?.name || "News"}
                        </Link>
                        <h4 className="text-sm sm:text-base font-semibold leading-snug tracking-tight text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors line-clamp-2 mb-2">
                          <Link href={`/article/${a.slug}`}>
                            <span className="hlink">{a.title}</span>
                          </Link>
                        </h4>
                        {a.deck && (
                          <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed mb-3">
                            {a.deck}
                          </p>
                        )}
                      </div>
                      <div className="pt-2 border-t border-[var(--line-2)]/60 flex items-center justify-between text-xs text-[var(--muted)] mt-auto">
                        <ArticleByline article={a} size={20} />
                        <span>{getReadingTimeMinutes(a)}m</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <div className="wrap">
        <NewsletterSignup />
      </div>
    </>
  );
}

// Inline helper component for Cat Split sections
function CatSplit({ cat, articles, reverse = false }: { cat: string, articles: any[], reverse?: boolean }) {
  const feat = articles[0];
  const rest = articles.slice(1, 4);
  const mainCat = feat?.category?.parent || feat?.category;
  const c = { name: mainCat?.name || cat };

  if (!feat) return null;

  return (
    <section aria-label={c.name}>
      <div className="wrap">
        <div className="sec-head">
          <h2>
            <span className="sec-rule"></span>{c.name}
            {cat === "business" && <span className="sec-sub">Markets · Funding · Strategy</span>}
          </h2>
          <Link href={`/category/${cat}`} className="view-all">
            View all 
            <svg className="ic-s" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </Link>
        </div>
        
        {cat === "business" && (
          <EditorialTicker articles={articles.slice(0, 8)} />
        )}

        <div className={`cat-split${reverse ? " rev" : ""}`}>
          <article className="cat-feat story" data-reveal>
            <Link href={`/article/${feat.slug}`} className="ph r-169" tabIndex={-1} aria-hidden="true">
              <Image 
                src={getImgSrc(feat.img || "", 960, 540)} 
                alt={feat.alt || feat.title} 
                fill 
                sizes="(max-width: 900px) 100vw, 50vw"
                className="object-cover"
              />
            </Link>
            <div>
              <Link href={`/category/${feat.category?.slug || cat}`} className="kicker plain">
                {feat.category?.name || c.name}
              </Link>
              <h3>
                <Link href={`/article/${feat.slug}`}>
                  <span className="hlink">{feat.title}</span>
                </Link>
              </h3>
              <p className="story-deck">{feat.deck}</p>
              <div className="byline" style={{ marginTop: "12px" }}>
                <ArticleByline article={feat} size={26} />
                <span><span className="dot">·</span> {<RelativeTime dateTime={new Date(feat.createdAt).toISOString()} />} <span className="dot">·</span> {feat.mins} min read</span>
              </div>
            </div>
          </article>
          
          <div className="cat-side">
            {rest.map(x => (
              <StoryRow key={x.id} article={x} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
