import React from "react";
import type { Metadata } from "next";
import {
  BarChart3,
  Cookie,
  Info,
  Lock,
  Megaphone,
  RefreshCw,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";
import { PolicyCallout, PolicyCard, PolicyFooter, PolicyHero, PolicyLayout, PolicyTable, type PolicySection } from "@/components/common/PolicyShell";

// ─────────────────────────────────────────────────────────────────────────────
// Cookie Policy
//
// Rewritten for advertising. The previous version advertised the opposite of
// the product: it told readers "we do not use intrusive, cross-site
// third-party advertising trackers", which is (a) not a promise a publication
// running — or intending to run — Google AdSense can keep, and (b) a
// documented AdSense policy problem, because a publisher must disclose the
// third-party vendors and cookies it uses. The claim is gone.
//
// The document now describes what this codebase actually does:
//
//   • the consent gate — components/common/AdUnit.tsx refuses to load the
//     AdSense library or an ad slot until the reader has chosen "Accept"
//     (`xsypher-cookie-consent`, localStorage, `components/common/CookieConsent`)
//   • the session cookies NextAuth sets for sign-in and CSRF
//   • the browser-storage keys the reader controls (theme, consent)
//   • the advertising stack: Google AdSense / DoubleClick, personalised vs
//     non-personalised ad serving, and every published opt-out route (Google Ads
//     Settings, aboutads.info, youronlinechoices.eu, the NAI portal)
//   • durations, purposes and the consent/rights sections GDPR and CCPA
//     require, with the retention table a reviewer looks for.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = constructMetadata({
  title: "Cookie Policy — xSypher",
  description:
    "Every cookie xSypher sets, why it exists and how long it lasts — essential session and security cookies, performance measurement, and the Google AdSense / DoubleClick advertising cookies, with the consent controls and opt-out links that switch them off.",
  canonical: `${siteConfig.url}/page/cookie-policy`,
  image: brandBannerUrl(),
  imageAlt: "xSypher cookie policy",
  type: "website",
});

