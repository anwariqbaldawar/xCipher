import React from "react";
import type { Metadata } from "next";
import {
  Cookie,
  Database,
  FileText,
  Globe,
  Info,
  Lock,
  Shield,
  Users,
} from "lucide-react";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";
import { PolicyCallout, PolicyCard, PolicyFooter, PolicyHero, PolicyLayout, type PolicySection } from "@/components/common/PolicyShell";

// ─────────────────────────────────────────────────────────────────────────────
// Privacy Policy
//
// Three things were wrong with the previous revision and all three are fixed
// by rewriting it against what the product actually does:
//
//   1. It described a hosting stack we do not run ("Vercel for hosting") and
//      analytics we do not load ("Google Analytics or Plausible"), while the
//      edge, the databases, the image store and the email paths are all named
//      in .env.example. Every processor below is one this publication
//      genuinely sends data to.
//   2. It said nothing about advertising, while the site ships a Google
//      AdSense integration gated behind the consent banner. A privacy policy
//      that omits the advertising stack is not AdSense-compliant, so the
//      advertising and vendor-cookie sections are now explicit and link to the
//      Cookie Policy for the cookie-level detail.
//   3. Reader-facing placeholder copy — sentences describing what a demo build
//      stores locally — is gone from the live policy, and the same strings were
//      removed from lib/mockData.ts so they cannot reappear through a stale
//      seed path.
//
// Layout (and the mobile card fix) is shared with the other policy routes via
// components/common/PolicyShell.tsx.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = constructMetadata({
  title: "Privacy Policy — xSypher",
  description:
    "What xSypher collects, why, how long it is kept and who processes it — including the advertising partners that serve ads on this site, your GDPR and CCPA rights, and how to exercise them.",
  canonical: `${siteConfig.url}/page/privacy-policy`,
  image: brandBannerUrl(),
  imageAlt: "xSypher privacy policy",
  type: "website",
});

