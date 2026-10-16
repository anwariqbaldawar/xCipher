import { Info, Cookie, ShieldCheck, BarChart3, Settings, RefreshCw, Megaphone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { brandBannerUrl, constructMetadata, siteConfig } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Cookie Policy — xSypher',
  description:
    'Every cookie and similar technology xSypher uses: essential and security cookies, analytics, and the Google AdSense and third-party advertising cookies that fund the publication, with direct opt-out instructions.',
  canonical: `${siteConfig.url}/page/cookie-policy`,
  image: brandBannerUrl(),
  imageAlt: 'xSypher cookie policy',
});

/**
 * Cookie Policy
 *
 * Two constraints shape this page:
 *
 *   1. It must describe what the code actually does. The essentials below are
 *      the storage keys and vendors that exist in this repository
 *      (`xsypher-theme`, `xsypher-cookie-consent`, the consent-gated AdSense
 *      script in components/common/AdUnit.tsx, the consent-gated Sentry client
 *      in instrumentation-client.ts). Nothing is described that the code does
 *      not do.
 *   2. It must be honest about advertising. An earlier revision claimed the
 *      site ran no ad-network cookies. That claim was both untrue the moment
 *      AdSense is enabled and incompatible with it, and a policy that
 *      contradicts the page it sits beside is worse than no disclosure at all.
 *      Google's advertising cookies — including DoubleClick/DART — are now
 *      disclosed in full, with opt-out links.
 */
