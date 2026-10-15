import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Mail } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Standards & Policies hub — one layout for the editorial and legal pages.
//
// Desktop uses the full measure: a sticky section index on the left, the
// document in a readable centre column, and a sticky rail on the right with
// contact, related policies and document details — no dead horizontal space.
// Below 1280px the rail folds away; below 1024px the index becomes an "On
// this page" disclosure above the text. Server-rendered: no client JS.
// Styles: the .policy-* block at the end of app/globals.css.
// ─────────────────────────────────────────────────────────────────────────────

export type PolicySlug = "editorial-standards" | "editorial-policy" | "privacy-policy" | "cookie-policy";

export interface PolicySection {
  id: string;
  title: string;
  content: ReactNode;
}

export const POLICY_HUB: { slug: PolicySlug; label: string; href: string }[] = [
  { slug: "editorial-standards", label: "Editorial Standards", href: "/page/editorial-standards" },
  { slug: "editorial-policy", label: "Editorial Policy & Ethics", href: "/page/editorial-policy" },
  { slug: "privacy-policy", label: "Privacy Policy", href: "/page/privacy-policy" },
  { slug: "cookie-policy", label: "Cookie Policy", href: "/page/cookie-policy" },
];

const RELATED: { label: string; href: string }[] = [
  { label: "Corrections & report an error", href: "/page/corrections" },
  { label: "Transparency report", href: "/page/transparency" },
  { label: "Terms of use", href: "/page/terms-of-use" },
  { label: "Advertising & partnerships", href: "/page/advertising" },
  { label: "About xSypher", href: "/page/about" },
  { label: "Contact the desk", href: "/page/contact" },
];

interface PolicyLayoutProps {
  slug: PolicySlug;
  kicker: string;
  title: string;
  summary: string;
  /** Human date, e.g. "16 October 2026". */
  lastUpdated: string;
  /** ISO date for the <time> element, e.g. "2026-10-16". */
  lastUpdatedIso: string;
  appliesTo: string;
  /** Short "at a glance" points shown above the first section. */
  highlights: { title: string; body: string }[];
  sections: PolicySection[];
  contact: { label: string; email: string; note: string };
}

function SectionIndex({ sections, className = "" }: { sections: PolicySection[]; className?: string }) {
  return (
    <ol className={`policy-index ${className}`}>
      {sections.map((section, index) => (
        <li key={section.id}>
          <a href={`#${section.id}`}>
            <span className="policy-index-num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span>{section.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

export default function PolicyLayout({
  slug, kicker, title, summary, lastUpdated, lastUpdatedIso, appliesTo, highlights, sections, contact,
}: PolicyLayoutProps) {
  return (
    <div className="policy-hub">
      <header className="policy-hero">
        <div className="policy-container policy-hero-inner">
          <nav aria-label="Breadcrumb" className="policy-breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Standards &amp; Policies</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>

          <div className="policy-hero-grid">
            <div>
              <p className="policy-kicker">{kicker}</p>
              <h1 className="policy-title">{title}</h1>
              <p className="policy-summary">{summary}</p>
            </div>
            <dl className="policy-doc-card">
              <div>
                <dt>Last updated</dt>
                <dd><time dateTime={lastUpdatedIso}>{lastUpdated}</time></dd>
              </div>
              <div>
                <dt>Applies to</dt>
                <dd>{appliesTo}</dd>
              </div>
              <div>
                <dt>{contact.label}</dt>
                <dd><a href={`mailto:${contact.email}`}>{contact.email}</a></dd>
              </div>
            </dl>
          </div>

          <nav aria-label="Standards and policies" className="policy-tabs">
            {POLICY_HUB.map(item => (
              <Link key={item.slug} href={item.href} aria-current={item.slug === slug ? "page" : undefined} className="policy-tab">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="policy-container policy-body">
        <aside className="policy-left" aria-label="On this page">
          <div className="policy-sticky">
            <p className="policy-rail-heading">On this page</p>
            <SectionIndex sections={sections} />
          </div>
        </aside>

        <article className="policy-main">
          <details className="policy-mobile-index">
            <summary>On this page · {sections.length} sections</summary>
            <SectionIndex sections={sections} />
          </details>

          <section aria-labelledby="policy-glance" className="policy-glance">
            <h2 id="policy-glance" className="policy-glance-heading">At a glance</h2>
            <div className="policy-glance-grid">
              {highlights.map(item => (
                <div key={item.title} className="policy-glance-card">
                  <p className="policy-glance-title">{item.title}</p>
                  <p className="policy-glance-body">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="policy-section" aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`} className="policy-section-title">
                <span className="policy-section-num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </h2>
              <div className="policy-prose">{section.content}</div>
            </section>
          ))}
        </article>

        <aside className="policy-right" aria-label="Contact and related policies">
          <div className="policy-sticky policy-rail">
            <div className="policy-rail-card policy-rail-contact">
              <p className="policy-rail-heading">{contact.label}</p>
              <p className="policy-rail-text">{contact.note}</p>
              <a href={`mailto:${contact.email}`} className="policy-rail-cta">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {contact.email}
              </a>
            </div>
            <div className="policy-rail-card">
              <p className="policy-rail-heading">Related</p>
              <ul className="policy-rail-links">
                {RELATED.map(link => (
                  <li key={link.href}>
                    <Link href={link.href}>
                      {link.label}
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="policy-rail-card">
              <p className="policy-rail-heading">Document</p>
              <dl className="policy-rail-meta">
                <div><dt>Owner</dt><dd>xSypher editorial desk</dd></div>
                <div><dt>Reviewed</dt><dd><time dateTime={lastUpdatedIso}>{lastUpdated}</time></dd></div>
                <div><dt>Sections</dt><dd>{sections.length}</dd></div>
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