const SECTIONS: PolicySection[] = [
  { id: "tldr", label: "0. Summary" },
  { id: "information-collection", label: "1. Information we collect" },
  { id: "how-we-use", label: "2. How we use it" },
  { id: "cookies", label: "3. Cookies & advertising" },
  { id: "data-sharing", label: "4. Sharing & processors" },
  { id: "your-rights", label: "5. Your rights (GDPR/CCPA)" },
  { id: "security", label: "6. Security & retention" },
  { id: "children", label: "7. Children" },
  { id: "contact", label: "8. Contact" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <PolicyHero
        kicker="Legal & Compliance"
        title="Privacy Policy"
        deck="We collect the minimum needed to run a publication, we do not sell your data, and the newsletter list never touches an advertiser. This page states exactly what is collected, where it goes and how to get it deleted."
        updated="15 October 2026"
        badges={[
          { label: "Applies to", value: "xsypher.com & newsletters" },
          { label: "Compliance", value: "GDPR · UK GDPR · CCPA/CPRA" },
          { label: "Controllers", value: "xSypher (independent publication)" },
        ]}
      />

      <PolicyLayout
        sections={SECTIONS}
        footerNote={
          <>
            <strong className="text-[var(--ink)]">Data request?</strong> Email{" "}
            <a href="mailto:privacy@xsypher.com" className="font-semibold text-[var(--accent)] underline">
              privacy@xsypher.com
            </a>{" "}
            from the address concerned and we will confirm what we hold and delete it if you ask us to. Requests are
            answered within 30 days.
          </>
        }
      >
        <PolicyCallout title="Summary: the short version" icon={Info} tone="accent">
          <ul>
            <li>
              We collect what is necessary to publish, deliver and improve the site — an email address if you
              subscribe or create an account, and aggregate read statistics that are not tied to you.
            </li>
            <li>
              <strong>We do not sell your personal data.</strong> Your newsletter address is never given, rented or
              exposed to an advertiser or a data broker.
            </li>
            <li>
              Newsletter email is opt-in, sent through our email provider, and cancellable with one click in every
              issue.
            </li>
            <li>
              Advertising is delivered by Google&apos;s publisher platform and is gated behind the cookie banner:
              non-essential advertising cookies are set only after you accept. Full detail is in the{" "}
              <a href="/page/cookie-policy">Cookie Policy</a>.
            </li>
            <li>
              You can request a copy of your data, correct it, or have it deleted at any time by writing to{" "}
              <a href="mailto:privacy@xsypher.com">privacy@xsypher.com</a>.
            </li>
          </ul>
        </PolicyCallout>

        <PolicyCard id="information-collection" title="1. Information We Collect" eyebrow="Section 01" icon={FileText}>
          <p>
            We collect information in three ways: what you give us directly, what is recorded automatically when a
            page is served, and what a third-party processor returns to us as part of running the site.
          </p>
          <h3>A. Information you provide</h3>
          <ul>
            <li>
              <strong>Newsletter subscription:</strong> your email address, and the date you subscribed. Nothing else
              is required to receive the newsletter.
            </li>
            <li>
              <strong>Account and comments:</strong> your name or display name, email address and a hashed password if
              you register to comment or to work in the editorial console.
            </li>
            <li>
              <strong>Correspondence:</strong> the content of messages you send to the desk — including tips,
              corrections and contact-form submissions, plus any file you choose to attach.
            </li>
          </ul>
          <h3>B. Information recorded automatically</h3>
          <ul>
            <li>Request metadata needed to serve a page: the requested URL, a timestamp and standard browser and device headers.</li>
            <li>
              Security and abuse signals processed at our edge: IP address and request patterns, used for rate limiting,
              bot mitigation and keeping the site online. Ordinary article reads are not used to build a profile of you.
            </li>
            <li>Aggregate read counts per article — a number attached to a story, not to a reader.</li>
          </ul>
          <h3>C. What we deliberately do not collect</h3>
          <ul>
            <li>No payment card data — there is no paywall and no paid tier on this site today.</li>
            <li>No special-category data, no biometric data, and no data purchased from data brokers.</li>
            <li>No cross-site behavioural profile built by us; advertising measurement is done by Google under its own terms.</li>
          </ul>
        </PolicyCard>

        <PolicyCard id="how-we-use" title="2. How We Use Your Data" eyebrow="Section 02" icon={Database}>
          <p>
            Data is used to deliver, secure and improve the publication. We rely on your consent for optional cookies
            and on legitimate interests (and the necessity of delivering a service you asked for) for the rest.
          </p>
          <ul>
            <li>
              <strong>Service delivery:</strong> sending the newsletter you subscribed to, authenticating your account,
              and publishing your comment under the name you chose.
            </li>
            <li>
              <strong>Platform security:</strong> detecting malicious traffic, rate limiting abuse, preventing CSRF and
              credential-stuffing attempts, and enforcing our terms.
            </li>
            <li>
              <strong>Editorial analytics:</strong> aggregate counting of which stories are read, so the desk knows what
              to spend its reporting budget on. This data is not linked to an individual reader.
            </li>
            <li>
              <strong>Advertising:</strong> serving and measuring advertising through Google&apos;s publisher platform,
              which is what keeps the reporting free to read.
            </li>
            <li>
              <strong>Legal compliance:</strong> keeping records needed to answer a lawful request or to defend a legal
              claim.
            </li>
          </ul>
        </PolicyCard>

        <PolicyCard id="cookies" title="3. Cookies, Advertising & Consent" eyebrow="Section 03" icon={Cookie} emphasis>
          <p>
            Cookies fall into three groups — essential session and security cookies, first-party performance
            measurement, and third-party advertising cookies served by Google AdSense and its partners. Only the first
            group is set without a choice, because the site cannot work without it.
          </p>
          <ul>
            <li>
              <strong>Advertising vendors.</strong> Google and its demand partners serve and measure ads on this site.
              They may set cookies (for example <em>IDE</em>, <em>__gads</em> and <em>__gpi</em>) to sequence and cap
              advertising, detect invalid traffic, and — where consent applies — personalise the ads you see.
            </li>
            <li>
              <strong>Your control.</strong> Declining in our banner stops the advertising library from loading at all;
              accepting allows it. You can opt out of personalised advertising independently at{" "}
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
                Google Ads Settings
              </a>{" "}
              or{" "}
              <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
                aboutads.info
              </a>
              , and we honour the Global Privacy Control signal.
            </li>
            <li>
              <strong>Cookie-level detail.</strong> Names, purposes and durations for every cookie and browser-storage
              key are listed in the <a href="/page/cookie-policy">Cookie Policy</a>.
            </li>
          </ul>
          <p>
            We do not sell personal information, and we do not let an advertising partner receive your newsletter
            address, your account email or your comment history.
          </p>
        </PolicyCard>

        <PolicyCard id="data-sharing" title="4. Data Sharing & Processors" eyebrow="Section 04" icon={Globe}>
          <p>
            <strong>We do not sell, rent or trade your personal information.</strong> Data is shared only with the
            service providers that make the publication work, each of which is bound by its own data-processing terms:
          </p>
          <ul>
            <li>
              <strong>Cloudflare</strong> — edge hosting, CDN, asset delivery and the image store (R2) that holds
              article media.
            </li>
            <li>
              <strong>Neon / Supabase (PostgreSQL)</strong> — the database holding article metadata, comments, accounts
              and newsletter subscriptions.
            </li>
            <li>
              <strong>Cloudinary</strong> — avatar image hosting and transformation for author profiles.
            </li>
            <li>
              <strong>Email providers (Resend / Brevo)</strong> — delivery of the newsletter and transactional messages
              such as password resets and comment replies.
            </li>
            <li>
              <strong>Google (AdSense and advertising partners)</strong> — advertising delivery, measurement and
              invalid-traffic protection, with cookie scope described in the{" "}
              <a href="/page/cookie-policy">Cookie Policy</a>.
            </li>
            <li>
              <strong>Error monitoring</strong> — aggregate crash and performance reporting used to keep pages
              available, configured not to capture article content or reader form input.
            </li>
          </ul>
          <p>
            We may also disclose information where required by law — to comply with a subpoena, court order or other
            lawful process, or where we believe in good faith that disclosure is necessary to protect rights, safety or
            the integrity of the service. Where a request is unlawful or over-broad we contest it, and we do not
            voluntarily identify confidential editorial sources to anyone.
          </p>
        </PolicyCard>

        <PolicyCard id="your-rights" title="5. Your Privacy Rights (GDPR & CCPA)" eyebrow="Section 05" icon={Shield}>
          <p>
            Depending on where you live — for example the EU/EEA, the UK, or California — you have specific legal
            rights over your data. We honour these for everyone who asks, not only where a statute compels it:
          </p>
          <ul>
            <li>
              <strong>Access:</strong> a copy of the personal data we hold about you.
            </li>
            <li>
              <strong>Rectification:</strong> correction of inaccurate or incomplete data.
            </li>
            <li>
              <strong>Erasure:</strong> deletion of your personal data, including your newsletter subscription and
              comment history.
            </li>
            <li>
              <strong>Restriction:</strong> a pause on processing while a dispute about accuracy is resolved.
            </li>
            <li>
              <strong>Portability:</strong> your data in a structured, machine-readable format.
            </li>
            <li>
              <strong>Objection and withdrawal of consent:</strong> opt out of advertising cookies, analytics or the
              newsletter at any time.
            </li>
            <li>
              <strong>Non-discrimination (CCPA/CPRA):</strong> we do not degrade the site for readers who exercise a
              privacy right. We do not sell personal information; you may opt out of sharing for targeted advertising
              through the banner or your browser&apos;s privacy signal.
            </li>
          </ul>
          <p>
            To exercise any of these rights, email{" "}
            <a href="mailto:privacy@xsypher.com">privacy@xsypher.com</a> from the address concerned — we may ask you to
            confirm control of that address before acting, which is what stops someone else deleting your subscription.
            Requests are answered within 30 days. If you are not satisfied with our response you can complain to your
            national data-protection authority, and we will tell you which one applies if you ask.
          </p>
        </PolicyCard>

        <PolicyCard id="security" title="6. Data Security & Retention" eyebrow="Section 06" icon={Lock}>
          <p>
            Traffic is encrypted in transit and served over TLS. Account passwords are stored as salted hashes computed
            with a purpose-built password algorithm and are never recoverable in plaintext. Access to production data
            is restricted to the small number of people who operate the publication, protected by two-factor
            authentication, and every editorial action is written to an audit log.
          </p>
          <p>
            We keep personal data only as long as it is needed for the purpose it was collected for, unless a longer
            period is required by law:
          </p>
          <ul>
            <li>
              <strong>Newsletter subscription:</strong> until you unsubscribe, plus a short suppression record so a
              removal cannot be undone by an accidental re-import.
            </li>
            <li>
              <strong>Account data:</strong> while the account exists, then deleted on request.
            </li>
            <li>
              <strong>Contact and corrections correspondence:</strong> retained as an editorial record of what was
              reported and how it was resolved.
            </li>
            <li>
              <strong>Aggregate read counts:</strong> kept indefinitely, because they contain no personal data.
            </li>
          </ul>
          <p>
            When data is no longer needed it is deleted from the live database and rotated out of backups on their own
            schedule. If a breach ever affects personal data, we will notify affected readers and the relevant
            authority without undue delay.
          </p>
        </PolicyCard>

        <PolicyCard id="children" title="7. Children's Privacy" eyebrow="Section 07" icon={Users}>
          <p>
            xSypher is a technology publication written for a general adult audience. We do not knowingly collect
            personal data from children under 13 (or under 16 where local law sets that age for consent). If you
            believe a child has given us personal data, write to{" "}
            <a href="mailto:privacy@xsypher.com">privacy@xsypher.com</a> and we will delete it, along with any
            subscription attached to it, without further questions.
          </p>
        </PolicyCard>

        <PolicyCard id="contact" title="8. Contact & Changes" eyebrow="Section 08" icon={Globe}>
          <p>
            This policy is reviewed whenever the stack changes — a new processor, an advertising partner, a new data
            type — and the &ldquo;last updated&rdquo; date at the top of the page always reflects the most recent
            substantive revision. Material changes are announced on the site rather than slipped in behind a date
            change.
          </p>
          <p>
            Questions, requests and complaints about this policy go to{" "}
            <a href="mailto:privacy@xsypher.com">privacy@xsypher.com</a>. General editorial enquiries go to the{" "}
            <a href="/page/contact">contact desk</a>.
          </p>
        </PolicyCard>

        <PolicyFooter
          title="Ask us what we hold — or have it deleted"
          body="Send a request from the address concerned and we will confirm what is stored and remove it on request. You never have to explain why."
          primary={{ href: "mailto:privacy@xsypher.com", label: "Email the privacy desk", mail: true }}
          secondary={{ href: "/page/cookie-policy", label: "Cookie Policy" }}
        />
      </PolicyLayout>
    </div>
  );
}
