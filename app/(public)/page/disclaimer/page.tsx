import type { Metadata } from "next";
import {
  AlertTriangle,
  Bug,
  Cpu,
  FileCheck2,
  Gavel,
  Library,
  Mail,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import {
  PolicyButton,
  PolicyCallout,
  PolicyCard,
  PolicyCta,
  PolicyFacts,
  PolicyFooterNote,
  PolicyHero,
  PolicyLayout,
  PolicyLink,
  PolicyPage,
  PolicyPoint,
  PolicyPoints,
  PolicyRows,
  PolicySection,
} from "@/components/policy/PolicyKit";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Technical Disclaimer — Liability, Dual-Use & Disclosure Terms | xSypher",
  description:
    "The terms that govern xSypher's technical content: educational and defensive use only, dual-use research and PoC boundaries, hardware and firmware modification liability, our responsible vulnerability disclosure process, and the as-is no-warranty clause covering all code we publish.",
  canonical: `${siteConfig.url}/page/disclaimer`,
  image: brandBannerUrl(),
  imageAlt: "xSypher technical disclaimer",
});

/**
 * Technical Disclaimer
 *
 * Rebuilt on PolicyKit so this document reads as part of the same family as the
 * Transparency Report, the Editorial Standards and the Editorial Policy: same
 * hero, same fact strip, same numbered sections, same cards and callouts.
 *
 * The five clauses the page has always carried are all still here, under their
 * original anchors, and each one now states its boundary explicitly — what we
 * assert, what we refuse, what the reader assumes, and what we will do if a
 * vendor objects. A disclaimer that only says "we are not liable" protects
 * nobody and informs nobody, and it is thin ground for an advertising review.
 */

const CONTENTS = [
  { id: "scope", label: "1. Scope of this notice" },
  { id: "educational", label: "2. Educational & defensive use" },
  { id: "dual-use", label: "3. Dual-use research & PoCs" },
  { id: "hardware-liability", label: "4. Hardware & firmware" },
  { id: "safe-harbor", label: "5. Responsible disclosure" },
  { id: "no-warranties", label: "6. Code is provided “as-is”" },
  { id: "liability", label: "7. Limitation of liability" },
  { id: "contact", label: "8. Reporting & document control" },
];

