import type { Metadata } from "next";
import Link from "next/link";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";
import PolicyLayout, { type PolicySection } from "@/components/legal/PolicyLayout";

// How xSypher reports: verification, sourcing, testing, corrections, the line
// between journalism and paid partnerships, and AI ethics. Commitments here
// must agree with /page/editorial-policy (the ethics and funding rules) and
// the response targets in /page/transparency.

export const metadata: Metadata = constructMetadata({
  title: "Editorial Standards — xSypher",
  description:
    "How xSypher reports: our fact-checking process, sourcing and attribution rules, testing and benchmark methodology, corrections policy and response times, the separation of journalism from sponsored content, and our AI ethics.",
  canonical: `${siteConfig.url}/page/editorial-standards`,
  image: brandBannerUrl(),
  imageAlt: "xSypher editorial standards",
});

const LAST_UPDATED = "16 October 2026";
const LAST_UPDATED_ISO = "2026-10-16";

const sections: PolicySection[] = [
  {
    id: "commitment",
    title: "Our commitment to readers",
    content: (
      <>
        <p>
          xSypher is an independent, founder-led publication covering software architecture, cybersecurity, AI, programming and the
          technology business for people who build and defend systems. Our readers rely on us to make decisions about what to deploy,
          patch, buy or learn, so accuracy is not a feature of our work — it is the work.
        </p>
        <p>
          These standards describe how a story is reported, checked, labelled and corrected. They apply to everything we publish: news,
          analysis, explainers, reviews, opinion, newsletters and social posts. Our rules on money and independence are set out in the{" "}
          <Link href="/page/editorial-policy">Editorial Policy &amp; Ethics</Link>.
        </p>
      </>
    ),
  },
  {
    id: "bylines",
    title: "Bylines and accountability",
    content: (
      <>
        <p>
          Most stories carry the name of the person who wrote them, linked to an author page with their background and areas of expertise.
          Some briefs and collaborative pieces carry a <strong>desk byline</strong> — such as xSypher AI Desk, xSypher CyberOps or xSypher
          Dev Desk — and a desk byline is also used when naming a writer would put them at risk. Desk stories go through exactly the same
          review as named ones.
        </p>
        <p>
          Every story is approved by an editor before publication, and the Founder &amp; Lead Editor, Anwar Iqbal Dawar, is ultimately
          accountable for everything published under the xSypher name. Every article shows when it was published and when it was last
          updated.
        </p>
      </>
    ),
  },
  {
    id: "verification",
    title: "How we verify: our fact-checking process",
    content: (
      <>
        <p>Before a story is published it goes through these steps, recorded in our editorial system:</p>
        <ol>
          <li><strong>Primary sources first.</strong> We work from the specification, the repository, the advisory, the filing, the official documentation or the person directly involved — not from someone else&rsquo;s summary of them.</li>
          <li><strong>Independent confirmation.</strong> A claim that does not come from a primary source needs confirmation from a second, independent source before we state it as fact.</li>
          <li><strong>Reproduce what can be tested.</strong> If a technical claim can be checked — a benchmark, a configuration, a code path, a vulnerability&rsquo;s preconditions — we reproduce it ourselves where we can, and say so when we could not.</li>
          <li><strong>Numbers, names, versions and dates.</strong> Each is checked against its source; version numbers and dates are stated so a reader knows exactly what a finding applies to.</li>
          <li><strong>Right of reply.</strong> A company or person facing criticism or an allegation is contacted before publication and given reasonable time to respond. If they decline, we say so.</li>
          <li><strong>Editorial review.</strong> The draft is submitted for review, where an editor checks sourcing, claims, numbers, the headline and image rights, and may send it back with notes before approving it.</li>
          <li><strong>After publication.</strong> We keep watching for new information, reader reports and vendor updates, and update or correct the story as the corrections policy below requires.</li>
        </ol>
        <h3>Labels we use</h3>
        <div className="policy-table-wrap">
          <table className="policy-table">
            <thead>
              <tr><th>Label</th><th>What it means</th></tr>
            </thead>
            <tbody>
              <tr><td>News</td><td>Verified reporting of what happened, without our opinion.</td></tr>
              <tr><td>Analysis</td><td>Interpretation by a writer with relevant expertise, grounded in evidence that is shown.</td></tr>
              <tr><td>Opinion</td><td>A clearly identified personal argument. Facts in it are held to the same standard.</td></tr>
              <tr><td>Review</td><td>A verdict based on our own hands-on testing, using the methodology below.</td></tr>
              <tr><td>Unconfirmed / rumour</td><td>Information we could not fully verify, published only with context on why we consider it credible.</td></tr>
              <tr><td>Vendor claim</td><td>A figure supplied by a company that we have not reproduced.</td></tr>
              <tr><td>Sponsored / Partner</td><td>Paid content — see the independence section below.</td></tr>
            </tbody>
          </table>
        </div>
        <h3>Headlines and images</h3>
        <p>
          A headline must be supported by the story beneath it — no claims the article does not make, and no withholding the point to force a
          click. Images are credited; photographs are not altered beyond routine cropping and exposure; AI-generated illustrations are labelled
          as such and are never used to depict a real event or a real person.
        </p>
      </>
    ),
  },
  {
    id: "sourcing",
    title: "Sourcing, attribution and anonymous sources",
    content: (
      <>
        <p>
          We name our sources wherever we can and link to the primary material behind a claim. When we build on another outlet&rsquo;s
          reporting, we name the outlet and link to the original. Press releases are treated as claims to check, never republished as
          reporting.
        </p>
        <h3>Anonymous sources</h3>
        <p>
          We grant anonymity only when a source&rsquo;s safety, job or finances are genuinely at risk, and only when the material can be
          verified independently — an unverifiable anonymous claim is not a story. An editor knows the identity of every anonymous source we
          rely on, and we explain to readers why anonymity was granted.
        </p>
        <h3>Protecting sources</h3>
        <p>
          For sensitive material, ask for an encrypted channel: authors can publish a PGP public key on their author page, and the desk will
          confirm a key fingerprint before you send anything. We keep only the material needed to verify a story, and we will tell you plainly
          what we can and cannot protect rather than point you to a drop box we do not operate.
        </p>
        <h3>Plagiarism</h3>
        <p>
          Plagiarism — including passing off AI-generated text or another writer&rsquo;s work as our own — is a firing offence, not a style
          question.
        </p>
      </>
    ),
  },
  {
    id: "testing",
    title: "Reviews, testing and benchmarks",
    content: (
      <>
        <ul>
          <li><strong>Hands-on or not at all.</strong> A review verdict is based on our own use of the product. If we have not tested it, we do not review it.</li>
          <li><strong>Reproducible numbers.</strong> Every benchmark states the hardware or instance type, software versions, configuration and workload, so a reader can reproduce it rather than take it on trust.</li>
          <li><strong>Visible scoring.</strong> Scores come with their breakdown, so you can see how each criterion contributed to the verdict.</li>
          <li><strong>Review units.</strong> Hardware lent by manufacturers is returned after testing or kept solely as a benchmark reference. We never sell review units, and providing one never guarantees coverage — let alone positive coverage.</li>
          <li><strong>No previews for vendors.</strong> Manufacturers do not see a review before it is published. We respect embargoes on timing only, never on what we may say.</li>
          <li><strong>Long-term updates.</strong> If a firmware or software update changes a product materially, we update the review and say what changed.</li>
        </ul>
      </>
    ),
  },
  {
    id: "corrections",
    title: "Corrections, clarifications and updates",
    content: (
      <>
        <p>
          We correct errors openly and quickly. Anyone can report one through our{" "}
          <Link href="/page/corrections">corrections page</Link> or by writing to <a href="mailto:editor@xsypher.com">editor@xsypher.com</a>,
          and every report gets a human answer.
        </p>
        <ul>
          <li><strong>Correction:</strong> we got a fact wrong. We fix it and add a dated note to the story saying what was wrong and what is right.</li>
          <li><strong>Clarification:</strong> the facts were right but the wording could mislead. We reword it and note that we did.</li>
          <li><strong>Update:</strong> the story has moved on since publication. We add the new information with the date of the update.</li>
          <li><strong>Retraction:</strong> a story&rsquo;s central claim does not stand. We say so prominently on the story and explain why, rather than deleting it silently.</li>
        </ul>
        <p>
          Spelling and formatting fixes that do not change meaning may be made without a note. Substantive changes are never made quietly.
        </p>
        <h3>Response targets</h3>
        <div className="policy-table-wrap">
          <table className="policy-table">
            <thead>
              <tr><th>Request</th><th>We respond within</th></tr>
            </thead>
            <tbody>
              <tr><td>Correction about a security disclosure</td><td>1 business day</td></tr>
              <tr><td>Factual error</td><td>2 business days</td></tr>
              <tr><td>Missing or misattributed credit</td><td>3 business days</td></tr>
              <tr><td>Copyright or licensing complaint</td><td>5 business days</td></tr>
              <tr><td>Retraction request</td><td>5 business days</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          These are the same targets published in our <Link href="/page/transparency#corrections">transparency report</Link>.
        </p>
      </>
    ),
  },
  {
    id: "independence",
    title: "Independence: journalism and paid partnerships",
    content: (
      <>
        <p>
          Our reporting, reviews and benchmarks are editorially independent. Payment never buys coverage, a favourable conclusion, a score or a
          ranking, and no advertiser, sponsor or investor gets preview access, copy approval or a veto over our journalism. Commercial formats
          that support the publication are kept visibly separate:
        </p>
        <div className="policy-table-wrap">
          <table className="policy-table">
            <thead>
              <tr><th>Format</th><th>Who decides the content</th><th>How it is labelled</th><th>Verdicts or scores?</th></tr>
            </thead>
            <tbody>
              <tr><td>Reporting, analysis, reviews</td><td>Our editors only</td><td>Byline and section</td><td>Yes — ours alone</td></tr>
              <tr><td>Sponsored Deep-Dive</td><td>Produced with a paying partner; written to our standards</td><td>&ldquo;Sponsored&rdquo;, before the first paragraph</td><td>Never</td></tr>
              <tr><td>Partner Content</td><td>Supplied or commissioned by a partner</td><td>&ldquo;Partner&rdquo;, before the first paragraph</td><td>Never</td></tr>
              <tr><td>Display ads (Google AdSense)</td><td>Selected by Google, not by our editors</td><td>Shown as advertising, apart from articles</td><td>Not applicable</td></tr>
              <tr><td>Affiliate links</td><td>Our editors choose products on merit first</td><td>Disclosed in the story; tagged as sponsored links</td><td>Unaffected by commission</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Sponsors may check a sponsored piece for factual accuracy about their own product — nothing more. A partnership buys no influence
          over any other coverage, including coverage of that partner, and if a deal would require otherwise we decline it. When a company we
          have a commercial relationship with is in the news, we cover it as critically as anyone else and disclose the relationship.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI usage ethics",
    content: (
      <>
        <p>
          We cover artificial intelligence closely, so we hold our own use of it to a clear standard. Stories are researched, written and
          edited by people, and an accountable editor approves every one.
        </p>
        <h3>AI may help with</h3>
        <ul>
          <li>Organising research — clustering sources, or summarising a long specification into a writer&rsquo;s private notes.</li>
          <li>Language mechanics such as grammar and clarity, on text a person wrote.</li>
          <li>Illustrations, which are always labelled as AI-generated.</li>
        </ul>
        <h3>AI never</h3>
        <ul>
          <li>Writes an article, produces a thesis, analysis, verdict or score, or chooses what we cover.</li>
          <li>Generates a quote, a source, a statistic, a code sample presented as tested, or a patch note.</li>
          <li>Stands in for fact-checking: anything an AI tool suggests is verified against primary sources like any other unverified claim.</li>
          <li>Produces images presented as photographs, or depicts real people or events.</li>
        </ul>
        <h3>Data and disclosure</h3>
        <p>
          Confidential source material, unpublished reporting and personal data are not put into AI tools that retain or train on what they
          are given. When AI has contributed materially to how a piece was produced, the story says so. We review AI products by the same
          testing standard as any other product — including the tools we use ourselves.
        </p>
      </>
    ),
  },
  {
    id: "fairness",
    title: "Fairness, harm and security reporting",
    content: (
      <>
        <ul>
          <li>We distinguish clearly between what is proven, what is alleged and what is our interpretation.</li>
          <li>We avoid naming private individuals unless it is essential to the story, and take particular care with anyone vulnerable.</li>
          <li>We do not publish working exploit code for a vulnerability that has no available fix, and we give vendors a reasonable chance to patch before publishing details that would put users at risk.</li>
          <li>We do not pay sources for information.</li>
        </ul>
      </>
    ),
  },
  {
    id: "contact",
    title: "Questions and complaints",
    content: (
      <p>
        If you think we have fallen short of these standards, write to <a href="mailto:editor@xsypher.com">editor@xsypher.com</a> or use the{" "}
        <Link href="/page/corrections">corrections page</Link>. Complaints that are not resolved by the desk are reviewed by the Founder &amp;
        Lead Editor. How the publication is owned, funded and corrected is documented in our{" "}
        <Link href="/page/transparency">transparency report</Link>.
      </p>
    ),
  },
];

export default function EditorialStandardsPage() {
  return (
    <PolicyLayout
      slug="editorial-standards"
      kicker="Standards & accountability"
      title="Editorial Standards"
      summary="How every xSypher story is reported, verified, labelled and corrected — and how we keep independent journalism separate from the paid partnerships and advertising that help fund it."
      lastUpdated={LAST_UPDATED}
      lastUpdatedIso={LAST_UPDATED_ISO}
      appliesTo="Everything published by xSypher"
      highlights={[
        { title: "Verified before published", body: "Primary sources first, a second source for anything else, and testable claims reproduced ourselves." },
        { title: "Corrected in the open", body: "Dated correction notes, no silent edits, and published response targets for every kind of report." },
        { title: "Paid content is labelled", body: "Sponsored and Partner pieces are marked before the first paragraph and never carry verdicts or scores." },
        { title: "People write, AI assists", body: "AI never writes a story, a quote or a verdict, and never replaces fact-checking." },
      ]}
      sections={sections}
      contact={{ label: "Editorial questions", email: "editor@xsypher.com", note: "Report an error, question a story or raise a concern with the editors." }}
    />
  );
}
