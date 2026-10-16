import { Info, Shield, Lock, FileText, Globe, Server, Megaphone, Clock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { brandBannerUrl, constructMetadata, siteConfig } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Privacy Policy — xSypher',
  description:
    'What xSypher collects and why: newsletter subscriptions, comments and aggregate analytics, Cloudflare edge and R2 storage security, Google AdSense and third-party advertising partners, retention periods, and your GDPR / CCPA / CPRA rights.',
  canonical: `${siteConfig.url}/page/privacy-policy`,
  image: brandBannerUrl(),
  imageAlt: 'xSypher privacy policy',
});

/**
 * Privacy Policy
 *
 * Note on routes: the canonical URL is /page/privacy-policy. The shorter
 * /page/privacy is served by a permanent redirect in next.config.ts rather than
 * a second page, so there is exactly one policy — two copies of a privacy
 * policy that drift apart is a compliance problem, not a convenience.
 *
 * Note on accuracy: every disclosure below corresponds to something this
 * codebase actually does — newsletter addresses to the subscriber table,
 * comments with SHA-256 hashed email/IP (app/actions/comments.ts), first-party
 * view counters, consent-gated AdSense (components/common/AdUnit.tsx) and
 * consent-gated error monitoring (instrumentation-client.ts).
 */
export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>
            <p className="font-[family:var(--f-body)] text-lg text-[var(--muted)] leading-relaxed">
              We believe in digital transparency. This policy explains exactly what we collect, where it is stored, how long we keep it, and the rights you can exercise over it.
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
              <a href="#information-collection" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">1. Information We Collect</a>
              <a href="#how-we-use" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">2. How We Use Your Data</a>
              <a href="#infrastructure" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">3. Cloudflare &amp; R2 Infrastructure</a>
              <a href="#advertising" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">4. Google AdSense &amp; Ad Partners</a>
              <a href="#cookies" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">5. Cookies &amp; Tracking</a>
              <a href="#retention" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">6. Data Retention</a>
              <a href="#your-rights" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">7. Your Privacy Rights</a>
              <a href="#security" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">8. Data Security</a>
              <a href="#contact" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">9. Contact Information</a>
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
                    <span className="text-[var(--muted)] leading-relaxed">We collect the minimum a publication needs: a <strong>newsletter email address</strong> if you subscribe, a <strong>display name plus hashed email/IP</strong> if you comment, and <strong>aggregate page-view counts</strong> for editorial planning.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--muted)] leading-relaxed"><strong>We do not sell your personal data.</strong> We do not append reader identifiers to advertising audiences, and we do not run third-party behavioural analytics.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--muted)] leading-relaxed">Advertising is served by <strong>Google AdSense</strong>, which may set advertising cookies — only after you accept our consent banner. Opt out of personalisation any time at <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Google Ad Settings</a>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--muted)] leading-relaxed">Content is served from <strong>Cloudflare&apos;s edge network</strong> and stored in <strong>Cloudflare R2</strong>; structured data lives in our own PostgreSQL database with TLS in transit.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--muted)] leading-relaxed">Newsletter emails are strictly opt-in with one-click unsubscribe, and you can request access, correction or deletion of your data at any time via <a href="mailto:privacy@xsypher.com" className="text-[var(--accent)] hover:underline">privacy@xsypher.com</a>.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION 1 */}
          <section id="information-collection" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <FileText className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                1. Information We Collect
              </h2>
            </div>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-[var(--muted)] font-[family:var(--f-body)]">
              <h3 className="text-[var(--ink)] font-bold text-lg mt-6 mb-3">A. Information You Provide</h3>
              <ul className="list-disc pl-5 mb-4 space-y-1">
                <li><strong>Newsletter subscription:</strong> the email address you enter in a newsletter form, plus the date and source of the subscription. Nothing else is required.</li>
                <li><strong>Comments:</strong> the display name you choose, the comment text, and your email address — which is <strong>immediately converted to a SHA-256 hash</strong> and stored only in that form. The raw address is never written to our database and is never published. A hash of your IP address and your browser&apos;s user-agent string are stored alongside the comment for moderation and abuse prevention.</li>
                <li><strong>Correspondence:</strong> whatever you send us when you contact the desk, report a correction, or apply for a role. Tips are handled under the sourcing rules in our <Link href="/page/editorial-standards" className="text-[var(--accent)] hover:underline">Editorial Standards</Link>.</li>
              </ul>

              <h3 className="text-[var(--ink)] font-bold text-lg mt-6 mb-3">B. Information Collected Automatically</h3>
              <ul className="list-disc pl-5 mb-4 space-y-1">
                <li><strong>Page-view counts:</strong> an incrementing counter per article, stored in our own database. It is not tied to a reader identifier, so the same person reading twice produces the same aggregate number as one person reading twice.</li>
                <li><strong>Request metadata:</strong> our edge infrastructure processes your IP address, user agent and requested URL transiently in order to deliver the page, apply rate limits and block abusive traffic. Standard edge logs are retained briefly for security purposes.</li>
                <li><strong>Consent state:</strong> your cookie choice is stored in your browser, with a timestamp, so we can honour it and demonstrate it.</li>
                <li><strong>Diagnostics (only with consent):</strong> anonymous crash reports and performance timings. User-identifying data collection is disabled, and session replay — when it runs at all — masks all text and blocks all media.</li>
              </ul>

              <h3 className="text-[var(--ink)] font-bold text-lg mt-6 mb-3">C. Information From Third Parties</h3>
              <ul className="list-disc pl-5 mb-4 space-y-1">
                <li><strong>Email delivery data:</strong> our email provider reports whether a newsletter was delivered, opened or bounced, so we can remove dead addresses and prove that unsubscribe requests were honoured.</li>
                <li><strong>Advertising measurement:</strong> our advertising partner reports aggregate impression and revenue figures. We do not receive, and do not ask for, individual reader profiles.</li>
              </ul>
              <p className="mb-4">
                We do not knowingly collect data from children under 13, and we do not create accounts for casual readers.
              </p>
            </div>
          </section>

          {/* SECTION 2 */}
          <section id="how-we-use" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <Shield className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                2. How We Use Your Data
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                The data we gather is used to deliver, maintain and improve xSypher. We rely on your consent for optional categories, on the performance of a contract for newsletter delivery, and on our legitimate interest in keeping the platform secure and understood.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="p-5 border border-[var(--line)] rounded-xl bg-[var(--surface-2)]">
                  <h4 className="font-bold text-[var(--ink)] mb-2">Service Delivery</h4>
                  <p className="text-sm">To send the newsletters you asked for, publish and moderate comments, and answer messages sent to the desk.</p>
                </div>
                <div className="p-5 border border-[var(--line)] rounded-xl bg-[var(--surface-2)]">
                  <h4 className="font-bold text-[var(--ink)] mb-2">Platform Security</h4>
                  <p className="text-sm">To detect malicious activity, mitigate denial-of-service traffic, prevent comment spam and enforce our Terms of Use.</p>
                </div>
                <div className="p-5 border border-[var(--line)] rounded-xl bg-[var(--surface-2)]">
                  <h4 className="font-bold text-[var(--ink)] mb-2">Editorial Analytics</h4>
                  <p className="text-sm">To see which topics readers actually read, so we know what to cover in more depth and what to stop commissioning.</p>
                </div>
                <div className="p-5 border border-[var(--line)] rounded-xl bg-[var(--surface-2)]">
                  <h4 className="font-bold text-[var(--ink)] mb-2">Advertising</h4>
                  <p className="text-sm">To fund the publication. Ad serving is consent-gated and handled by Google; we do not build reader profiles of our own.</p>
                </div>
              </div>
              <p className="mt-4">
                <strong>We do not sell, rent or trade your personal information.</strong> We share data with processors only where they perform a service for us under a data-processing agreement — our database and edge-compute provider, our email provider, our advertising partner and our error-monitoring provider. We may also disclose information where legally compelled to do so, and we will tell readers when we are permitted to.
              </p>
            </div>
          </section>

          {/* SECTION 3 */}
          <section id="infrastructure" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <Server className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                3. Cloudflare &amp; R2 Edge Infrastructure
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                xSypher is served through <strong>Cloudflare&apos;s edge network</strong>. Cloudflare terminates TLS, caches static assets, applies web-application-firewall rules and absorbs volumetric attacks before traffic reaches our application. In doing so it processes IP addresses, user agents, TLS fingerprints and request URLs on our behalf as a data processor, and it is bound by its own data-processing terms.
              </p>
              <p>
                Article bodies and editor documents are stored in <strong>Cloudflare R2</strong> object storage, while structured metadata — titles, bylines, taxonomy, comments, subscribers — lives in our <strong>PostgreSQL</strong> database. Both are encrypted in transit; R2 objects are served over HTTPS only and are not publicly listable.
              </p>
              <p>
                Because Cloudflare operates a global anycast network, a request from your device may be served by an edge location in your own region rather than by an origin server elsewhere. That is a latency and resilience benefit, and it also means fewer copies of your request travel across the internet than they would with a single-region host.
              </p>
            </div>
          </section>

          {/* SECTION 4 */}
          <section id="advertising" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <Megaphone className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                4. Google AdSense &amp; Third-Party Ad Partners
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                xSypher is supported by display advertising served through <strong>Google AdSense</strong>, and may work with additional third-party advertising partners. Advertising is what allows the reporting, reviews and benchmarks on this site to remain free to read, and it is kept clearly separate from editorial judgement.
              </p>
              <p>
                Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website and other websites. Google&apos;s use of advertising cookies — including the <strong>DoubleClick/DART cookie</strong> — enables it and its partners to serve personalised advertisements based on your visits to xsypher.com and other sites on the internet.
              </p>
              <p>
                You can control this: visit <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Google Ad Settings</a> to opt out of personalised advertising, or <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">aboutads.info</a> to opt out with participating vendors. Our <Link href="/page/cookie-policy" className="text-[var(--accent)] hover:underline">Cookie Policy</Link> lists every advertising cookie and its opt-out in full.
              </p>
              <p>
                <strong>What we never do:</strong> sell your email address, share newsletter lists with advertisers, expose commenter identities to partners, or embed advertising pixels that load before you have made a consent choice.
              </p>
            </div>
          </section>

          {/* SECTION 5 */}
          <section id="cookies" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <Lock className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                5. Cookies &amp; Tracking Disclosures
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                We use essential cookies for security and session integrity, browser storage for your theme and consent preferences, first-party counters for aggregate readership measurement, and — only with your consent — Google advertising cookies.
              </p>
              <p>
                There is no third-party behavioural analytics service on this site, and no cross-site tracking by us. The complete inventory, including retention periods and step-by-step opt-out instructions, is maintained in our <Link href="/page/cookie-policy" className="text-[var(--accent)] hover:underline font-semibold">Cookie Policy</Link>.
              </p>
            </div>
          </section>

          {/* SECTION 6 */}
          <section id="retention" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <Clock className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                6. Data Retention
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                We keep personal information only for as long as it serves the purpose it was collected for, unless a longer period is required by law:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-[var(--line)] rounded-xl overflow-hidden">
                  <thead className="bg-[var(--surface-2)] text-[var(--ink)]">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Data</th>
                      <th className="text-left px-4 py-3 font-semibold">Retention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    <tr><td className="px-4 py-3">Newsletter email address</td><td className="px-4 py-3">Until you unsubscribe, then removed from active lists and suppressed for 24 months to honour the opt-out</td></tr>
                    <tr><td className="px-4 py-3">Comment content &amp; display name</td><td className="px-4 py-3">For as long as the article and comment remain published</td></tr>
                    <tr><td className="px-4 py-3">Comment email/IP hashes</td><td className="px-4 py-3">Retained for moderation and abuse prevention while the comment exists; deleted with it</td></tr>
                    <tr><td className="px-4 py-3">Edge security logs</td><td className="px-4 py-3">Short-lived (typically days), then rotated</td></tr>
                    <tr><td className="px-4 py-3">Consent records</td><td className="px-4 py-3">Until you clear them, plus 12 months for audit</td></tr>
                    <tr><td className="px-4 py-3">Aggregate view statistics</td><td className="px-4 py-3">Indefinite — these contain no personal data</td></tr>
                  </tbody>
                </table>
              </div>
              <p>
                Where a deletion request is made, data that is no longer needed is irreversibly deleted or anonymised, and any backup copy is left to expire on its normal rotation cycle.
              </p>
            </div>
          </section>

          {/* SECTION 7 */}
          <section id="your-rights" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <Globe className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                7. Your Privacy Rights (GDPR &amp; CCPA/CPRA)
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                Depending on where you live, you hold specific legal rights over your data. We honour these for every reader, not only where a statute compels it:
              </p>
              <ul className="list-disc pl-5 mb-4 space-y-2">
                <li><strong>Right to Access:</strong> request a copy of the personal data we hold about you.</li>
                <li><strong>Right to Rectification:</strong> ask us to correct inaccurate or incomplete data.</li>
                <li><strong>Right to Erasure (“Right to be Forgotten”):</strong> request deletion of your personal data from our systems.</li>
                <li><strong>Right to Restrict Processing:</strong> ask us to pause processing in defined circumstances.</li>
                <li><strong>Right to Data Portability:</strong> receive your data in a structured, machine-readable format.</li>
                <li><strong>Right to Object &amp; Withdraw Consent:</strong> decline or later withdraw consent for optional cookies and advertising personalisation, including through <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Google Ad Settings</a>.</li>
                <li><strong>Right to Non-Discrimination (CCPA/CPRA):</strong> we do not sell personal information, and exercising any right above will never degrade your access to xSypher.</li>
              </ul>
              <div className="mt-6 p-4 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-xl">
                <p className="text-[var(--ink)] text-sm font-semibold">
                  To exercise any of these rights, email our Data Protection contact at <a href="mailto:privacy@xsypher.com" className="text-[var(--accent)] hover:underline">privacy@xsypher.com</a>. We respond within 30 days, and usually sooner. You may also lodge a complaint with your local supervisory authority.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 8 */}
          <section id="security" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <Shield className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                8. Data Security
              </h2>
            </div>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                All traffic between your browser and our servers is encrypted with TLS, enforced with HSTS, and protected by a strict Content Security Policy with per-request nonces. Staff authentication uses signed, HTTP-only session cookies, and passwords are hashed with a modern password-hashing algorithm — never stored in plain text or reversible form.
              </p>
              <p>
                Submitted comment content and article HTML are sanitised before storage so that a submission cannot inject scripts into a page another reader loads. Email addresses used in comments are hashed at the point of submission, so a database disclosure would not hand over reader addresses.
              </p>
              <p>
                No system is perfectly secure, and we will not pretend otherwise. If we ever suffer a breach affecting your personal data, we will notify affected readers and the relevant authority without undue delay. Suspected vulnerabilities in our own platform can be reported through the process set out in our <Link href="/page/disclaimer" className="text-[var(--accent)] hover:underline">responsible disclosure policy</Link>.
              </p>
            </div>
          </section>

          {/* SECTION 9 */}
          <section id="contact" className="scroll-mt-28 pb-12">
            <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)] mb-6">
              9. Contact Information
            </h2>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                If you have any questions, concerns or requests regarding this Privacy Policy, our practices, or your dealings with the xSypher platform, please contact us.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <a
                  href="mailto:privacy@xsypher.com"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 !bg-[var(--accent)] dark:!bg-[var(--accent)] !text-white dark:!text-white font-[family:var(--f-ui)] font-bold rounded-lg shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Email Privacy Team
                  </span>
                </a>
                <a
                  href="/page/contact"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)] font-[family:var(--f-ui)] font-bold rounded-lg hover:bg-[var(--surface-3)] transition-all"
                >
                  General Contact
                </a>
              </div>
            </div>
          </section>

        </article>
      </div>
    </div>
  );
}
