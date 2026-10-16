import React from "react";
import type { Metadata } from "next";
import {
  Award,
  Bot,
  FlaskConical,
  GitCompareArrows,
  Info,
  MicVocal,
  PencilRuler,
  RefreshCcwDot,
  Scale,
  ShieldCheck,
  Tag,
  UserCheck,
} from "lucide-react";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";
import { PolicyCallout, PolicyCard, PolicyFooter, PolicyHero, PolicyLayout, type PolicySection } from "@/components/common/PolicyShell";

// ─────────────────────────────────────────────────────────────────────────────
// Editorial Standards & Ethics
//
// This is the page a Google quality rater, an AdSense reviewer or a reader with
// a complaint lands on, so it carries the five things a news publisher is
// expected to be able to state without hedging: who verified the technical
// claim and against what, whether a benchmark can be reproduced, who wrote the
// piece and what makes them qualified, which content is paid for and how it is
// labelled, and how an error is corrected once it is found.
//
// Everything asserted here is true of this publication's own workflow (the
// pipeline in `lib/` — sanitized publishing, revision history, benchmark
// leaderboard, labelled placements, the corrections route). Nothing is claimed
// that the product cannot demonstrate.
//
// Layout, including the mobile fix for the old icon-column cards, lives in
// components/common/PolicyShell.tsx.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = constructMetadata({
  title: "Editorial Standards & Ethics — xSypher",
  description:
    "How xSypher reports: primary-source engineering verification, reproducible benchmark disclosure, byline accountability, labelled Sponsored and Partner content, AI usage boundaries and a corrections workflow with published response targets.",
  canonical: `${siteConfig.url}/page/editorial-standards`,
  image: brandBannerUrl(),
  imageAlt: "xSypher editorial standards and ethics",
  type: "website",
});

const SECTIONS: PolicySection[] = [
  { id: "tldr", label: "0. Summary" },
  { id: "independence", label: "1. Independence & funding" },
  { id: "verification", label: "2. Source verification" },
  { id: "benchmarks", label: "3. Benchmarks & testing" },
  { id: "bylines", label: "4. Bylines & expertise" },
  { id: "commercial", label: "5. Sponsored & Partner content" },
  { id: "ai", label: "6. AI usage disclosure" },
  { id: "corrections", label: "7. Corrections workflow" },
  { id: "sourcing", label: "8. Sources & anonymity" },
  { id: "reviews", label: "9. Review ethics" },
  { id: "attribution", label: "10. Attribution" },
  { id: "contact", label: "11. Raising a concern" },
];