export default function DisclaimerPage() {
  return (
    <PolicyPage>
      <PolicyHero
        badge="Technical Disclaimer"
        badgeIcon={ShieldAlert}
        meta="Last reviewed: October 16, 2026"
        title="What our technical content does and does not authorise."
        lede={
          <>
            <p>
              xSypher publishes security research, exploit analysis, code, benchmarks and hardware
              teardowns. This page states the limits that come with all of it: what the material is for, what it
              is not permission to do, who carries the risk when hardware or firmware is modified, and what we
              will do when a vendor disputes a finding.
            </p>
            <p>
              It applies to every article, repository snippet, download and diagram on this site. Where a
              specific story needs a narrower term, the story says so in its own words.
            </p>
          </>
        }
        actions={
          <>
            <PolicyButton href="/page/contact" icon={Mail}>
              Report a vulnerability
            </PolicyButton>
            <PolicyButton href="/page/editorial-standards" icon={FileCheck2} variant="ghost">
              Editorial standards
            </PolicyButton>
          </>
        }
      />

      <PolicyFacts
        facts={[
          {
            label: "Disclosure embargo",
            value: "90 days",
            note: "Standard notice to a vendor before we publish an unpatched critical issue.",
          },
          {
            label: "Accelerated window",
            value: "7 days",
            note: "Used when an issue is already being exploited, or the vendor has gone silent.",
          },
          {
            label: "Code warranty",
            value: "None",
            note: "Everything published is “as-is”. You test it, you own the outcome.",
          },
          {
            label: "Security contact",
            value: "contact@xsypher.com",
            note: "For vulnerabilities in xsypher.com itself, per our security.txt policy.",
          },
        ]}
      />

      <PolicyLayout
        contents={CONTENTS}
        asideNote={
          <>
            Reading this with a legal or editorial question in mind?{" "}
            <PolicyLink href="/page/contact">Contact the desk</PolicyLink> — routed to the editor, not to a
            form queue.
          </>
        }
      >
        {/* ── 1. SCOPE ─────────────────────────────────────────────────────── */}
        <PolicySection id="scope" index={1} title="Scope of this notice" icon={Library}>
          <p>
            This notice covers everything technical we publish: vulnerability write-ups and exploit analysis,
            proof-of-concept code, shell and configuration snippets, benchmark methodology and results, firmware
            and hardware teardown guides, reverse-engineering walkthroughs, architecture diagrams, and the
            downloadable material that accompanies them.
          </p>
          <p>
            It is a condition of using this site. If you do not accept it, the material is not licensed to you
            — and where the terms here and a term stated inside an individual article disagree, the stricter of
            the two applies.
          </p>
          <PolicyCard title="How this page relates to our other documents" icon={Scale}>
            <PolicyPoints>
              <PolicyPoint label="Editorial standards govern what we publish.">
                Sourcing, verification, benchmarking and corrections are defined in the{" "}
                <PolicyLink href="/page/editorial-standards">Editorial Standards</PolicyLink>.
              </PolicyPoint>
              <PolicyPoint label="The privacy policy governs reader data.">
                What we collect, why, and how to have it removed is in the{" "}
                <PolicyLink href="/page/privacy-policy">Privacy Policy</PolicyLink>.
              </PolicyPoint>
              <PolicyPoint label="This page governs your use of the technical material.">
                Authorisation, liability, hardware risk and disclosure terms live here.
              </PolicyPoint>
            </PolicyPoints>
          </PolicyCard>
        </PolicySection>

        {/* ── 2. EDUCATIONAL & DEFENSIVE USE ───────────────────────────────── */}
        <PolicySection id="educational" index={2} title="Educational & defensive use only" icon={ShieldCheck}>
          <p>
            Everything we publish is provided strictly for <strong className="text-[var(--ink)]">educational and defensive purposes</strong>.
            It exists so that researchers, blue teams, system administrators and developers can understand how a
            class of attack works, detect it in their own telemetry, and patch it before somebody else finds it
            the hard way.
          </p>
          <p>
            Reading our material does not grant you permission to test anything. You may run the concepts,
            scripts or payloads described here only against systems you own outright, or against systems for
            which you hold <strong className="text-[var(--ink)]">explicit written authorisation</strong> that
            names the scope, the window and the point of contact. Curiosity is not authorisation. A public IP
            address is not authorisation. A bug-bounty programme you have not read, or one that excludes the
            target you have in mind, is not authorisation.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PolicyCard title="What we publish and why" tone="ok" icon={ShieldCheck}>
              <PolicyPoints>
                <PolicyPoint label="Technique at defence depth." tone="ok">
                  Enough detail to build a detection, a patch or a mitigation.
                </PolicyPoint>
                <PolicyPoint label="Reproducible methodology." tone="ok">
                  Test conditions published alongside the result so a reader can check it.
                </PolicyPoint>
                <PolicyPoint label="Attribution." tone="ok">
                  The researchers behind a finding are named and linked, not absorbed.
                </PolicyPoint>
              </PolicyPoints>
            </PolicyCard>
            <PolicyCard title="What we refuse to publish" tone="no" icon={AlertTriangle}>
              <PolicyPoints>
                <PolicyPoint label="Weaponised tooling." tone="no">
                  Nothing whose primary design goal is disruption, extortion or unauthorised access.
                </PolicyPoint>
                <PolicyPoint label="Victim data." tone="no">
                  No exfiltrated records, no personal data of breach victims, no credential dumps.
                </PolicyPoint>
                <PolicyPoint label="A live kill shot." tone="no">
                  No working exploit aimed at a named organisation that has not yet had time to patch.
                </PolicyPoint>
              </PolicyPoints>
            </PolicyCard>
          </div>
          <PolicyCallout title="If you are unsure whether your test is authorised, it is not." tone="warn" icon={AlertTriangle}>
            Written permission from the asset owner — naming your IPs, your window and what you may touch — is
            the only thing that converts curiosity into lawful testing. No article on this site supplies that
            permission, and nothing here should be read as an invitation to probe a third party.
          </PolicyCallout>
        </PolicySection>

        {/* ── 3. DUAL-USE RESEARCH ─────────────────────────────────────────── */}
        <PolicySection id="dual-use" index={3} title="Dual-use research & PoC boundaries" icon={TerminalSquare}>
          <p>
            Security knowledge is inherently dual-use: the same technique that audits a network can compromise
            it. Scanners, fuzzers, debuggers and proof-of-concept code are legitimate instruments of research,
            and publishing them is protected expression in most jurisdictions we are read in. xSypher publishes
            in that tradition while drawing a deliberate line around intent.
          </p>
          <PolicyRows
            rows={[
              {
                label: "Our position",
                value:
                  "Security research is a public good. Withholding how a class of bug works favours attackers, who already know, over defenders, who need to detect it.",
              },
              {
                label: "Our boundary",
                value:
                  "Depth is bound to defence. Where a technique can be documented at the level needed to build a detection or a fix, that is the level we publish — not a turnkey exploitation chain.",
              },
              {
                label: "Your responsibility",
                value:
                  "You alone are accountable for what you do with the knowledge. We do not adopt the intent of anyone who misuses published research, and we will not help anyone who arrives with it.",
              },
              {
                label: "Use we oppose",
                value:
                  "Unauthorised intrusion, data theft, ransomware, extortion, surveillance of individuals or communities, and state-sponsored cyber operations against civil society.",
              },
            ]}
          />
          <PolicyCallout title="Dual-use is a property of the knowledge, not a licence for the reader." tone="accent" icon={Scale}>
            If your plan depends on a target not knowing, on authorisation you cannot produce in writing, or on
            someone else footing the cost of the damage, this publication is not for you.
          </PolicyCallout>
        </PolicySection>

        {/* ── 4. HARDWARE & FIRMWARE ───────────────────────────────────────── */}
        <PolicySection
          id="hardware-liability"
          index={4}
          title="Hardware & firmware modification liability"
          icon={Cpu}
        >
          <p>
            We cover hardware reverse engineering, firmware flashing, teardowns, overclocking, soldering and
            physical modification of IoT, networking and consumer devices. If you follow one of these guides —
            a jumper configuration, a bootloader unlock, a voltage or clock modification, a flash you write
            yourself — you assume the total risk and the total responsibility for what happens to that device.
          </p>
          <p>
            xSypher and its authors accept no liability for any of the following arising from an attempt to
            reproduce a procedure described on this platform:
          </p>
          <PolicyCard title="Damage you carry, not us" tone="no" icon={AlertTriangle}>
            <PolicyPoints>
              <PolicyPoint label="Destroyed hardware." tone="no">
                Bricked, unrecoverable or permanently damaged silicon, microcontrollers, boards, storage and
                peripherals.
              </PolicyPoint>
              <PolicyPoint label="Voided warranties and lost access." tone="no">
                Voided manufacturer warranties, banned device identifiers, revoked remote-management access.
              </PolicyPoint>
              <PolicyPoint label="Electrical and thermal harm." tone="no">
                Overcurrent, thermal events, fires or personal injury from improper handling, power delivery or
                heat management.
              </PolicyPoint>
              <PolicyPoint label="Consequences on a live network." tone="no">
                Data loss, service interruption, regulatory non-compliance or contractual breach caused by a
                modified device you attach to a network you operate or share.
              </PolicyPoint>
              <PolicyPoint label="Shared infrastructure." tone="no">
                Weakened safety or security of third-party, employer or community infrastructure.
              </PolicyPoint>
            </PolicyPoints>
          </PolicyCard>
          <PolicyCallout title="Procedures are revision-specific, and revisions change silently." tone="warn" icon={AlertTriangle}>
            Every guide documents the exact hardware and firmware revision we had on the bench. Manufacturers
            ship different boards under the same model number without notice, and a modification that was safe
            on one revision can destroy another. Verify against your own device, use proper tools and protective
            equipment, and never modify equipment you do not own or a device on a network you are not authorised
            to alter.
          </PolicyCallout>
        </PolicySection>

        {/* ── 5. RESPONSIBLE DISCLOSURE ────────────────────────────────────── */}
        <PolicySection
          id="safe-harbor"
          index={5}
          title="Responsible vulnerability disclosure"
          icon={Bug}
        >
          <p>
            We collaborate regularly with independent researchers who bring us tips, artefacts, telemetry and
            proof-of-concept code. This is the process we hold ourselves to in public, and the protection a
            source can expect from us in return.
          </p>
          <PolicyCard title="Our disclosure commitments" icon={ShieldCheck}>
            <PolicyPoints>
              <PolicyPoint label="Source protection.">
                We do not voluntarily disclose the identity of a confidential source or whistleblower to a
                corporate entity, a threat actor or law enforcement. Sensitive material is handled over
                encrypted channels on request, and we retain only what is needed to verify a story.
              </PolicyPoint>
              <PolicyPoint label="Standard 90-day embargo.">
                Before publishing details of a critical, unpatched vulnerability we notify the affected vendor
                and allow 90 days for a fix to be developed and deployed.
              </PolicyPoint>
              <PolicyPoint label="Extension in good faith.">
                We will extend the window where a vendor shows documented, verifiable progress — milestone
                notes, patch branches, a release date. We do not extend it for silence.
              </PolicyPoint>
              <PolicyPoint label="Accelerated publication.">
                We reserve the right to shorten the window to as little as 7 days — typically without technical
                exploitation detail — if the issue is being exploited in the wild, if a fix is already
                available, or if a vendor is misrepresenting the risk to users.
              </PolicyPoint>
              <PolicyPoint label="Notice that is actually actionable.">
                Vendors receive enough technical detail to reproduce and remediate: not a teaser, not a
                countdown, not a “wait for the conference talk” email.
              </PolicyPoint>
              <PolicyPoint label="Researcher safety and credit.">
                We coordinate with researchers who acted in good faith, credit them by name unless asked not to,
                and do not hand a report to a third party for retaliation.
              </PolicyPoint>
              <PolicyPoint label="Vulnerabilities in our own platform.">
                Suspected issues in xsypher.com should go to{" "}
                <a href="mailto:contact@xsypher.com" className="text-[var(--accent)] hover:underline font-semibold">
                  contact@xsypher.com
                </a>
                , consistent with our{" "}
                <a href="/.well-known/security.txt" className="text-[var(--accent)] hover:underline font-semibold">
                  security.txt
                </a>{" "}
                policy. We acknowledge the report, tell you what we intend to do and roughly when, and credit
                you if you wish.
              </PolicyPoint>
            </PolicyPoints>
          </PolicyCard>
          <PolicyCallout title="What we cannot do: authorise your testing." tone="no" icon={AlertTriangle}>
            We publish research; we do not run a bug-bounty programme over third-party products and we cannot
            grant permission over systems we do not own. Legal compliance during testing — scope, timing,
            reporting — remains yours while you work.
          </PolicyCallout>
        </PolicySection>

        {/* ── 6. AS-IS, NO WARRANTY ────────────────────────────────────────── */}
        <PolicySection id="no-warranties" index={6} title="Software & code are provided “as-is”" icon={FileCheck2}>
          <p>
            Any code, script, configuration fragment, command, benchmark harness or query published on xSypher
            is provided <strong className="text-[var(--ink)]">“as is” and “as available”, without warranty of
            any kind</strong>, express or implied. Without limiting that, we disclaim the implied warranties of
            merchantability, fitness for a particular purpose, title and non-infringement.
          </p>
          <PolicyRows
            rows={[
              {
                label: "No fitness promise",
                value:
                  "We do not warrant that published code is complete, correct, secure, current or suitable for your environment, or that it will run without modification.",
              },
              {
                label: "No defect promise",
                value:
                  "We do not warrant that the code is defect-free, or that the vulnerability it addresses is the only relevant issue in your stack.",
              },
              {
                label: "Superseded material",
                value:
                  "Software, firmware, dependencies, APIs and threats change continuously. A guide that was accurate when published can be obsolete — or actively unsafe — a year later. Superseded stories are updated and the change noted.",
              },
              {
                label: "Test first",
                value:
                  "Run untrusted code in an isolated environment, never with production credentials, never against infrastructure you do not control, and never as the sole copy of important data.",
              },
            ]}
          />
          <PolicyCallout title="You are responsible for your backups, staging and change control." tone="warn" icon={AlertTriangle}>
            We publish code because it is useful, not because it is safe for your specific deployment. Read it,
            understand it, and adapt it — a snippet pasted into production without review is a decision you made,
            not a defect we hid.
          </PolicyCallout>
        </PolicySection>

        {/* ── 7. LIMITATION OF LIABILITY ───────────────────────────────────── */}
        <PolicySection id="liability" index={7} title="Limitation of liability" icon={Gavel}>
          <p>
            To the maximum extent permitted by applicable law, xSypher, its publisher and its contributors shall
            not be liable for any direct, indirect, incidental, special, consequential or exemplary loss or
            damage — including loss of data, profit, revenue, service, goodwill or business opportunity — arising
            out of or in connection with your use of, or reliance on, anything published on this site, however
            caused and under any theory of liability, whether in contract, tort, strict liability or otherwise.
          </p>
          <p>
            This limitation applies even if we have been advised of the possibility of such damage. Where a
            jurisdiction does not permit the exclusion of certain warranties or liabilities, our liability is
            limited to the smallest amount that jurisdiction allows — nothing here is intended to exclude
            liability that cannot lawfully be excluded.
          </p>
          <PolicyCard title="Disputes, and the first step we ask for" icon={Scale}>
            <p className="text-sm leading-relaxed">
              xSypher is published from Peshawar, Pakistan, and these terms are governed by the laws in force at
              the publisher&apos;s principal place of business, without regard to conflict-of-law rules. Before
              anything else, write to us: almost every dispute we have ever had started as a
              misunderstanding about a number, a date or a vendor&apos;s own documentation, and was resolved by
              one email. Reach the desk at{" "}
              <a href="mailto:legal@xsypher.com" className="text-[var(--accent)] hover:underline font-semibold">
                legal@xsypher.com
              </a>
              .
            </p>
          </PolicyCard>
          <p>
            By using this platform and reading our research you signify your acceptance of this disclaimer. If
            you do not agree with these terms, you must stop using xSypher.
          </p>
        </PolicySection>

        {/* ── 8. DOCUMENT CONTROL ──────────────────────────────────────────── */}
        <PolicySection id="contact" index={8} title="Reporting, legal notices & document control" icon={Mail}>
          <p>
            This page is versioned rather than rewritten in place: when a clause changes, the change is made
            publicly, dated at the top, and — where it materially narrows what readers were previously allowed
            to do — summarised in our corrections log. A disclaimer that quietly changes behind a reader&apos;s
            back is not worth the pixels it is printed on.
          </p>
          <PolicyRows
            rows={[
              {
                label: "Security reports",
                value: (
                  <a href="mailto:contact@xsypher.com" className="text-[var(--accent)] hover:underline font-semibold">
                    contact@xsypher.com
                  </a>
                ),
              },
              {
                label: "Legal notices",
                value: (
                  <a href="mailto:legal@xsypher.com" className="text-[var(--accent)] hover:underline font-semibold">
                    legal@xsypher.com
                  </a>
                ),
              },
              {
                label: "Editorial questions",
                value: (
                  <>
                    The <PolicyLink href="/page/contact">contact desk</PolicyLink>, or read the{" "}
                    <PolicyLink href="/page/editorial-policy">Editorial Policy</PolicyLink> for how a decision
                    was made.
                  </>
                ),
              },
              {
                label: "Corrections",
                value: (
                  <>
                    Report an error through the{" "}
                    <PolicyLink href="/page/corrections">corrections desk</PolicyLink> — acknowledged within two
                    business days.
                  </>
                ),
              },
            ]}
          />
        </PolicySection>

        <PolicyCta
          title="Found something in this notice that does not match how we behave?"
          body="That is the most useful message we can receive. Tell us what you expected, what happened, and which clause you are pointing at — it goes to the editor, and we answer it."
        >
          <PolicyButton href="/page/contact" icon={Mail}>
            Contact the desk
          </PolicyButton>
          <PolicyButton href="/page/transparency" icon={ShieldCheck} variant="ghost">
            Transparency report
          </PolicyButton>
          <PolicyButton href="/page/privacy-policy" variant="ghost">
            Privacy policy
          </PolicyButton>
        </PolicyCta>

        <PolicyFooterNote
          reviewed="October 16, 2026"
          editor="Anwar Iqbal Dawar"
          links={[
            { href: "/page/editorial-standards", label: "Editorial Standards" },
            { href: "/page/editorial-policy", label: "Editorial Policy" },
            { href: "/page/transparency", label: "Transparency Report" },
            { href: "/page/cookie-policy", label: "Cookie Policy" },
            { href: "/page/privacy-policy", label: "Privacy Policy" },
            { href: "/page/corrections", label: "Corrections" },
          ]}
        />
      </PolicyLayout>
    </PolicyPage>
  );
}
