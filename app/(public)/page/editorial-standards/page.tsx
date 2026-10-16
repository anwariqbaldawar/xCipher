import type { Metadata } from "next";
import {
  BadgeDollarSign,
  Bot,
  FileCheck2,
  FileWarning,
  FlaskConical,
  Handshake,
  IdCard,
  LaptopMinimal,
  Quote,
  Scale,
  ShieldCheck,
  Terminal,
  UserCheck,
} from "lucide-react";
import {
  PolicyButton,
  PolicyCallout,
  PolicyCard,
  PolicyCta,
  PolicyFacts,
  PolicyFooterNote,
  PolicyHero,
  PolicyLayout,
  PolicyLink,
  PolicyPage,
  PolicyPoint,
  PolicyPoints,
  PolicyRows,
  PolicySection,
  PolicySteps,
} from "@/components/policy/PolicyKit";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Editorial Standards — Verification, Independence & Corrections | xSypher",
  description:
    "The charter behind every xSypher story: editorial independence from sponsors, primary-source verification and reproducible benchmarks, byline accountability, sponsored and partner content labelling, affiliate disclosure, human oversight of AI research tools and a formal corrections protocol.",
  canonical: `${siteConfig.url}/page/editorial-standards`,
  image: brandBannerUrl(),
  imageAlt: "xSypher editorial standards",
});

/**
 * Editorial Standards
 *
 * Rebuilt on PolicyKit. It was a single narrow column of prose with no hero
 * structure, no contents rail and no cards — the thinnest-looking document on
 * the site, and the one a reader is most likely to share when they want to know
 * whether we can be trusted. It now carries the same hero, fact strip, numbered
 * sections and boxes as the Transparency Report, with the standards themselves
 * unchanged in substance and expanded where a reader would reasonably ask "and
 * what does that mean in practice?".
 */

const CONTENTS = [
  { id: "independence", label: "1. Independence & funding" },
  { id: "sourcing", label: "2. Sourcing & verification" },
  { id: "benchmarks", label: "3. Reproducible benchmarks" },
  { id: "byline", label: "4. Byline accountability" },
  { id: "review-ethics", label: "5. Review ethics" },
  { id: "sponsored", label: "6. Sponsored & partner content" },
  { id: "affiliate", label: "7. Affiliate disclosure" },
  { id: "ai", label: "8. AI & human oversight" },
  { id: "attribution", label: "9. Attribution & plagiarism" },
  { id: "corrections", label: "10. Corrections protocol" },
];

