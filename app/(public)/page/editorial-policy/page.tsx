import type { Metadata } from "next";
import Link from "next/link";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";
import PolicyLayout, { type PolicySection } from "@/components/legal/PolicyLayout";

// The ethics and funding rules: who owns xSypher, how it makes money, and the
// lines commercial relationships cannot cross. How stories are reported and
// corrected lives in /page/editorial-standards; keep the two consistent.

export const metadata: Metadata = constructMetadata({
  title: "Editorial Policy & Ethics — xSypher",
  description:
    "How xSypher handles independence, technical verification and benchmarking, sponsored and partner content, affiliate links, AI assistance and corrections — the rules behind every story we publish.",
  canonical: `${siteConfig.url}/page/editorial-policy`,
  image: brandBannerUrl(),
  imageAlt: "xSypher editorial policy",
});

const LAST_UPDATED = "16 October 2026";
const LAST_UPDATED_ISO = "2026-10-16";

const sections: PolicySection[] = [
  {
    id: "ownership",
    title: "Ownership and funding",
    content: (
      <>
        <p>
          xSypher is an independent publication published by xSypher Media, founded and edited by Anwar Iqbal Dawar. It takes no venture
          capital and has no corporate parent.
        </p>
        <p>
          The publication is funded by clearly labelled sponsorship and advertising, affiliate commissions where a story includes them, and
          reader support. None of these comes with editorial control. The full ownership and funding disclosure is in our{" "}
          <Link href="/page/transparency">transparency report</Link>.
        </p>
      </>
    ),
  },
  {
    id: "independence",
    title: "Editorial independence",
    content: (
      <>
        <p>
          Our core reporting, reviews and benchmarks are editorially independent. Payment never buys a positive review, a favourable
          conclusion, a score or a ranking — and no gift or favour changes what we conclude.
        </p>
        <p>
          What we cover, how we rate products and the conclusions we draw are decided by our editors alone, separately from advertising and
          partnerships. No sponsor, vendor, advertiser or investor has prior review, copy approval or veto power over any piece of our
          journalism. If a major technology company — including a sponsor — makes a misstep, we cover it critically and fairly.
        </p>
      </>
    ),
  },
  {
    id: "sponsored-content",
    title: "Sponsored content and native advertising",
    content: (
      <>
        <p>
          Commercial partners support xSypher through three formats: <strong>Sponsored Deep-Dives</strong> (paid technical explorations
          produced with a partner), <strong>Partner Content</strong>, and <strong>display and newsletter sponsorships</strong>. They fund the
          independent reporting around them; they never replace it.
        </p>
        <ul>
          <li>Every paid piece carries a visible &ldquo;Sponsored&rdquo; or &ldquo;Partner&rdquo; label <strong>before the first paragraph</strong> — never buried at the foot of the page.</li>
          <li>Paid links are tagged so search engines treat them as advertising.</li>
          <li>Sponsored material is never presented as an independent review, benchmark or endorsement, and never carries a verdict or score.</li>
          <li>Sponsors may check a sponsored piece for factual accuracy about their own product. They may not soften criticism in editorial coverage, preview unrelated stories, or veto publication.</li>
          <li>Sponsoring one piece buys no influence over any other coverage, including coverage of the sponsor.</li>
        </ul>
        <p>
          If a partnership would require any of that, we decline it. Formats and ground rules for partners are on our{" "}
          <Link href="/page/advertising">advertising page</Link>.
        </p>
      </>
    ),
  },
  {
    id: "display-advertising",
    title: "Display advertising",
    content: (
      <>
        <p>
          Any display ads on xSypher are served by Google AdSense and load only for readers who accept optional cookies (see our{" "}
          <Link href="/page/privacy-policy">Privacy Policy</Link>). Ads are chosen by Google&rsquo;s systems, not by our editors; our writers do
          not see who is advertising to whom, and advertisers cannot request, influence or remove coverage.
        </p>
        <p>
          Ads are always presented as advertising and kept apart from article text. If you see an ad on xSypher that is misleading or
          inappropriate, tell us and we will block it through Google&rsquo;s controls.
        </p>
      </>
    ),
  },
  {
    id: "affiliate-links",
    title: "Affiliate and partner links",
    content: (
      <>
        <p>
          Where a story contains an affiliate or partner link, that is disclosed in the story, and the link is tagged as advertising for search
          engines. A commission never affects our verdicts, scores, rankings or recommendations: products are chosen on merit first, and if a
          product falls short of our standards we say so, whatever the commission.
        </p>
        <p>We do not sell do-follow backlinks or paid insertions into existing editorial articles.</p>
      </>
    ),
  },
  {
    id: "gifts",
    title: "Gifts, review units, travel and events",
    content: (
      <ul>
        <li>Hardware sent for review is returned after testing or kept solely as a reference for future benchmark comparisons. We never sell review units, and accepting one never guarantees coverage — let alone positive coverage.</li>
        <li>We decline gifts beyond nominal value from companies we cover.</li>
        <li>If a company ever pays for travel or event access connected to a story, the story says so.</li>
        <li>Embargoes are honoured for timing only. They never limit what we may say.</li>
      </ul>
    ),
  },
  {
    id: "conflicts",
    title: "Conflicts of interest",
    content: (
      <p>
        Writers and editors disclose to the desk any financial interest, business relationship or personal connection that touches a story,
        and step back from coverage where the conflict cannot be managed. Where a conflict is relevant to readers, the story discloses it.
        Nobody at xSypher may trade on information before it is published.
      </p>
    ),
  },
  {
    id: "verification",
    title: "Technical verification and benchmarking",
    content: (
      <>
        <p>
          We rely on primary sources — the specification, the repository, the advisory, official documentation — plus direct interviews and
          hands-on testing, and we reproduce testable claims ourselves. When we publish a benchmark, we disclose the setup it ran on — hardware
          or instance type, versions, configuration and workload — so a reader can reproduce the number. Vendor-supplied figures we have not
          reproduced are labelled as vendor claims.
        </p>
        <p>
          Unconfirmed information such as hardware leaks is published only when we can explain why it is credible, and is labelled as
          unconfirmed. The full process is in our <Link href="/page/editorial-standards#verification">Editorial Standards</Link>.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI assistance and human review",
    content: (
      <>
        <p>
          Every xSypher article is researched, written and edited by people. AI tools may help organise research, check language mechanics, and
          produce illustrations that are disclosed as AI-generated. They never produce the thesis, the analysis or a verdict; they never stand
          in for fact-checking; and they never write a quote or a patch note.
        </p>
        <p>
          The complete rules, including what we will never put into an AI tool, are in our{" "}
          <Link href="/page/editorial-standards#ai">AI usage ethics</Link>.
        </p>
      </>
    ),
  },
  {
    id: "corrections",
    title: "Corrections protocol",
    content: (
      <>
        <p>
          Anyone can report an error — through the <Link href="/page/corrections">corrections page</Link> or the contact desk — and every report
          gets a human answer within two business days. Material changes made after publication are noted on the story with a date; minor typo
          fixes may not get a note, but substantive edits are never made quietly.
        </p>
        <p>
          Definitions, the full response targets and how retractions work are set out in our{" "}
          <Link href="/page/editorial-standards#corrections">Editorial Standards</Link>.
        </p>
      </>
    ),
  },
  {
    id: "accountability",
    title: "Complaints and accountability",
    content: (
      <p>
        Questions about these rules, or a concern about something we published, go to{" "}
        <a href="mailto:editor@xsypher.com">editor@xsypher.com</a>. Complaints that the desk cannot resolve are reviewed by the Founder &amp; Lead
        Editor, and significant corrections are recorded in the <Link href="/page/transparency">transparency report</Link>.
      </p>
    ),
  },
];

export default function EditorialPolicyPage() {
  return (
    <PolicyLayout
      slug="editorial-policy"
      kicker="Transparency & trust"
      title="Editorial Policy & Ethics"
      summary="Who owns xSypher, how it is funded, and the lines no commercial relationship can cross — the ethics behind every story we publish."
      lastUpdated={LAST_UPDATED}
      lastUpdatedIso={LAST_UPDATED_ISO}
      appliesTo="All xSypher journalism and commercial partnerships"
      highlights={[
        { title: "Independently owned", body: "No venture capital and no corporate parent; funding sources are disclosed in the transparency report." },
        { title: "Coverage is not for sale", body: "No sponsor, advertiser or vendor gets previews, copy approval or a veto." },
        { title: "Paid means labelled", body: "Sponsored and Partner content is marked before the first paragraph, and paid links are tagged." },
        { title: "Conflicts disclosed", body: "Financial and personal interests are declared to the desk — and to readers when they matter." },
      ]}
      sections={sections}
      contact={{ label: "Editorial questions", email: "editor@xsypher.com", note: "Raise a concern about a story or about how these rules are applied." }}
    />
  );
}
