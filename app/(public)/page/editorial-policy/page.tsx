import type { Metadata } from "next";
import {
  BadgeDollarSign,
  Bot,
  FileCheck2,
  FileWarning,
  FlaskConical,
  Handshake,
  IdCard,
  Scale,
  ShieldCheck,
  Users,
  Wallet,
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
} from "@/components/policy/PolicyKit";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Editorial Policy & Ethics — Independence, Ads & AI | xSypher",
  description:
    "How xSypher handles editorial independence, technical verification and benchmarking, byline accountability, sponsored and partner content disclosure, affiliate links, AI assistance and corrections — the rules behind every story we publish.",
  canonical: `${siteConfig.url}/page/editorial-policy`,
  image: brandBannerUrl(),
  imageAlt: "xSypher editorial policy",
});

/**
 * Editorial Policy
 *
 * Rebuilt on PolicyKit so it matches the Editorial Standards, the Technical
 * Disclaimer and the Transparency Report: same hero, same fact strip, same
 * numbered sections and cards.
 *
 * The previous layout put the icon tile and the body copy in one flex row, which
 * on a phone squeezed the text into a narrow column beside the icon — exactly the
 * misalignment a reader notices on the page this replaced.
 */

const CONTENTS = [
  { id: "independence", label: "1. Editorial independence" },
  { id: "verification", label: "2. Verification & benchmarks" },
  { id: "byline", label: "3. Byline accountability" },
  { id: "sponsored", label: "4. Sponsored & partner content" },
  { id: "affiliate", label: "5. Affiliate links" },
  { id: "ai", label: "6. AI & human review" },
  { id: "corrections", label: "7. Corrections protocol" },
];

