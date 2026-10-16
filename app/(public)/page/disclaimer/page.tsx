import React from "react";
import type { Metadata } from "next";
import {
  AlertTriangle,
  CircuitBoard,
  FileWarning,
  Scale,
  ShieldAlert,
  TerminalSquare,
} from "lucide-react";
import { brandBannerUrl, constructMetadata, siteConfig } from "@/lib/seo";
import { PolicyCallout, PolicyCard, PolicyFooter, PolicyHero, PolicyLayout, type PolicySection } from "@/components/common/PolicyShell";

// ─────────────────────────────────────────────────────────────────────────────
// Technical Disclaimer
//
// The five clauses are the legal spine of the security, reverse-engineering and
// code coverage, so each one now states the actual boundary rather than a
// headline: whose systems may be tested, what a published PoC is and is not
// permission to do, which hardware risks the reader accepts, how the 90-day
// disclosure clock runs and ends, and exactly what warranty is disclaimed for
// software and code (nothing — including the merchantability warranty an
// implied term would otherwise supply).
//
// Section ids are unchanged (#educational, #dual-use, #hardware-liability,
// #safe-harbor, #no-warranties) so existing inbound links and search results
// pointing at a clause still land on it.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = constructMetadata({
  title: "Technical Disclaimer — xSypher",
  description:
    "Limits of liability for xSypher's technical coverage: educational and defensive use only, dual-use security research and PoC boundaries, hardware and firmware modification risk, a responsible 90-day vulnerability disclosure policy with safe harbour for researchers, and an as-is no-warranty clause for published code.",
  canonical: `${siteConfig.url}/page/disclaimer`,
  image: brandBannerUrl(),
  imageAlt: "xSypher technical disclaimer",
  type: "website",
});

