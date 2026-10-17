import Image from 'next/image';
import { Download, Palette, Type, ShieldCheck, User, SpellCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { brandBannerUrl, constructMetadata, siteConfig } from '@/lib/seo';
import CopyButton from './CopyButton';
import DownloadAssetCard from './DownloadAssetCard';

export const metadata: Metadata = constructMetadata({
  title: 'Media Kit & Brand Assets | xSypher',
  description:
    'Official xSypher logos, typography, brand colours, name pronunciation and spelling guidelines, and boilerplate copy for press, conference programmes and partners.',
  canonical: `${siteConfig.url}/page/media-kit`,
  image: brandBannerUrl(),
  imageAlt: 'xSypher media kit',
});

export default function MediaKitPage() {
  return (
    <div className="bg-[var(--surface)] min-h-screen">
      <header className="border-b border-[var(--line)] bg-[var(--surface-2)]">
        <div className="max-w-7xl mx-auto px-4 pt-32 pb-16 sm:pt-40 sm:px-8 lg:pt-44 lg:px-12 relative z-10">
          <div className="max-w-3xl">
            <span className="text-[var(--accent)] font-bold text-xs uppercase tracking-widest mb-3 block">
              Press &amp; Partners
            </span>
            <h1 className="font-[family:var(--f-display)] text-4xl sm:text-5xl font-bold mb-4 text-[var(--ink)] tracking-tight">
              Media Kit
            </h1>
            <p className="font-[family:var(--f-body)] text-lg text-[var(--muted)] leading-relaxed">
              Official brand assets, typography and boilerplate copy for press, conference programmes and partners. Everything on this page is safe to reuse as published.
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-8 lg:px-12">
        
        {/* Boilerplate Copy */}
        <section className="mb-16">
          <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-6 border-b border-[var(--line)] pb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
            Boilerplate copy
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-[var(--surface-2)] border border-[var(--line)] rounded-sm p-6 shadow-sm">
              <h3 className="font-bold text-[var(--ink)] mb-3 text-sm uppercase tracking-wider">Short — 50 words</h3>
              <p className="text-[var(--muted)] font-[family:var(--f-body)] text-sm leading-relaxed mb-4">
                xSypher is an independent, founder-led engineering publication covering software architecture, cybersecurity, AI systems and developer hardware. Written for people who build and operate systems, it funds itself through clearly labelled sponsorship and reader support — with no venture capital, no corporate parent and no paid verdicts.
              </p>
              <CopyButton text="xSypher is an independent, founder-led engineering publication covering software architecture, cybersecurity, AI systems and developer hardware. Written for people who build and operate systems, it funds itself through clearly labelled sponsorship and reader support — with no venture capital, no corporate parent and no paid verdicts." />
            </div>
            <div className="bg-[var(--surface-2)] border border-[var(--line)] rounded-sm p-6 shadow-sm">
              <h3 className="font-bold text-[var(--ink)] mb-3 text-sm uppercase tracking-wider">Long — 100 words</h3>
              <p className="text-[var(--muted)] font-[family:var(--f-body)] text-sm leading-relaxed mb-4">
                xSypher is an independent, founder-led engineering publication covering software architecture, cybersecurity, AI systems and developer hardware. <br/><br/>
                Built by engineers for engineers, it favours primary sources, reproducible benchmarks and hands-on testing over press-release reporting. The publication takes no venture capital and has no corporate parent; it is funded by clearly labelled sponsorship, affiliate commissions and reader support, so a verdict is never for sale. Sponsored material is disclosed before the first paragraph, and every correction lives on the article it corrects, with a timestamp.
              </p>
              <CopyButton text="xSypher is an independent, founder-led engineering publication covering software architecture, cybersecurity, AI systems and developer hardware. Built by engineers for engineers, it favours primary sources, reproducible benchmarks and hands-on testing over press-release reporting. The publication takes no venture capital and has no corporate parent; it is funded by clearly labelled sponsorship, affiliate commissions and reader support, so a verdict is never for sale. Sponsored material is disclosed before the first paragraph, and every correction lives on the article it corrects, with a timestamp." />
            </div>
          </div>
        </section>

        {/* Brand Identity, Pronunciation & Spelling Guidelines */}
        <section className="mb-16">
          <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-6 border-b border-[var(--line)] pb-4 flex items-center gap-2">
            <SpellCheck className="w-5 h-5 text-[var(--accent)]" />
            Brand Identity, Pronunciation &amp; Spelling Guidelines
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-[var(--surface-2)] border border-[var(--line)] rounded-sm p-6 shadow-sm">
              <h3 className="font-bold text-[var(--ink)] mb-3 text-sm uppercase tracking-wider">How to say the name</h3>
              <p className="text-[var(--muted)] font-[family:var(--f-body)] text-sm leading-relaxed mb-4">
                xSypher is pronounced <b className="text-[var(--ink)]">“ex-sy-fer”</b> — the letter x spoken aloud (“ex”), followed by “sy-fer”, rhyming with the traditional word <i>cipher</i> it is built from.
              </p>
              <p className="text-[var(--muted)] font-[family:var(--f-body)] text-sm leading-relaxed">
                The name comes from <i>cipher</i>: a transformation you can specify exactly, verify, and repeat — the same standard every technical claim on this publication is held to. The leading <b className="text-[var(--ink)]">x</b> is the unknown we are still working out, which in engineering is most of it.
              </p>
            </div>
            <div className="bg-[var(--surface-2)] border border-[var(--line)] rounded-sm p-6 shadow-sm">
              <h3 className="font-bold text-[var(--ink)] mb-3 text-sm uppercase tracking-wider">The official spelling</h3>
              <p className="text-[var(--muted)] font-[family:var(--f-body)] text-sm leading-relaxed mb-4">
                Whether you search for it or spell it as <b className="text-[var(--ink)]">xCipher</b>, the traditional <b className="text-[var(--ink)]">Cypher</b>, <b className="text-[var(--ink)]">Sypher</b>, or the common phonetic typos <b className="text-[var(--ink)]">xcyper</b> and <b className="text-[var(--ink)]">cyper</b> — <b className="text-[var(--ink)]">xSypher</b> is the official canonical name of our independent technology and security publication, and the only spelling that appears in our masthead, metadata and structured data.
              </p>
              <p className="text-[var(--muted)] font-[family:var(--f-body)] text-sm leading-relaxed">
                The publication was founded under the name xCipher and later became xSypher, so older coverage, archives and search queries still use the earlier spellings. They all refer to this same publication at <a className="text-[var(--accent)] hover:underline" href="https://www.xsypher.com">https://www.xsypher.com</a>.
              </p>
            </div>
          </div>
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-4xl text-[var(--muted)] font-[family:var(--f-body)] mt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 not-prose">
              <div className="border border-green-500/30 bg-green-500/5 rounded-sm p-6">
                <h4 className="font-bold text-green-500 mb-2 uppercase text-sm tracking-wide">Do:</h4>
                <ul className="text-sm space-y-2 text-[var(--ink)] list-disc pl-4">
                  <li>Write the name as <b>xSypher</b> — one word, lowercase x, capital S.</li>
                  <li>Say it as “ex-sy-fer” in interviews, conference programmes and video scripts.</li>
                  <li>Link to <code>https://www.xsypher.com</code> as the canonical domain.</li>
                </ul>
              </div>
              <div className="border border-red-500/30 bg-red-500/5 rounded-sm p-6">
                <h4 className="font-bold text-red-500 mb-2 uppercase text-sm tracking-wide">Don&apos;t:</h4>
                <ul className="text-sm space-y-2 text-[var(--ink)] list-disc pl-4">
                  <li>Do not style it as a separate publication (“xCipher”, “xCipher Tech”) — those are legacy and phonetic variants of xSypher, not rival outlets.</li>
                  <li>Do not hyphenate, space or capitalise it mid-sentence (“X Sypher”, “X-Sypher”, “XSypher”).</li>
                  <li>Do not invent a backronym — the x is the unknown variable, not an abbreviation.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Executive Bios */}
        <section className="mb-16">
          <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-6 border-b border-[var(--line)] pb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[var(--accent)]" />
            About the founder
          </h2>
          <div className="bg-[var(--surface-2)] border border-[var(--line)] rounded-sm p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-start shadow-sm">
            <div className="w-32 h-32 shrink-0 border-2 border-[var(--accent)] rounded-full overflow-hidden mt-2 bg-white p-1">
              <Image
                src="/anwar.webp"
                alt="Anwar Iqbal Dawar"
                width={128}
                height={128}
                className="w-full h-full object-cover object-[50%_10%] scale-[1.15] translate-y-2 rounded-full"
                priority
              />
            </div>
            <div>
              <h3 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-1">Anwar Iqbal Dawar</h3>
              <p className="text-sm font-bold uppercase tracking-widest text-[var(--accent)] mb-4">Founder &amp; Lead Editor</p>
              <p className="text-[var(--muted)] font-[family:var(--f-body)] text-sm sm:text-base leading-relaxed mb-4">
                Anwar Iqbal Dawar is the founder and Lead Editor of xSypher. A Computer Engineering scholar working across systems architecture, cloud infrastructure and security research, he started the publication to write the technical material he kept failing to find elsewhere: how a system actually behaves once it is running, and what the primary sources say rather than what the launch post claims. He sets the editorial standard — primary sources, reproducible tests, corrections on the article — and writes most of the deeper analysis himself.
              </p>
              <a href="mailto:press@xsypher.com" className="text-sm font-bold text-[var(--ink)] hover:text-[var(--accent)] transition-colors">Request an interview &rarr;</a>
            </div>
          </div>
        </section>

        {/* Brand Guidelines */}
        <section className="mb-16">
          <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-6 border-b border-[var(--line)] pb-4">
            Logo Usage &amp; Brand Constraints
          </h2>
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-4xl text-[var(--muted)] font-[family:var(--f-body)]">
            <p>
              The xSypher logomark is an essential part of our brand identity. It represents our commitment to precision, cryptography, and structural integrity.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-8 not-prose">
              <div className="border border-green-500/30 bg-green-500/5 rounded-sm p-6">
                <h4 className="font-bold text-green-500 mb-2 uppercase text-sm tracking-wide">Do:</h4>
                <ul className="text-sm space-y-2 text-[var(--ink)] list-disc pl-4">
                  <li>Maintain strict clear-space padding (at least 1/2 the width of the logo mark).</li>
                  <li>Use the high-contrast white variant on dark backgrounds.</li>
                  <li>Scale the logo proportionally.</li>
                </ul>
              </div>
              <div className="border border-red-500/30 bg-red-500/5 rounded-sm p-6">
                <h4 className="font-bold text-red-500 mb-2 uppercase text-sm tracking-wide">Don&apos;t:</h4>
                <ul className="text-sm space-y-2 text-[var(--ink)] list-disc pl-4">
                  <li>Do not apply drop shadows, glows, or gradients to the logo.</li>
                  <li>Do not skew, stretch, or compress the logo dimensions.</li>
                  <li>Do not recolor the logo outside of the approved brand palette.</li>
                  <li>Do not embed the logo in a busy or low-contrast background.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16">
          <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-6 border-b border-[var(--line)] pb-4 flex items-center gap-2">
            <Type className="w-5 h-5 text-[var(--accent)]" />
            Brand Typography
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-[var(--surface-2)] border border-[var(--line)] rounded-sm">
              <div className="text-4xl mb-4 text-[var(--ink)] font-normal font-kremlin">Kremlin</div>
              <h3 className="font-bold text-[var(--ink)] mb-2">Display &amp; Branding</h3>
              <p className="text-sm text-[var(--muted)]">Our custom display face is used exclusively for the xSypher logo mark and highly specific editorial feature headers. It represents the brutalist, unapologetic nature of our cybersecurity reporting.</p>
            </div>
            <div className="p-6 bg-[var(--surface-2)] border border-[var(--line)] rounded-sm">
              <div className="text-4xl mb-4 text-[var(--ink)] font-bold tracking-tight" style={{ fontFamily: 'var(--f-display)' }}>Inter</div>
              <h3 className="font-bold text-[var(--ink)] mb-2">Primary UI &amp; Prose</h3>
              <p className="text-sm text-[var(--muted)]">Inter is utilized for all interface elements and long-form article prose. It was selected for its exceptional legibility at small sizes, optimal x-height, and neutral technical aesthetic.</p>
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section className="mb-16">
          <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-6 border-b border-[var(--line)] pb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-[var(--accent)]" />
            Brand Colors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-[var(--surface-2)] border border-[var(--line)] rounded-sm overflow-hidden shadow-sm flex flex-col">
              <div className="h-32 w-full" style={{ backgroundColor: 'var(--accent)' }}></div>
              <div className="p-4">
                <h3 className="font-bold text-[var(--ink)] mb-1">Primary Accent (Red)</h3>
                <code className="text-xs text-[var(--muted)] bg-[var(--surface)] px-2 py-1 rounded">HEX: #EF4444 (Approx)</code>
              </div>
            </div>
            <div className="bg-[var(--surface-2)] border border-[var(--line)] rounded-sm overflow-hidden shadow-sm flex flex-col">
              <div className="h-32 w-full" style={{ backgroundColor: 'var(--ink)' }}></div>
              <div className="p-4">
                <h3 className="font-bold text-[var(--ink)] mb-1">Ink (Text)</h3>
                <code className="text-xs text-[var(--muted)] bg-[var(--surface)] px-2 py-1 rounded">HEX: #F8FAFC / #0F172A</code>
              </div>
            </div>
            <div className="bg-[var(--surface-2)] border border-[var(--line)] rounded-sm overflow-hidden shadow-sm flex flex-col">
              <div className="h-32 w-full border-b border-[var(--line)]" style={{ backgroundColor: 'var(--surface)' }}></div>
              <div className="p-4">
                <h3 className="font-bold text-[var(--ink)] mb-1">Surface (Bg)</h3>
                <code className="text-xs text-[var(--muted)] bg-[var(--surface)] px-2 py-1 rounded">HEX: #020617 / #FFFFFF</code>
              </div>
            </div>
          </div>
        </section>

        {/* Downloadable Assets */}
        <section>
          <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-6 border-b border-[var(--line)] pb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-[var(--accent)]" />
            Downloadable Assets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <DownloadAssetCard 
              title="xSypher Logo (SVG)"
              desc="Vector format, ideal for print and high-res web."
              type="svg"
            />
            <DownloadAssetCard 
              title="xSypher Logo (PNG)"
              desc="Raster format with transparent background."
              type="png"
            />
          </div>
        </section>

      </div>
    </div>
  );
}
