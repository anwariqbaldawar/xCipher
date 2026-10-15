import type { Metadata } from "next";
import Link from "next/link";
import { constructMetadata, siteConfig } from "@/lib/seo";
import PolicyLayout, { type PolicySection } from "@/components/legal/PolicyLayout";
import CookieSettingsButton from "@/components/legal/CookieSettingsButton";

// The inventory below mirrors the code: storage keys from CookieConsent,
// ThemeProvider, the font-size control, useInstantSearch and ViewCounter;
// the session cookie from lib/auth.config.ts; and the consent gate that keeps
// AdSense and Sentry replay off until "Accept". Change the code, change this.

export const metadata: Metadata = constructMetadata({
  title: "Cookie Policy | xSypher",
  description:
    "Every cookie and browser-storage item xSypher uses — strictly necessary, preferences, diagnostics and Google AdSense advertising cookies — with purposes, durations, and how to change your choice at any time.",
  canonical: `${siteConfig.url}/page/cookie-policy`,
});

const LAST_UPDATED = "16 October 2026";
const LAST_UPDATED_ISO = "2026-10-16";

type Row = [name: string, provider: string, purpose: string, duration: string];

function CookieTable({ rows }: { rows: Row[] }) {
  return (
    <div className="policy-table-wrap">
      <table className="policy-table">
        <thead>
          <tr><th>Name</th><th>Provider</th><th>Purpose</th><th>Duration</th></tr>
        </thead>
        <tbody>
          {rows.map(([name, provider, purpose, duration]) => (
            <tr key={name}>
              <td><code>{name}</code></td>
              <td>{provider}</td>
              <td>{purpose}</td>
              <td>{duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const sections: PolicySection[] = [
  {
    id: "what-are-cookies",
    title: "What cookies and browser storage are",
    content: (
      <>
        <p>
          A <strong>cookie</strong> is a small text file a website asks your browser to keep and send back on later visits.{" "}
          <strong>Local storage</strong> and <strong>session storage</strong> are similar browser features, except that what they hold stays
          on your device and is not sent with every request; session storage is cleared when you close the tab.
        </p>
        <p>
          &ldquo;First-party&rdquo; items are set by xsypher.com itself. &ldquo;Third-party&rdquo; cookies are set by another company&rsquo;s
          domain — on this site, only Google&rsquo;s advertising cookies, and only if you allow them.
        </p>
      </>
    ),
  },
  {
    id: "our-approach",
    title: "Our approach: consent first",
    content: (
      <>
        <p>
          When you first visit, a banner asks whether to allow optional cookies. Until you answer, and if you choose Decline, xSypher uses
          only what is <strong>strictly necessary</strong> for the site to work or what <strong>remembers your own settings</strong>.
        </p>
        <p>
          Optional items — <strong>Google AdSense advertising cookies</strong> and <strong>diagnostic session replay</strong> — are switched on
          only after you choose Accept. Before that, the AdSense code is not loaded on our pages at all.
        </p>
        <p>
          We do not use analytics scripts, tracking pixels, social-media &ldquo;like&rdquo; buttons or fingerprinting.
        </p>
      </>
    ),
  },
  {
    id: "strictly-necessary",
    title: "Strictly necessary",
    content: (
      <>
        <p>These are needed for the site to work and to keep it secure, so they do not require consent.</p>
        <CookieTable
          rows={[
            ["xsypher-cookie-consent", "xSypher (local storage)", "Remembers whether you accepted or declined optional cookies, so the banner does not ask on every page.", "Until you clear it or use Cookie settings"],
            ["__Secure-next-auth.session-token", "xSypher", "Keeps writers and editors signed in to the newsroom. Never set for readers.", "Up to 30 days"],
            ["__Host-authjs.csrf-token", "xSypher", "Protects the staff sign-in form against cross-site request forgery. Staff only.", "Browser session"],
            ["__Secure-authjs.callback-url", "xSypher", "Returns a staff member to the right page after signing in. Staff only.", "Browser session"],
            ["__cf_bm", "Cloudflare", "May be set by our network provider to tell people apart from automated traffic and protect the site from bots.", "30 minutes"],
          ]}
        />
      </>
    ),
  },
  {
    id: "preferences",
    title: "Preferences (on your device only)",
    content: (
      <>
        <p>
          These remember choices you make. They live in your browser&rsquo;s storage, are never sent to us and are not used to identify you.
        </p>
        <CookieTable
          rows={[
            ["xsypher-theme", "xSypher (local storage)", "Remembers light or dark mode if you choose one instead of following your device.", "Until you clear it"],
            ["xsypher-fs", "xSypher (local storage)", "Remembers the reading text size you picked.", "Until you clear it"],
            ["xsypher:recent-searches", "xSypher (local storage)", "Shows your last few searches in the search panel, on this device only.", "Until you clear it"],
            ["Article view flag", "xSypher (session storage)", "Stops a reload of the same article in the same tab being counted twice in our view totals.", "Until the tab closes"],
          ]}
        />
      </>
    ),
  },
  {
    id: "diagnostics",
    title: "Diagnostics (optional)",
    content: (
      <>
        <p>
          Only if you accept optional cookies, a small sample of sessions may be recorded by our error-monitoring provider, Sentry, so we can
          see what went wrong when an interaction breaks. All text is masked and all images and media are blocked in these recordings.
        </p>
        <CookieTable
          rows={[
            ["sentryReplaySession", "Sentry (session storage)", "Groups the events of one sampled session so a failure can be reproduced.", "Until the tab closes"],
          ]}
        />
      </>
    ),
  },
  {
    id: "advertising",
    title: "Advertising (optional) — Google AdSense",
    content: (
      <>
        <p>
          xSypher may show ads served by Google AdSense. If — and only if — you accept optional cookies, Google and its partners may set and
          read the cookies below to show ads, including ads based on your visits to this and other websites, to limit how often you see the
          same ad, and to measure performance and prevent fraud.
        </p>
        <CookieTable
          rows={[
            ["IDE", "Google (doubleclick.net)", "The DoubleClick cookie formerly known as the DART cookie: ad personalisation and measurement across sites.", "13 months (EEA/UK), 24 months elsewhere"],
            ["test_cookie", "Google (doubleclick.net)", "Checks whether your browser accepts cookies.", "15 minutes"],
            ["__gads", "Google (xsypher.com)", "Ad delivery, frequency capping and measurement for ads on this site.", "13 months"],
            ["__gpi", "Google (xsypher.com)", "Works with __gads for ad delivery and measurement.", "13 months"],
            ["__eoi", "Google (xsypher.com)", "Security and ad-fraud prevention.", "6 months"],
          ]}
        />
        <p>
          These are the cookies Google documents for AdSense; Google may change their names or lifetimes. Its current list is at{" "}
          <a href="https://policies.google.com/technologies/cookies" rel="noopener noreferrer" target="_blank">policies.google.com/technologies/cookies</a>,
          and how it uses data from sites like ours is explained at{" "}
          <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer" target="_blank">policies.google.com/technologies/partner-sites</a>.
        </p>
      </>
    ),
  },
  {
    id: "embedded-content",
    title: "Embedded content",
    content: (
      <p>
        Videos are embedded in YouTube&rsquo;s privacy-enhanced mode (youtube-nocookie.com): YouTube does not set cookies for your visit until
        you play a video, after which it may store information on your device under Google&rsquo;s own policies. Posts from X are rendered by
        our servers as static content — X&rsquo;s scripts and cookies are not loaded, though images inside a post load from X&rsquo;s servers.
      </p>
    ),
  },
  {
    id: "manage-choices",
    title: "Managing your choices",
    content: (
      <>
        <h3>Change or withdraw consent at any time</h3>
        <p>
          Use the button below to bring the cookie banner back and choose again. If you decline after accepting earlier, ads stop loading
          from your next page view; cookies Google has already set expire on their own schedule or can be deleted in your browser.
        </p>
        <CookieSettingsButton />
        <h3>Opt out of personalised ads</h3>
        <ul>
          <li><a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">Google Ads Settings</a> — turn off ad personalisation by Google.</li>
          <li>
            <a href="https://optout.aboutads.info" rel="noopener noreferrer" target="_blank">aboutads.info</a> (US),{" "}
            <a href="https://www.youronlinechoices.eu" rel="noopener noreferrer" target="_blank">youronlinechoices.eu</a> (EU and UK) and the{" "}
            <a href="https://optout.networkadvertising.org" rel="noopener noreferrer" target="_blank">Network Advertising Initiative</a> — industry opt-outs.
          </li>
        </ul>
        <h3>Use your browser&rsquo;s controls</h3>
        <p>
          Every major browser lets you view, block and delete cookies and site data:{" "}
          <a href="https://support.google.com/chrome/answer/95647" rel="noopener noreferrer" target="_blank">Chrome</a>,{" "}
          <a href="https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox" rel="noopener noreferrer" target="_blank">Firefox</a>,{" "}
          <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" rel="noopener noreferrer" target="_blank">Safari</a> and{" "}
          <a href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" rel="noopener noreferrer" target="_blank">Edge</a>.
          Blocking strictly necessary items does not stop you reading xSypher; it only affects staff sign-in and your saved preferences.
        </p>
        <h3>Do Not Track</h3>
        <p>
          There is no agreed standard for browser &ldquo;Do Not Track&rdquo; signals, so the site does not change behaviour in response to them.
          The consent banner and Cookie settings are how you control optional cookies here.
        </p>
      </>
    ),
  },
  {
    id: "changes-contact",
    title: "Changes and contact",
    content: (
      <p>
        If we add, remove or change a cookie, we update this page and the date at the top. Questions:{" "}
        <a href="mailto:privacy@xsypher.com">privacy@xsypher.com</a>. How we handle personal data more broadly is set out in our{" "}
        <Link href="/page/privacy-policy">Privacy Policy</Link>.
      </p>
    ),
  },
];

export default function CookiePolicyPage() {
  return (
    <PolicyLayout
      slug="cookie-policy"
      kicker="Legal & privacy"
      title="Cookie Policy"
      summary="Every cookie and browser-storage item xSypher uses, who sets it, what it does and how long it lasts — and how to change your choice at any time."
      lastUpdated={LAST_UPDATED}
      lastUpdatedIso={LAST_UPDATED_ISO}
      appliesTo="xsypher.com and its subdomains"
      highlights={[
        { title: "Necessary only, until you choose", body: "Before you answer the banner, the site uses only what it needs to work and to remember your settings." },
        { title: "Optional really is optional", body: "Google AdSense cookies and diagnostic session replay switch on only after you choose Accept." },
        { title: "Change your mind any time", body: "Cookie settings on this page brings the banner back so you can accept or decline again." },
        { title: "No tracking scripts", body: "No analytics scripts, tracking pixels, social widgets or fingerprinting run on xSypher." },
      ]}
      sections={sections}
      contact={{ label: "Cookie questions", email: "privacy@xsypher.com", note: "Ask about any item on this page, or how to remove cookies already set." }}
    />
  );
}