export default function CookiePolicyPage() {
  return (
    <div className="bg-[var(--surface)] min-h-screen">
      {/* HEADER HERO */}
      <header className="border-b border-[var(--line)] bg-[var(--surface-2)]">
        <div className="max-w-7xl mx-auto px-4 pt-32 pb-16 sm:pt-40 sm:px-8 lg:pt-44 lg:px-12">
          <div className="max-w-3xl">
            <span className="text-[var(--accent)] font-bold text-xs uppercase tracking-widest mb-3 block">
              Legal &amp; Compliance
            </span>
            <h1 className="font-[family:var(--f-display)] text-4xl sm:text-5xl font-bold mb-4 text-[var(--ink)] tracking-tight">
              Cookie Policy
            </h1>
            <p className="font-[family:var(--f-body)] text-lg text-[var(--muted)] leading-relaxed">
              Transparency is our default. This policy explains how and why we use cookies and similar tracking technologies — including the advertising cookies Google uses to fund independent technology journalism.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--faint)]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
              Last Updated: October 16, 2026
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-8 lg:px-12 flex flex-col lg:flex-row gap-12">

        {/* SIDEBAR NAVIGATION (Sticky on Desktop) */}
        <aside className="lg:w-1/4 hidden lg:block shrink-0">
          <div className="sticky top-32">
            <h4 className="font-[family:var(--f-display)] font-bold text-sm text-[var(--ink)] uppercase tracking-wider mb-4 border-b border-[var(--line)] pb-2">
              Table of Contents
            </h4>
            <nav className="flex flex-col font-[family:var(--f-ui)] text-sm border-l-2 border-[var(--line-2)]">
              <a href="#tldr" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">0. TL;DR Summary</a>
              <a href="#what-are-cookies" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">1. What Exactly Are Cookies?</a>
              <a href="#types-of-cookies" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">2. Types of Cookies We Use</a>
              <a href="#advertising" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">3. Google AdSense &amp; Advertising</a>
              <a href="#analytics" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">4. Analytics &amp; Error Monitoring</a>
              <a href="#manage-preferences" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">5. Managing Your Preferences</a>
              <a href="#retention" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">6. Retention Periods</a>
              <a href="#consent" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">7. Consent (GDPR &amp; CCPA)</a>
              <a href="#updates" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">8. Policy Updates &amp; Contact</a>
            </nav>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <article className="lg:w-3/4 max-w-3xl text-[var(--ink)] space-y-12">

          {/* TL;DR BOX */}
          <section id="tldr" className="scroll-mt-28 bg-[var(--surface-2)] border border-[var(--line)] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="p-3 bg-[var(--surface)] rounded-xl text-[var(--accent)] shadow-sm shrink-0">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-[family:var(--f-display)] font-bold text-[var(--ink)] text-xl mb-3">TL;DR: The Short Version</h3>
                <ul className="list-none space-y-3 font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--muted)] leading-relaxed"><strong>Essential and security cookies</strong> keep the site working — session integrity, abuse prevention, CSRF protection and your light/dark preference. These cannot be switched off.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--muted)] leading-relaxed"><strong>Analytics and error monitoring</strong> are first-party and aggregate: we count page views in our own database and receive crash reports, with user-identifying data collection disabled.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--muted)] leading-relaxed"><strong>Advertising cookies come from Google.</strong> xSypher is funded in part by display advertising served through <strong>Google AdSense</strong>. Google and its partners use cookies — including the DoubleClick/DART cookie — to serve, measure and (where you consent) personalise ads based on your visits to this and other websites.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--muted)] leading-relaxed"><strong>No ads load until you accept.</strong> Until you choose “Accept” in our consent banner, the AdSense script is never injected and no ad cookie is written. You can change your mind at any time.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--muted)] leading-relaxed">You retain full control: opt out of personalised advertising at <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Google Ad Settings</a> or <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">aboutads.info</a>, and clear or block non-essential cookies in your browser.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION 1 */}
          <section id="what-are-cookies" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <Cookie className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                1. What Exactly Are Cookies?
              </h2>
            </div>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-[var(--muted)] font-[family:var(--f-body)]">
              <p className="mb-4">
                Cookies are small text files placed on your computer, smartphone or other device when you visit a website. They are widely used to make websites work, to make them work more efficiently, and to provide reporting information to the people running them.
              </p>
              <p className="mb-4">
                Cookies set by the website owner (in this case, xSypher) are called “first-party cookies”. Cookies set by parties other than the website owner are called “third-party cookies”. We use both, and we also use two related browser-storage mechanisms:
              </p>
              <ul className="list-disc pl-5 mb-4 space-y-2">
                <li><strong>Local storage</strong> — used for preferences that never need to travel to our servers, such as your selected reading theme (<code>xsypher-theme</code>) and your cookie choice itself (<code>xsypher-cookie-consent</code>).</li>
                <li><strong>Cookie-less identifiers in server logs</strong> — when you load a page, our edge infrastructure processes your IP address and user agent transiently to deliver the request and protect the service from abuse. Comment submissions store a <em>SHA-256 hash</em> of that IP and of your email address, never the raw values.</li>
              </ul>
              <p className="mb-4">
                Cookies can be “session” cookies, which are deleted when you close your browser, or “persistent” cookies, which remain for a defined period. Both types are described below.
              </p>
            </div>
          </section>

          {/* SECTION 2 */}
          <section id="types-of-cookies" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <ShieldCheck className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                2. Types of Cookies We Use
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-6">
              <p>
                Each category below serves a distinct purpose. Only the first is strictly necessary; everything else is your choice.
              </p>

              <div className="p-5 border border-l-4 border-[var(--line)] border-l-[var(--accent)] rounded-r-xl bg-[var(--surface-2)]">
                <h4 className="font-bold text-[var(--ink)] mb-2 flex items-center gap-2">
                  Essential / Strictly Necessary Cookies
                </h4>
                <p className="text-sm mb-3">These are required for xSypher to function correctly and securely. They are set on the basis of our legitimate interest in operating a safe, working publication, and they cannot be disabled through our banner.</p>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  <li><strong>Security &amp; abuse prevention:</strong> challenge and rate-limiting cookies that protect the site from automated abuse, credential stuffing and denial-of-service traffic.</li>
                  <li><strong>CSRF protection:</strong> a session cookie that ensures a form submission genuinely came from your browser, not a third-party page.</li>
                  <li><strong>Staff authentication:</strong> our newsroom console (admin.xsypher.com) uses a signed, HTTP-only session cookie to keep authorised editors logged in. Readers do not need an account to read xSypher, so no account cookie is set for ordinary visits.</li>
                  <li><strong>Consent record:</strong> we store your cookie choice, with a timestamp, so we do not ask again on every page.</li>
                </ul>
              </div>

              <div className="p-5 border border-l-4 border-[var(--line)] border-l-[var(--accent)] rounded-r-xl bg-[var(--surface-2)]">
                <h4 className="font-bold text-[var(--ink)] mb-2 flex items-center gap-2">
                  Preference &amp; Functionality Storage
                </h4>
                <p className="text-sm mb-3">Non-essential, local to your browser, and never transmitted to us as an identity.</p>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  <li><strong>Theme (<code>xsypher-theme</code>):</strong> remembers whether you read xSypher in light or dark mode so the page does not flash on load.</li>
                  <li><strong>Search history (<code>xsypher:search:*</code>):</strong> recent search terms shown in the live search overlay. Clearing your browser storage removes them permanently.</li>
                  <li><strong>Interface state:</strong> whether you dismissed the newsletter prompt or a one-time notice, so it is not shown again.</li>
                </ul>
              </div>

              <div className="p-5 border border-l-4 border-[var(--line)] border-l-[var(--accent)] rounded-r-xl bg-[var(--surface-2)]">
                <h4 className="font-bold text-[var(--ink)] mb-2 flex items-center gap-2">
                  Analytics, Performance &amp; Error Monitoring
                </h4>
                <p className="text-sm mb-3">Aggregate measurement of what is read, how fast pages load, and whether something breaks.</p>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  <li><strong>First-party view counts:</strong> a page-view counter stored in our own PostgreSQL database. There is no cross-site identifier and no advertising profile attached to it.</li>
                  <li><strong>Edge performance metrics:</strong> Cloudflare, our CDN and edge-compute provider, records request-level performance and security telemetry at the edge as part of delivering the site.</li>
                  <li><strong>Error monitoring (consent-gated):</strong> when you accept optional cookies, Sentry receives crash and performance reports. Session Replay is configured to mask all text and block all media, and user-identifying data collection is disabled. Decline and no client-side monitoring is initialised at all.</li>
                </ul>
              </div>

              <div className="p-5 border border-l-4 border-[var(--line)] border-l-[var(--accent)] rounded-r-xl bg-[var(--surface-2)]">
                <h4 className="font-bold text-[var(--ink)] mb-2 flex items-center gap-2">
                  Advertising Cookies (Third-Party)
                </h4>
                <p className="text-sm mb-3">Set only after you accept, and only by our advertising partner, Google.</p>
                <ul className="text-sm list-disc pl-5 space-y-1">
                  <li><strong>Google AdSense:</strong> serves the display advertising that keeps xSypher free to read.</li>
                  <li><strong>DoubleClick / DART:</strong> Google&apos;s advertising cookie, which enables frequency capping, fraud prevention and interest-based advertising across sites.</li>
                  <li><strong>Measurement cookies:</strong> used to count impressions and prevent invalid traffic.</li>
                </ul>
                <p className="text-sm mt-3">
                  Full detail, including how to opt out, is in <a href="#advertising" className="text-[var(--accent)] font-semibold hover:underline">section 3</a>.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 3 */}
          <section id="advertising" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <Megaphone className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                3. Google AdSense &amp; Third-Party Advertising
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                Independent technology journalism is funded by readers and by advertising. xSypher serves display advertising through <strong>Google AdSense</strong> and may work with additional third-party advertising partners, including demand-side platforms buying inventory through Google&apos;s ad exchange.
              </p>
              <p>
                <strong>Google&apos;s use of advertising cookies.</strong> Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website and other websites on the internet. Google&apos;s use of advertising cookies — most notably the <strong>DoubleClick cookie (also referred to as the DART cookie)</strong> — enables it and its partners to serve personalised advertisements to you based on your visits to xsypher.com and/or other sites across the internet. You can read Google&apos;s own explanation at{' '}
                <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">policies.google.com/technologies/ads</a>.
              </p>
              <p>
                <strong>Personalised and non-personalised ads.</strong> Where consent has been granted through our banner or Google&apos;s consent framework, ads may be personalised. Where consent is declined or unavailable, ads are served in a non-personalised mode: Google still uses cookies for frequency capping, aggregated ad reporting and fraud prevention, but not to build an advertising profile across sites. Which mode applies is also recorded in your Google Ad Settings.
              </p>
              <div className="p-5 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl space-y-3">
                <h4 className="font-bold text-[var(--ink)] text-sm">How to opt out of personalised advertising</h4>
                <ul className="text-sm list-disc pl-5 space-y-2">
                  <li>
                    <strong>Google Ad Settings</strong> — turn off personalised ads, or opt out of personalised advertising from third-party vendors, at{' '}
                    <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">adssettings.google.com</a>.
                  </li>
                  <li>
                    <strong>aboutads.info</strong> — the Digital Advertising Alliance&apos;s consumer choice tool, at{' '}
                    <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">aboutads.info/choices</a>, covering participating vendors.
                  </li>
                  <li>
                    <strong>Your Online Choices (EU/UK)</strong> — the EDAA&apos;s equivalent tool, at{' '}
                    <a href="https://www.youronlinechoices.eu" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">youronlinechoices.eu</a>.
                  </li>
                  <li>
                    <strong>On this site</strong> — choosing “Decline” in our cookie banner prevents the AdSense script from loading at all, so no advertising cookie is set.
                  </li>
                </ul>
              </div>
              <p>
                Opting out of personalised advertising does not reduce the number of ads you see; it means the ads are selected without an interest profile. xSypher does not sell your personal information, and we do not append email lists or reader identifiers to advertising audiences.
              </p>
            </div>
          </section>

          {/* SECTION 4 */}
          <section id="analytics" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <BarChart3 className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                4. Analytics &amp; Error Monitoring
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                We measure readership to decide what to commission, not to profile individuals. Page views are counted in our own database by article, with no per-reader identifier stored — the same article read twice by the same person increments the same public counter.
              </p>
              <p>
                We do not run Google Analytics, and we do not licence cross-site behavioural data. When optional cookies are accepted we additionally receive anonymous crash reports and performance timings so that a broken layout on an unusual device becomes a bug report instead of an invisible failure. Those reports never include the content you type into a comment or newsletter field.
              </p>
              <p>
                Newsletter subscriptions are handled by our email provider, Resend, and stored in our database. Comments are stored with a hashed email address only. Neither is used for advertising.
              </p>
              <div className="p-5 border border-l-4 border-[var(--line)] border-l-[var(--muted)] rounded-r-xl bg-[var(--surface-2)]">
                <p className="text-sm">
                  In short: the only third-party code on this site capable of tracking you across other websites is Google&apos;s advertising stack — and it does not load until you press <strong>Accept</strong> on the consent banner.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 5 */}
          <section id="manage-preferences" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <Settings className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                5. Managing Your Preferences
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                You have the right to decide whether to accept or reject non-essential cookies, and to change that decision later. You can set or amend your web browser controls to accept, refuse or delete cookies entirely.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl">
                  <h4 className="font-bold text-[var(--ink)] mb-1 text-sm">Our consent banner</h4>
                  <p className="text-xs">Choose “Decline” to keep every optional category — analytics, monitoring and advertising — switched off. Your choice is stored locally and applies immediately.</p>
                </div>
                <div className="p-4 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl">
                  <h4 className="font-bold text-[var(--ink)] mb-1 text-sm">Browser settings</h4>
                  <p className="text-xs">Every major browser (Chrome, Firefox, Safari, Edge) can clear existing cookies and block future ones, either globally or per-site.</p>
                </div>
                <div className="p-4 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl">
                  <h4 className="font-bold text-[var(--ink)] mb-1 text-sm">Advertising opt-outs</h4>
                  <p className="text-xs">Manage or disable personalised advertising through <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Google Ad Settings</a> and <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">aboutads.info</a>.</p>
                </div>
                <div className="p-4 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl">
                  <h4 className="font-bold text-[var(--ink)] mb-1 text-sm">Important note</h4>
                  <p className="text-xs">Rejecting essential cookies is not possible through the banner, and blocking them in the browser may break login, form submission and theme persistence.</p>
                </div>
              </div>
              <p className="mt-4">
                For general guidance on managing and deleting cookies, visit <a href="https://aboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">aboutcookies.org</a> or <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">allaboutcookies.org</a>.
              </p>
            </div>
          </section>

          {/* SECTION 6 */}
          <section id="retention" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <ShieldCheck className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                6. Retention Periods
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>Nothing is kept longer than it is needed for the purpose it was set:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-[var(--line)] rounded-xl overflow-hidden">
                  <thead className="bg-[var(--surface-2)] text-[var(--ink)]">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Category</th>
                      <th className="text-left px-4 py-3 font-semibold">Typical lifetime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    <tr><td className="px-4 py-3">Staff session cookie</td><td className="px-4 py-3">Session; expires on logout or after 30 days of inactivity</td></tr>
                    <tr><td className="px-4 py-3">Security &amp; rate-limiting cookies</td><td className="px-4 py-3">Minutes to 24 hours</td></tr>
                    <tr><td className="px-4 py-3">Consent record</td><td className="px-4 py-3">Until you clear it, plus 12 months for audit purposes</td></tr>
                    <tr><td className="px-4 py-3">Theme &amp; interface preferences</td><td className="px-4 py-3">Until you clear browser storage</td></tr>
                    <tr><td className="px-4 py-3">Aggregate view counters</td><td className="px-4 py-3">Retained indefinitely as non-personal statistics</td></tr>
                    <tr><td className="px-4 py-3">Google advertising cookies</td><td className="px-4 py-3">Set by Google; see Google&apos;s cookie documentation for current durations</td></tr>
                  </tbody>
                </table>
              </div>
              <p>
                Comment submissions retain a hashed email and hashed IP for moderation and abuse prevention for as long as the comment is published.
              </p>
            </div>
          </section>

          {/* SECTION 7 */}
          <section id="consent" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <Cookie className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                7. Consent Management (GDPR &amp; CCPA/CPRA)
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                For readers in the European Economic Area, the United Kingdom and Switzerland, non-essential cookies are only set on the basis of your consent, which you may withdraw at any time through the banner or by clearing your browser storage. Essential cookies are processed under the legitimate-interest basis described above.
              </p>
              <p>
                For readers in California, we do not sell or share personal information in the sense defined by the CCPA/CPRA for monetary value. Where an advertising partner&apos;s cookie could constitute “sharing” for cross-context behavioural advertising, it is only loaded after you affirmatively accept, and you can opt out at any time via Google Ad Settings or by declining the banner. You will never receive a degraded experience for opting out.
              </p>
              <p>
                Requests relating to access, deletion or correction of your data are handled under our <Link href="/page/privacy-policy" className="text-[var(--accent)] hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          </section>

          {/* SECTION 8 */}
          <section id="updates" className="scroll-mt-28 pb-12">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <RefreshCw className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                8. Policy Updates &amp; Contact
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                We may update this Cookie Policy to reflect changes to the cookies we use or for other operational, legal or regulatory reasons. Material changes are reflected in the “Last Updated” date at the top of this page; we do not silently rewrite it.
              </p>
              <p>
                If you have any questions about our use of cookies or other technologies, email our team at <a href="mailto:privacy@xsypher.com" className="text-[var(--accent)] hover:underline font-semibold">privacy@xsypher.com</a>.
              </p>
            </div>
          </section>

        </article>
      </div>
    </div>
  );
}
