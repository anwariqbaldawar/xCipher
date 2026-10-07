import Link from "next/link";
import type { ReactNode } from "react";
import Image from "next/image";
import { Lock } from "lucide-react";
import CopyPgpButton from "./CopyPgpButton";
import StoryCard from "@/components/article/StoryCard";
import Sidebar from "@/components/layout/Sidebar";
import { fmtViews } from "@/lib/utils";
import { sanitizeBioHtml } from "@/lib/sanitize";
import CodeBlockEnhancer from "@/components/article/CodeBlockEnhancer";

import { SocialIcon } from "@/components/common/SocialIcon";
export { SocialIcon };


export default function AuthorProfileView({ author, articles, socials, totalViews, articleFeed }: { author: any, articles: any[], socials: any[], totalViews: number, articleFeed?: ReactNode }) {
  return (
    <div className="ap-root overflow-x-hidden w-full max-w-[100vw]">
      {/* ── Hero / Banner ─────────────────────────── */}
      <section className="ap-hero">
        <div className="ap-banner" aria-hidden="true">
          <div className="ap-banner-grid" />
        </div>

        <div className="wrap ap-hero-inner flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 md:gap-8">
          <div className="ap-avatar-wrap shrink-0">
            {author.avatar ? (
              <Image src={author.avatar} alt={author.name || "Author"} width={130} height={130} sizes="(min-width: 700px) 130px, 110px" className="ap-avatar" />
            ) : (
              <div className="ap-avatar ap-avatar-initial">
                {(author.name || "A").charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="ap-hero-info flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex flex-row items-center justify-center md:justify-start gap-2 w-full text-center md:text-left flex-wrap">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--ink)] tracking-tight max-w-full break-words text-balance">
                {author.name || "Author"}
              </h1>
              {author.verifiedTitle && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--accent)" className="shrink-0 translate-y-[2px]" aria-label="Verified Staff">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-7.9 7.9z" fill="#fff"/>
                  <circle cx="12" cy="12" r="10" fill="var(--accent)"/>
                  <path d="M10.1 16.7l-4.1-4.1 1.4-1.4 2.7 2.7 6.4-6.4 1.4 1.4-7.8 7.8z" fill="#fff"/>
                </svg>
              )}
            </div>
            
            {/* Primary Credential (Headline / Tagline) */}
            {author.headline && (
              <p className="ap-headline mt-2" style={{ color: "var(--ink-2)", fontWeight: 500 }}>
                {author.headline}
              </p>
            )}

            <div className="ap-meta-row flex flex-wrap items-center justify-center md:justify-start gap-4 w-full min-w-0 break-words whitespace-normal" style={{ marginTop: "12px" }}>
              {author.location && (
                <span className="ap-meta-item flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {author.location}
                </span>
              )}
              {author.email && author.publicContact !== false && (
                <a href={`mailto:${author.email}`} className="ap-meta-item ap-meta-link flex items-center gap-1.5 max-w-full break-words overflow-hidden text-ellipsis">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                  <span className="truncate">{author.email}</span>
                </a>
              )}
              {author.website && (
                <a href={author.website} target="_blank" rel="noopener noreferrer" className="ap-meta-item ap-meta-link flex items-center gap-1.5 max-w-full break-words overflow-hidden text-ellipsis">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  <span className="truncate">{author.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
            </div>

            {/* Social icons */}
            {socials.length > 0 && (
              <div className="ap-socials flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
                {socials.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--line)] text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] transition-colors"
                    aria-label={s.platform}
                    title={s.platform}
                  >
                    <SocialIcon platform={s.platform} />
                    <span>{s.platform}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats Row ─────────────────────────────── */}
      <div className="wrap">
        <div className="flex flex-row flex-wrap justify-center md:justify-start items-center gap-8 sm:gap-12 w-full py-6 my-6 border-y border-[var(--line)]">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">{articles.length}</span>
            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mt-1">PUBLISHED ARTICLES</span>
          </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">{totalViews > 0 ? fmtViews(totalViews) : 0}</span>
            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mt-1">TOTAL READS</span>
          </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--ink)]">
              {articles.reduce((sum, a) => sum + (a.readingTime || 1) * 200, 0).toLocaleString()}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mt-1">WORDS WRITTEN</span>
          </div>
        </div>
      </div>

      {/* ── Body: About + Articles + Sidebar ─────────── */}
      <div className="wrap ap-body min-w-0 max-w-full overflow-x-hidden">
        
        <div className="ap-main-col min-w-0 max-w-full overflow-x-hidden">
          {/* About */}
          {author.bio && (
            <section className="ap-about min-w-0 max-w-full" aria-label="About">
              <div className="ap-section-label">About</div>
              {author.expertise && (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {author.expertise.split(',').map((beat: string, idx: number) => {
                      const trimmed = beat.trim();
                      if (!trimmed) return null;
                      return (
                        <span 
                          key={idx} 
                          className="bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--ink-2)] border border-[var(--line-2)] px-3 py-1.5 rounded-md text-xs font-mono tracking-wide transition-all cursor-default"
                        >
                          {trimmed}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="ap-bio prose art-body min-w-0 max-w-full break-words w-full" dangerouslySetInnerHTML={{ __html: sanitizeBioHtml(author.bio) }} />
              <CodeBlockEnhancer />
              {author.disclosure && (
                <div style={{ marginTop: "16px", padding: "12px", background: "var(--surface-2)", borderRadius: "var(--r-md)", fontSize: "13px", fontStyle: "italic", color: "var(--ink-muted)" }}>
                  <strong>Disclosure: </strong> {author.disclosure}
                </div>
              )}
              {author.user?.pgpPublicKey && (
                <div className="mt-8 pt-6 border-t border-[var(--line)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-[var(--ink)]">
                      <Lock className="w-4 h-4 text-[var(--accent)]" />
                      <h3 className="font-semibold text-sm uppercase tracking-wider">Secure Communication</h3>
                    </div>
                    <CopyPgpButton pgpKey={author.user.pgpPublicKey} />
                  </div>
                  <pre className="p-4 bg-[var(--surface-2)] border border-[var(--line-2)] rounded-lg text-[10px] sm:text-xs font-mono text-[var(--ink-muted)] overflow-y-auto max-h-48 whitespace-pre-wrap word-break-all">
                    {author.user.pgpPublicKey}
                  </pre>
                </div>
              )}
            </section>
          )}

          {/* Articles */}
          <section aria-label="Articles" style={{ marginTop: author.bio ? '48px' : '32px' }}>
            <div className="ap-section-label" style={{ marginBottom: '24px' }}>
              {articles.length > 0
                ? `${articles.length} Article${articles.length !== 1 ? 's' : ''} by ${author.name}`
                : `Articles by ${author.name}`}
            </div>

            {articles.length > 0 ? (
              <div className="ap-articles-grid">
                {/* Featured first article */}
                {articles[0] && (
                  <article className="ap-article-featured">
                    {articles[0].img && (
                      <Link href={`/article/${articles[0].slug}`} className="ap-featured-img-wrap" tabIndex={-1} aria-hidden="true">
                        <img src={articles[0].img} alt={articles[0].title} className="ap-featured-img" />
                        <div className="ap-featured-img-overlay" />
                      </Link>
                    )}
                    <div className="ap-featured-body">
                      {articles[0].category && (
                        <Link href={`/category/${articles[0].category.slug}`} className="kicker" style={{ marginBottom: '10px', display: 'inline-block' }}>
                          {articles[0].category.name}
                        </Link>
                      )}
                      <h2 className="ap-featured-title">
                        <Link href={`/article/${articles[0].slug}`}>{articles[0].title}</Link>
                      </h2>
                      {articles[0].deck && <p className="ap-featured-deck">{articles[0].deck}</p>}
                      <div className="ap-article-meta">
                        {new Date(articles[0].createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        {/* Read count removed to prevent view-count bias */}
                      </div>
                    </div>
                  </article>
                )}

                {/* Remaining articles grid */}
                {articleFeed ?? (articles.length > 1 && (
                  <div className="ap-articles-rest">
                    {articles.slice(1).map(article => (
                      <StoryCard key={article.id} article={article} showDeck={false} />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="ap-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <p>No published articles yet.</p>
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar */}
        <Sidebar />

      </div>
    </div>
  );
}
