import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Ban,
  Bot,
  CheckCircle2,
  FileWarning,
  Handshake,
  Lock,
  ScrollText,
  ShieldCheck,
  Terminal,
  Users,
  Wallet,
} from "lucide-react";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata: Metadata = constructMetadata({
  title: "Transparency Report — Ownership, Funding and Standards | xSypher",
  description:
    "How xSypher is owned and funded, how a story is researched and verified before it publishes, where AI is and is not used, how our advertising firewall works, and how to get something corrected.",
  canonical: `${siteConfig.url}/page/transparency`,
  image: brandBannerUrl(),
  imageAlt: "xSypher Transparency Report",
});

/** Shared icon contract so a section header can take any lucide component. */
type Icon = React.ComponentType<{ className?: string }>;

const SECTIONS = [
  { id: "ownership", label: "1. Ownership & funding" },
  { id: "research", label: "2. How we research & publish" },
  { id: "ai-policy", label: "3. AI & human oversight" },
  { id: "firewall", label: "4. Advertising firewall" },
  { id: "corrections", label: "5. Corrections & takedowns" },
  { id: "reader-data", label: "6. Reader data" },
];

/**
 * A policy section. The heading pattern (numbered kicker + icon in a bordered
 * tile) is the same one the standards and corrections pages use, so the three
 * documents read as one family rather than three one-off designs.
 */
function Section({
  id,
  index,
  title,
  icon: SectionIcon,
  children,
}: {
  id: string;
  index: number;
  title: string;
  icon: Icon;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32">
      <div className="flex items-start gap-4 mb-5">
        <span className="w-11 h-11 shrink-0 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)] shadow-sm">
          <SectionIcon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--faint)] mb-0.5">
            Section {index}
          </span>
          <h2 className="font-[family:var(--f-display)] text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
            {title}
          </h2>
        </div>
      </div>
      <div className="space-y-4 text-sm sm:text-base text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
        {children}
      </div>
    </section>
  );
}

/** One labelled commitment inside a section. */
function Point({
  label,
  children,
  tone = "neutral",
}: {
  label: string;
  children: React.ReactNode;
  tone?: "neutral" | "yes" | "no";
}) {
  const mark = tone === "yes" ? "text-[var(--ok)]" : tone === "no" ? "text-[var(--bad)]" : "text-[var(--accent)]";
  const MarkIcon = tone === "yes" ? CheckCircle2 : tone === "no" ? Ban : Terminal;

  return (
    <li className="flex items-start gap-3 text-sm leading-relaxed">
      <MarkIcon className={`w-4 h-4 ${mark} shrink-0 mt-[3px]`} aria-hidden="true" />
      <span>
        <strong className="font-semibold text-[var(--ink)]">{label}</strong> {children}
      </span>
    </li>
  );
}

