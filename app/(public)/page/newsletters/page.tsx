import { Info, Zap, Shield, Clock, Search } from 'lucide-react';
import type { Metadata } from 'next';
import { brandBannerUrl, constructMetadata, siteConfig } from '@/lib/seo';
import NewsletterPageForm from './NewsletterPageForm';

export const metadata: Metadata = constructMetadata({
  title: 'The Daily Brief — Newsletter | xSypher',
  description: 'One short email on weekday mornings: what shipped, what broke, and the engineering detail behind it. No hype, unsubscribe in one click.',
  canonical: `${siteConfig.url}/page/newsletters`,
  image: brandBannerUrl(),
  imageAlt: 'The xSypher Daily Brief',
});

export default function NewslettersPage() {
  return (
    <div className="bg-[var(--surface)] min-h-screen">
      {/* HEADER HERO */}
      <header className="border-b border-[var(--line)] bg-[var(--surface-2)]">
        <div className="max-w-7xl mx-auto px-4 pt-32 pb-16 sm:pt-40 sm:px-8 lg:pt-44 lg:px-12">
          <div className="max-w-3xl">
            <span className="text-[var(--accent)] font-bold text-xs uppercase tracking-widest mb-3 block">
              Newsletter
            </span>
            <h1 className="font-[family:var(--f-display)] text-4xl sm:text-5xl font-bold mb-4 text-[var(--ink)] tracking-tight">
              xSypher Newsletters
            </h1>
            <p className="font-[family:var(--f-body)] text-lg text-[var(--muted)] leading-relaxed">
              One short email on weekday mornings: what shipped, what broke, and the engineering detail behind it. Written by the same people who write the site — no hype, no list-building, unsubscribe in one click.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--faint)]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
              Last Updated: September 19, 2026
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
              Directory
            </h4>
            <nav className="flex flex-col font-[family:var(--f-ui)] text-sm border-l-2 border-[var(--line-2)]">
              <a href="#tldr" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">0. Quick Summary</a>
              <a href="#the-daily-brief" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">1. The Daily Brief</a>
              <a href="#subscribe" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">2. Subscribe Now</a>
              <a href="#frequency" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">3. Delivery Schedule</a>
              <a href="#privacy-promise" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">4. Our Privacy Promise</a>
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
                    <span className="text-[var(--muted)] leading-relaxed">We send the <strong>xSypher Daily Brief</strong>, a short morning newsletter.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--muted)] leading-relaxed">Get exclusive editorial insights, breaking tech news, and deep-dive cybersecurity analysis.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--muted)] leading-relaxed">We operate under a <strong>strict zero-spam policy</strong>. We never sell your email.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent)] font-bold mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--muted)] leading-relaxed">You can unsubscribe instantly at any time via a one-click link in every email.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION 1: THE DAILY BRIEF */}
          <section id="the-daily-brief" className="scroll-mt-28">
            <div className="flex items-center gap-3 mb-6">
              <Search className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                1. The Daily Brief
              </h2>
            </div>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-[var(--muted)] font-[family:var(--f-body)]">
              <p className="mb-4">
                The <strong>xSypher Daily Brief</strong> is a short, plain-text email. No teaser paragraphs, no engagement bait, no sponsored slots inside the body — it links to what we published and to the primary sources behind it.
              </p>
              <p className="mb-4">
                Each issue carries a handful of items across software engineering, security and AI: a specification or advisory worth reading, a release we have actually tried, and one thing we are testing or benchmarking at the moment. If nothing earned your attention that week, the issue says so instead of padding itself out.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 mb-6">
                <div className="p-4 border border-[var(--line)] rounded-xl bg-[var(--surface-2)] text-center">
                  <Zap className="w-5 h-5 text-[var(--accent)] mx-auto mb-2" />
                  <h4 className="font-bold text-[var(--ink)] text-sm mb-1">High Signal</h4>
                  <p className="text-xs">No fluff, just the facts that impact your work.</p>
                </div>
                <div className="p-4 border border-[var(--line)] rounded-xl bg-[var(--surface-2)] text-center">
                  <Shield className="w-5 h-5 text-[var(--accent)] mx-auto mb-2" />
                  <h4 className="font-bold text-[var(--ink)] text-sm mb-1">Tech Focused</h4>
                  <p className="text-xs">Deep dives into code, CVEs, and enterprise shifts.</p>
                </div>
                <div className="p-4 border border-[var(--line)] rounded-xl bg-[var(--surface-2)] text-center">
                  <Clock className="w-5 h-5 text-[var(--accent)] mx-auto mb-2" />
                  <h4 className="font-bold text-[var(--ink)] text-sm mb-1">5-Min Read</h4>
                  <p className="text-xs">Optimized format to respect your time.</p>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: SUBSCRIBE FORM */}
          <section id="subscribe" className="scroll-mt-28">
            <NewsletterPageForm />
          </section>

          {/* SECTION 3: FREQUENCY */}
          <section id="frequency" className="scroll-mt-28">
            <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)] mb-6">
              3. Delivery Schedule & Frequency
            </h2>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                The brief goes out <strong>once per day, Monday through Friday</strong>. One email, and it stays short. 
              </p>
              <p>
                Weekends stay quiet. A Saturday send would have to be something genuinely urgent — a critical vulnerability being exploited in the wild, say — and even then it is one email, not a campaign.
              </p>
            </div>
          </section>

          {/* SECTION 4: PRIVACY */}
          <section id="privacy-promise" className="scroll-mt-28 pb-12">
            <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)] mb-6">
              4. Our Privacy & No-Spam Promise
            </h2>
            <div className="text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
              <p>
                Your inbox is sacred space. When you entrust us with your email address, we take that responsibility seriously. We guarantee that your email will <strong>never be sold, rented, or shared</strong> with third-party advertisers or data brokers.
              </p>
              <p>
                Furthermore, we hate trapped subscriptions as much as you do. Every single email we send includes a clear, visible, one-click unsubscribe link at the very bottom. If you decide the Daily Brief is no longer for you, you can exit gracefully with no hurdles, no questions asked.
              </p>
              <p className="mt-4">
                For a complete understanding of how we handle your data, please review our comprehensive <a href="/page/privacy-policy" className="text-[var(--accent)] hover:underline">Privacy Policy</a>.
              </p>
            </div>
          </section>

        </article>
      </div>
    </div>
  );
}