const SECTIONS: PolicySection[] = [
  { id: "tldr", label: "0. Summary" },
  { id: "what-are-cookies", label: "1. What cookies are" },
  { id: "categories", label: "2. Categories we use" },
  { id: "essential", label: "3. Essential & security" },
  { id: "performance", label: "4. Performance" },
  { id: "advertising", label: "5. Advertising vendors" },
  { id: "personalised", label: "6. Personalised vs non-personalised" },
  { id: "retention", label: "7. Duration & retention" },
  { id: "consent", label: "8. Consent controls" },
  { id: "rights", label: "9. GDPR & CCPA rights" },
  { id: "updates", label: "10. Updates & contact" },
];

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <PolicyHero
        kicker="Legal & Compliance"
        title="Cookie Policy"
        deck="A complete inventory of the cookies and browser-storage keys this site uses, including the advertising cookies served by our third-party vendors, and the controls that turn each category off."
        updated="15 October 2026"
        badges={[
          { label: "Applies to", value: "xsypher.com" },
          { label: "Compliance", value: "GDPR · ePrivacy · CCPA · Google EU user consent policy" },
          { label: "Vendors listed", value: "Google AdSense / DoubleClick" },
        ]}
      />

      <PolicyLayout
        sections={SECTIONS}
        footerNote={
          <>
            <strong className="text-[var(--ink)]">Turn advertising cookies off:</strong> open{" "}
            <a href="https://adssettings.google.com" className="font-semibold text-[var(--accent)] underline">
              Google Ads Settings
            </a>{" "}
            or the AdChoices portal at aboutads.info. Declining in our banner also stops the ad library from loading
            at all on this site.
          </>
        }
      >
        <PolicyCallout title="Summary: what this page says" icon={Info} tone="accent">
          <ul>
            <li>
              <strong>Nothing optional loads before you choose.</strong> Advertising and measurement scripts are held
              back until you select <em>Accept</em>. Choosing <em>Decline</em> is a real outcome, not a nudge — the
              AdSense library is never requested.
            </li>
            <li>
              <strong>Essential cookies</strong> keep you signed in to the editorial console, block cross-site request
              forgery, and serve the site over HTTPS. They cannot be switched off without breaking the site.
            </li>
            <li>
              <strong>Advertising cookies</strong> are set by third-party vendors — principally Google AdSense and
              DoubleClick — and are used to serve, cap and measure advertising, including personalised advertising
              where you have consented to it.
            </li>
            <li>
              <strong>You can opt out independently of us</strong> through Google Ads Settings, aboutads.info or
              youronlinechoices.eu, and you can withdraw consent here at any time from the banner or your browser
              settings.
            </li>
            <li>
              <strong>We never sell your personal data.</strong> Advertising is served through Google&apos;s platforms
              under their publisher agreements; we do not hand your email address or newsletter list to an advertiser.
            </li>
          </ul>
        </PolicyCallout>

        <PolicyCard id="what-are-cookies" title="1. What Exactly Are Cookies?" eyebrow="Section 01" icon={Cookie}>
          <p>
            Cookies are small text files placed on your device when you visit a website. They let a site remember
            state between page loads — that you are signed in, that you prefer the dark theme — and they let
            third-party services recognise a browser in order to measure an audience or serve an advertisement.
          </p>
          <p>
            Cookies set by xSypher itself are <strong>first-party cookies</strong>. Cookies set by companies whose
            services run inside our pages — Google&apos;s advertising and analytics libraries, for example — are{" "}
            <strong>third-party cookies</strong>, and they are governed by that vendor&apos;s own privacy policy as
            well as by this one.
          </p>
          <p>
            We also use browser <strong>local storage</strong>, which is not a cookie: it is never sent to our servers
            with a request, and it is readable only by this site. The two keys we keep there (your theme choice and
            your consent choice) are listed below so this page stays a complete inventory rather than a list of
            cookies that quietly omits everything else.
          </p>
        </PolicyCard>

        <PolicyCard id="categories" title="2. Categories We Use" eyebrow="Section 02" icon={ShieldCheck}>
          <p>Cookies and similar technologies on xSypher fall into three categories, and only the first is exempt from consent:</p>
          <ul>
            <li>
              <strong>Strictly necessary (essential).</strong> Session, authentication and security cookies. Set on
              every visit; no consent required because the site cannot function without them.
            </li>
            <li>
              <strong>Performance and functionality.</strong> First-party measurement of which stories are read, so
              the desk can see what is working. Aggregate, not cross-site, and never used to build an advertising
              profile.
            </li>
            <li>
              <strong>Advertising and third-party vendor cookies.</strong> Set by Google and other permitted vendors
              to serve, sequence, cap and measure advertising — including personalised advertising where consent
              applies. These load only after you accept.
            </li>
          </ul>
        </PolicyCard>

        <PolicyCard id="essential" title="3. Essential & Security Cookies" eyebrow="Always on" icon={Lock}>
          <p>
            These are required to deliver the site securely, to keep a signed-in reader signed in, and to protect
            forms against cross-site request forgery. They contain no advertising identifiers.
          </p>
          <PolicyTable
            caption="Essential cookies and browser storage"
            head={["Name", "Set by", "Purpose", "Duration"]}
            rows={[
              ["authjs.session-token", "xSypher (first party)", "Keeps a registered reader or editor signed in to the console. Signed and encrypted; HttpOnly.", "Session (30 days when \u201cremember me\u201d is used)"],
              ["authjs.csrf-token", "xSypher (first party)", "Cross-site request forgery protection on sign-in and article actions.", "Session"],
              ["authjs.callback-url", "xSypher (first party)", "Returns you to the page you requested after signing in.", "Session"],
              ["xsypher-theme", "xSypher (localStorage)", "Remembers your light/dark theme so the first paint does not flash. Not a cookie — never transmitted.", "Until cleared"],
              ["xsypher-cookie-consent", "xSypher (localStorage)", "Records your Accept/Decline choice so the banner is not shown again and ad scripts stay gated.", "Until cleared"],
            ]}
          />
          <p>
            Sign-in is optional and applies to commenters and editorial staff. A reader who never signs in receives no
            first-party cookie beyond what the edge requires to serve the page.
          </p>
        </PolicyCard>

        <PolicyCard id="performance" title="4. Performance & Measurement" eyebrow="Aggregate only" icon={BarChart3}>
          <p>
            We measure readership to decide what to cover and to spot pages that load badly. Measurement on xSypher is
            deliberately first-party: article views are counted server-side as an aggregate number attached to the
            story, with no reader identifier and no cross-site profile. No third-party analytics product is currently
            loaded on this site.
          </p>
          <p>
            Because that aggregate counting happens on our own infrastructure, it does not create an advertising
            profile and does not follow you to other websites. If a third-party analytics vendor is ever added, it
            will be named in the table below with its cookie names and durations before it goes live — this page is
            updated as part of the change, not after it.
          </p>
          <PolicyTable
            caption="Measurement"
            head={["Mechanism", "Set by", "What it records", "Retention"]}
            rows={[
              ["Server-side view counter", "xSypher (no cookie)", "An incrementing read count per article. No IP address, no device fingerprint, no reader identifier is stored with it.", "Indefinite aggregate (no personal data)"],
              ["Edge request logs", "Cloudflare", "Standard request metadata used for security, abuse prevention and capacity — retained by our edge provider under their policy.", "Short-lived, provider-defined"],
              ["Article preferences", "xSypher (localStorage)", "Reading progress and dismissed banners, stored on your device only.", "Until cleared"],
            ]}
          />
        </PolicyCard>

        <PolicyCard id="advertising" title="5. Advertising & Third-Party Vendors" eyebrow="Consent required" icon={Megaphone} emphasis>
          <p>
            xSypher carries advertising through Google&apos;s publisher platforms, principally <strong>Google AdSense</strong>,
            with ad serving, measurement and fraud protection handled by Google and its demand partners. Advertising
            is what keeps the reporting free to read — and it is also the category of cookies that needs your
            permission, so no advertising script is requested until you accept.
          </p>
          <h3>How the gate works</h3>
          <ul>
            <li>
              On your first visit, no ad library and no ad slot is loaded. The AdSense script tag is not even added to
              the page.
            </li>
            <li>
              If you choose <strong>Accept</strong>, the AdSense library loads and the ad slots on the page request
              creative from Google&apos;s servers, which sets the vendor cookies listed below.
            </li>
            <li>
              If you choose <strong>Decline</strong>, the site continues to work exactly as before, with no
              advertising cookies and no ad requests, and your choice is remembered on your device.
            </li>
          </ul>
          <h3>Vendors and what they set</h3>
          <PolicyTable
            caption="Advertising cookies (set only after consent)"
            head={["Cookie", "Vendor / domain", "Purpose", "Duration"]}
            rows={[
              ["IDE", "Google — doubleclick.net", "Advertising measurement, ad personalisation and fraud prevention across Google's advertising surfaces.", "Up to 13 months (EU/UK: per vendor consent)"],
              ["__gads", "Google — xsypher.com", "Reach and frequency measurement for ads served through Google.", "Up to 13 months"],
              ["__gpi", "Google — xsypher.com", "Ad personalisation and interest signals used by Google's publisher products.", "Up to 13 months"],
              ["test_cookie", "Google — doubleclick.net", "Checks whether your browser accepts cookies so Google can serve consistently.", "15 minutes"],
              ["Google Analytics (_ga, _ga_*)", "Google — xsypher.com", "Not currently enabled. If enabled, used for aggregate traffic measurement under the same consent gate.", "Up to 13 months"],
            ]}
          />
          <p>
            Google may also serve non-personalised advertising in jurisdictions where personalisation is restricted.
            In that mode, cookies are still used for frequency capping, aggregated reporting and fraud protection, but
            not to build an interest-based advertising profile.
          </p>
          <p>
            Advertising partners are disclosed in machine-readable form. We publish an{" "}
            <a href="/ads.txt">ads.txt</a> record at the root of this domain so that buyers can verify which ad
            systems are authorised to sell our inventory — an empty records section means no third party is
            authorised, which is how an impression can be attributed to us rather than to a scraped copy of our
            pages. The file is updated when the vendor list changes.
          </p>
        </PolicyCard>

        <PolicyCard id="personalised" title="6. Personalised vs Non-Personalised Ads" eyebrow="Your choice" icon={Info}>
          <p>
            <strong>Personalised advertising</strong> uses the pages you have visited and the approximate interest
            categories Google infers from them to choose which ad you see. It is what makes a display impression more
            valuable to the advertiser, and it is why it requires consent in the EU/EEA, the UK and Switzerland — and,
            under CCPA/CPRA, an opt-out of &quot;sharing&quot; for targeted advertising in California.
          </p>
          <p>
            <strong>Non-personalised advertising</strong> targets the context of the page instead of the reader: a
            story about SSDs may carry a storage advertisement because the topic is hardware, not because we know what
            you bought last week. It still needs cookies for frequency capping, aggregated reporting and invalid
            traffic detection.
          </p>
          <p>
            You can move between the two outside our site as well, because the choice belongs to your Google account
            rather than to this domain:
          </p>
          <ul>
            <li>
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
                Google Ads Settings
              </a>{" "}
              — turn off personalised ads and reset the advertising identifier Google holds for your browser.
            </li>
            <li>
              <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
                aboutads.info
              </a>{" "}
              — the Digital Advertising Alliance&apos;s opt-out tool, which covers many participating vendors at once.
            </li>
            <li>
              <a href="https://www.youronlinechoices.eu" target="_blank" rel="noopener noreferrer">
                youronlinechoices.eu
              </a>{" "}
              — the EU/UK industry portal for interest-based advertising preferences.
            </li>
            <li>
              <a href="https://optout.networkadvertising.org" target="_blank" rel="noopener noreferrer">
                optout.networkadvertising.org
              </a>{" "}
              — the Network Advertising Initiative opt-out for its member networks.
            </li>
          </ul>
          <p>
            These tools set an opt-out cookie in your browser, so clearing cookies will reset them. We also honour the{" "}
            <strong>Global Privacy Control</strong> (GPC) signal where your browser sends one.
          </p>
        </PolicyCard>

        <PolicyCard id="retention" title="7. Duration & Retention" eyebrow="Section 07" icon={Settings}>
          <p>
            Cookies are either session cookies — deleted when the browser closes — or persistent cookies, which stay
            until the duration below elapses or you clear them. Nothing on this site is retained for longer than its
            stated purpose requires.
          </p>
          <PolicyTable
            caption="Retention summary"
            head={["Category", "Typical duration", "What happens at expiry"]}
            rows={[
              ["Essential session cookies", "Session", "Deleted when the browser closes; a returning reader with \u201cremember me\u201d keeps a signed 30-day session token instead."],
              ["Consent record (local storage)", "Indefinite", "Your Accept/Decline choice persists until you clear site data — which is also what re-shows the banner."],
              ["Theme preference (local storage)", "Indefinite", "Holds your light/dark choice; clearing it returns the site to following your operating system."],
              ["Aggregate view counts", "Indefinite (no personal data)", "A number attached to a story. It is not linked to a reader and cannot be traced back to one."],
              ["Advertising cookies", "15 minutes to 13 months", "Set by the vendor; each expires on its own schedule and can be cleared or blocked from your browser at any time."],
              ["Edge security logs", "Provider-defined, short-lived", "Used to detect abuse and keep the site online, then discarded."],
            ]}
          />
        </PolicyCard>

        <PolicyCard id="consent" title="8. Consent Controls" eyebrow="Section 08" icon={Settings}>
          <p>
            Consent for optional cookies is collected through our own banner on first visit, and it is the gate the
            advertising code respects rather than a notice shown after the fact.
          </p>
          <ul>
            <li>
              <strong>Accept</strong> — allows advertising and measurement cookies. The AdSense library loads on the
              next page view, and ad slots begin requesting creative.
            </li>
            <li>
              <strong>Decline</strong> — denies them. No advertising script is requested for this browser, and the
              site remains fully readable.
            </li>
            <li>
              <strong>Change your mind</strong> — clear this site&apos;s data in your browser (or open the site in a
              private window to see the banner again) and choose differently. Your choice is stored in
              the local key <em>xsypher-cookie-consent</em> on your device only.
            </li>
            <li>
              <strong>Per-vendor control</strong> — because advertising cookies are third-party, you can also block
              them with browser settings, an extension, or the opt-out tools in Section 6, independently of us.
            </li>
          </ul>
          <p>
            Blocking essential cookies will sign you out and disable the editorial console; blocking advertising
            cookies changes what advertising you see but never gates access to an article. We do not operate a
            paywall, and we do not make content conditional on accepting advertising cookies.
          </p>
        </PolicyCard>

        <PolicyCard id="rights" title="9. GDPR & CCPA Rights Over Cookie Data" eyebrow="Section 09" icon={ShieldCheck}>
          <p>
            Where cookie data identifies you (for example a signed-in session), it is personal data and the rights in
            our{" "}
            <a href="/page/privacy-policy">Privacy Policy</a> apply: access, rectification, erasure, restriction,
            portability and objection, plus the right to withdraw consent at any time.
          </p>
          <ul>
            <li>
              <strong>Legal bases.</strong> Essential cookies run on the basis of legitimate interests and the
              necessity of delivering a secure service. Advertising and measurement cookies run on consent.
            </li>
            <li>
              <strong>California (CCPA/CPRA).</strong> We do not sell personal information. You have the right to opt
              out of the sharing of personal information for cross-context behavioural advertising — which you can do
              with the controls in Section 6, our banner, or a GPC signal.
            </li>
            <li>
              <strong>International transfers.</strong> Advertising cookies are processed by Google, whose own terms
              and Standard Contractual Clauses govern the transfer of that data.
            </li>
            <li>
              <strong>Exercising a right.</strong> Write to{" "}
              <a href="mailto:privacy@xsypher.com">privacy@xsypher.com</a>. Requests are answered within 30 days, and
              cookies can be examined directly in your browser&apos;s storage inspector if you want to see exactly
              what is set.
            </li>
          </ul>
        </PolicyCard>

        <PolicyCard id="updates" title="10. Updates & Contact" eyebrow="Section 10" icon={RefreshCw}>
          <p>
            We update this policy whenever the cookies we use change — when an advertising partner is added, when a
            vendor is removed, or when the retention schedule changes. The &ldquo;last updated&rdquo; date at the top
            of this page always reflects the most recent substantive revision, and a change that expands advertising
            or measurement is announced on the page rather than slipped in behind a date bump.
          </p>
          <p>
            Questions about this policy, a data request, or a vendor you believe is setting something that is not
            listed here should go to{" "}
            <a href="mailto:privacy@xsypher.com">privacy@xsypher.com</a> — a listed discrepancy is treated as a bug,
            not as a disagreement about wording.
          </p>
        </PolicyCard>

        <PolicyFooter
          title="Want advertising cookies off entirely?"
          body="Choose Decline in the banner and the AdSense library is never requested on this site. You can also withdraw personalised advertising at Google Ads Settings, aboutads.info or youronlinechoices.eu — those choices apply across every site that uses the same vendors."
          primary={{ href: "mailto:privacy@xsypher.com", label: "Contact the privacy desk", mail: true }}
          secondary={{ href: "/page/privacy-policy", label: "Privacy Policy" }}
        />
      </PolicyLayout>
    </div>
  );
}
