import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { 
  Brain, 
  Terminal, 
  ShieldCheck, 
  Code2, 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  Scale, 
  FileCheck, 
  Lock, 
  ArrowUpRight, 
  Mail, 
  Layers, 
  Award, 
  Globe2, 
  Zap, 
  Compass,
  FileCode2
} from "lucide-react";
import { SocialIcon } from "@/components/common/SocialIcon";
import SocialLinks from "@/components/common/SocialLinks";
import { siteConfig } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "About xSypher — An Independent Engineering Publication",
  description:
    "xSypher is an independent, founder-led engineering publication covering software architecture, cybersecurity, AI systems and developer hardware — with hands-on testing and primary-source verification instead of press-release rewrites.",
  alternates: {
    canonical: `${siteConfig.url}/page/about`,
  },
  openGraph: {
    title: "About xSypher — An Independent Engineering Publication",
    description:
      "Who builds xSypher, how we are funded, and the standards a story has to clear before it publishes.",
    url: `${siteConfig.url}/page/about`,
    siteName: siteConfig.name,
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="w-full bg-[var(--paper)] text-[var(--ink)] min-h-screen">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO SECTION
          ───────────────────────────────────────────────────────────── */}
      <section className="relative w-full border-b border-[var(--line)] bg-[var(--surface)] overflow-hidden">
        {/* Subtle decorative background grid */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden="true"
        />

        {/* Ambient accent glow */}
        <div 
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[var(--accent)] opacity-10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />
        <div 
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[var(--accent)] opacity-5 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-32 pb-16 sm:pt-40 sm:pb-24 lg:pt-44 lg:pb-28 relative z-10">
          {/* Kicker badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              Inside xSypher // Who we are
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="font-[family:var(--f-display)] text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-[var(--ink)] max-w-4xl text-balance">
            Decoding the Future of <span className="text-[var(--accent)]">Technology</span>.
          </h1>

          {/* Short Sub-headline */}
          <p className="mt-6 text-lg sm:text-xl lg:text-2xl text-[var(--muted)] font-[family:var(--f-body)] max-w-3xl leading-relaxed">
            An independent, founder-led engineering publication: software architecture, cybersecurity, AI systems and the hardware developers actually buy — tested, sourced and written by people who build things.
          </p>

          {/* Key Metrics Strip */}
          <div className="mt-12 pt-8 border-t border-[var(--line)] grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div className="flex flex-col">
              <span className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                Independent
              </span>
              <span className="text-xs sm:text-sm text-[var(--muted)] font-[family:var(--f-ui)] mt-1">
                Engineering &amp; Security Publication
              </span>
            </div>

            <div className="flex flex-col">
              <span className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                Zero
              </span>
              <span className="text-xs sm:text-sm text-[var(--muted)] font-[family:var(--f-ui)] mt-1">
                Outside Investors
              </span>
            </div>

            <div className="flex flex-col">
              <span className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                100%
              </span>
              <span className="text-xs sm:text-sm text-[var(--muted)] font-[family:var(--f-ui)] mt-1">
                Editor-Reviewed
              </span>
            </div>

            <div className="flex flex-col">
              <span className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--accent)]">
                100%
              </span>
              <span className="text-xs sm:text-sm text-[var(--muted)] font-[family:var(--f-ui)] mt-1">
                Transparent &amp; Labelled Partnerships
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. OUR STORY / MISSION
          ───────────────────────────────────────────────────────────── */}
      <section className="w-full py-16 sm:py-20 lg:py-24 border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* Left Header / Hook */}
            <div className="lg:col-span-4 flex flex-col">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-3">
                <Compass className="w-4 h-4" />
                <span>Our Story &amp; Mission</span>
              </div>
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-4xl font-bold tracking-tight text-[var(--ink)] leading-snug">
                Why We Built xSypher: Separating Signal From the Noise.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                Technology is moving faster than human attention can filter. In an industry flooded with PR hype cycles and synthetic summaries, we champion verified technical truth.
              </p>

              {/* Quote / Highlight Card */}
              <div className="mt-8 p-6 rounded-lg bg-[var(--surface)] border border-[var(--line)] border-l-4 border-l-[var(--accent)] shadow-sm">
                <p className="text-sm font-medium italic text-[var(--ink)] leading-relaxed">
                  &ldquo;We don&apos;t write for algorithms or venture capitalists. We write for the engineers, security analysts, and curious minds who build and break systems in the real world.&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[var(--surface-2)] flex items-center justify-center font-bold text-xs text-[var(--accent)] border border-[var(--line)]">
                    xS
                  </span>
                  <div className="text-xs">
                    <strong className="block font-semibold text-[var(--ink)]">Anwar Iqbal Dawar</strong>
                    <span className="text-[var(--faint)]">Founder &amp; Lead Editor</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Detailed Narrative */}
            <div className="lg:col-span-8 flex flex-col gap-6 text-[var(--ink)] font-[family:var(--f-body)] text-base sm:text-lg leading-relaxed">
              <p>
                xSypher started in 2025 as a personal notebook about the systems its founder was studying — kernel internals, network protocols, cloud infrastructure and the machine-learning stack — and turned into a publication because the deep material was the part nobody else was writing.
              </p>

              <p>
                Most technology coverage is written from the press release outwards. That is not a conspiracy, it is an incentive: announcements are cheap to cover and always available. The interesting material sits one layer down — <em>how does this scheduler actually behave under load? What does this advisory mean for a service that already shipped? Is this benchmark reproducible, or was it tuned for the launch?</em> — and that is the layer we work in.
              </p>

              <p>
                So the standard we hold ourselves to is deliberately unglamorous: <strong>read the primary source, run the test, link what you claim, and say plainly when something is unproven</strong>. Where we cannot test a claim ourselves, we say whose claim it is. Where we got something wrong, the correction goes on the article.
              </p>

              <p>
                The name <strong>xSypher</strong> comes from <em>cipher</em>: a transformation you can specify exactly, verify, and repeat. That is the standard for a technical claim — if you cannot show the procedure, you have not shown anything. The &apos;x&apos; is the unknown we are still working out, which in engineering is most of it.
              </p>

              {/* Three Core Tenets Sub-block */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--line)]">
                <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
                  <div className="w-8 h-8 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-3">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h3 className="font-[family:var(--f-display)] font-semibold text-sm text-[var(--ink)] mb-1">
                    Accuracy Over Speed
                  </h3>
                  <p className="text-xs text-[var(--muted)] leading-normal">
                    We would rather be second and thoroughly accurate than first with unverified vendor marketing claims.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
                  <div className="w-8 h-8 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-3">
                    <FileCode2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-[family:var(--f-display)] font-semibold text-sm text-[var(--ink)] mb-1">
                    Code-Level Audits
                  </h3>
                  <p className="text-xs text-[var(--muted)] leading-normal">
                    Where a claim is testable we reproduce it locally — reference setups, benchmarks and the commands we ran.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
                  <div className="w-8 h-8 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-3">
                    <Scale className="w-4 h-4" />
                  </div>
                  <h3 className="font-[family:var(--f-display)] font-semibold text-sm text-[var(--ink)] mb-1">
                    Complete Independence
                  </h3>
                  <p className="text-xs text-[var(--muted)] leading-normal">
                    No vendor and no fund sets our verdicts. Where a review unit or a test account was provided, the story says so.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. WHAT WE COVER (CORE PILLARS)
          ───────────────────────────────────────────────────────────── */}
      <section className="w-full py-16 sm:py-20 lg:py-24 border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          
          {/* Section Heading */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 lg:mb-16 gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-2">
                <Layers className="w-4 h-4" />
                <span>Our Editorial Coverage</span>
              </div>
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-4xl font-bold tracking-tight text-[var(--ink)]">
                The Core Pillars of xSypher
              </h2>
            </div>
            <p className="text-sm sm:text-base text-[var(--muted)] font-[family:var(--f-ui)] max-w-md">
              Five areas, one standard: read the primary source, test what can be tested, and link the evidence.
            </p>
          </div>

          {/* Pillars Grid: Responsive 1 col -> 2 cols -> 3 cols */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Pillar 1: AI */}
            <div className="group relative p-6 sm:p-8 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-lg bg-[var(--surface)] border border-[var(--line)] group-hover:border-[var(--accent)]/50 flex items-center justify-center text-[var(--accent)] transition-colors mb-6 shadow-sm">
                  <Brain className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Pillar 01
                </span>
                <h3 className="font-[family:var(--f-display)] text-xl font-bold text-[var(--ink)] mt-1 mb-3">
                  Artificial Intelligence
                </h3>
                <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                  Deep technical dives into frontier model architectures, transformer attention mechanics, neural network weight pruning, autonomous agentic loops, and open-weights quantization.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--line)] group-hover:border-[var(--line-2)] flex flex-wrap gap-2 text-xs text-[var(--faint)]">
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">LLMs</span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">Multi-Modal</span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">Local Weights</span>
              </div>
            </div>

            {/* Pillar 2: Prompt Engineering */}
            <div className="group relative p-6 sm:p-8 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-lg bg-[var(--surface)] border border-[var(--line)] group-hover:border-[var(--accent)]/50 flex items-center justify-center text-[var(--accent)] transition-colors mb-6 shadow-sm">
                  <Terminal className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Pillar 02
                </span>
                <h3 className="font-[family:var(--f-display)] text-xl font-bold text-[var(--ink)] mt-1 mb-3">
                  Prompt Engineering
                </h3>
                <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                  Treating prompt orchestration as strict systems design. Structured context steering, few-shot reasoning topologies, semantic caching, jailbreak mitigation, and output schema validation.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--line)] group-hover:border-[var(--line-2)] flex flex-wrap gap-2 text-xs text-[var(--faint)]">
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">Context Routing</span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">Chain-of-Thought</span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">JSON Mode</span>
              </div>
            </div>

            {/* Pillar 3: Cybersecurity */}
            <div className="group relative p-6 sm:p-8 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-lg bg-[var(--surface)] border border-[var(--line)] group-hover:border-[var(--accent)]/50 flex items-center justify-center text-[var(--accent)] transition-colors mb-6 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Pillar 03
                </span>
                <h3 className="font-[family:var(--f-display)] text-xl font-bold text-[var(--ink)] mt-1 mb-3">
                  Cybersecurity &amp; Threat Intel
                </h3>
                <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                  Offensive and defensive security reporting. Dissecting zero-day CVEs, memory corruption exploits, APT telemetry, Kali Linux methodology, cryptographic breakthroughs, and threat modeling.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--line)] group-hover:border-[var(--line-2)] flex flex-wrap gap-2 text-xs text-[var(--faint)]">
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">Zero-Day CVEs</span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">Kali Linux</span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">Penetration Testing</span>
              </div>
            </div>

            {/* Pillar 4: Software */}
            <div className="group relative p-6 sm:p-8 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-lg bg-[var(--surface)] border border-[var(--line)] group-hover:border-[var(--accent)]/50 flex items-center justify-center text-[var(--accent)] transition-colors mb-6 shadow-sm">
                  <Code2 className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Pillar 04
                </span>
                <h3 className="font-[family:var(--f-display)] text-xl font-bold text-[var(--ink)] mt-1 mb-3">
                  Software Architecture
                </h3>
                <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                  Full-stack engineering decomposed. Dissecting modern frameworks like Next.js, React Server Components, TypeScript runtime guarantees, high-performance Python backends, and Rust tooling.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--line)] group-hover:border-[var(--line-2)] flex flex-wrap gap-2 text-xs text-[var(--faint)]">
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">Next.js &amp; RSC</span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">Python Systems</span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">Distributed DBs</span>
              </div>
            </div>

            {/* Pillar 5: Gadgets & Silicon */}
            <div className="group relative p-6 sm:p-8 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-lg flex flex-col justify-between md:col-span-2 lg:col-span-1">
              <div>
                <div className="w-12 h-12 rounded-lg bg-[var(--surface)] border border-[var(--line)] group-hover:border-[var(--accent)]/50 flex items-center justify-center text-[var(--accent)] transition-colors mb-6 shadow-sm">
                  <Cpu className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Pillar 05
                </span>
                <h3 className="font-[family:var(--f-display)] text-xl font-bold text-[var(--ink)] mt-1 mb-3">
                  Next-Gen Gadgets &amp; Silicon
                </h3>
                <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                  Hardware teardowns, Neural Processing Unit (NPU) benchmarks, edge AI accelerators, RISC-V developments, and hands-on reviews of hardware built for developers and power users.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--line)] group-hover:border-[var(--line-2)] flex flex-wrap gap-2 text-xs text-[var(--faint)]">
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">NPUs &amp; ASICs</span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">Hardware Teardowns</span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">Edge Compute</span>
              </div>
            </div>

            {/* Bonus Card: Investigative Dispatch */}
            <div className="group relative p-6 sm:p-8 rounded-xl bg-[var(--surface-3)] border border-[var(--line)] flex flex-col justify-between md:col-span-2 lg:col-span-1">
              <div>
                <div className="w-12 h-12 rounded-lg bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)] mb-6 shadow-sm">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Original reporting
                </span>
                <h3 className="font-[family:var(--f-display)] text-xl font-bold text-[var(--ink)] mt-1 mb-3">
                  Long-form reporting
                </h3>
                <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                  Longer-form reporting on security incidents, supply-chain failures, regulatory pressure, and the engineering decisions inside products people actually use.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between text-xs font-semibold text-[var(--accent)]">
                <Link href="/latest" className="inline-flex items-center gap-1 hover:underline">
                  Explore Latest Reports
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. OUR TEAM SECTION
          ───────────────────────────────────────────────────────────── */}
      <section className="w-full py-16 sm:py-20 lg:py-24 border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          
          {/* Section Header */}
          <div className="max-w-3xl mb-12 sm:mb-16">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-2">
              <Award className="w-4 h-4" />
              <span>The Team</span>
            </div>
            <h2 className="font-[family:var(--f-display)] text-2xl sm:text-4xl font-bold tracking-tight text-[var(--ink)]">
              Who builds xSypher
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--muted)] font-[family:var(--f-ui)]">
              A small, founder-led team of engineers and researchers. Everyone here writes, tests and ships — there is no layer of management between a story and publication.
            </p>
          </div>

          {/* PROMINENT CARD: Anwar Iqbal Dawar (Founder & Lead Editor) */}
          <div className="mb-12 p-6 sm:p-8 lg:p-10 rounded-2xl bg-[var(--surface)] border-2 border-[var(--line)] hover:border-[var(--accent)] transition-all duration-300 shadow-md relative overflow-hidden group">
            {/* Top Accent Strip */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--accent)]" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Avatar / Portrait Column */}
              <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left lg:-ml-3">
                <div className="relative w-fit mx-auto lg:mx-0 lg:mr-auto lg:w-full lg:max-w-[300px] mt-2 lg:-mt-6">
                  {/* Avatar Frame with Cyber Glow */}
                  <div className="relative mx-auto lg:mx-0 w-52 h-52 sm:w-64 sm:h-64 lg:w-full lg:max-w-[300px] lg:h-auto lg:aspect-[4/5] rounded-2xl bg-[var(--surface-2)] lg:bg-transparent border-2 border-[var(--accent)] lg:border-none overflow-hidden flex items-center justify-center shadow-md lg:shadow-none transition-colors">
                    <Image
                      src="/anwar.webp"
                      alt="Anwar Iqbal Dawar"
                      width={360}
                      height={450}
                      className="w-full h-full object-cover object-top lg:object-center origin-bottom lg:origin-center scale-[0.97] lg:scale-100 -translate-x-2.5 lg:translate-x-0 rounded-2xl"
                      priority
                    />
                    {/* Desktop Bottom Fade Overlay */}
                    <div 
                      className="hidden lg:block absolute bottom-0 left-0 w-full h-14 bg-gradient-to-t from-[var(--surface)] to-transparent pointer-events-none" 
                      aria-hidden="true" 
                    />
                  </div>
                  {/* Verified Badge */}
                  <div 
                    className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-[var(--accent)] text-white shadow-md lg:hidden"
                    title="Verified Founder & Editor"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-5 lg:mt-2.5 relative z-10">
                  <span className="inline-block px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 mb-2">
                    Founder &amp; Lead Editor
                  </span>
                  <h3 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)]">
                    Anwar Iqbal Dawar
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--muted)] font-[family:var(--f-ui)] mt-0.5">
                    Computer Engineering Scholar &bull; Future Cyber Cloud Engineer
                  </p>
                </div>

                {/* Social & Contact Buttons */}
                <div className="flex items-center gap-3 mt-4 lg:mt-4 relative z-10">
                  <a 
                    href="https://github.com/anwariqbaldawar/AnwarIqbaldawar" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label="Anwar Iqbal Dawar on GitHub"
                    className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--ink)] border border-[var(--line)] transition-colors"
                  >
                    <SocialIcon platform="github" />
                  </a>
                  <a 
                    href="https://x.com/engr_anwardawar" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label="Anwar Iqbal Dawar on X"
                    className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--ink)] border border-[var(--line)] transition-colors"
                  >
                    <SocialIcon platform="x" />
                  </a>
                  <a 
                    href="https://www.linkedin.com/in/anwar-iqbal-dawar-6564ba37a" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label="Anwar Iqbal Dawar on LinkedIn"
                    className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--ink)] border border-[var(--line)] transition-colors"
                  >
                    <SocialIcon platform="linkedin" />
                  </a>
                  <a 
                    href="mailto:anwar@xsypher.com" 
                    aria-label="Email: anwar@xsypher.com"
                    title="anwar@xsypher.com"
                    className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--ink)] border border-[var(--line)] transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Bio & Philosophy Column */}
              <div className="lg:col-span-8 flex flex-col justify-between">
                <div>
                  <h4 className="font-[family:var(--f-display)] text-base sm:text-lg font-bold text-[var(--ink)] mb-3">
                    Biography &amp; Technical Stance
                  </h4>
                  <p className="text-sm sm:text-base text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed mb-4">
                    Anwar Iqbal Dawar built his foundational expertise while pursuing a <strong>BS in Computer Engineering</strong> at <strong>CECOS University Peshawar</strong>. Driven by an intense curiosity for how complex networks and software systems operate at a hardware level, Anwar focuses on identifying structural vulnerabilities before they can be exploited. His engineering background provides a rigorous, math-and-logic-driven approach to solving modern security challenges.
                  </p>
                  <p className="text-sm sm:text-base text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                    Looking ahead, Anwar is actively shaping his trajectory toward an <strong>MS in Cybersecurity</strong>, with the ultimate goal of becoming a <strong>Cyber Cloud Engineer</strong>. He believes the future of technology lies in securing decentralized, cloud-native infrastructures. At xSypher, Anwar ensures that every piece of technical journalism is grounded in authentic engineering principles, bridging the gap between academic research and frontline cloud defense.
                  </p>
                </div>

                {/* Anwar's Technical Stack Badges */}
                <div className="mt-6 pt-5 border-t border-[var(--line)]">
                  <span className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider block mb-2.5">
                    Core Specializations &amp; Tools:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)]">
                      C++ &amp; Python
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)]">
                      Full-Stack Web Development
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)]">
                      Next.js &amp; React Architecture
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)]">
                      Linux OS Administration
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)]">
                      Cloud Infrastructure Security
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)]">
                      Penetration Testing
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TEAM MEMBERS GRID: Balanced 2x2 Layout on Tablets & Desktops */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            
            {/* Team Member 1: Ameer Muawiya Khattak */}
            <div className="group p-6 sm:p-7 rounded-2xl bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)]/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-4 sm:gap-5 mb-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] group-hover:border-[var(--accent)]/40 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-colors">
                    <Image
                      src="/amk.webp"
                      alt="Ameer Muawiya Khattak"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="pt-0.5 min-w-0">
                    <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 mb-1.5">
                      Co-Founder &amp; CTO
                    </span>
                    <h3 className="font-[family:var(--f-display)] text-lg sm:text-xl font-bold text-[var(--ink)] leading-snug">
                      Ameer Muawiya Khattak
                    </h3>
                    <p className="text-xs text-[var(--faint)] mt-0.5 font-[family:var(--f-ui)]">Engineering &amp; Infrastructure</p>
                  </div>
                </div>
                <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                  Builds and maintains the platform this publication runs on — the web application, the database and storage plumbing, and the deployment pipeline — alongside his own infrastructure work.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5 text-xs text-[var(--muted)]">
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">Cloud Architecture</span>
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">DevOps</span>
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">SRE</span>
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">Infrastructure</span>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors">
                    <SocialIcon platform="github" />
                  </a>
                  <a href="https://www.instagram.com/xd_mk_37/?hl=en" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors">
                    <SocialIcon platform="instagram" />
                  </a>
                  <a href="https://x.com/MaviKtk" target="_blank" rel="noopener noreferrer" aria-label="X" className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors">
                    <SocialIcon platform="x" />
                  </a>
                </div>
              </div>
            </div>

            {/* Team Member 2: Tariq Jameel */}
            <div className="group p-6 sm:p-7 rounded-2xl bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)]/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-4 sm:gap-5 mb-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] group-hover:border-[var(--accent)]/40 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-colors">
                    <Image
                      src="/tj.webp"
                      alt="Tariq Jameel"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="pt-0.5 min-w-0">
                    <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 mb-1.5">
                      Systems &amp; Security Engineer
                    </span>
                    <h3 className="font-[family:var(--f-display)] text-lg sm:text-xl font-bold text-[var(--ink)] leading-snug">
                      Tariq Jameel
                    </h3>
                    <p className="text-xs text-[var(--faint)] mt-0.5 font-[family:var(--f-ui)]">Computer Engineer &bull; Cyber Infrastructure</p>
                  </div>
                </div>
                <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                  Computer Engineer focused on cyber defense, networking protocols, and Linux system administration. Adept in Python automation and modern web development architecture.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5 text-xs text-[var(--muted)]">
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">Cybersecurity</span>
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">Linux &amp; Python</span>
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">Networking</span>
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">Web Dev</span>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <a href="https://github.com/tariq-jameel-2024" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors">
                    <SocialIcon platform="github" />
                  </a>
                  <a href="https://www.linkedin.com/in/tariq-jameel-4392a8370" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors">
                    <SocialIcon platform="linkedin" />
                  </a>
                  <a href="https://x.com/TJameel99371" target="_blank" rel="noopener noreferrer" aria-label="X" className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors">
                    <SocialIcon platform="x" />
                  </a>
                </div>
              </div>
            </div>

            {/* Team Member 3: Khizar Muzzamail */}
            <div className="group p-6 sm:p-7 rounded-2xl bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)]/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-4 sm:gap-5 mb-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] group-hover:border-[var(--accent)]/40 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-colors">
                    <Image
                      src="/km.webp"
                      alt="Khizar Muzzamail"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="pt-0.5 min-w-0">
                    <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 mb-1.5">
                      Lead Security Researcher
                    </span>
                    <h3 className="font-[family:var(--f-display)] text-lg sm:text-xl font-bold text-[var(--ink)] leading-snug">
                      Khizar Muzzamail
                    </h3>
                    <p className="text-xs text-[var(--faint)] mt-0.5 font-[family:var(--f-ui)]">Vulnerability Research &amp; Audits</p>
                  </div>
                </div>
                <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                  Researches and writes on vulnerability analysis, attack-surface review and defensive tooling — including the parts of a disclosure that a vendor advisory tends to leave out.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5 text-xs text-[var(--muted)]">
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">Threat Intel</span>
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">Security Audits</span>
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">AppSec</span>
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">Zero-Day</span>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <a href="https://github.com/khizar5370" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors">
                    <SocialIcon platform="github" />
                  </a>
                  <a href="https://www.linkedin.com/in/khizar-khan-800aa7415" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors">
                    <SocialIcon platform="linkedin" />
                  </a>
                  <a href="https://x.com/Khizar5370" target="_blank" rel="noopener noreferrer" aria-label="X" className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors">
                    <SocialIcon platform="x" />
                  </a>
                </div>
              </div>
            </div>

            {/* Team Member 4: Tariq Aziz */}
            <div className="group p-6 sm:p-7 rounded-2xl bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)]/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-4 sm:gap-5 mb-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] group-hover:border-[var(--accent)]/40 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-colors">
                    <Image
                      src="/tariq.webp"
                      alt="Tariq Aziz"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="pt-0.5 min-w-0">
                    <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 mb-1.5">
                      Social Media Coordinator
                    </span>
                    <h3 className="font-[family:var(--f-display)] text-lg sm:text-xl font-bold text-[var(--ink)] leading-snug">
                      Tariq Aziz
                    </h3>
                    <p className="text-xs text-[var(--faint)] mt-0.5 font-[family:var(--f-ui)]">Community &amp; Communications</p>
                  </div>
                </div>
                <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                  Runs our social accounts and community replies, and handles the outreach that puts a story in front of the people it was written for.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5 text-xs text-[var(--muted)]">
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">Social Media</span>
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">Growth</span>
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">PR</span>
                  <span className="px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] font-medium">Branding</span>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <a href="https://www.facebook.com/tariq.dawar.571980" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors">
                    <SocialIcon platform="facebook" />
                  </a>
                  <a href="https://www.instagram.com/tariq_dawar0/?hl=en" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors">
                    <SocialIcon platform="instagram" />
                  </a>
                  <a href="https://x.com/TariqAzizr0l" target="_blank" rel="noopener noreferrer" aria-label="X" className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors">
                    <SocialIcon platform="x" />
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. OUR EDITORIAL PROMISE
          ───────────────────────────────────────────────────────────── */}
      <section className="w-full py-16 sm:py-20 lg:py-24 border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-3">
              <Scale className="w-4 h-4" />
              <span>Ethical Standards</span>
            </div>
            <h2 className="font-[family:var(--f-display)] text-2xl sm:text-4xl font-bold tracking-tight text-[var(--ink)]">
              What we promise — and what you can hold us to
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--muted)] font-[family:var(--f-ui)] leading-relaxed">
              Four commitments that decide what runs, what gets corrected, and who gets a say in it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            
            {/* Promise 1 */}
            <div className="p-6 sm:p-8 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] hover:border-[var(--line-2)] transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)] shrink-0 shadow-sm">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-[family:var(--f-display)] text-lg font-bold text-[var(--ink)] mb-2">
                    1. Primary-source verification
                  </h3>
                  <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                    We do not pass on vendor claims as findings. Technical statements, performance numbers and vulnerability reports are checked against the primary source — the specification, the repository, the advisory — and tested on our own machines wherever a test is possible. When a number came from somebody else, the story says whose it is.
                  </p>
                </div>
              </div>
            </div>

            {/* Promise 2 */}
            <div className="p-6 sm:p-8 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] hover:border-[var(--line-2)] transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)] shrink-0 shadow-sm">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-[family:var(--f-display)] text-lg font-bold text-[var(--ink)] mb-2">
                    2. A real wall between editorial and commercial
                  </h3>
                  <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                    No advertiser, sponsor or investor gets preview access or a say in what we publish. The publication is supported by clearly labelled Sponsored Deep-Dives, Partner Content and display/newsletter sponsorships — every paid format carries a &ldquo;Sponsored&rdquo; or &ldquo;Partner&rdquo; tag before the first paragraph. Where a sponsor&apos;s product is independently reviewed, the verdict stays ours: sponsorship buys placement, never conclusions.
                  </p>
                </div>
              </div>
            </div>

            {/* Promise 3 */}
            <div className="p-6 sm:p-8 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] hover:border-[var(--line-2)] transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)] shrink-0 shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-[family:var(--f-display)] text-lg font-bold text-[var(--ink)] mb-2">
                    3. Corrections live on the article
                  </h3>
                  <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                    When we get something wrong, the fix goes on the story itself, with a timestamp and a note explaining what changed. Minor typos are fixed silently; substantive changes never are. Anyone can report an error and get an answer within two business days — the policy and the form are on our corrections page.
                  </p>
                </div>
              </div>
            </div>

            {/* Promise 4 */}
            <div className="p-6 sm:p-8 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] hover:border-[var(--line-2)] transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)] shrink-0 shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-[family:var(--f-display)] text-lg font-bold text-[var(--ink)] mb-2">
                    4. Source protection, honestly described
                  </h3>
                  <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                    Sensitive tip? Ask for an encrypted channel and we will use one — authors can publish a PGP key on their profile. We keep the minimum material needed to verify a story and publish nothing that could identify a source who asked us not to. We will also tell you plainly what we can and cannot protect: we do not operate a third-party secure-drop service, and we would rather say that than pretend otherwise.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. INTERACTIVE CTA / CONTACT & NEWSLETTER SECTION
          ───────────────────────────────────────────────────────────── */}
      <section className="w-full py-16 sm:py-20 lg:py-24 bg-[var(--paper)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] p-8 sm:p-12 text-center shadow-md relative overflow-hidden">
            {/* Glow effect */}
            <div 
              className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[var(--accent)] opacity-10 blur-2xl pointer-events-none" 
              aria-hidden="true" 
            />

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)] mb-4">
              <Globe2 className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Connect with xSypher</span>
            </div>

            <h2 className="font-[family:var(--f-display)] text-2xl sm:text-4xl font-extrabold text-[var(--ink)] tracking-tight">
              Got a tip, a correction or a system worth tearing down?
            </h2>

            <p className="mt-4 text-sm sm:text-base text-[var(--muted)] font-[family:var(--f-body)] max-w-2xl mx-auto leading-relaxed">
              We read every credible tip, technical correction and collaboration request ourselves. If something here does not match how we behave, tell us — that is the fastest way to get it fixed.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/latest"
                className="group relative w-full sm:w-auto inline-flex items-center justify-center overflow-hidden px-6 py-3.5 rounded-xl font-semibold text-sm !bg-[var(--accent)] dark:!bg-[var(--accent)] !text-white dark:!text-white hover:brightness-110 active:scale-95 transition-all shadow-sm"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Read Latest Stories
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </Link>
              <Link
                href="/page/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm text-[var(--ink)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--line)] transition-all"
              >
                Contact the desk
                <Mail className="w-4 h-4" />
              </Link>
              <Link
                href="/page/transparency"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm text-[var(--ink)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--line)] transition-all"
              >
                How we are funded
                <ShieldCheck className="w-4 h-4" />
              </Link>
            </div>

            {/* Official profiles — the same ordered set as the footer. */}
            <div className="mt-10 flex flex-col items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--faint)]">
                Follow xSypher
              </span>
              <SocialLinks
                className="flex items-center justify-center gap-2"
                linkClassName="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
