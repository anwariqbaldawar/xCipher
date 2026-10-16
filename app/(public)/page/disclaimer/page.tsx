import { ShieldAlert, AlertTriangle, Scale, Cpu, TerminalSquare, FileText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { brandBannerUrl, constructMetadata, siteConfig } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Technical Disclaimer — xSypher',
  description:
    'Liability, safety and dual-use boundaries for xSypher’s technical, coding, hardware-modification and cybersecurity content — including our responsible vulnerability disclosure terms and the no-warranty clause covering all code we publish.',
  canonical: `${siteConfig.url}/page/disclaimer`,
  image: brandBannerUrl(),
  imageAlt: 'xSypher technical disclaimer',
});

/**
 * Technical Disclaimer
 *
 * The five clauses are the same five the page has always carried — educational
 * use, dual-use research, hardware modification, responsible disclosure and the
 * as-is warranty clause. What changed is that each one now states its boundary
 * explicitly: what we assert, what we refuse, what the reader assumes, and what
 * we will do if a vendor objects. A disclaimer that only says "we are not
 * liable" protects nobody and informs nobody.
 */
export default function DisclaimerPage() {
  return (
    <div className="bg-[var(--surface)] min-h-screen">
      <header className="border-b border-[var(--line)] bg-[var(--surface-2)]">
        <div className="max-w-7xl mx-auto px-4 pt-32 pb-16 sm:pt-40 sm:px-8 lg:pt-44 lg:px-12 relative z-10">
          <div className="max-w-3xl">
            <span className="text-[var(--accent)] font-bold text-xs uppercase tracking-widest mb-3 block">
              Legal &amp; Compliance
            </span>
            <h1 className="font-[family:var(--f-display)] text-4xl sm:text-5xl font-bold mb-4 text-[var(--ink)] tracking-tight">
              Technical Disclaimer
            </h1>
            <p className="font-[family:var(--f-body)] text-lg text-[var(--muted)] leading-relaxed">
              Limits of liability regarding zero-day research, dual-use technology, hardware reverse engineering, and exploit documentation published on xSypher.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--faint)]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
              Last Updated: October 16, 2026
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-8 lg:px-12 flex flex-col lg:flex-row gap-12">
        <aside className="lg:w-1/4 hidden lg:block shrink-0">
          <div className="sticky top-32">
            <h4 className="font-[family:var(--f-display)] font-bold text-sm text-[var(--ink)] uppercase tracking-wider mb-4 border-b border-[var(--line)] pb-2">
              Table of Contents
            </h4>
            <nav className="flex flex-col font-[family:var(--f-ui)] text-sm border-l-2 border-[var(--line-2)]">
              <a href="#educational" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">1. Educational &amp; Defensive Purpose</a>
              <a href="#dual-use" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">2. Dual-Use Research &amp; PoC Boundaries</a>
              <a href="#hardware-liability" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">3. Hardware &amp; Firmware Liability</a>
              <a href="#safe-harbor" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">4. Responsible Disclosure</a>
              <a href="#no-warranties" className="-ml-[2px] py-2 pl-4 border-l-2 border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] transition-all font-medium">5. Software &amp; Code “As-Is”</a>
            </nav>
          </div>
        </aside>

        <article className="lg:w-3/4 max-w-3xl text-[var(--ink)] space-y-16">

          <section id="educational" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <ShieldAlert className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)] m-0">
                1. Educational &amp; Defensive Purposes Only
              </h2>
            </div>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-[var(--muted)] font-[family:var(--f-body)]">
              <p>
                All cybersecurity tutorials, exploit breakdowns, reverse-engineering concepts, code snippets, firmware analyses and configuration guidance published on xSypher are provided strictly for <strong>educational and defensive purposes</strong>. We publish them so that security researchers, system administrators, blue teams and developers can understand how a class of attack works, detect it, and patch it.
              </p>
              <p>
                Reading this material does not grant you permission to test anything. You may only execute the concepts, scripts or payloads described here against systems you own outright, or systems for which you hold <strong>explicit, written authorisation</strong> from the owner that names the scope and the window of testing. Curiosity, a public IP address, or a bug-bounty programme that excludes the target are not authorisation.
              </p>
              <p>
                We do not publish working exploit code targeted at a named, unpatched victim; step-by-step instructions intended to facilitate unauthorised access; or material whose only practical use is to cause harm. Where a technique is documented, it is documented at the level required to defend against it.
              </p>
            </div>
          </section>

          <section id="dual-use" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <TerminalSquare className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)] m-0">
                2. Dual-Use Technology Clause &amp; PoC Boundaries
              </h2>
            </div>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-[var(--muted)] font-[family:var(--f-body)]">
              <p>
                Security knowledge is inherently dual-use: the same technique used to audit a network can be used to compromise it. Scanners, fuzzers, debuggers and proof-of-concept code are legitimate instruments of research, and their publication is protected expression. xSypher publishes in that tradition, while drawing a deliberate line around intent.
              </p>
              <p>
                <strong>What we do:</strong> explain vulnerabilities and defences in technical depth; publish reproducible methodology and detection guidance; attribute research to the people who did it; and refuse to sensationalise an unpatched issue for traffic.
              </p>
              <p>
                <strong>What we do not do:</strong> supply turnkey tooling whose primary design goal is disruption; publish data exfiltrated from a real breach; expose the personal data of victims; or coordinate with anyone seeking to monetise an attack. xSypher unequivocally opposes the weaponisation of research for unauthorised disruption, data theft, extortion or state-sponsored cyber operations.
              </p>
              <p>
                We are not responsible for the use another party makes of published research or code, and we do not adopt the intent of anyone who misuses it. If you intend to cause harm, this publication is not for you.
              </p>
            </div>
          </section>

          <section id="hardware-liability" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <Cpu className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)] m-0">
                3. Hardware &amp; Firmware Modification Liability
              </h2>
            </div>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-[var(--muted)] font-[family:var(--f-body)]">
              <p>
                xSypher covers hardware reverse engineering, firmware flashing, teardowns, overclocking, soldering and physical modification of IoT, networking and consumer devices. If you choose to follow a hardware guide, jumper configuration, bootloader unlock or voltage modification discussed on this platform, you assume the total risk and the total responsibility.
              </p>
              <p>
                xSypher and its authors shall not be liable for any of the following resulting from your attempt to reproduce a procedure we describe:
              </p>
              <ul>
                <li>Bricked, unrecoverable or permanently damaged silicon, microcontrollers, boards or storage.</li>
                <li>Voided manufacturer warranties, banned device identifiers, or lost remote-management access.</li>
                <li>Electrical hazards, thermal events, fires, or personal injury arising from improper handling, power delivery or heat management.</li>
                <li>Loss of data, service interruption, regulatory non-compliance, or contractual breach arising from a modified device on a network you operate or attach to.</li>
                <li>Misconfiguration of a device that weakens third-party or shared infrastructure safety.</li>
              </ul>
              <p>
                Procedures are described as they applied to the specific hardware revision we tested. Manufacturers change boards silently, and a procedure that was safe on one revision can destroy another. Verify against your own device, use appropriate tools and protective equipment, and never modify equipment you do not own or a device on a network you are not authorised to alter.
              </p>
            </div>
          </section>

          <section id="safe-harbor" className="scroll-mt-28">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <Scale className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)] m-0">
                4. Safe Harbor &amp; Responsible Disclosure
              </h2>
            </div>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-[var(--muted)] font-[family:var(--f-body)]">
              <p>
                We routinely collaborate with independent security researchers who provide tips, datasets, artefacts or PoCs concerning vulnerabilities. xSypher operates under a strict journalistic standard, and the terms below are the ones we will hold to in public.
              </p>
              <ul>
                <li><strong>Source protection:</strong> we will not voluntarily disclose the identity of a confidential source or whistleblower to a corporate entity, a threat actor or law enforcement. Materials are handled on encrypted channels where the source requests it, and we keep only what is needed to verify a story.</li>
                <li><strong>Disclosure window:</strong> before publishing details of a critical, unpatched vulnerability, xSypher enforces a standard <strong>90-day embargo</strong> to notify the affected vendor and allow a fix to be developed and deployed. We will extend that window in good faith where a vendor shows demonstrable, documented progress.</li>
                <li><strong>Accelerated publication:</strong> we reserve the right to shorten an embargo to as little as <strong>7 days</strong>, typically without technical detail, if a vulnerability is being exploited in the wild, if a fix is already available, or if a vendor is silent, hostile or misrepresenting the risk to users.</li>
                <li><strong>Notice to vendors:</strong> we contact the vendor, or the relevant national CERT/CSIRT where no channel exists, with enough technical detail to reproduce and remediate the issue — not a teaser, and not a countdown.</li>
                <li><strong>Researcher safety:</strong> we coordinate with researchers who acted in good faith, we credit them by name unless asked not to, and we will not hand their reporting to third parties for retaliation. Researchers are responsible for their own authorisation and legal compliance during testing; xSypher cannot grant authorisation over systems we do not own.</li>
                <li><strong>Vulnerabilities in our own platform:</strong> suspected issues in xsypher.com itself should go to <a href="mailto:contact@xsypher.com">contact@xsypher.com</a>, consistent with our <Link href="/.well-known/security.txt">security.txt</Link> policy. We will acknowledge a report, tell you what we intend to do, and credit you if you wish.</li>
              </ul>
            </div>
          </section>

          <section id="no-warranties" className="scroll-mt-28 pb-12">
            <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
              <AlertTriangle className="w-6 h-6 text-[var(--accent)]" />
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold text-[var(--ink)] m-0">
                5. Software &amp; Code “As-Is” — No Warranty
              </h2>
            </div>
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-[var(--muted)] font-[family:var(--f-body)]">
              <p>
                Any code, script, configuration fragment, command, benchmark harness or query published on xSypher is provided <strong>“as is” and “as available”, without warranty of any kind</strong>, express or implied. Without limiting that, we disclaim the implied warranties of merchantability, fitness for a particular purpose, title and non-infringement.
              </p>
              <p>
                We do not warrant that published code is complete, correct, secure, current or suitable for your environment; that it will run without modification; that it is free of defects; or that any vulnerability it addresses is the only relevant issue. Software, firmware, dependencies, APIs and threats change continuously, and material that was accurate when published may be obsolete or actively unsafe later. Where a story is superseded we update it and note the change, in line with our corrections protocol.
              </p>
              <p>
                To the maximum extent permitted by law, xSypher, its publisher and its contributors shall not be liable for any direct, indirect, incidental, special, consequential or exemplary loss or damage — including loss of data, profit, revenue, service or goodwill — arising from the use of, or reliance on, anything published here, however caused and under any theory of liability.
              </p>
              <p>
                <strong>Test in an isolated environment first.</strong> Never run untrusted code with production credentials, on a host carrying sole copies of important data, or against infrastructure you do not control. You are responsible for your own backups, staging environments and change control.
              </p>
              <p>
                By using this platform and reading our research you signify your acceptance of this disclaimer. Editorial judgements, bylines and attribution are governed by our <Link href="/page/editorial-policy">Editorial Policy</Link>, and the handling of personal data by our <Link href="/page/privacy-policy">Privacy Policy</Link>. If you do not agree with these terms, you must stop using xSypher.
              </p>
              <p className="mt-6 flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-[var(--accent)]" />
                <span>Questions about these clauses: <a href="mailto:legal@xsypher.com" className="text-[var(--accent)] hover:underline font-semibold">legal@xsypher.com</a></span>
              </p>
            </div>
          </section>

        </article>
      </div>
    </div>
  );
}