export default function EditorialStandardsPage() {
  return (
    <PolicyPage>
      <PolicyHero
        badge="The Charter"
        badgeIcon={Scale}
        meta="Last reviewed: October 16, 2026"
        title="The standards every xSypher story is held to."
        lede={
          <>
            <p>
              Truth, transparency and deep technical accuracy are the product. This page is the charter our
              newsroom works to — it applies to reported news, hands-on reviews, benchmark analysis, security
              research and every commercial partnership, without exception.
            </p>
            <p>
              It is written to be checkable rather than aspirational: each section states what we do, what we
              refuse, and what a reader can hold us to. Where we fall short of it, that is a corrections matter
              and there is a protocol for it at the end.
            </p>
          </>
        }
        actions={
          <>
            <PolicyButton href="/page/corrections" icon={FileWarning}>
              Report an error
            </PolicyButton>
            <PolicyButton href="/page/transparency" icon={ShieldCheck} variant="ghost">
              Transparency report
            </PolicyButton>
          </>
        }
      />

      <PolicyFacts
        facts={[
          {
            label: "Verification basis",
            value: "Primary sources",
            note: "Specifications, repositories, advisories, filings and our own reproduced tests.",
          },
          {
            label: "Paid formats",
            value: "Labelled",
            note: "“Sponsored” or “Partner” in the kicker, before the first paragraph, always.",
          },
          {
            label: "AI-written articles",
            value: "Zero",
            note: "AI assists research organisation and mechanics; every story is human-written.",
          },
          {
            label: "Corrections",
            value: "2 business days",
            note: "First human response to any factual-error report, published as a dated note.",
          },
        ]}
      />

      <PolicyLayout
        contents={CONTENTS}
        asideNote={
          <>
            Questions about these standards, or a correction to request?{" "}
            <PolicyLink href="/page/contact">Contact the desk</PolicyLink> — it reaches an editor.
          </>
        }
      >
        {/* ── 1. INDEPENDENCE ──────────────────────────────────────────────── */}
        <PolicySection id="independence" index={1} title="Editorial independence & funding" icon={Scale}>
          <p>
            We report the facts. Editorial decisions — what we cover, what we conclude and what score we give —
            are shielded from commercial influence. No advertiser, sponsor or investor gets preview access, copy
            approval, a veto, or advance warning of critical coverage.
          </p>
          <p>
            That independence is funded, not compromised, by commercial partnerships: clearly labelled Sponsored
            Deep-Dives, Partner Content, display and newsletter advertising, affiliate links and reader support.
            Sponsors receive no seat at the editorial table. If a technology company — including a sponsor —
            makes a misstep, we cover it critically and fairly, and we do not soften a verdict because a partner
            advertises with us.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PolicyCard title="Where the money comes from" tone="ok" icon={ShieldCheck}>
              <PolicyPoints>
                <PolicyPoint label="Labelled sponsorship and display advertising." tone="ok">
                  Sold directly or through a network, always disclosed, never dressed up as reporting.
                </PolicyPoint>
                <PolicyPoint label="Affiliate commissions." tone="ok">
                  Where a story links to something we would recommend anyway, and the commission never decides
                  the verdict.
                </PolicyPoint>
                <PolicyPoint label="Reader support." tone="ok">
                  Newsletter subscribers, members of the comment section, and people who send us hardware to
                  test.
                </PolicyPoint>
              </PolicyPoints>
            </PolicyCard>
            <PolicyCard title="What money cannot buy here" tone="no" icon={FileWarning}>
              <PolicyPoints>
                <PolicyPoint label="A verdict." tone="no">
                  Sponsorship buys reach, not conclusions. We have said a product is not ready, and we will say
                  it again.
                </PolicyPoint>
                <PolicyPoint label="A review slot." tone="no">
                  Paid placements never wear the review label, and a review is never paid for.
                </PolicyPoint>
                <PolicyPoint label="Early sight of a story." tone="no">
                  Sponsors see a piece when readers do.
                </PolicyPoint>
              </PolicyPoints>
            </PolicyCard>
          </div>
          <PolicyCallout title="Accepting a briefing is not an obligation to be kind." icon={Terminal}>
            Hospitality invitations, review samples and embargoed briefings never oblige us to publish, and
            never oblige us to be favourable. Where a company we have covered commercially is later the subject
            of a critical story, that commercial relationship is disclosed inside the story.
          </PolicyCallout>
        </PolicySection>

        {/* ── 2. SOURCING ──────────────────────────────────────────────────── */}
        <PolicySection id="sourcing" index={2} title="Sourcing & verification" icon={UserCheck}>
          <p>
            A claim reaches print only when it can be traced to something checkable: the specification itself,
            the source repository, the advisory or CVE, the regulatory filing, the datasheet, the commit history,
            or a named person who is accountable for what they say. An unverifiable anonymous claim is not a
            story — it is a rumour with a deadline.
          </p>
          <p>
            We verify what we are given before we publish it, and we protect the people who give it to us.
            Anonymity is granted where a source&apos;s safety, job or finances are genuinely at risk, and only
            with an editor&apos;s approval, a stated reason for the grant, and independent corroboration of the
            underlying material.
          </p>
          <PolicyCard title="How anonymity is handled" icon={UserCheck}>
            <PolicyPoints>
              <PolicyPoint label="Editor approval, stated reason.">
                No reporter grants anonymity alone, and the reason for the grant is recorded in the story file.
              </PolicyPoint>
              <PolicyPoint label="Corroboration, not vibes.">
                The underlying material is verified independently of the source&apos;s account before we rely on
                it.
              </PolicyPoint>
              <PolicyPoint label="Encrypted channels.">
                For sensitive material, ask and we will use one. We confirm a key fingerprint before you send
                anything, and we tell you plainly what we can and cannot protect.
              </PolicyPoint>
              <PolicyPoint label="Minimum retention.">
                We keep only what is needed to verify a story, and we do not hold material we cannot protect.
              </PolicyPoint>
            </PolicyPoints>
          </PolicyCard>
          <PolicyCallout title="Unconfirmed information is labelled as unconfirmed." tone="warn" icon={FileWarning}>
            Where we report on leaks, rumoured hardware or unverified industry chatter, the story says so
            explicitly and explains why we judged it worth publishing at all. A rumour is never dressed as a
            finding.
          </PolicyCallout>
        </PolicySection>

        {/* ── 3. BENCHMARKS ────────────────────────────────────────────────── */}
        <PolicySection
          id="benchmarks"
          index={3}
          title="Primary-source verification & reproducible benchmarks"
          icon={FlaskConical}
        >
          <p>
            Every technical story is checked against primary material before publication: the specification, the
            reference manual, the public repository at a named commit, the vendor advisory, the regulatory filing
            or our own reproducible test. Secondary coverage is never our primary source, and marketing material
            is never treated as evidence.
          </p>
          <p>
            When we publish a number, we publish the conditions that produced it, so a reader can reproduce the
            measurement instead of taking it on trust.
          </p>
          <PolicyRows
            rows={[
              {
                label: "Test setup",
                value:
                  "Hardware or instance type, CPU and memory allocation, storage class, network conditions where they matter.",
              },
              {
                label: "Versions",
                value:
                  "Operating system, kernel, firmware, runtime, library and dependency versions, pinned at the version tested.",
              },
              {
                label: "Workload",
                value:
                  "What was run, with what configuration, on what data — enough for a competent engineer to rebuild it.",
              },
              {
                label: "Statistics",
                value:
                  "Sample size and repetition count. A single run is presented as a single run, never as a trend.",
              },
              {
                label: "Vendor figures",
                value:
                  "A number we have not reproduced is labelled as the vendor's claim, and never blended into our own results.",
              },
            ]}
          />
          <PolicyCallout title="If a re-run contradicts a number we published, the number changes." tone="warn" icon={FlaskConical}>
            Contested results get re-tested. A contradiction is corrected under the protocol at the end of this
            page, and the change note records the original figure alongside the conditions the new one was
            produced under.
          </PolicyCallout>
        </PolicySection>

        {/* ── 4. BYLINE ────────────────────────────────────────────────────── */}
        <PolicySection id="byline" index={4} title="Byline accountability & engineering expertise" icon={IdCard}>
          <p>
            A byline is a claim of accountability: a named human being, with a verifiable specialism, stands
            behind what is written and can be asked to defend it. Reviewers, security writers and benchmark
            authors have hands-on engineering or laboratory experience in the subject they cover, and that
            specialism is stated on their author profile.
          </p>
          <PolicyCard title="Rules we hold bylines to" icon={IdCard}>
            <PolicyPoints>
              <PolicyPoint label="Real people only.">
                No fictitious bylines, invented personas, or a house account passed off as a person.
              </PolicyPoint>
              <PolicyPoint label="Collective work is labelled.">
                Where a piece is genuinely the output of the whole desk — a live briefing, a news round-up —
                the article says so and names the editor responsible for it.
              </PolicyPoint>
              <PolicyPoint label="Interests are disclosed.">
                Authors declare holdings, employment and paid advisory roles, and are reassigned when a conflict
                cannot be resolved.
              </PolicyPoint>
              <PolicyPoint label="Expertise is verified first.">
                Authority on a subject is established before commissioning, not after publishing, and
                freelancers are held to the same standard as staff.
              </PolicyPoint>
            </PolicyPoints>
          </PolicyCard>
        </PolicySection>

        {/* ── 5. REVIEW ETHICS ────────────────────────────────────────────── */}
        <PolicySection id="review-ethics" index={5} title="Review ethics" icon={LaptopMinimal}>
          <p>
            Gadgets and software are reviewed honestly, and a review verdict can never be bought: we do not sell
            positive reviews, scores or rankings. Sponsored Deep-Dives and Partner Content are separate, clearly
            labelled formats and are never disguised as independent reviews, nor allowed to influence one.
          </p>
          <p>
            Hardware sent to us by manufacturers is either returned after the review period or kept in a secure
            editorial vault for future benchmark comparisons. We never sell review units, and accepting one never
            guarantees coverage — let alone positive coverage.
          </p>
          <PolicyCard title="What a review commits us to" tone="ok" icon={LaptopMinimal}>
            <PolicySteps
              steps={[
                {
                  title: "The unit is tested, not unboxed.",
                  body: "Where a claim is measurable we measure it, and the test conditions ship with the verdict.",
                },
                {
                  title: "The verdict is written before the sponsor conversation.",
                  body: "No commercial conversation about a product happens until the review is filed and scored.",
                },
                {
                  title: "Returned, vaulted, or purchased — never sold on.",
                  body: "Review units are accounted for, and no reviewer keeps or resells hardware as a benefit of the job.",
                },
                {
                  title: "Negative findings are published too.",
                  body: "A product that falls short is described as falling short, in the headline if the shortfall is the story.",
                },
              ]}
            />
          </PolicyCard>
        </PolicySection>

        {/* ── 6. SPONSORED ────────────────────────────────────────────────── */}
        <PolicySection id="sponsored" index={6} title="Sponsored & partner content standards" icon={Handshake}>
          <p>
            We accept commercial support in three clearly separated formats: <strong className="text-[var(--ink)]">Sponsored
            Deep-Dives</strong> (a technical exploration produced with a partner and paid for by them),{" "}
            <strong className="text-[var(--ink)]">Partner Content</strong> (material produced by or with a
            partner&apos;s engineering team), and <strong className="text-[var(--ink)]">display and newsletter
            advertising</strong>, sold against our audience rather than our editorial judgement. These formats
            fund the independent reporting around them; they never replace it.
          </p>
          <PolicyCard title="Every paid piece carries this" icon={Handshake}>
            <PolicyPoints>
              <PolicyPoint label="A visible label.">
                “Sponsored” or “Partner” in the kicker above the headline and again before the first paragraph —
                never buried at the foot of the page, never blended into a byline.
              </PolicyPoint>
              <PolicyPoint label="Search-engine honesty.">
                Paid links are tagged as advertising, so crawlers treat them the way a reader would.
              </PolicyPoint>
              <PolicyPoint label="No imitation of editorial.">
                Sponsored material is never presented as an independent review, benchmark or endorsement.
              </PolicyPoint>
              <PolicyPoint label="No cross-coverage influence.">
                Sponsoring one piece buys nothing over any other coverage, including coverage of that sponsor.
              </PolicyPoint>
            </PolicyPoints>
          </PolicyCard>
          <PolicyCallout title="What a sponsor may and may not do" tone="accent" icon={Handshake}>
            A sponsor may check a sponsored piece for factual accuracy about its own product. A sponsor may not
            change our verdicts, remove context, preview unrelated stories, or veto publication. Where a
            partnership would require any of that, we decline the partnership.
          </PolicyCallout>
          <p>
            The formats, placement and ground rules for partners are set out on the{" "}
            <PolicyLink href="/page/advertising">advertising page</PolicyLink>.
          </p>
        </PolicySection>

        {/* ── 7. AFFILIATE ────────────────────────────────────────────────── */}
        <PolicySection id="affiliate" index={7} title="Affiliate link disclosure" icon={BadgeDollarSign}>
          <p>
            Some buying guides and reviews contain affiliate links, which pay us a commission if you purchase
            through them. Where an article contains one, it is disclosed in the article itself, near the first
            link, in plain language — not only in a site-wide footer notice nobody reads.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PolicyCard title="How commissions are handled" tone="ok" icon={BadgeDollarSign}>
              <PolicyPoints>
                <PolicyPoint label="Disclosed in the story." tone="ok">
                  Before the first affiliate link, not in a disclaimer footer.
                </PolicyPoint>
                <PolicyPoint label="Merit decides inclusion." tone="ok">
                  Products are selected on merit and tested the same way whether a programme exists or not.
                </PolicyPoint>
                <PolicyPoint label="Verdicts stand regardless." tone="ok">
                  A product that falls short is described as falling short even when a higher-commission
                  alternative could have been recommended.
                </PolicyPoint>
              </PolicyPoints>
            </PolicyCard>
            <PolicyCard title="What we never sell" tone="no" icon={FileWarning}>
              <PolicyPoints>
                <PolicyPoint label="Do-follow backlinks." tone="no">
                  Not for money, not for a review unit, not for a case of beer.
                </PolicyPoint>
                <PolicyPoint label="Insertions into published articles." tone="no">
                  Links are not added to a live review after the fact because somebody paid.
                </PolicyPoint>
                <PolicyPoint label="Rankings." tone="no">
                  Position in a list is an editorial judgement and is never priced.
                </PolicyPoint>
              </PolicyPoints>
            </PolicyCard>
          </div>
        </PolicySection>

        {/* ── 8. AI ───────────────────────────────────────────────────────── */}
        <PolicySection id="ai" index={8} title="Human editorial oversight of AI research tools" icon={Bot}>
          <p>
            Because we cover artificial intelligence deeply, we are explicit about how we use it. AI tools may
            assist our journalists with research organisation — clustering sources, summarising a long
            specification into an author&apos;s notes, drafting a first-pass outline — plus transcription and
            language mechanics. They are instruments, not authors and not sources.
          </p>
          <PolicyCard title="The boundary, in one card" icon={Bot}>
            <PolicyPoints>
              <PolicyPoint label="Every article is written and edited by named humans.">
                No AI system produces our thesis, our analysis, our verdict or a quotation, and no AI-generated
                text is published as reporting after a human edit pass.
              </PolicyPoint>
              <PolicyPoint label="No AI stands in for verification.">
                Every factual claim is traced to a primary source a human has opened and read. An AI
                system&apos;s citation is a lead to verify, never a source we rely on.
              </PolicyPoint>
              <PolicyPoint label="A human is accountable.">
                The responsible editor owns that trace, and the byline names the person who wrote the piece.
              </PolicyPoint>
              <PolicyPoint label="Generated imagery is labelled.">
                Where we use generated illustration, the caption says so.
              </PolicyPoint>
            </PolicyPoints>
          </PolicyCard>
          <PolicyCallout title="We do not publish AI-written articles. Not one." tone="ok" icon={ShieldCheck}>
            This is the simplest claim on this page and the easiest to check, which is why it is stated in plain
            words rather than a policy hedge. If you ever believe a story was machine-written, tell us and we
            will show you the file history.
          </PolicyCallout>
        </PolicySection>

        {/* ── 9. ATTRIBUTION ──────────────────────────────────────────────── */}
        <PolicySection id="attribution" index={9} title="Attribution & plagiarism" icon={Quote}>
          <p>
            Plagiarism is a firing offence, not a style question. We credit the outlet that did the work and link
            it, and we link the primary source behind it — the original paper, advisory or submission — wherever
            one exists. We do not lift a scoop, strip its byline and present it as our own finding.
          </p>
          <p>
            Where a story is built on someone else&apos;s original reporting, we say so in the body, not only in
            the footer, and we do not re-report a single-source story as though we had independently confirmed
            it. Our goal is to elevate the technology journalism ecosystem, and that starts with respecting the
            hard work of our peers.
          </p>
          <PolicyCard title="Sourcing hygiene" icon={Quote}>
            <PolicyPoints>
              <PolicyPoint label="Primary over secondary.">
                The paper, the advisory, the repository — not the write-up of the write-up.
              </PolicyPoint>
              <PolicyPoint label="Credit in the text.">
                Attribution appears where the claim appears, not in a trailing credit line.
              </PolicyPoint>
              <PolicyPoint label="No synthetic provenance.">
                We do not cite a source we have not opened, and we do not chain citations through another
                outlet&apos;s summary.
              </PolicyPoint>
            </PolicyPoints>
          </PolicyCard>
        </PolicySection>

        {/* ── 10. CORRECTIONS ─────────────────────────────────────────────── */}
        <PolicySection id="corrections" index={10} title="Formal corrections protocol" icon={FileWarning}>
          <p>
            Anyone can report an error — a reader, a vendor, a researcher, a competitor — and every report
            receives a human answer within two business days. Reports are triaged by severity: factual errors
            that could mislead a purchasing or security decision are handled first, style and typo issues last.
          </p>
          <PolicySteps
            steps={[
              {
                title: "Report received and acknowledged.",
                body: "A human replies within two business days, saying who is looking at it and what they will check.",
              },
              {
                title: "Verified against the primary source.",
                body: "We go back to the specification, the code, the advisory or our own test — not to whoever complained loudest.",
              },
              {
                title: "Corrected in public, with a dated note.",
                body: "Substantive corrections carry a timestamped note describing what was wrong, what is right, and when it changed.",
              },
              {
                title: "Retractions stay at the original URL.",
                body: "A retraction notice replaces the article's body with an explanation, so anyone who cited it can find out why it changed.",
              },
              {
                title: "The record is kept.",
                body: "We do not silently rewrite a published piece, quietly delete a paragraph that proved wrong, or remove an article to make a complaint disappear.",
              },
            ]}
          />
          <PolicyCallout title="Minor typo fixes need no log entry. Nothing substantive is ever edited without one." tone="warn" icon={FileWarning}>
            That includes corrections to benchmark figures, which record the re-run conditions the new number was
            produced under — see the{" "}
            <PolicyLink href="/page/corrections">corrections desk</PolicyLink> to file one.
          </PolicyCallout>
        </PolicySection>

        <PolicyCta
          title="Hold us to this charter"
          body="If a story fails one of the standards above, that is the message we most want to receive. Point us at the clause and the paragraph — it reaches an editor, and we answer it."
        >
          <PolicyButton href="/page/corrections" icon={FileWarning}>
            Report an error
          </PolicyButton>
          <PolicyButton href="/page/editorial-policy" icon={FileCheck2} variant="ghost">
            Editorial policy
          </PolicyButton>
          <PolicyButton href="/page/transparency" icon={ShieldCheck} variant="ghost">
            Transparency report
          </PolicyButton>
          <PolicyButton href="/page/contact" icon={UserCheck} variant="ghost">
            Contact the desk
          </PolicyButton>
        </PolicyCta>

        <PolicyFooterNote
          reviewed="October 16, 2026"
          editor="Anwar Iqbal Dawar"
          links={[
            { href: "/page/editorial-policy", label: "Editorial Policy" },
            { href: "/page/transparency", label: "Transparency Report" },
            { href: "/page/advertising", label: "Advertising & Partnerships" },
            { href: "/page/corrections", label: "Corrections" },
            { href: "/page/disclaimer", label: "Technical Disclaimer" },
            { href: "/page/privacy-policy", label: "Privacy Policy" },
          ]}
        />
      </PolicyLayout>
    </PolicyPage>
  );
}