export default function TransparencyReportPage() {
  return (
    <div className="w-full bg-[var(--paper)] text-[var(--ink)] min-h-screen">
      {/* ─────────────────────────────────────────────────────────────
          HERO
          ───────────────────────────────────────────────────────────── */}
      <header className="relative w-full border-b border-[var(--line)] bg-[var(--surface)] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[var(--accent)] opacity-[0.07] blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-32 pb-14 sm:pt-40 sm:pb-16 relative z-10">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20">
                <ScrollText className="w-3.5 h-3.5" aria-hidden="true" />
                Transparency Report
              </span>
              <span className="text-xs font-medium text-[var(--faint)] font-[family:var(--f-ui)]">
                Reviewed October 2026
              </span>
            </div>

            <h1 className="font-[family:var(--f-display)] text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] text-balance">
              Who owns xSypher — and what that means for what we publish.
            </h1>

            <p className="mt-6 text-base sm:text-lg text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
              xSypher is an independent, founder-led engineering publication. There is no venture capital, no
              corporate parent and no investor board. This page is the standing record of how we are funded, how a
              story is researched and verified before it goes out, where AI is and is not used, and how anyone can
              get something corrected.
            </p>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          AT A GLANCE
          ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-[var(--line)] bg-[var(--surface-2)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-[var(--line)] lg:divide-x">
            <div className="py-6 sm:py-7 lg:pr-8">
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--faint)] mb-2">
                Ownership
              </span>
              <span className="font-[family:var(--f-display)] text-xl font-bold text-[var(--ink)]">
                Founder-led
              </span>
              <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] mt-1">
                Bootstrapped. No VC, no parent company, no investors to please.
              </p>
            </div>
            <div className="py-6 sm:py-7 lg:px-8">
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--faint)] mb-2">
                Editorial control
              </span>
              <span className="font-[family:var(--f-display)] text-xl font-bold text-[var(--ink)]">
                Ours, entirely
              </span>
              <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] mt-1">
                No sponsor or vendor reads a story before you do.
              </p>
            </div>
            <div className="py-6 sm:py-7 lg:px-8">
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--faint)] mb-2">
                Ad scripts
              </span>
              <span className="font-[family:var(--f-display)] text-xl font-bold text-[var(--ink)]">
                Consent-gated
              </span>
              <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] mt-1">
                No advertising script loads until you accept cookies.
              </p>
            </div>
            <div className="py-6 sm:py-7 lg:pl-8">
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--faint)] mb-2">
                Corrections
              </span>
              <span className="font-[family:var(--f-display)] text-xl font-bold text-[var(--ink)]">
                2 business days
              </span>
              <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] mt-1">
                First response to any factual-error report.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BODY: sticky contents rail + sections
          ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12 sm:py-16 flex flex-col lg:flex-row gap-12 lg:gap-16">
        <aside className="lg:w-1/4 shrink-0 lg:order-1">
          <nav
            aria-label="Transparency report contents"
            className="lg:sticky lg:top-32 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"
          >
            <h2 className="font-[family:var(--f-display)] font-bold text-xs uppercase tracking-[0.16em] text-[var(--ink)] mb-3">
              On this page
            </h2>
            <ul className="flex flex-col font-[family:var(--f-ui)] text-sm">
              {SECTIONS.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block py-1.5 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-[var(--line)] text-xs text-[var(--faint)] font-[family:var(--f-body)] leading-relaxed">
              Something here you want to challenge?{" "}
              <Link href="/page/contact" className="text-[var(--accent)] hover:underline font-semibold">
                Contact the desk
              </Link>
              .
            </div>
          </nav>
        </aside>

        <article className="lg:w-3/4 lg:order-2 min-w-0 space-y-12 sm:space-y-16">
          {/* ── 1. OWNERSHIP & FUNDING ── */}
          <Section id="ownership" index={1} title="Independent ownership & funding" icon={Wallet}>
            <p>
              xSypher is owned and operated by its founder,{" "}
              <Link href="/page/about" className="text-[var(--accent)] hover:underline font-semibold">
                Anwar Iqbal Dawar
              </Link>
              , and it is funded by what it earns. We have taken no venture capital, we have no corporate parent,
              and we accept no funding from technology vendors, defence contractors or state bodies. There is no
              investor board to keep happy and no quarterly growth number that decides what we are allowed to say.
            </p>
            <p>
              We publish this because it answers the only question that matters to a reader of a technical review:{" "}
              <strong className="font-semibold text-[var(--ink)]">
                who is paying for the conclusion?
              </strong>{" "}
              For us, the answer is: readers, sponsors who are clearly labelled as sponsors, and nobody else. That
              is the whole reason we can test a product, find it wanting, and publish exactly that.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <h3 className="font-[family:var(--f-display)] font-bold text-sm uppercase tracking-wider text-[var(--ink)] mb-3">
                  What funds the work
                </h3>
                <ul className="space-y-2.5">
                  <Point label="Labelled sponsorship and display advertising.">
                    Sold directly or through a network, always disclosed, never dressed up as reporting.
                  </Point>
                  <Point label="Affiliate commissions.">
                    Where a story links to something we would recommend anyway, and where the commercial link never
                    decides the verdict.
                  </Point>
                  <Point label="Reader support.">
                    Newsletter subscribers, members of the comment section, and people who send us a tool to test.
                  </Point>
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <h3 className="font-[family:var(--f-display)] font-bold text-sm uppercase tracking-wider text-[var(--ink)] mb-3">
                  What money cannot buy here
                </h3>
                <ul className="space-y-2.5">
                  <Point tone="no" label="A verdict.">
                    We have said a product is not ready, and we will say it again. Sponsorship buys reach, not
                    conclusions.
                  </Point>
                  <Point tone="no" label="A review slot.">
                    Paid placements never wear the review label, and a review is never paid for.
                  </Point>
                  <Point tone="no" label="Early sight of a story.">
                    Sponsors see a piece when readers do.
                  </Point>
                </ul>
              </div>
            </div>

            <p>
              Where a claim in this section becomes false — a grant, an outside investment, a parent company — this
              page changes in the same week, with the date at the top updated. A transparency page that is only
              accurate during a good year is a marketing page.
            </p>
          </Section>

          {/* ── 2. HOW WE RESEARCH & PUBLISH ── */}
          <Section id="research" index={2} title="How a story is researched and published" icon={Terminal}>
            <p>
              Our subjects are systems: stacks, protocols, kernels, cloud bills, model weights. You cannot report
              on those by paraphrasing a press release, so the work starts with the artefact itself — the
              documentation, the source, the advisory, the benchmark we run on our own machines.
            </p>

            <ol className="space-y-3">
              {[
                {
                  title: "Read the primary material first.",
                  body: "Specifications, RFCs, changelogs, CVE advisories, source repositories and the vendor's own documentation — linked in the story so you can check us line by line.",
                },
                {
                  title: "Test what can be tested.",
                  body: "Where a claim is measurable we reproduce it: a throwaway reference setup, a public dataset, a documented benchmark. When a number comes from a vendor rather than from us, we label it as theirs.",
                },
                {
                  title: "Verify before we assert.",
                  body: "Technical claims are checked against a second source or the code itself. Unconfirmed information is labelled unconfirmed, with the reason we think it is worth publishing at all.",
                },
                {
                  title: "Editorial review, then publish.",
                  body: "Every story is read by an editor before it goes out — for accuracy, for overclaiming and for whether the headline is supported by the body. A byline means a named human is accountable for the piece.",
                },
                {
                  title: "Audit after publication.",
                  body: "Broken links, superseded versions, changed vendor behaviour and reader reports are folded back into the article, with a timestamped note when the change is substantive.",
                },
              ].map((step, index) => (
                <li
                  key={step.title}
                  className="flex items-start gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5"
                >
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center font-[family:var(--f-mono)] text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-relaxed">
                    <strong className="block font-semibold text-[var(--ink)] mb-1">{step.title}</strong>
                    {step.body}
                  </span>
                </li>
              ))}
            </ol>

            <div className="rounded-xl border border-[var(--line)] border-l-4 border-l-[var(--accent)] bg-[var(--surface)] p-5">
              <h3 className="font-[family:var(--f-display)] font-bold text-base text-[var(--ink)] mb-2">
                What we do not do
              </h3>
              <ul className="space-y-2.5">
                <Point tone="no" label="Republish a press release as reporting.">
                  Announcements are reported on, not pasted.
                </Point>
                <Point tone="no" label="Publish a benchmark we cannot reproduce.">
                  If we cannot show the setup, we do not show the chart.
                </Point>
                <Point tone="no" label="Present a rumour as a finding.">
                  Rumours stay labelled as rumours or they do not run.
                </Point>
              </ul>
            </div>
          </Section>

          {/* ── 3. AI & HUMAN OVERSIGHT ── */}
          <Section id="ai-policy" index={3} title="AI usage & human oversight" icon={Bot}>
            <p>
              We write about machine learning, so we hold ourselves to the same standard we measure everyone else
              against. xSypher does not publish AI-written articles. Every story carries a human byline, and that
              human — with an editor behind them — is responsible for the argument, the numbers and the
              conclusions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <h3 className="font-[family:var(--f-display)] font-bold text-sm uppercase tracking-wider text-[var(--ok)] mb-3">
                  AI is allowed to help with
                </h3>
                <ul className="space-y-2.5">
                  <Point tone="yes" label="Research organisation.">
                    Clustering sources, drafting a reading list, summarising a long specification into an author&apos;s
                    private notes.
                  </Point>
                  <Point tone="yes" label="Language mechanics.">
                    Grammar, spelling, structure and translation checks on text a human has already written.
                  </Point>
                  <Point tone="yes" label="Visuals, where labelled.">
                    Generated illustration or header art, disclosed as generated and never as a photograph of a real
                    event or product.
                  </Point>
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <h3 className="font-[family:var(--f-display)] font-bold text-sm uppercase tracking-wider text-[var(--bad)] mb-3">
                  AI never does
                </h3>
                <ul className="space-y-2.5">
                  <Point tone="no" label="The thesis.">
                    The architectural argument, the review verdict and the analysis are human work.
                  </Point>
                  <Point tone="no" label="Fact-checking or sourcing.">
                    Verification is a person opening the docs and running the test, not a model agreeing with a
                    draft.
                  </Point>
                  <Point tone="no" label="Quotes or patch notes.">
                    We never synthesise a quote, an interview answer or a changelog entry.
                  </Point>
                  <Point tone="no" label="Publishing.">
                    Nothing on xSypher goes live without a named human editor having read it.
                  </Point>
                </ul>
              </div>
            </div>

            <p>
              If a piece ever uses AI in a way that goes beyond the list above, the disclosure lives inside that
              piece, in the reader&apos;s view — not buried in this page. Our fuller position, including how we
              handle contributed and sponsored material, is in the{" "}
              <Link href="/page/editorial-policy" className="text-[var(--accent)] hover:underline font-semibold">
                editorial policy
              </Link>
              .
            </p>
          </Section>

          {/* ── 4. ADVERTISING FIREWALL ── */}
          <Section id="firewall" index={4} title="Advertising, affiliate & editorial firewall" icon={Handshake}>
            <p>
              Sponsorship keeps this publication alive, which is exactly why the boundary around it has to be
              explicit and boring. These rules are not aspirational — they are what we enforce when a campaign is
              worth more than the story it is attached to.
            </p>

            <ul className="space-y-3">
              <Point tone="yes" label="Disclosure at the top.">
                Sponsored and affiliate content is labelled where a reader meets it, before the first paragraph,
                never in a footer.
              </Point>
              <Point tone="no" label="No hidden SEO links.">
                We do not sell do-follow backlinks, paid keyword insertions into existing articles, or
                &ldquo;guest posts&rdquo; whose real purpose is a link.
              </Point>
              <Point tone="no" label="No sponsor sign-off.">
                Sponsors may correct a factual error about their own product. They do not get to remove a finding
                they dislike, edit conclusions, or approve a draft.
              </Point>
              <Point tone="yes" label="The review stands on its own.">
                If a sponsored deep dive turns up problems, they are in the published piece. The sponsor can end the
                partnership; the article stays.
              </Point>
            </ul>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <h3 className="font-[family:var(--f-display)] font-bold text-base text-[var(--ink)] mb-2">
                Categories we turn down
              </h3>
              <p className="text-sm leading-relaxed">
                Token and crypto speculation, gambling and betting, payday and high-risk trading offers,
                undisclosed data brokers, anything that asks us to state a claim we cannot verify, and anyone whose
                product cannot survive an engineer asking a follow-up question. Relevance matters as much as money:
                if our readers cannot build with it, we are not the right room for it.
              </p>
            </div>

            <p>
              The commercial formats on offer — and the honesty about there being no published rate card — are on the{" "}
              <Link href="/page/advertising" className="text-[var(--accent)] hover:underline font-semibold">
                sponsorship page
              </Link>
              .
            </p>
          </Section>

          {/* ── 5. CORRECTIONS & TAKEDOWNS ── */}
          <Section id="corrections" index={5} title="Corrections, copyright & takedowns" icon={FileWarning}>
            <p>
              Corrections are the whole basis of trust in technical publishing. If we got a number, a version or a
              security claim wrong, tell us and we fix the article — not a footnote, the article — and we say what
              changed.
            </p>

            <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Response targets for corrections and integrity requests
                </caption>
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-[11px] font-bold uppercase tracking-wider text-[var(--faint)]">
                    <th scope="col" className="px-5 py-3 font-bold">What you are reporting</th>
                    <th scope="col" className="px-5 py-3 font-bold">How we handle it</th>
                    <th scope="col" className="px-5 py-3 font-bold whitespace-nowrap">First response</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      kind: "Factual error",
                      handling:
                        "Checked against the primary source. If we are wrong, the text is corrected and, for anything substantive, a timestamped note is appended to the story.",
                      sla: "2 business days",
                    },
                    {
                      kind: "Missing or misattributed credit",
                      handling:
                        "Attribution is added or fixed in the article and metadata, and the change is noted.",
                      sla: "3 business days",
                    },
                    {
                      kind: "Copyright or licensing complaint",
                      handling:
                        "We audit the asset and its provenance. Anything we cannot license or verify is removed or replaced, with or without agreement on the underlying claim.",
                      sla: "5 business days",
                    },
                    {
                      kind: "Correction about a security disclosure",
                      handling:
                        "Escalated. Where a reader knows more than the published advisory, we update the piece and credit the report unless asked not to.",
                      sla: "1 business day",
                    },
                    {
                      kind: "Retraction request",
                      handling:
                        "Reviewed by the editor. A fundamentally unsound story is retracted outright and replaced with an explanation of why.",
                      sla: "5 business days",
                    },
                  ].map((row) => (
                    <tr key={row.kind} className="border-b border-[var(--line)] last:border-0 align-top">
                      <th scope="row" className="px-5 py-4 text-left font-semibold text-[var(--ink)]">
                        {row.kind}
                      </th>
                      <td className="px-5 py-4 text-[var(--muted)] leading-relaxed">{row.handling}</td>
                      <td className="px-5 py-4 text-[var(--ink)] font-medium whitespace-nowrap">{row.sla}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <h3 className="font-[family:var(--f-display)] font-bold text-sm uppercase tracking-wider text-[var(--ink)] mb-3">
                  How to report
                </h3>
                <ul className="space-y-2.5">
                  <Point label="Use the report form.">
                    It goes straight to the editorial desk with the article URL attached —{" "}
                    <Link href="/page/corrections" className="text-[var(--accent)] hover:underline font-semibold">
                      /page/corrections
                    </Link>
                    .
                  </Point>
                  <Point label="Or email corrections@xsypher.com.">
                    Include the URL and the claim you think is wrong. Screenshots of our own page help more than
                    screenshots of someone else&apos;s.
                  </Point>
                  <Point label="Legal and copyright: contact@xsypher.com.">
                    Mark the subject line clearly; it is routed to the editor, not to a ticket queue.
                  </Point>
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <h3 className="font-[family:var(--f-display)] font-bold text-sm uppercase tracking-wider text-[var(--ink)] mb-3">
                  Why there is no log table here
                </h3>
                <p className="text-sm leading-relaxed text-[var(--muted)]">
                  A correction only counts if it lives on the story it corrects. We keep the fix on the article —
                  what changed, when, and why — rather than in a separate scoreboard that readers have to cross
                  reference. Minor typos are fixed silently; substantive changes are never silent.
                </p>
              </div>
            </div>
          </Section>

          {/* ── 6. READER DATA ── */}
          <Section id="reader-data" index={6} title="Reader data, in plain terms" icon={Lock}>
            <p>
              This is a publication about systems, so it would be strange for the platform itself to be a black box.
              What the site actually does with your visit:
            </p>
            <ul className="space-y-3">
              <Point tone="yes" label="Advertising scripts wait for consent.">
                No ad tag, ad request or third-party marketing script is loaded until you accept cookies, and none
                load if you decline.
              </Point>
              <Point label="No third-party analytics product.">
                We do not run a cross-site analytics SDK to watch what you do on other sites.
              </Point>
              <Point label="Views are counted first-party.">
                Article reads are aggregated in our own infrastructure and stored as a number against the article.
              </Point>
              <Point label="Error reports are stripped down.">
                Crash and error monitoring runs with personal information collection disabled, and session replay is
                off unless you consent — and masked even then.
              </Point>
              <Point label="IP addresses are transient.">
                A connection address is used in memory for abuse protection, rate limiting and spam control, with a
                short expiry — not as a profile of your reading.
              </Point>
            </ul>
            <p>
              The formal details, including the lawful basis for each category of data and how to have it deleted,
              are in the{" "}
              <Link href="/page/privacy-policy" className="text-[var(--accent)] hover:underline font-semibold">
                privacy policy
              </Link>{" "}
              and the{" "}
              <Link href="/page/cookie-policy" className="text-[var(--accent)] hover:underline font-semibold">
                cookie policy
              </Link>
              .
            </p>
          </Section>

          {/* ── CTA ── */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-5">
              <span className="w-11 h-11 shrink-0 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-[family:var(--f-display)] text-lg sm:text-xl font-bold text-[var(--ink)]">
                  Hold us to this page
                </h2>
                <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] mt-1 leading-relaxed">
                  If any statement here stops matching how we behave, that is the finding we most want to hear
                  about.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Link
                href="/page/corrections"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold !bg-[var(--accent)] !text-white hover:brightness-110 active:scale-[0.98] transition-all shadow-sm"
              >
                Report an error
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href="/page/editorial-policy"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-[var(--ink)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--line)] transition-all"
              >
                Editorial policy
                <ScrollText className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href="/page/advertising"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-[var(--ink)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--line)] transition-all"
              >
                Sponsor xSypher
                <Handshake className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href="/page/contact"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-[var(--ink)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--line)] transition-all"
              >
                Contact the desk
                <Users className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <p className="text-xs text-[var(--faint)] font-[family:var(--f-ui)] border-t border-[var(--line)] pt-6">
            Last reviewed: October 2026 · Published by xSypher, Peshawar, Pakistan · Edited by Anwar Iqbal Dawar
          </p>
        </article>
      </div>
    </div>
  );
}