export default function EditorialPolicyPage() {
  return (
    <PolicyPage>
      <PolicyHero
        badge="Transparency & Trust"
        badgeIcon={Scale}
        meta="Last reviewed: October 16, 2026"
        title="Our editorial guidelines & ethics."
        lede={
          <>
            <p>
              This is the operating policy behind every story on xSypher: how we stay independent, how technical
              claims are verified, who is accountable for a byline, where AI does and does not help, and how a
              correction gets made.
            </p>
            <p>
              It is the short form of the{" "}
              <PolicyLink href="/page/editorial-standards">editorial standards</PolicyLink>, written for readers
              who want the rules rather than the charter — every clause here is expanded there with the
              reasoning behind it.
            </p>
          </>
        }
        actions={
          <>
            <PolicyButton href="/page/editorial-standards" icon={FileCheck2}>
              Full editorial standards
            </PolicyButton>
            <PolicyButton href="/page/corrections" icon={FileWarning} variant="ghost">
              Report an error
            </PolicyButton>
          </>
        }
      />

      <PolicyFacts
        facts={[
          {
            label: "Sponsor veto",
            value: "Never",
            note: "No advertiser, sponsor or investor reads a story before a reader does.",
          },
          {
            label: "Benchmark method",
            value: "Published",
            note: "Setup, versions, workload and sample size ship with the number.",
          },
          {
            label: "Corrections",
            value: "Public & dated",
            note: "Substantive changes carry a timestamped note, permanently.",
          },
          {
            label: "AI-generated articles",
            value: "None",
            note: "Assistive only: research organisation and language mechanics.",
          },
        ]}
      />

      <PolicyLayout
        contents={CONTENTS}
        asideNote={
          <>
            Something here you want to challenge?{" "}
            <PolicyLink href="/page/contact">Contact the desk</PolicyLink> — it reaches an editor, not a queue.
          </>
        }
      >
        {/* ── 1. INDEPENDENCE ──────────────────────────────────────────────── */}
        <PolicySection id="independence" index={1} title="Editorial independence" icon={ShieldCheck}>
          <p>
            xSypher&apos;s core reporting, reviews and benchmarks are editorially independent. Payment never buys
            a positive review, a favourable conclusion, a score or a ranking — and no gift or favour changes
            what we conclude.
          </p>
          <p>
            Our editorial decisions — what we cover, how we rate products, what we conclude — are made
            separately from advertising and partnerships. Commercial partners support the publication through
            the clearly labelled formats described below; no sponsor, vendor or investor has prior review, copy
            approval or veto power over any piece of our journalism, and none receives advance warning of
            critical coverage.
          </p>
          <PolicyCallout title="Independence has a cost, and it is the point." tone="accent" icon={Wallet}>
            We lose business when we publish a verdict a sponsor dislikes, and we publish it anyway. Where a
            company we have covered commercially is later the subject of a critical story, the commercial
            relationship is disclosed inside that story rather than left for a reader to discover.
          </PolicyCallout>
        </PolicySection>

        {/* ── 2. VERIFICATION ──────────────────────────────────────────────── */}
        <PolicySection
          id="verification"
          index={2}
          title="Technical verification & benchmarking methodology"
          icon={FlaskConical}
        >
          <p>
            Every story passes through a fact-checking process built on primary sources — the specification, the
            repository, the advisory, official documentation — plus direct interviews and hands-on testing. We
            verify technical claims by reproducing setups and running local benchmarks whenever a claim is
            testable.
          </p>
          <p>
            When we publish a benchmark, we disclose the setup it ran on so a reader can reproduce the number
            rather than take it on trust.
          </p>
          <PolicyRows
            rows={[
              {
                label: "Disclosed",
                value:
                  "Hardware or instance type, versions, configuration, workload and repetition count — published with the result.",
              },
              {
                label: "Labelled",
                value:
                  "Vendor-supplied figures we have not reproduced are marked as vendor claims, never presented as our own measurement.",
              },
              {
                label: "Re-tested",
                value:
                  "A contested result is re-run. If the re-run contradicts what we published, the corrections protocol below applies to it like any other error.",
              },
              {
                label: "Avoided",
                value:
                  "Unverified rumour presented as fact. Where we report on unconfirmed information — hardware leaks, industry chatter — it is stated as unconfirmed, with the reason we judged it credible enough to publish.",
              },
            ]}
          />
        </PolicySection>

        {/* ── 3. BYLINE ────────────────────────────────────────────────────── */}
        <PolicySection id="byline" index={3} title="Byline accountability & engineering expertise" icon={IdCard}>
          <p>
            Every byline on xSypher is a named human being who stands behind the work and can be asked to defend
            it. We do not publish fictitious bylines, invented personas, or a house account presented as a person.
            Where a piece is genuinely the output of the whole desk — a live briefing, a news round-up — the
            article says so and names the editor responsible.
          </p>
          <PolicyCard title="What a byline commits us to" icon={IdCard}>
            <PolicyPoints>
              <PolicyPoint label="Verified specialism.">
                Reviewers, security writers and benchmark authors have hands-on engineering or laboratory
                experience in the subject they cover, stated on their author profile.
              </PolicyPoint>
              <PolicyPoint label="Disclosed interests.">
                Authors declare holdings, employment and paid advisory roles, and are reassigned when a conflict
                cannot be resolved.
              </PolicyPoint>
              <PolicyPoint label="Verified before commissioning.">
                Authority on a topic is established before the work is assigned, not after publication, and
                freelancers are held to the same standard as staff.
              </PolicyPoint>
              <PolicyPoint label="Never bought or borrowed.">
                A byline is not sold, rented, or used to lend credibility to material the named author did not
                write.
              </PolicyPoint>
            </PolicyPoints>
          </PolicyCard>
        </PolicySection>

        {/* ── 4. SPONSORED ────────────────────────────────────────────────── */}
        <PolicySection
          id="sponsored"
          index={4}
          title="Sponsored content & native advertising disclosure"
          icon={Handshake}
        >
          <p>
            xSypher is supported in part by commercial partnerships:{" "}
            <strong className="text-[var(--ink)]">Sponsored Deep-Dives</strong> (paid technical explorations
            produced with a partner), <strong className="text-[var(--ink)]">Partner Content</strong>, and{" "}
            <strong className="text-[var(--ink)]">display and newsletter sponsorships</strong>. These formats
            fund the independent reporting around them; they do not replace it.
          </p>
          <PolicyCard title="The label rule" icon={Handshake}>
            <PolicyPoints>
              <PolicyPoint label="Before the first paragraph.">
                “Sponsored” or “Partner” appears in the kicker and again ahead of the body — never buried at the
                foot of the page, never omitted because a client would prefer it absent.
              </PolicyPoint>
              <PolicyPoint label="Tagged for search engines.">
                Paid links are marked as advertising, so crawlers treat them the way a reader would.
              </PolicyPoint>
              <PolicyPoint label="Never dressed as editorial.">
                Sponsored material is never presented as an independent review, benchmark or endorsement, and a
                partner&apos;s sponsorship of one piece buys no influence over any other coverage.
              </PolicyPoint>
              <PolicyPoint label="Accuracy review only.">
                Sponsors may check a sponsored piece for factual accuracy about their own product. They may not
                soften criticism in editorial coverage, preview unrelated stories, or veto publication — and if a
                partnership would require any of that, we decline it.
              </PolicyPoint>
            </PolicyPoints>
          </PolicyCard>
          <p>
            The formats, placement and ground rules for partners are set out on the{" "}
            <PolicyLink href="/page/advertising">advertising &amp; partnerships page</PolicyLink>.
          </p>
        </PolicySection>

        {/* ── 5. AFFILIATE ────────────────────────────────────────────────── */}
        <PolicySection id="affiliate" index={5} title="Affiliate & partner links policy" icon={BadgeDollarSign}>
          <p>
            xSypher is funded by clearly labelled sponsorship and advertising, affiliate commissions where a
            story includes them, and reader support. It takes no venture capital and has no corporate parent —
            the ownership and funding disclosure is in the{" "}
            <PolicyLink href="/page/transparency">transparency report</PolicyLink>.
          </p>
          <p>
            Where a story contains an affiliate or partner link, that is disclosed in the story and the link is
            tagged as advertising for search engines. A commission <strong className="text-[var(--ink)]">never</strong>{" "}
            affects our editorial verdicts, scores, rankings or recommendations: products are chosen on merit
            first, and if a product falls short of our standards we say so regardless of any potential
            commission. We do not sell do-follow backlinks or paid insertions into existing editorial articles.
          </p>
        </PolicySection>

        {/* ── 6. AI ───────────────────────────────────────────────────────── */}
        <PolicySection id="ai" index={6} title="AI assistance & human engineering review" icon={Bot}>
          <p>
            Because we cover artificial intelligence deeply, we must be completely transparent about how we use
            it. <strong className="text-[var(--ink)]">All xSypher articles are researched, written and edited by
            human journalists.</strong>
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PolicyCard title="AI may help with" tone="ok" icon={Bot}>
              <PolicyPoints>
                <PolicyPoint label="Research organisation." tone="ok">
                  Clustering sources and summarising a long specification into an author&apos;s private notes.
                </PolicyPoint>
                <PolicyPoint label="Language mechanics." tone="ok">
                  Grammar, spelling, structure and translation checks on text a human has already written.
                </PolicyPoint>
                <PolicyPoint label="Disclosed illustration." tone="ok">
                  Generated artwork, labelled as generated in the caption.
                </PolicyPoint>
              </PolicyPoints>
            </PolicyCard>
            <PolicyCard title="AI never does this" tone="no" icon={FileWarning}>
              <PolicyPoints>
                <PolicyPoint label="Produce the argument." tone="no">
                  Not the thesis, the analysis, the verdict, or a quotation.
                </PolicyPoint>
                <PolicyPoint label="Stand in for fact-checking." tone="no">
                  Every claim is traced to a primary source a human has opened and read.
                </PolicyPoint>
                <PolicyPoint label="Write a story." tone="no">
                  No AI-generated text is published as reporting, even after a human edit pass.
                </PolicyPoint>
              </PolicyPoints>
            </PolicyCard>
          </div>
          <PolicyCallout title="The longer version of this boundary is public." tone="accent" icon={ShieldCheck}>
            The <PolicyLink href="/page/editorial-standards">editorial standards</PolicyLink> and the{" "}
            <PolicyLink href="/page/transparency">transparency report</PolicyLink> both cover how AI is used, how
            human review is recorded, and what happens if we ever get it wrong.
          </PolicyCallout>
        </PolicySection>

        {/* ── 7. CORRECTIONS ──────────────────────────────────────────────── */}
        <PolicySection id="corrections" index={7} title="Corrections protocol" icon={FileWarning}>
          <p>
            We are committed to fixing our mistakes openly. Anyone can report an error — through the corrections
            desk or the contact page — and every report gets a human answer within two business days. If we
            publish an error, we correct it as quickly as possible.
          </p>
          <p>
            Any material change made to an article after publication, such as correcting a technical inaccuracy
            or updating a factual claim, is clearly noted with a timestamp at the foot of the piece. Minor typo
            fixes may not receive a log entry; substantive edits never get quietly swept under the rug.
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 pt-1">
            <PolicyButton href="/page/corrections" icon={FileWarning} variant="ghost">
              Report an error
            </PolicyButton>
            <PolicyButton href="/page/transparency#corrections" icon={FileCheck2} variant="ghost">
              Correction response times
            </PolicyButton>
          </div>
        </PolicySection>

        <PolicyCta
          title="Read the rules, then hold us to them"
          body="This page is the short form. The standards page carries the full charter — including the sponsored-content labelling rules, the affiliate disclosure policy and the AI oversight boundary — and the transparency report shows how the publication is owned and funded."
        >
          <PolicyButton href="/page/editorial-standards" icon={FileCheck2}>
            Editorial standards
          </PolicyButton>
          <PolicyButton href="/page/transparency" icon={ShieldCheck} variant="ghost">
            Transparency report
          </PolicyButton>
          <PolicyButton href="/page/contact" icon={Users} variant="ghost">
            Contact the desk
          </PolicyButton>
        </PolicyCta>

        <PolicyFooterNote
          reviewed="October 16, 2026"
          editor="Anwar Iqbal Dawar"
          links={[
            { href: "/page/editorial-standards", label: "Editorial Standards" },
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