export default function EditorialStandardsPage() {
  return (
    <div className="min-h-screen w-full bg-[var(--surface)] text-[var(--ink)] selection:bg-[var(--accent)]/20">
      <PolicyHero
        kicker="Standards & Ethics"
        title="Our Editorial Standards"
        deck="Truth, transparency and deep technical accuracy — stated as rules we can be held to, not as aspirations. This page is the contract between the desk, the reader, and the vendor whose product we are about to take apart."
        updated="15 October 2026"
        badges={[
          { label: "Applies to", value: "All xSypher desks" },
          { label: "Compliance", value: "E-E-A-T / AdSense policy" },
          { label: "Reviewed", value: "Quarterly, by the editor" },
        ]}
      />

      <PolicyLayout
        sections={SECTIONS}
        footerNote={
          <>
            <strong className="text-[var(--ink)]">Spotted a claim you think is wrong?</strong> Corrections are
            accepted from anyone — read the workflow below, then write to the desk. A factual error is acknowledged
            within two business days.
          </>
        }
      >
        <PolicyCallout title="Summary: the five commitments" icon={Info} tone="accent">
          <ul>
            <li>
              <strong>Engineering transparency.</strong> Every technical claim is traced to a primary source
              (documentation, a specification, a vendor advisory or a test we ran) and linked in the piece, not
              paraphrased from someone else&apos;s coverage.
            </li>
            <li>
              <strong>Reproducibility.</strong> A benchmark result is published with the hardware, firmware, software
              versions, workload and settings that produced it, so a reader with the same equipment can attempt to
              reproduce it — including the results that disagree with the vendor.
            </li>
            <li>
              <strong>Accountable bylines.</strong> Every story carries the name of a real author who is reachable and
              answerable for it. No anonymous staffers, no ghost-written &ldquo;desk&rdquo; copy.
            </li>
            <li>
              <strong>Labelled money.</strong> Sponsored and Partner content is marked before the first paragraph and
              kept off the review track. Sponsorship buys placement, never conclusions.
            </li>
            <li>
              <strong>Published corrections.</strong> Errors are fixed on the article itself with a timestamped note,
              and the correction policy states how fast each class of error is handled.
            </li>
          </ul>
        </PolicyCallout>

        <PolicyCard id="independence" title="Independence & Funding" eyebrow="Clause 01" icon={Scale}>
          <p>
            We report the facts. Editorial decisions — what we cover, what we conclude and what score we give — are
            shielded from commercial influence: no advertiser, sponsor or investor gets preview access, copy approval
            or a veto over our journalism.
          </p>
          <p>
            xSypher is independently owned and founder-led. It carries no venture capital and no corporate parent, and
            it is funded by clearly labelled commercial partnerships: Sponsored Deep-Dives, Partner Content and
            display or newsletter sponsorships. Every paid format is disclosed as such, in the article itself and on
            the advertising page.
          </p>
          <p>
            That firewall cuts both ways. If a major technology company — including a current sponsor — ships a
            flawed product or mishandles an incident, we cover it critically and fairly, and we tell readers when the
            subject of a story is also a sponsor. Our loyalty runs to the reader who has to decide whether to spend
            their money, not to the vendor who has to hit a quarter.
          </p>
        </PolicyCard>

        <PolicyCard id="verification" title="Primary-Source Engineering Verification" eyebrow="Clause 02" icon={ShieldCheck}>
          <p>
            A claim reaches publication only after it has survived verification, and that verification is
            engineering-first rather than press-release-first:
          </p>
          <h3>What counts as a primary source</h3>
          <ul>
            <li>Vendor documentation, datasheets and specifications — in the version that shipped, not the draft.</li>
            <li>Source code, kernels, decompiled firmware, protocol captures and RFCs.</li>
            <li>Advisories, CVEs and patches from the maintainers, reproduced against a controlled build.</li>
            <li>Our own instrumented tests, run on hardware we hold.</li>
          </ul>
          <h3>What we do with anything short of that</h3>
          <p>
            Corporate claims, analyst projections and single-study findings are reported as claims — attributed,
            dated and labelled — and never laundered into fact. Where a claim is significant and cannot be verified,
            we say so in the story rather than leaving the reader to assume it was checked.
          </p>
          <p>
            When we are wrong about the cause of a failure — a thermal limit blamed on firmware that was actually a
            firmware setting, an exploit that turned out to be a misconfiguration — we correct the analysis on the
            article, because the technical reason matters as much as the correction itself.
          </p>
        </PolicyCard>

        <PolicyCard id="benchmarks" title="Reproducible Benchmarks & Testing" eyebrow="Clause 03" icon={FlaskConical}>
          <p>
            Performance journalism is only worth reading if it can be audited. Every benchmark we publish — in a
            review, a comparison or a dedicated deep-dive — is disclosed with the detail needed to challenge it:
          </p>
          <ul>
            <li>
              <strong>The bench:</strong> model numbers, memory and storage configuration, thermal environment, and
              any overclock, undervolt or power limit we applied.
            </li>
            <li>
              <strong>The software:</strong> operating system build, driver and firmware versions, and the exact
              tool or script invoked.
            </li>
            <li>
              <strong>The workload:</strong> dataset, settings, iteration counts, warm-up runs, and whether the figure
              quoted is an average, a median or a best case.
            </li>
            <li>
              <strong>The variance:</strong> run-to-run spread. A 2% delta on a bench with 4% spread is reported as
              a tie, not as a winner.
            </li>
          </ul>
          <p>
            Where a vendor supplies tooling or pre-release firmware, we say so, state whether the result was
            reproduced on release firmware, and keep the disclosed numbers even when the retail result is worse.
            Review units supplied by a manufacturer are disclosed in the article, and accepting a unit never carries
            a commitment to publish, to publish favourably, or to withdraw criticism.
          </p>
        </PolicyCard>

        <PolicyCard id="bylines" title="Author Expertise & Byline Accountability" eyebrow="Clause 04" icon={UserCheck}>
          <p>
            Byline accountability is not a signature, it is a claim we make about the person: that they have the
            background to have made the judgements in the story. So each author has a profile page carrying their
            beat, the areas they are qualified to write about, and their published work on xSypher.
          </p>
          <ul>
            <li>
              <strong>Named bylines.</strong> Reporting, reviews and analysis carry a human byline. There is no
              house byline standing in for a writer who does not want their name on the piece.
            </li>
            <li>
              <strong>Correct assignment.</strong> Reviews go to writers who have used the class of hardware or
              software in question; security analysis goes to writers who work in the field. A story an author is not
              equipped to defend is reassigned, not published.
            </li>
            <li>
              <strong>Specialist review.</strong> Benchmarks, exploit write-ups and firmware teardowns are read
              before publication by someone other than the author, whose job is to attack the method.
            </li>
            <li>
              <strong>Reachability.</strong> Authors are contactable through the contact desk; a correction request
              addressed to an author goes to that author.
            </li>
          </ul>
        </PolicyCard>

        <PolicyCard id="commercial" title="Independent Reviews vs Sponsored & Partner Content" eyebrow="Clause 05" icon={Tag}>
          <p>
            Independent journalism and paid placements live in different lanes, and we keep them visibly separate:
          </p>
          <ul>
            <li>
              <strong>Independent reviews and analysis.</strong> Commissioned by the desk, written by our authors,
              never shown to the vendor before publication. A verdict, a score or a ranking cannot be bought,
              influenced or withdrawn — that is the whole point of the format.
            </li>
            <li>
              <strong>Sponsored Deep-Dives.</strong> Commissioned and funded by a partner, produced with editorial
              craft, labelled <em>Sponsored</em> in the kicker and in the page metadata before the first paragraph,
              and excluded from review scores and from &ldquo;recommended&rdquo; placements.
            </li>
            <li>
              <strong>Partner Content.</strong> Material produced with a partner in which the desk participates.
              Labelled <em>Partner</em> in the same way and to the same standard.
            </li>
            <li>
              <strong>Commercial pages.</strong> Advertising, media-kit and partnership copy is published under the
              advertising route, never inside the article feed, and never presented as reporting.
            </li>
          </ul>
          <p>
            Affiliate relationships are disclosed wherever a link could earn a commission, and we do not sell do-follow
            links or &ldquo;guaranteed mention&rdquo; placements inside editorial. Declined categories — including
            deceptive products, malware-adjacent services and anything requiring us to hide a material risk from
            readers — are listed on the advertising page.
          </p>
        </PolicyCard>

        <PolicyCard id="ai" title="AI Usage Disclosure Boundaries" eyebrow="Clause 06" icon={Bot}>
          <p>
            AI is a tool in this newsroom, not an author. The boundary is simple and it is enforced at the desk:
          </p>
          <ul>
            <li>
              <strong>Assistive only.</strong> AI may help transcribe interviews, draft outlines, summarise a long
              document we have already read, or check a formula. It may not write the thesis of a story, decide what
              is true, or produce a verdict we publish under a human byline.
            </li>
            <li>
              <strong>The three human steps.</strong> The reporting, the fact-check against primary sources and the
              final judgement are done by people who are named on the piece and answerable for it.
            </li>
            <li>
              <strong>Disclosure.</strong> Where AI meaningfully shaped a published artefact — a generated
              illustration, a data interpretation, a translation — the article says so in the text.
            </li>
            <li>
              <strong>Never synthetic evidence.</strong> We do not publish AI-generated imagery as if it were
              photographic documentation, and we do not put machine-written words in a real person&apos;s mouth.
            </li>
          </ul>
          <p>
            Corrections that trace back to an unverified AI-assisted summary are treated as our error, not the
            model&apos;s. The byline is the point of accountability.
          </p>
        </PolicyCard>

        <PolicyCard id="corrections" title="Corrections, Updates & Retractions" eyebrow="Clause 07" icon={RefreshCcwDot}>
          <p>
            When we get something wrong, the fix goes on the article — not in a separate log a reader will never
            find. Material corrections are appended with a timestamp and an explanation of what changed; silent
            edits are not an option, and a story is never quietly deleted to bury an error.
          </p>
          <h3>Response targets</h3>
          <ul>
            <li>Factual error in a story: acknowledged within 2 business days, corrected as soon as it is confirmed.</li>
            <li>Security-relevant error (a wrong mitigation, an unsafe instruction): same-day priority.</li>
            <li>Attribution or credit omission: 3 business days.</li>
            <li>Copyright or retraction request: 5 business days for an initial substantive response.</li>
          </ul>
          <p>
            Substantive rewrites are logged in the article&apos;s revision history, which the editorial console keeps
            for every published story. Where a correction changes a conclusion rather than a detail — a score, a
            verdict, a finding — the article carries an editor&apos;s note saying so, and the change is reported to
            the search engines that have indexed the page.
          </p>
        </PolicyCard>

        <PolicyCard id="sourcing" title="Sources, Anonymity & Protection" eyebrow="Clause 08" icon={MicVocal}>
          <p>
            We verify what we are given before we publish it, and we protect the people who give it to us. Anonymity
            is granted where a source&apos;s safety, job or finances are genuinely at risk — and only when the
            material can be verified independently, because an unverifiable anonymous claim is not a story.
          </p>
          <p>
            For sensitive material, ask for an encrypted channel and we will arrange one — authors can publish a PGP
            public key on their profile, and the desk will confirm a key fingerprint before you send anything. We keep
            the minimum material needed to verify a story, and we will tell you plainly what we can and cannot
            protect rather than pointing at a drop box we do not operate.
          </p>
          <p>
            We do not identify a confidential source to a company, a PR department or a court without the
            source&apos;s consent, and we do not publish a document in a form that exposes the person who provided it.
          </p>
        </PolicyCard>

        <PolicyCard id="reviews" title="Review Ethics" eyebrow="Clause 09" icon={PencilRuler}>
          <p>
            Gadgets and software are reviewed honestly, and a review verdict can never be bought: we do not sell
            positive reviews, scores or rankings. Sponsored Deep-Dives and Partner Content are separate, clearly
            labelled formats — tagged before the first paragraph — and are never disguised as independent reviews or
            allowed to influence one.
          </p>
          <p>
            Hardware sent to us by manufacturers is either returned after the review period or kept in a secure
            editorial vault for future benchmark comparisons. We never sell review units, and accepting a review unit
            never guarantees coverage — let alone positive coverage.
          </p>
          <p>
            Review scores come from a published rubric rather than from mood: the breakdown behind a score — design,
            performance, software, value and repairability — is shown in the article so a reader can disagree with the
            weighting as well as the number.
          </p>
        </PolicyCard>

        <PolicyCard id="attribution" title="Plagiarism & Attribution" eyebrow="Clause 10" icon={GitCompareArrows}>
          <p>
            Plagiarism is a firing offence, not a style question. When we build on another outlet&apos;s reporting we
            name them and link to the original, and we link the primary source behind it wherever one exists.
          </p>
          <p>
            Images, diagrams and datasets carry credit and a licence where the licence requires it, including in the
            image metadata the search engines read — a photograph is never reused without the attribution its licence
            demands.
          </p>
          <p>
            Our goal is to elevate the technology journalism ecosystem, and that starts with respecting the hard work
            of our peers.
          </p>
        </PolicyCard>

        <PolicyCard id="contact" title="Raising a Concern" eyebrow="Clause 11" icon={Award}>
          <p>
            Complaints, correction requests, right-of-reply and evidence about a story are all welcome, and all of
            them are read by a human. Include the URL, the claim you are contesting and any document that supports
            your position; where a complaint is upheld we publish the correction rather than negotiating over
            whether it was needed.
          </p>
          <p>
            Standards questions, corrections and sponsorship disclosures all reach the desk through one route, and the
            same standards apply to a complaint from a reader and to one from a company with an advertising budget.
          </p>
        </PolicyCard>

        <PolicyFooter
          title="Questions about these standards, or a correction to request?"
          body="Send the URL, the claim and your evidence. Factual errors are acknowledged within two business days; security-relevant corrections are treated as same-day priorities."
          primary={{ href: "mailto:corrections@xsypher.com", label: "Corrections desk", mail: true }}
          secondary={{ href: "/page/transparency", label: "Transparency report" }}
        />
      </PolicyLayout>
    </div>
  );
}
