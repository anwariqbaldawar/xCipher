import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Bot, BadgeDollarSign, FileWarning, FlaskConical, Handshake } from "lucide-react";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Editorial Policy & Ethics — xSypher",
  description:
    "How xSypher handles independence, technical verification and benchmarking, sponsored and partner content, affiliate links, AI assistance and corrections — the rules behind every story we publish.",
  canonical: `${siteConfig.url}/page/editorial-policy`,
  image: brandBannerUrl(),
  imageAlt: "xSypher editorial policy",
});

export default function EditorialPolicyPage() {
  return (
    <div className="w-full bg-[var(--paper)] min-h-screen text-[var(--ink)]">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO SECTION
          ───────────────────────────────────────────────────────────── */}
      <section className="w-full border-b border-[var(--line)] bg-[var(--surface)] relative overflow-hidden">
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden="true"
        />
        
        <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-32 pb-16 sm:pt-40 sm:pb-24 relative z-10 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 mb-6">
            Transparency &amp; Trust
          </span>
          <h1 className="font-[family:var(--f-display)] text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--ink)] leading-tight">
            Our Editorial Guidelines &amp; Ethics
          </h1>
          <p className="mt-6 text-base sm:text-lg text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
            These are the rules behind every story on xSypher: how we stay independent, how technical claims are verified, where AI does and does not help, and how a correction gets made. Where a rule needs a longer explanation, it links to one.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. POLICY SECTIONS
          ───────────────────────────────────────────────────────────── */}
      <section className="w-full py-12 sm:py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 flex flex-col gap-8 sm:gap-10">
          
          {/* Section 1: Editorial Independence */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-10 shadow-sm transition-all hover:border-[var(--line-2)] hover:shadow-md">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="font-[family:var(--f-display)] text-xl sm:text-2xl font-bold text-[var(--ink)] mb-3">
                  Editorial Independence
                </h2>
                <div className="font-[family:var(--f-body)] text-sm sm:text-base text-[var(--muted)] leading-relaxed space-y-4">
                  <p>
                    xSypher&apos;s core reporting, reviews and benchmarks are editorially independent. Payment never buys a positive review, a favourable conclusion, a score or a ranking — and no gift or favor changes what we conclude.
                  </p>
                  <p>
                    Our editorial decisions — including what we cover, how we rate products, and the conclusions we draw — are made separately from advertising and partnerships. Commercial partners support the publication through the clearly labelled formats described below; no sponsor, vendor or investor has prior review, copy approval or veto power over any piece of our journalism.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Sponsored Content & Native Advertising */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-10 shadow-sm transition-all hover:border-[var(--line-2)] hover:shadow-md">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <Handshake className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="font-[family:var(--f-display)] text-xl sm:text-2xl font-bold text-[var(--ink)] mb-3">
                  Sponsored Content &amp; Native Advertising Disclosure
                </h2>
                <div className="font-[family:var(--f-body)] text-sm sm:text-base text-[var(--muted)] leading-relaxed space-y-4">
                  <p>
                    xSypher is supported in part by commercial partnerships: <strong>Sponsored Deep-Dives</strong> (paid technical explorations produced with a partner), <strong>Partner Content</strong>, and <strong>display and newsletter sponsorships</strong>. These formats fund the independent reporting around them; they do not replace it.
                  </p>
                  <p>
                    Every paid piece carries a visible &ldquo;Sponsored&rdquo; or &ldquo;Partner&rdquo; disclosure before the first paragraph — never buried at the foot of the page — and paid links are tagged so search engines treat them as advertising. Sponsored material is never presented as an independent review, benchmark or endorsement, and a partner&apos;s sponsorship of one piece buys no influence over any other coverage, including coverage of that partner.
                  </p>
                  <p>
                    Sponsors may check a sponsored piece for factual accuracy about their own product; they may not soften criticism in editorial coverage, preview unrelated stories, or veto publication. If a partnership would require any of that, we decline it. The formats and ground rules for partners are set out on our advertising page.
                  </p>
                  <p className="pt-2">
                    <Link
                      href="/page/advertising"
                      className="inline-flex items-center gap-1 text-[var(--accent)] font-semibold hover:underline"
                    >
                      Advertising &amp; partnerships &rarr;
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Fact-Checking & Sourcing */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-10 shadow-sm transition-all hover:border-[var(--line-2)] hover:shadow-md">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="font-[family:var(--f-display)] text-xl sm:text-2xl font-bold text-[var(--ink)] mb-3">
                  Technical Verification &amp; Benchmarking Methodology
                </h2>
                <div className="font-[family:var(--f-body)] text-sm sm:text-base text-[var(--muted)] leading-relaxed space-y-4">
                  <p>
                    Every story passes through a rigorous fact-checking process. We rely heavily on primary sources — the specification, the repository, the advisory, official documentation — plus direct interviews and hands-on testing. We verify technical claims by reproducing setups and running local benchmarks whenever a claim is testable.
                  </p>
                  <p>
                    When we publish a benchmark, we disclose the setup it ran on: hardware or instance type, versions, configuration and the workload, so a reader can reproduce the number rather than take it on trust. Vendor-supplied figures we have not reproduced are labelled as vendor claims. If a re-run contradicts a published number, the correction protocol below applies to it like any other error.
                  </p>
                  <p>
                    We actively avoid unverified rumors or speculation. If we do report on unconfirmed information (such as hardware leaks or industry rumors), it is explicitly stated as such, with clear context on why we believe the information is credible enough to publish.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: AI & Automation Policy */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-10 shadow-sm transition-all hover:border-[var(--line-2)] hover:shadow-md relative overflow-hidden">
            {/* Subtle highlight accent for AI policy */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)]" aria-hidden="true" />
            
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <Bot className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="font-[family:var(--f-display)] text-xl sm:text-2xl font-bold text-[var(--ink)] mb-3">
                  AI Assistance &amp; Human Engineering Review
                </h2>
                <div className="font-[family:var(--f-body)] text-sm sm:text-base text-[var(--muted)] leading-relaxed space-y-4">
                  <p>
                    Because we cover artificial intelligence deeply, we must be completely transparent about how we use it. <strong>All xSypher articles are researched, written, and edited by human journalists.</strong>
                  </p>
                  <p>
                    AI tools may assist with research organisation (clustering sources, summarising a long specification into an author’s notes), language mechanics, and generated illustration that is disclosed as such. They never produce the thesis, the analysis or a verdict, they never stand in for fact-checking, and they never write a quote or a patch note. Every article is researched, written and edited by named humans — the fuller breakdown of that boundary is on the transparency report.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Affiliate & Advertising Disclosure */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-10 shadow-sm transition-all hover:border-[var(--line-2)] hover:shadow-md">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <BadgeDollarSign className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="font-[family:var(--f-display)] text-xl sm:text-2xl font-bold text-[var(--ink)] mb-3">
                  Affiliate &amp; Partner Links Policy
                </h2>
                <div className="font-[family:var(--f-body)] text-sm sm:text-base text-[var(--muted)] leading-relaxed space-y-4">
                  <p>
                    xSypher is funded by clearly labelled sponsorship and advertising, affiliate commissions where a story includes them, and reader support. It takes no venture capital and has no corporate parent — the full ownership and funding disclosure is in the transparency report.
                  </p>
                  <p>
                    Where a story contains an affiliate or partner link, that is disclosed in the story, and the link is tagged as advertising for search engines. A commission <strong>never</strong> impacts our editorial verdicts, scores, rankings or product recommendations: products are chosen on merit first, and if a product falls short of our standards we say so, regardless of any potential commission. We do not sell do-follow backlinks or paid insertions into existing editorial articles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Corrections Policy */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-10 shadow-sm transition-all hover:border-[var(--line-2)] hover:shadow-md">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <FileWarning className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h2 className="font-[family:var(--f-display)] text-xl sm:text-2xl font-bold text-[var(--ink)] mb-3">
                  Corrections Protocol
                </h2>
                <div className="font-[family:var(--f-body)] text-sm sm:text-base text-[var(--muted)] leading-relaxed space-y-4">
                  <p>
                    We are fiercely committed to fixing our mistakes openly. Anyone can report an error — through the corrections page or the contact desk — and every report gets a human answer within two business days. If we publish an error, we correct it as quickly as possible.
                  </p>
                  <p>
                    Any material changes made to an article post-publication (such as correcting technical inaccuracies or updating factual claims) will be clearly noted with a timestamp at the bottom of the piece. Minor typo fixes may not always receive a log entry, but substantive edits will never be quietly swept under the rug.
                  </p>
                  <p className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <Link
                      href="/page/corrections"
                      className="inline-flex items-center gap-1 text-[var(--accent)] font-semibold hover:underline"
                    >
                      Report an error &rarr;
                    </Link>
                    <Link
                      href="/page/transparency#corrections"
                      className="inline-flex items-center gap-1 text-[var(--accent)] font-semibold hover:underline"
                    >
                      Correction response times &rarr;
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
      
      {/* ─────────────────────────────────────────────────────────────
          3. BOTTOM CTA / FOOTNOTE
          ───────────────────────────────────────────────────────────── */}
      <section className="w-full py-10 sm:py-12 border-t border-[var(--line)] bg-[var(--surface)] text-center">
        <p className="text-xs sm:text-sm text-[var(--faint)] font-[family:var(--f-ui)] max-w-lg mx-auto px-4">
          Questions about these rules, or a concern about something we published? <Link href="/page/contact" className="text-[var(--accent)] hover:underline">Contact the desk</Link> — or read the <Link href="/page/transparency" className="text-[var(--accent)] hover:underline">transparency report</Link> for how the publication is owned, funded and corrected.
        </p>
      </section>
    </div>
  );
}