const SECTIONS: PolicySection[] = [
  { id: "educational", label: "1. Educational & defensive use" },
  { id: "dual-use", label: "2. Dual-use research & PoC" },
  { id: "hardware-liability", label: "3. Hardware & firmware" },
  { id: "safe-harbor", label: "4. 90-day disclosure & safe harbour" },
  { id: "no-warranties", label: "5. Code as-is, no warranty" },
  { id: "contact", label: "6. Reporting a problem" },
];

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <PolicyHero
        kicker="Legal & Compliance"
        title="Technical Disclaimer"
        deck="Limits of liability for zero-day research, dual-use technology, hardware reverse engineering and the exploit documentation published on xSypher — written to be read before you run something, not after."
        updated="15 October 2026"
        badges={[
          { label: "Applies to", value: "All technical, security & hardware content" },
          { label: "Disclosure window", value: "90 days (7 on active exploitation)" },
          { label: "Warranty", value: "None — as-is, as-available" },
        ]}
      />

      <PolicyLayout
        sections={SECTIONS}
        footerNote={
          <>
            <strong className="text-[var(--ink)]">Researcher?</strong> If you are reporting a vulnerability to us, or
            asking what we will publish and when, start with clause 4 — it states the embargo, the safe-harbour
            position and how to reach the desk safely.
          </>
        }
      >
        <PolicyCallout title="Read this first" icon={FileWarning} tone="accent">
          <p>
            Nothing on xSypher is a licence to test a system you do not own. The tutorials, proofs of concept,
            firmware notes and code samples we publish are technical journalism: they explain how something works and
            how it fails, so that defenders, engineers and researchers can fix it. Running any of it against
            infrastructure you are not authorised to touch may be a criminal offence in your jurisdiction, and it is
            not something this publication permits, encourages or indemnifies.
          </p>
          <p>
            By continuing to read our technical coverage you accept the limits in the five clauses below. If you do
            not accept them, stop using this site.
          </p>
        </PolicyCallout>

        <PolicyCard id="educational" title="1. Educational & Defensive Purpose Only" eyebrow="Clause 01" icon={ShieldAlert} emphasis>
          <p>
            All cybersecurity tutorials, exploit breakdowns, reverse-engineering concepts and code snippets published
            on xSypher are provided strictly for <strong>educational and defensive purposes</strong>. We publish them
            to help security researchers, system administrators, incident responders and developers understand an
            attack path well enough to patch it, detect it, or design it out of a product.
          </p>
          <h3>What this means in practice</h3>
          <ul>
            <li>
              <strong>Authorised targets only.</strong> Do not execute any provided code, script or payload against a
              system you do not own, or against a system where you lack explicit written authorisation to conduct
              penetration testing. &ldquo;It was published on the internet&rdquo; is not authorisation.
            </li>
            <li>
              <strong>Laboratory conditions.</strong> Reproduce our work in an isolated lab you control — a virtual
              machine or segregated network — rather than on production infrastructure, and never on a third
              party&apos;s.
            </li>
            <li>
              <strong>Defence outranks curiosity.</strong> Where a technique has both an attack and a detection form,
              we publish the detection guidance alongside it and expect readers to use it that way.
            </li>
            <li>
              <strong>No operational uplift.</strong> We do not publish finished weaponised tooling, working
              mass-exploitation kits, or step-by-step instructions aimed at a specific named victim. Detail stops
              where defensive value ends.
            </li>
          </ul>
        </PolicyCard>

        <PolicyCard id="dual-use" title="2. Dual-Use Cybersecurity Research & PoC Boundaries" eyebrow="Clause 02" icon={TerminalSquare}>
          <p>
            Cybersecurity knowledge is inherently dual-use: the same technique used to audit and harden a network can
            be used to compromise it. Publishing research on how vulnerabilities work — including proof-of-concept code
            that demonstrates a defect — is protected expression and an established part of how the security industry
            improves. Discussing a flaw publicly is often the only lever that gets it patched.
          </p>
          <h3>Where we draw the line</h3>
          <ul>
            <li>
              <strong>A PoC demonstrates, it does not weaponise.</strong> Our proofs of concept are written to
              establish that a vulnerability is real and reachable. We withhold, redact or generalise the parts whose
              only purpose would be scalable, unattended attack — payload delivery, persistence, evasion at scale.
            </li>
            <li>
              <strong>Named victims are out of scope.</strong> We do not publish exploitation detail for a live flaw
              targeting a specific organisation, sector under active attack, or critical national infrastructure.
            </li>
            <li>
              <strong>No opposition to weaponisation.</strong> xSypher opposes the use of our research for
              unauthorised disruption, data theft, extortion, surveillance of at-risk groups, or state-sponsored cyber
              operations.
            </li>
            <li>
              <strong>Misuse is the reader&apos;s act.</strong> Publication is not endorsement, instruction or
              authorisation. We are not legally or ethically responsible for a third party&apos;s misuse of
              published defensive research.
            </li>
          </ul>
          <p>
            Where a disclosure is genuinely dangerous to publish, the correct outcome is a coordinated one: a vendor
            patch, an advisory, and then the explanation. Clause 4 sets out that process.
          </p>
        </PolicyCard>

        <PolicyCard id="hardware-liability" title="3. Hardware & Firmware Modification Liability" eyebrow="Clause 03" icon={CircuitBoard}>
          <p>
            Alongside software, xSypher covers hardware reverse engineering, firmware flashing, teardowns, and
            modification of IoT, networking, storage and single-board devices. Hardware does not have an undo button,
            and unlike a virtual machine it can be destroyed, can damage the equipment attached to it, and can hurt
            the person holding it.
          </p>
          <p>
            If you follow a teardown, a jumper or pad configuration, a voltage or current modification, a firmware
            flash or a repair procedure discussed on this platform, you do so entirely at your own risk. xSypher and
            its authors are not liable for:
          </p>
          <ul>
            <li>Bricked, locked, or permanently damaged silicon, storage, or whole devices.</li>
            <li>Voided manufacturer warranties, service contracts, or support entitlements.</li>
            <li>Electrical hazards — including fire, short circuits, damaged mains equipment, or injury.</li>
            <li>Damage to other equipment, data, or property connected to the device you modified.</li>
            <li>Regulatory consequences of modification in your jurisdiction (radio, safety, or import rules).</li>
          </ul>
          <p>
            Follow the standard precautions for any bench work: unplug power before soldering, verify voltage and
            polarity with a meter rather than assuming, use an anti-static strap, and never work on a mains-powered
            device while it is live. Swap to a device you can afford to lose before you attempt a mod on the only unit
            you own.
          </p>
        </PolicyCard>

        <PolicyCard id="safe-harbor" title="4. Responsible 90-Day Disclosure & Safe Harbour for Researchers" eyebrow="Clause 04" icon={Scale} emphasis>
          <p>
            We work with independent security researchers and review proof-of-concept material before it is published.
            Our disclosure process is stated in advance so that a researcher, a vendor, and our readers all know what
            to expect:
          </p>
          <ul>
            <li>
              <strong>90-day embargo.</strong> Before publishing details of a critical, unpatched vulnerability,
              xSypher gives the affected vendor 90 days from our first verified report to develop and ship a fix. We
              share the minimum technical detail needed to reproduce and remediate, and we tell the researcher when the
              report has gone out.
            </li>
            <li>
              <strong>Shortened clock.</strong> We reserve the right to reduce the embargo to 7 days — or to publish
              immediately in genuinely exceptional cases — where a vulnerability is being actively exploited in the
              wild, where vulnerable devices are exposed in large numbers, or where a vendor has confirmed it will not
              patch.
            </li>
            <li>
              <strong>Extensions.</strong> Where a vendor is engaged and demonstrably close to a fix, we will extend
              the window, and we say publicly when we do.
            </li>
            <li>
              <strong>Safe harbour.</strong> We support safe-harbour protections for good-faith security research, and
              our own conduct is bounded by it: research we publish or relay is reported in good faith, demonstrates
              only what is necessary to establish the flaw, does not exfiltrate data beyond the minimum needed as
              evidence, does not degrade or interrupt a live service, and is disclosed to the vendor before the public.
              We will not publish material obtained by attacking a system without authorisation.
            </li>
            <li>
              <strong>Source protection.</strong> We do not voluntarily disclose the identity of a confidential source
              or whistleblower to a corporate entity, a regulator or law enforcement without that source&apos;s
              consent. Encrypted contact can be arranged on request — the desk will confirm a key fingerprint before
              you send material.
            </li>
          </ul>
          <p>
            If you are a researcher whose work we have covered and you believe the embargo calculus was wrong, tell
            the desk: the reasoning behind a publication decision is something we will state in public.
          </p>
        </PolicyCard>

        <PolicyCard id="no-warranties" title="5. Software, Code & Tutorials — As-Is, No Warranty" eyebrow="Clause 05" icon={AlertTriangle}>
          <p>
            The information provided on xSypher — including code, scripts, configuration, commands, benchmark figures
            and diagrams — is provided on an <strong>&ldquo;as is&rdquo;</strong> and{" "}
            <strong>&ldquo;as available&rdquo;</strong> basis, without warranties of any kind, whether express,
            implied or statutory. That expressly disclaims any implied warranty of merchantability, fitness for a
            particular purpose, title and non-infringement, and any warranty that the material is complete, accurate
            or free from defect.
          </p>
          <ul>
            <li>
              <strong>Verify before you deploy.</strong> Read code before running it, test it in a non-production
              environment, and satisfy yourself that it matches your own security, licensing and compliance
              requirements. We cannot audit your environment for you.
            </li>
            <li>
              <strong>It will age.</strong> Technologies, interfaces, firmware and vulnerabilities change quickly.
              Code that worked at publication may be broken, deprecated or unsafe later; a vulnerability we documented
              may be patched, and a mitigation may have been superseded.
            </li>
            <li>
              <strong>Licensing.</strong> Snippets are published for readers to learn from and adapt. Third-party
              libraries, vendor SDKs and error messages quoted in an article remain under their own licences and
              terms.
            </li>
            <li>
              <strong>No support obligation.</strong> Publishing a technique does not commit us to supporting your
              implementation, upgrading the example, or troubleshooting a result you could not reproduce.
            </li>
            <li>
              <strong>Limitation of liability.</strong> To the fullest extent permitted by law, xSypher, its authors
              and its contributors accept no liability for any direct, indirect, incidental, consequential or punitive
              damage arising from the use of, or reliance on, anything published here — including loss of data, loss of
              profit, service interruption or device failure.
            </li>
          </ul>
          <p>
            Where a jurisdiction does not permit the exclusion of certain warranties or liabilities, those exclusions
            apply only to the extent permitted; everything else in this disclaimer stands.
          </p>
        </PolicyCard>

        <PolicyCard id="contact" title="6. Reporting a Problem With Our Coverage" eyebrow="Clause 06" icon={ShieldAlert}>
          <p>
            If an article contains an unsafe instruction, a broken or misleading exploit narrative, a mitigation that
            does not work, or code that does something other than what the text claims, tell the desk — security
            corrections are treated as same-day priorities rather than queued behind feature work.
          </p>
          <p>
            The same route handles vendor rebuttals, embargo extensions, and requests to review what we hold before it
            is published. Include the URL, the specific claim and any evidence you can share; if you are reporting on
            behalf of a vendor, say so and include a contact who can confirm the fix.
          </p>
        </PolicyCard>

        <PolicyFooter
          title="Found something unsafe, or a flaw we should hold?"
          body="Security-relevant corrections and embargo requests are answered the same day wherever the desk can verify them. Send the URL, the claim and the evidence."
          primary={{ href: "mailto:contact@xsypher.com", label: "Security & corrections desk", mail: true }}
          secondary={{ href: "/page/editorial-standards", label: "Editorial standards" }}
        />
      </PolicyLayout>
    </div>
  );
}
