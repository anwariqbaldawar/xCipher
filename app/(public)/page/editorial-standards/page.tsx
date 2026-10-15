import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Scale, UserCheck, LaptopMinimal, Quote } from "lucide-react";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Editorial Standards — xSypher",
  description:
    "The rules behind xSypher's reporting: independence from vendors, careful sourcing, transparent and clearly labelled sponsored partnerships, and attribution for work that is not ours.",
  canonical: `${siteConfig.url}/page/editorial-standards`,
  image: brandBannerUrl(),
  imageAlt: "xSypher editorial standards",
});

export default function EditorialStandardsPage() {
  return (
    <div className="w-full min-h-screen bg-[var(--surface)] text-[var(--ink)] selection:bg-[var(--accent)]/20">
      {/* HERO SECTION */}
      <section className="w-full border-b border-[var(--line)] relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden="true"
        />
        <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-32 pb-20 sm:pt-40 sm:pb-28 relative z-10 text-center">
          <span className="inline-block px-3 py-1 mb-6 rounded text-xs font-bold uppercase tracking-[0.2em] bg-[var(--ink)] text-[var(--surface)]">
            The Manifesto
          </span>
          <h1 className="font-[family:var(--f-display)] text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-[var(--ink)]">
            Our Editorial Standards
          </h1>
          <p className="mt-8 text-lg sm:text-xl font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed">
            Truth, transparency, and deep technical accuracy.
          </p>
        </div>
      </section>

      {/* CORE PRINCIPLES CONTENT */}
      <section className="w-full py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 flex flex-col space-y-16">
          
          {/* Principle 1 */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <Scale className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Uncompromised Objectivity
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  We report the facts. Editorial decisions — what we cover, what we conclude and what score we give — are shielded from commercial influence: no advertiser, sponsor or investor gets preview access, copy approval or a veto over our journalism.
                </p>
                <p>
                  That independence is funded, not compromised, by commercial partnerships: clearly labelled Sponsored Deep-Dives, Partner Content and display/newsletter sponsorships support the publication, and every paid format is disclosed as such. If a major tech conglomerate — including a sponsor — makes a misstep, we cover it critically and fairly. Our loyalty lies exclusively with our readers: accurate, noise-free analysis so they can form their own conclusions.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-[var(--line)]" />

          {/* Principle 2 */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Sourcing &amp; Anonymous Tips
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  We verify what we are given before we publish it, and we protect the people who give it to us. Anonymity is granted where a source’s safety, job or finances are genuinely at risk — and only when the material can be verified independently, because an unverifiable anonymous claim is not a story.
                </p>
                <p>
                  For sensitive material, ask for an encrypted channel and we will use one — authors can publish a PGP public key on their profile, and the desk will confirm a key fingerprint before you send anything. We keep the minimum material needed to verify a story, and we will tell you plainly what we can and cannot protect rather than pointing at a drop box we do not operate.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-[var(--line)]" />

          {/* Principle 3 */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <LaptopMinimal className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Review Ethics
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  Gadgets and software are reviewed honestly, and a review verdict can never be bought: we do not sell positive reviews, scores or rankings. Sponsored Deep-Dives and Partner Content are separate, clearly labelled formats — tagged &ldquo;Sponsored&rdquo; or &ldquo;Partner&rdquo; before the first paragraph — and are never disguised as independent reviews or allowed to influence one.
                </p>
                <p>
                  Hardware sent to us by manufacturers is either returned after the review period or kept purely in a secure editorial vault for future benchmark comparisons. We never sell review units, and accepting a review unit never guarantees coverage—let alone positive coverage.
                </p>
              </div>
            </div>
          </div>

          <hr className="border-[var(--line)]" />

          {/* Principle 4 */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <div className="shrink-0 mt-1">
              <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                <Quote className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-4">
                Plagiarism &amp; Attribution
              </h2>
              <div className="font-[family:var(--f-body)] text-[var(--muted)] leading-relaxed space-y-4">
                <p>
                  Plagiarism is a firing offence, not a style question. When we build on another outlet’s reporting we name them and link to the original, and we link the primary source behind it wherever one exists.
                </p>
                <p>
                  Our goal is to elevate the technology journalism ecosystem, and that starts with respecting the hard work of our peers.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* BACK TO CONTACT CTA */}
      <section className="w-full py-16 sm:py-24 border-t border-[var(--line)] text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 flex flex-col items-center">
          <p className="font-[family:var(--f-body)] text-[var(--muted)] mb-8 max-w-lg">
            Questions about these standards, or a correction to request?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <Link
              href="/page/contact"
              className="py-3 px-6 !bg-[var(--accent)] !text-[var(--on-accent)] hover:brightness-110 font-[family:var(--f-ui)] font-bold rounded-lg inline-flex items-center justify-center transition-all shadow-sm"
            >
              Contact the desk
            </Link>
            <Link
              href="/page/transparency"
              className="py-3 px-6 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--ink)] border border-[var(--line)] font-[family:var(--f-ui)] font-bold rounded-lg inline-flex items-center justify-center transition-all"
            >
              Transparency report
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
