import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Scale, UserCheck, LaptopMinimal, Quote, FlaskConical, IdCard, Handshake, BadgeDollarSign, Bot, FileWarning } from "lucide-react";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Editorial Standards — xSypher",
  description:
    "The charter behind xSypher's reporting: primary-source verification and reproducible benchmarks, byline accountability, clearly labelled sponsored and partner content, affiliate disclosure, human editorial oversight of AI-assisted research, and a formal corrections protocol.",
  canonical: `${siteConfig.url}/page/editorial-standards`,
  image: brandBannerUrl(),
  imageAlt: "xSypher editorial standards",
});

export default function EditorialStandardsPage() {
  return (
    <div className="w-full min-h-screen bg-[var(--surface)] text-[var(--ink)] selection:bg-[var(--accent)]/20">
      {/* HERO SECTION */}
      <section className="w-full border-b border-[var(--line)] relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />
        <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-32 pb-20 sm:pt-40 sm:pb-28 relative z-10 text-center">
          <span className="inline-block px-3 py-1 mb-6 rounded text-xs font-bold uppercase tracking-[0.2em] bg-[var(--ink)] text-[var(--surface)]">
            The Manifesto
          </span>
          <h1 className="font-[family:var(--f-display)] text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-[var(--ink)]">
            Our Editorial Standards
          </h1>
          <p className="mt-8 text-lg sm:text-xl font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed">
            Truth, transparency, and deep technical accuracy.
          </p>
        </div>
      </section>

      {/* CORE PRINCIPLES CONTENT */}
      <section className="w-full py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 flex flex-col space-y-16">

          <p className="font-[family:var(--f-body)] text-lg text-[var(--muted)] leading-relaxed">
            This is the charter our newsroom works to. It applies to every format we publish — reported news, hands-on reviews, benchmark analysis, security research and every commercial partnership — and it is the standard we expect readers to hold us to.
          </p>

          {/* Principle 1 */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <Scale className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Uncompromised Objectivity
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  We report the facts. Editorial decisions — what we cover, what we conclude and what score we give — are shielded from commercial influence: no advertiser, sponsor or investor gets preview access, copy approval or a veto over our journalism.
                </p>
                <p>
                  That independence is funded, not compromised, by commercial partnerships: clearly labelled Sponsored Deep-Dives, Partner Content and display/newsletter sponsorships support the publication, and every paid format is disclosed as such. Sponsors receive no seat at the editorial table — no preview of unrelated stories, no copy approval, no veto, and no advance warning of critical coverage. If a major technology company — including a sponsor — makes a misstep, we cover it critically and fairly, and we do not soften a verdict because a partner advertises with us.
                </p>
                <p>
                  Our loyalty lies exclusively with our readers: accurate, noise-free analysis so they can form their own conclusions. Where we get something wrong, we say so in public rather than quietly editing the record (see the formal corrections protocol below).
                </p>
              </div>
            </div>
          </div>

          <hr className="border-[var(--line)]" />

          {/* Principle 2 */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Sourcing &amp; Anonymous Tips
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  We verify what we are given before we publish it, and we protect the people who give it to us. A claim reaches print only when it can be traced to something checkable: the specification itself, the source repository, the advisory or CVE, the filing, the datasheet, the commit history, or a named person who is accountable for what they say. An unverifiable anonymous claim is not a story — it is a rumour with a deadline.
                </p>
                <p>
                  Anonymity is granted where a source’s safety, job or finances are genuinely at risk, and only with an editor’s approval, a stated reason for the grant, and independent corroboration of the underlying material.
                </p>
                <p>
                  For sensitive material, ask for an encrypted channel and we will use one — authors can publish a PGP public key on their profile, and the desk will confirm a key fingerprint before you send anything. We keep the minimum material needed to verify a story, and we will tell you plainly what we can and cannot protect rather than pointing at a drop box we do not operate.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-[var(--line)]" />

          {/* Principle 3 */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <LaptopMinimal className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Review Ethics
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  Gadgets and software are reviewed honestly, and a review verdict can never be bought: we do not sell positive reviews, scores or rankings. Sponsored Deep-Dives and Partner Content are separate, clearly labelled formats — tagged &ldquo;Sponsored&rdquo; or &ldquo;Partner&rdquo; before the first paragraph — and are never disguised as independent reviews or allowed to influence one.
                </p>
                <p>
                  Hardware sent to us by manufacturers is either returned after the review period or kept purely in a secure editorial vault for future benchmark comparisons. We never sell review units, and accepting a review unit never guarantees coverage — let alone positive coverage. Where a review includes a benchmark, the full test configuration is published with it (see <em>Primary-Source Technical Verification</em> below), and a vendor-supplied figure we have not reproduced is labelled as a vendor claim, never presented as our own measurement.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-[var(--line)]" />

          {/* Principle 4 */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <Quote className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Plagiarism &amp; Attribution
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  Plagiarism is a firing offence, not a style question. We credit the outlet that did the work and link it, and we link the primary source behind it — the original paper, advisory or submission — wherever one exists. We do not lift a scoop, strip its byline and present it as our own finding, and we do not re-report a single-source story as though we had independently confirmed it. Where a story is based on someone else&apos;s original reporting we say so in the body, not only in the footer.
                </p>
                <p>
                  Our goal is to elevate the technology journalism ecosystem, and that starts with respecting the hard work of our peers.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-[var(--line)]" />

          {/* Primary-source verification */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <FlaskConical className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Primary-Source Verification &amp; Reproducible Benchmarks
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  Every technical story is checked against primary material before publication: the specification, the reference manual, the public repository at a named commit, the vendor advisory, the regulatory filing, or our own reproducible test. Secondary coverage is never our primary source, and marketing material is never treated as evidence.
                </p>
                <p>
                  When we publish a number, we publish the conditions that produced it — hardware or instance type, firmware and library versions, configuration, workload, sample size and repetition count — so that a reader can reproduce the measurement instead of taking it on trust. Benchmarks that we cannot reproduce are labelled as vendor claims or third-party results, not blended into our own.
                </p>
                <p>
                  Where a result is contested, we re-run the test. If a re-run contradicts a figure we published, the correction is made under the formal protocol below and the original number is documented in the change note.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-[var(--line)]" />

          {/* Byline accountability */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <IdCard className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Byline Accountability &amp; Engineering Expertise
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  A byline is a claim of accountability: a named human being, with a verifiable specialism, stands behind what is written and can be asked to defend it. Reviewers and security writers have hands-on engineering or laboratory experience in the subject they cover, and their expertise is stated on their author profile.
                </p>
                <p>
                  We do not publish fictitious bylines, invented personas, or a house account passed off as a person. Where a piece is genuinely a collective output of the desk — a live briefing summary, a news round-up — the piece says so explicitly, and an editor is named as responsible for it.
                </p>
                <p>
                  Authors disclose material interests, including holdings, employment or paid advisory relationships, and are reassigned when a conflict cannot be resolved. Freelancers are held to the same standard as staff, and their authority on a subject is verified before commissioning, not after publishing.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-[var(--line)]" />

          {/* Sponsored and partner content */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <Handshake className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Sponsored &amp; Partner Content Standards
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  We accept commercial support in three clearly separated formats: <strong>Sponsored Deep-Dives</strong> (a technical exploration produced with a partner and paid for by them), <strong>Partner Content</strong> (material produced by or with a partner&#39;s engineering team), and <strong>display and newsletter advertising</strong> sold against our audience rather than our editorial judgement. These formats fund the independent reporting around them; they never replace it, and they are never presented as independent reviews, benchmarks or endorsements.
                </p>
                <p>
                  Every paid piece carries a visible <strong>&ldquo;Sponsored&rdquo;</strong> or <strong>&ldquo;Partner&rdquo;</strong> disclosure — in the kicker above the headline, before the first paragraph of the body, and in the structured data — never buried at the foot of the page, never blended into the byline, and never omitted because a client would prefer it absent. Paid links are tagged as advertising for search engines.
                </p>
                <p>
                  A sponsor may review a sponsored piece for factual accuracy about its own product, and may not change our verdicts, remove context, preview unrelated stories, or veto publication. Sponsorship of one piece buys no influence over any other coverage, including coverage of that sponsor. Where a partnership would require editorial concessions, we decline the partnership.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-[var(--line)]" />

          {/* Affiliate disclosure */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <BadgeDollarSign className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Affiliate Link Disclosure
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  Some buying guides and reviews contain affiliate links, which pay us a commission if you purchase through them. Where an article contains one, it is disclosed in the article itself, near the first link, in plain language — not only in a site-wide footer notice nobody reads.
                </p>
                <p>
                  A commission never determines whether a product is covered, how it is scored, or where it is ranked. Products are selected on merit, tested the same way regardless of whether an affiliate programme exists, and a product that falls short is described as falling short even when a higher-commission alternative could have been recommended instead. We do not sell do-follow backlinks, paid insertions into existing editorial articles, or links added to a review after publication.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-[var(--line)]" />

          {/* AI oversight */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <Bot className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Human Editorial Oversight of AI Research Tools
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  We cover artificial intelligence seriously, so we are explicit about how we use it. AI tools may assist our journalists with research organisation — clustering sources, summarising a long specification into an author&apos;s notes, drafting a first-pass outline — transcription, and language mechanics. They are treated as instruments, not as authors or sources.
                </p>
                <p>
                  <strong>Every xSypher article is researched, written, fact-checked and edited by named humans.</strong> No AI system produces our thesis, our analysis, our verdict or a quotation; no AI system stands in for verification; and no AI-generated text is published as reporting even after a human edit pass. Generated imagery, where we use it, is labelled as generated.
                </p>
                <p>
                  Every factual claim in an AI-assisted piece must be traced back to a primary source a human has opened and read, and the responsible editor is accountable for that trace — an AI system&apos;s citation is a lead to verify, never a source we rely on.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-[var(--line)]" />

          {/* Corrections protocol */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <FileWarning className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Formal Corrections Protocol
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  Anyone can report an error — a reader, a vendor, a researcher, a competitor — and every report receives a human answer within two business days. Reports are triaged by severity: factual errors that could mislead a purchasing or security decision are handled first, style and typo issues last.
                </p>
                <p>
                  Substantive corrections are published, not hidden: the article carries a dated correction note describing what was wrong, what the correct information is, and when the change was made. We do not silently rewrite a published piece, we do not quietly delete a paragraph that turned out to be wrong, and we do not remove an article to make a complaint disappear.
                </p>
                <p>
                  Where a story is retracted, the retraction notice stays at the original URL with an explanation and a link to the corrected record, so that anyone who cited the original can find out why it changed. Minor typographical fixes need no log entry, but no substantive edit is ever made without one — including corrections to benchmark figures, which reference the re-run conditions under which the new number was produced.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* BACK TO CONTACT CTA */}
      <section className="w-full py-16 sm:py-24 border-t border-[var(--line)] text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 flex flex-col items-center">
          <p className="font-[family:var(--f-body)] text-[var(--muted)] mb-8 max-w-lg">
            Questions about these standards, or a correction to request?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <Link
              href="/page/contact"
              className="py-3 px-6 !bg-[var(--accent)] !text-[var(--on-accent)] hover:brightness-110 font-[family:var(--f-ui)] font-bold rounded-lg inline-flex items-center justify-center transition-all shadow-sm"
            >
              Contact the desk
            </Link>
            <Link
              href="/page/transparency"
              className="py-3 px-6 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--ink)] border border-[var(--line)] font-[family:var(--f-ui)] font-bold rounded-lg inline-flex items-center justify-center transition-all"
            >
              Transparency report
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
