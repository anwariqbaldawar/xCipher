import type { Metadata } from "next";
import Link from "next/link";
import { constructMetadata, siteConfig } from "@/lib/seo";
import PolicyLayout, { type PolicySection } from "@/components/legal/PolicyLayout";
import CookieSettingsButton from "@/components/legal/CookieSettingsButton";

// Every statement here describes what the code actually does — the consent
// gate in components/common/AdUnit.tsx, the stored fields in lib/db/schema.ts,
// the processors the deployment really uses. Change the code, change this.

export const metadata: Metadata = constructMetadata({
  title: "Privacy Policy | xSypher",
  description:
    "How xSypher collects, uses and protects personal data: newsletters, comments, contact messages, Google AdSense advertising cookies, consent, GDPR and CCPA rights, and how to opt out of personalised ads.",
  canonical: `${siteConfig.url}/page/privacy-policy`,
});

const LAST_UPDATED = "16 October 2026";
const LAST_UPDATED_ISO = "2026-10-16";

const sections: PolicySection[] = [
  {
    id: "who-we-are",
    title: "Who we are and what this covers",
    content: (
      <>
        <p>
          xSypher is an independent, founder-led technology publication published by <strong>xSypher Media</strong>, founded and edited by
          Anwar Iqbal Dawar. In this policy, &ldquo;xSypher&rdquo;, &ldquo;we&rdquo; and &ldquo;us&rdquo; mean that publication. For the purposes of
          data-protection law, xSypher Media is the controller of the personal data described below.
        </p>
        <p>
          This policy applies to <strong>xsypher.com</strong> and its subdomains, our email newsletters, and the contact channels listed on this
          site. It does not apply to other websites we link to; they have their own policies.
        </p>
        <p>
          You can read xSypher without creating an account or telling us who you are. Readers do not have accounts: the only accounts on
          this platform belong to our own writers and editors.
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    content: (
      <>
        <h3>Information you give us</h3>
        <ul>
          <li>
            <strong>Newsletter sign-ups:</strong> your email address. We record when you subscribed and where on the site you signed up
            (your consent record), and generate a unique token that powers the one-click unsubscribe link in every email.
          </li>
          <li>
            <strong>Comments:</strong> the display name you choose, your comment, and your email address — which we store only as a
            one-way cryptographic hash, never in readable form. Comments are held for moderation before they appear. A hashed IP address
            and your browser&rsquo;s user-agent string are stored with each comment to fight spam and abuse.
          </li>
          <li>
            <strong>Contact form and email:</strong> your name, email address, the department you chose and your message. The IP address
            and user-agent string of the submission are stored with it so we can handle abuse.
          </li>
          <li>
            <strong>Contributor and staff accounts:</strong> name, email address, role, profile details and security data. Passwords are
            stored only as bcrypt hashes, and two-factor authentication is available.
          </li>
        </ul>
        <h3>Information collected automatically</h3>
        <ul>
          <li>
            <strong>Server and security logs:</strong> IP address, browser and device type, the page requested, the referring page and
            timestamps. We use them to deliver pages, keep the service secure, and investigate faults. IP addresses are also used briefly
            to rate-limit forms against abuse.
          </li>
          <li>
            <strong>Error diagnostics:</strong> when something breaks, our error-monitoring service receives technical details — the
            error, the page address, browser and operating system. If you accept optional cookies, a small sample of sessions (5%) may
            also be recorded to diagnose broken interactions, with all text masked and all images and media blocked.
          </li>
          <li>
            <strong>Reading counts:</strong> article views are counted as a simple total to rank &ldquo;Most Read&rdquo;. No reading
            profile is built and no personal data is attached to a view.
          </li>
          <li>
            <strong>Cookies and browser storage:</strong> described in section 4 and in full in our <Link href="/page/cookie-policy">Cookie Policy</Link>.
          </li>
        </ul>
        <div className="policy-callout">
          <p>
            <strong>What we do not do:</strong> we do not run third-party analytics scripts, tracking pixels or fingerprinting, and we do
            not buy personal data from brokers. Aggregate traffic figures come from our own server and network logs.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use information, and our legal bases",
    content: (
      <>
        <p>
          We use personal data only for the purposes below. Where the EU or UK General Data Protection Regulation (GDPR) applies, each use
          rests on the legal basis shown.
        </p>
        <div className="policy-table-wrap">
          <table className="policy-table">
            <thead>
              <tr><th>Purpose</th><th>Data used</th><th>Legal basis (GDPR)</th></tr>
            </thead>
            <tbody>
              <tr><td>Sending the newsletters you asked for</td><td>Email address, consent record</td><td>Consent (Art. 6(1)(a))</td></tr>
              <tr><td>Publishing and moderating comments</td><td>Display name, comment, hashed email and IP, user agent</td><td>Legitimate interests (Art. 6(1)(f)) in hosting a safe discussion</td></tr>
              <tr><td>Answering messages, tips and correction requests</td><td>Name, email, message, IP, user agent</td><td>Legitimate interests; steps at your request</td></tr>
              <tr><td>Running, securing and debugging the site</td><td>Logs, error reports, rate-limit counters</td><td>Legitimate interests in a secure, working service</td></tr>
              <tr><td>Session replay for diagnostics</td><td>Masked interaction recording</td><td>Consent</td></tr>
              <tr><td>Advertising (Google AdSense)</td><td>Cookies and identifiers set by Google</td><td>Consent</td></tr>
              <tr><td>Meeting legal obligations</td><td>Whatever the obligation requires</td><td>Legal obligation (Art. 6(1)(c))</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          We do not use personal data for automated decision-making that has legal or similarly significant effects on you.
        </p>
      </>
    ),
  },
  {
    id: "advertising",
    title: "Advertising and Google AdSense",
    content: (
      <>
        <p>
          Advertising helps fund independent technology journalism. xSypher may display ads served by <strong>Google AdSense</strong>.
          Ads are selected by Google, not by our editors, and advertisers have no influence over our coverage (see our{" "}
          <Link href="/page/editorial-policy">Editorial Policy &amp; Ethics</Link>).
        </p>
        <h3>Ads load only after you consent</h3>
        <p>
          When you first visit, a banner asks whether to allow optional cookies. <strong>Until you choose &ldquo;Accept&rdquo;, no AdSense
          code is loaded on our pages, so no advertising cookies are set through xSypher.</strong> If you choose &ldquo;Decline&rdquo;, ads
          stay off. We apply this consent-first rule to every visitor, wherever they are, which also covers the consent requirements for
          visitors in the European Economic Area, the United Kingdom and Switzerland.
        </p>
        <h3>How Google uses cookies</h3>
        <ul>
          <li>Third-party vendors, including Google, use cookies to serve ads based on a user&rsquo;s prior visits to this website or other websites.</li>
          <li>
            Google&rsquo;s use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or
            other sites on the Internet.
          </li>
          <li>
            Google&rsquo;s advertising cookies include the DoubleClick cookie long known as the <strong>DART cookie</strong> (today named
            <code>IDE</code>, set on doubleclick.net), alongside cookies such as <code>__gads</code> and <code>__gpi</code>. They are used
            to show ads that are more relevant to you, limit how often you see the same ad, and measure ad performance.
          </li>
          <li>
            Google explains how it uses information from sites that use its services at{" "}
            <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer" target="_blank">policies.google.com/technologies/partner-sites</a>.
          </li>
        </ul>
        <h3>Opting out of personalised advertising</h3>
        <ul>
          <li>
            Use <strong>Cookie settings</strong> below to withdraw consent at any time — ads stop loading on your next page view.
          </li>
          <li>
            Turn off personalised ads from Google in{" "}
            <a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">Google Ads Settings</a>.
          </li>
          <li>
            Opt out of personalised advertising from many participating companies at{" "}
            <a href="https://optout.aboutads.info" rel="noopener noreferrer" target="_blank">aboutads.info</a> (US),{" "}
            <a href="https://www.youronlinechoices.eu" rel="noopener noreferrer" target="_blank">youronlinechoices.eu</a> (EU and UK) or the{" "}
            <a href="https://optout.networkadvertising.org" rel="noopener noreferrer" target="_blank">Network Advertising Initiative</a>.
          </li>
        </ul>
        <CookieSettingsButton />
        <p>
          We do not work with any other ad network. If that changes, this section will name the new partner before its ads appear.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    content: (
      <>
        <p>
          Before you make a choice, xSypher only uses storage that the site needs to work or that remembers your own settings — your
          theme, text size, recent searches and your cookie choice. These stay in your browser and are not used to track you.
        </p>
        <p>
          Optional cookies — Google&rsquo;s advertising cookies and diagnostic session replay — are used only if you accept them. The full
          list, with providers, purposes and durations, is in our <Link href="/page/cookie-policy">Cookie Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share data with",
    content: (
      <>
        <p>
          <strong>We do not sell personal information.</strong> We share it only with service providers who process it on our behalf,
          under contracts that limit them to providing their service:
        </p>
        <div className="policy-table-wrap">
          <table className="policy-table">
            <thead>
              <tr><th>Provider</th><th>What they do for us</th></tr>
            </thead>
            <tbody>
              <tr><td>Our hosting provider</td><td>Runs the servers (a virtual private server) that host the site and its database</td></tr>
              <tr><td>Cloudflare</td><td>DNS, content delivery, protection against attacks and bots, and image storage and delivery</td></tr>
              <tr><td>Resend</td><td>Delivers newsletters and service emails</td></tr>
              <tr><td>Sentry</td><td>Error monitoring and, only with your consent, masked session replay</td></tr>
              <tr><td>Google</td><td>Advertising through AdSense — only if you accept optional cookies</td></tr>
            </tbody>
          </table>
        </div>
        <h3>Embedded content</h3>
        <p>
          Videos are embedded in YouTube&rsquo;s privacy-enhanced mode (youtube-nocookie.com). Posts from X are rendered as static content by
          our own servers, so X&rsquo;s scripts do not run on our pages; images inside those posts load from X&rsquo;s servers.
        </p>
        <h3>Legal and safety disclosures</h3>
        <p>
          We may disclose information where the law requires it, to respond to valid legal process, or to protect the safety of our
          readers, sources or staff. We push back on requests that would expose a confidential source. If xSypher is ever sold or merged,
          personal data would transfer only under this policy, and we would tell you before it is handled differently.
        </p>
      </>
    ),
  },
  {
    id: "international-transfers",
    title: "International transfers",
    content: (
      <p>
        Our providers may process data in countries other than yours, including the United States. Where the GDPR applies, those transfers
        rely on an adequacy decision or the European Commission&rsquo;s Standard Contractual Clauses, which our providers offer as part of
        their data-processing terms.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    content: (
      <ul>
        <li><strong>Newsletter:</strong> until you unsubscribe. We then keep your address marked as unsubscribed, solely so we never email you again; ask us and we will delete it entirely.</li>
        <li><strong>Comments:</strong> for as long as the comment is published, or until you ask us to remove it.</li>
        <li><strong>Contact messages:</strong> as long as needed to deal with your message and keep a reasonable record of it, unless you ask us to delete it sooner and no legal reason requires us to keep it.</li>
        <li><strong>Logs, rate-limit counters and error reports:</strong> for a limited period; rate-limit entries expire automatically.</li>
        <li><strong>Staff accounts:</strong> for the life of the account, then removed or anonymised.</li>
      </ul>
    ),
  },
  {
    id: "security",
    title: "How we protect data",
    content: (
      <>
        <p>
          Connections to xSypher are encrypted with HTTPS. Passwords are stored only as bcrypt hashes; two-factor authentication is
          available; editorial accounts have role-based permissions and sensitive actions are recorded in an audit log.
          Comment email addresses and IP addresses are stored as one-way hashes.
        </p>
        <p>
          No system is perfectly secure. If we learn of a breach that puts your personal data at risk, we will notify you and the relevant
          authorities as the law requires.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your privacy rights (GDPR and CCPA)",
    content: (
      <>
        <h3>EEA, UK and Switzerland</h3>
        <p>
          You have the right to access your data, to correct it, to have it deleted, to restrict or object to how we use it (including an
          absolute right to object to direct marketing), to receive it in a portable format, and to withdraw consent at any time without
          affecting earlier processing. You can also complain to your local data-protection authority.
        </p>
        <h3>California (CCPA, as amended by the CPRA)</h3>
        <ul>
          <li>You can ask to know what personal information we collect, use and disclose, and ask us to delete or correct it.</li>
          <li>
            We do not sell personal information for money. If you accept advertising cookies, Google may use them for personalised
            advertising, which California law can treat as &ldquo;sharing&rdquo;. Choosing Decline — or using Cookie settings to withdraw
            consent — opts you out.
          </li>
          <li>We do not collect sensitive personal information for the purpose of inferring characteristics about you.</li>
          <li>We will not discriminate against you for exercising any of these rights. An authorised agent may act for you.</li>
        </ul>
        <h3>How to make a request</h3>
        <p>
          Email <a href="mailto:privacy@xsypher.com">privacy@xsypher.com</a>. We may ask you to confirm you control the email address
          involved, and we reply within one month (45 days for California requests). Every newsletter also has a one-click unsubscribe link.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    content: (
      <p>
        xSypher is written for adults and is not directed at children under 13 (or under 16 in the EEA and UK). We do not knowingly collect
        their personal data. If you believe a child has given us personal information, email us and we will delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <p>
        When we change this policy, we update the date at the top of this page. If a change materially affects how we use your data, we
        will say so prominently on this page — and email newsletter subscribers — before it takes effect.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <p>
        Questions or requests about privacy: <a href="mailto:privacy@xsypher.com">privacy@xsypher.com</a>. For anything else, use the{" "}
        <Link href="/page/contact">contact desk</Link>.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      slug="privacy-policy"
      kicker="Legal & privacy"
      title="Privacy Policy"
      summary="What personal data xSypher handles, why, who processes it for us, how advertising cookies work on this site, and the rights you have over all of it — written to match exactly what our systems do."
      lastUpdated={LAST_UPDATED}
      lastUpdatedIso={LAST_UPDATED_ISO}
      appliesTo="xsypher.com, newsletters and contact channels"
      highlights={[
        { title: "No reader accounts", body: "You can read everything without signing up. We only process what the site and the services you choose need." },
        { title: "We do not sell your data", body: "Personal information is shared only with the service providers who run the site for us." },
        { title: "Ads only with consent", body: "Google AdSense and its cookies load only after you choose Accept — and you can change your mind at any time." },
        { title: "Your rights, one email away", body: "Access, correct, delete or export your data by writing to privacy@xsypher.com." },
      ]}
      sections={sections}
      contact={{ label: "Privacy questions", email: "privacy@xsypher.com", note: "Requests to access, correct or delete your data are answered within one month." }}
    />
  );
}
