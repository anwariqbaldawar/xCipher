"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Blocks,
  Code2,
  FileText,
  Layers,
  Mail,
  Radar,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { submitContactMessage } from "@/app/actions/contact";

/** The three partnership formats. No price tags: scope decides the number. */
const FORMATS = [
  {
    icon: FileText,
    kicker: "Format 01",
    title: "Dedicated technical deep-dive or product review",
    body:
      "A hands-on breakdown of a developer tool, API, cloud platform or AI service: what it actually does, how it behaves under real workloads, where it falls apart, and who should not use it. You get an honest technical assessment in front of people who will act on it. You do not get to approve the conclusion.",
    notes: ["Reference setup documented", "Benchmarks reproducible", "Verdict independent"],
  },
  {
    icon: Layers,
    kicker: "Format 02",
    title: "Category or article banner sponsorship",
    body:
      "A clean, clearly labelled placement alongside the coverage your audience already reads — programming, AI, cybersecurity, cloud and systems. Static image or simple graphic, placed in the page rather than over it. No interstitials, no autoplay audio, no layout shift.",
    notes: ["Labelled as sponsored", "Desktop and mobile", "No tracking pixels required"],
  },
  {
    icon: Wrench,
    kicker: "Format 03",
    title: "Early-partner custom packages",
    body:
      "For startups, indie toolmakers and small dev-tool teams: tell us the launch, the audience you want and the outcome you need, and we will shape a package around it — founding-partner rates while we are still building the format list. If we publish a rate card later, early partners keep their terms.",
    notes: ["Founding-partner rates", "Indie-toolmaker friendly", "Scoped with you, not to you"],
  },
];

const READERS = [
  {
    icon: Code2,
    title: "Full-stack developers",
    body: "People choosing a runtime, a database, a build tool or an auth provider this quarter — and reading the trade-offs before they commit.",
  },
  {
    icon: Blocks,
    title: "Software architects",
    body: "Engineers who own the system diagram: capacity, cost, failure modes, migration paths and the parts of the stack nobody wants to touch.",
  },
  {
    icon: Radar,
    title: "Security & AI practitioners",
    body: "Analysts, pentesters and ML engineers who read advisories, reproduce exploits and care whether a claim survives contact with the terminal.",
  },
  {
    icon: BadgeCheck,
    title: "Engineering students",
    body: "Computer engineering and CS readers learning how production systems are actually built, benchmarked and broken.",
  },
];

const GUIDELINES = [
  "Relevant to builders: developer tools, infrastructure, cloud, security, AI systems, hardware for engineers. If our readers cannot build with it, we are not the right publication.",
  "Disclosed to readers: every sponsored placement carries a visible label before the content, in the page and in the feed.",
  "No editorial control: sponsors never see a draft, never approve copy and never remove a finding.",
  "Truthful claims only: if you cannot substantiate it, we will not print it, sponsored or not.",
  "No hidden link building: no do-follow backlink sales, no paid insertions inside existing articles, no SEO guest-post farming.",
  "Reader experience first: no pop-ups, no interstitials, no autoplay audio, no layout shift, no pop-under redirects.",
];

export default function AdvertisingPageClient() {
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    website: "",
    format: "",
    details: "",
  });
  const [status, setStatus] = useState<{ type: "idle" | "submitting" | "success" | "error"; message?: string }>({
    type: "idle",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status.type === "submitting") return;
    setStatus({ type: "submitting" });

    const compiledMessage = [
      `Company: ${formData.companyName}`,
      `Contact Person: ${formData.contactPerson}`,
      formData.website ? `Product / Website: ${formData.website}` : "Product / Website: Not specified",
      `Preferred format: ${formData.format}`,
      formData.details ? `Campaign Details:\n${formData.details}` : "Campaign Details: Not specified",
    ].join("\n");

    const result = await submitContactMessage({
      name: `${formData.contactPerson} (${formData.companyName})`,
      email: formData.email,
      department: "partnerships",
      message: compiledMessage,
    });

    if (result.success) {
      setStatus({
        type: "success",
        message:
          "Enquiry received. We read every serious proposal ourselves and reply within a few business days — usually with questions about your product before any talk of placement.",
      });
      setFormData({ companyName: "", contactPerson: "", email: "", website: "", format: "", details: "" });
    } else {
      setStatus({
        type: "error",
        message: result.error || "Could not submit your enquiry. Please try again, or email press@xsypher.com.",
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const inputClass =
    "w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-4 py-3 text-[var(--ink)] placeholder-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30 transition-all";

  return (
    <div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      {/* ─────────────────────────────────────────────────────────────
          HERO
          ───────────────────────────────────────────────────────────── */}
      <section className="w-full border-b border-[var(--line)] bg-[var(--surface)] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[var(--accent)] opacity-[0.07] blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-32 pb-16 sm:pt-40 sm:pb-20 relative z-10">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 mb-6">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Sponsorships &amp; partnerships
            </span>
            <h1 className="font-[family:var(--f-display)] text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] text-balance">
              Put your developer tool in front of engineers who read the docs.
            </h1>
            <p className="mt-6 text-lg text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
              xSypher is a focused engineering publication read by full-stack developers, software architects,
              computer engineering students and security/AI practitioners. There is no rate card here and no
              invented monthly impression figure — we would rather quote work we can actually deliver, to people
              who will actually use what you build.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          WHY / AUDIENCE
          ───────────────────────────────────────────────────────────── */}
      <section className="w-full py-16 sm:py-20 border-b border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-4">
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)] mb-3">
                Who actually reads this
              </span>
              <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold tracking-tight">
                Quality over inflated quantity
              </h2>
              <p className="mt-4 text-sm sm:text-base text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                We are not going to pretend to be a traffic machine. This is a young, deliberately technical
                publication: the audience is smaller than a legacy tech site&apos;s and far more specific. What you
                are buying is attention from people who read past the first paragraph — and who often arrive with a
                problem your product solves.
              </p>
              <p className="mt-4 text-sm sm:text-base text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                If you need a million impressions of anything, we are the wrong placement and we will tell you so. If
                you need a room full of engineers evaluating infrastructure, carry on.
              </p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {READERS.map((reader) => (
                <div
                  key={reader.title}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm transition-colors hover:border-[var(--line-2)]"
                >
                  <span className="w-11 h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)] mb-4">
                    <reader.icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-[family:var(--f-display)] text-base font-bold text-[var(--ink)] mb-2">
                    {reader.title}
                  </h3>
                  <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                    {reader.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FORMATS
          ───────────────────────────────────────────────────────────── */}
      <section className="w-full py-16 sm:py-20 border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="max-w-2xl mb-12">
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)] mb-3">
              Partnership formats
            </span>
            <h2 className="font-[family:var(--f-display)] text-2xl sm:text-3xl font-bold tracking-tight">
              Three ways to work with us
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
              Every format is quoted after we understand the scope — traffic is not the same as fit, and a launch
              week is not the same as a fourteen-week integration. Ask, and you get a straight answer with a
              number attached to it.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {FORMATS.map((format) => (
              <div
                key={format.title}
                className="flex flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6 sm:p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/50 hover:shadow-md"
              >
                <div>
                  <span className="w-12 h-12 rounded-xl bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)] mb-5">
                    <format.icon className="w-6 h-6" aria-hidden="true" />
                  </span>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--faint)] mb-1.5">
                    {format.kicker}
                  </span>
                  <h3 className="font-[family:var(--f-display)] text-lg font-bold text-[var(--ink)] leading-snug mb-3">
                    {format.title}
                  </h3>
                  <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                    {format.body}
                  </p>
                </div>
                <ul className="mt-6 pt-4 border-t border-[var(--line)] flex flex-wrap gap-2 text-xs text-[var(--faint)]">
                  {format.notes.map((note) => (
                    <li
                      key={note}
                      className="px-2.5 py-1 rounded-md bg-[var(--surface)] border border-[var(--line)]"
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-[var(--line)] border-l-4 border-l-[var(--accent)] bg-[var(--paper)] p-5 sm:p-6 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
              <strong className="font-semibold text-[var(--ink)]">
                Sponsorship buys placement, never a verdict.
              </strong>{" "}
              A sponsored deep-dive is still a review: it is labelled, it goes through the same editorial review as
              everything else, and if the product has problems the article says so. Read the{" "}
              <Link href="/page/transparency#firewall" className="text-[var(--accent)] hover:underline font-semibold">
                advertising firewall
              </Link>{" "}
              for exactly where that line sits.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          GUIDELINES + PROCESS + FORM
          ───────────────────────────────────────────────────────────── */}
      <section className="w-full py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: guidelines + process */}
            <div className="space-y-12">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-11 h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                    <Stamp />
                  </span>
                  <h2 className="font-[family:var(--f-display)] text-2xl font-bold tracking-tight">
                    Sponsor guidelines
                  </h2>
                </div>
                <ul className="space-y-3">
                  {GUIDELINES.map((rule, index) => (
                    <li
                      key={rule}
                      className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed"
                    >
                      <span className="w-6 h-6 shrink-0 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center font-[family:var(--f-mono)] text-[11px] font-bold">
                        {index + 1}
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                  <Ban className="w-4 h-4 text-[var(--bad)] shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                    We decline token speculation, gambling, high-risk trading, undisclosed data collection and
                    anything asking for a claim we cannot verify — regardless of budget.
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-11 h-11 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)]">
                    <Mail className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <h2 className="font-[family:var(--f-display)] text-2xl font-bold tracking-tight">
                    How it works
                  </h2>
                </div>
                <ol className="space-y-4">
                  {[
                    {
                      title: "You describe the product and the goal.",
                      body: "What it does, who it is for, what a good outcome looks like. Links to docs and a test account beat a slide deck.",
                    },
                    {
                      title: "We scope it and quote it.",
                      body: "Format, length, placement, timeline and price — in writing, before anything is produced.",
                    },
                    {
                      title: "We build it on our terms.",
                      body: "Testing, writing and editing happen on our side. You can answer technical questions; you do not steer the conclusion.",
                    },
                    {
                      title: "It publishes labelled, and we tell you what happened.",
                      body: "Disclosure at the top, and an honest summary afterwards about how readers responded — including if they did not.",
                    },
                  ].map((step, index) => (
                    <li key={step.title} className="flex items-start gap-4">
                      <span className="w-7 h-7 shrink-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] flex items-center justify-center font-[family:var(--f-mono)] text-xs font-bold text-[var(--accent)]">
                        {index + 1}
                      </span>
                      <span className="text-sm text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
                        <strong className="block font-semibold text-[var(--ink)] mb-1">{step.title}</strong>
                        {step.body}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Right: enquiry form */}
            <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-9 shadow-md lg:sticky lg:top-28">
              <h2 className="font-[family:var(--f-display)] text-2xl font-bold text-[var(--ink)] mb-2">
                Start a conversation
              </h2>
              <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] mb-7">
                No budget tier to pick. Tell us what you are launching and we will come back with a scope and a
                number.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5 font-[family:var(--f-body)]">
                {status.type === "success" && (
                  <div
                    role="status"
                    className="rounded-lg border border-[var(--ok)]/30 bg-[var(--ok)]/10 p-4 text-sm text-[var(--ink)]"
                  >
                    {status.message}
                  </div>
                )}
                {status.type === "error" && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[var(--bad)]/30 bg-[var(--bad)]/10 p-4 text-sm text-[var(--ink)]"
                  >
                    {status.message}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-semibold text-[var(--ink)] mb-1">
                      Company or project <span className="text-[var(--accent)]">*</span>
                    </label>
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      placeholder="Acme Tooling"
                    />
                  </div>
                  <div>
                    <label htmlFor="contactPerson" className="block text-sm font-semibold text-[var(--ink)] mb-1">
                      Your name <span className="text-[var(--accent)]">*</span>
                    </label>
                    <input
                      type="text"
                      id="contactPerson"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-[var(--ink)] mb-1">
                      Email <span className="text-[var(--accent)]">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      placeholder="jane@acmetooling.dev"
                    />
                  </div>
                  <div>
                    <label htmlFor="website" className="block text-sm font-semibold text-[var(--ink)] mb-1">
                      Product URL
                    </label>
                    <input
                      type="url"
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="https://acmetooling.dev"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="format" className="block text-sm font-semibold text-[var(--ink)] mb-1">
                    Preferred format <span className="text-[var(--accent)]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="format"
                      name="format"
                      value={formData.format}
                      onChange={handleChange}
                      required
                      className={`${inputClass} appearance-none cursor-pointer`}
                    >
                      <option value="" disabled>
                        Choose the closest fit…
                      </option>
                      <option value="Dedicated technical deep-dive / review">
                        Dedicated technical deep-dive or review
                      </option>
                      <option value="Category or article banner">Category or article banner</option>
                      <option value="Early-partner custom package">Early-partner custom package</option>
                      <option value="Not sure yet">Not sure yet — advise me</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[var(--muted)]">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="details" className="block text-sm font-semibold text-[var(--ink)] mb-1">
                    What are you launching?
                  </label>
                  <textarea
                    id="details"
                    name="details"
                    value={formData.details}
                    onChange={handleChange}
                    rows={5}
                    className={`${inputClass} resize-y`}
                    placeholder="What the product does, who it is for, and what you want to happen. Docs or a test-account link help."
                  ></textarea>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={status.type === "submitting"}
                    className="group relative w-full overflow-hidden rounded-lg px-8 py-4 font-[family:var(--f-ui)] font-bold tracking-wide !bg-[var(--accent)] !text-[var(--on-accent)] flex items-center justify-center transition-all duration-300 shadow-lg hover:brightness-110 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {status.type === "submitting" ? "Sending…" : "Send enquiry"}
                      <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </button>
                </div>

                <p className="text-xs text-[var(--faint)] leading-relaxed">
                  Prefer email?{" "}
                  <a href="mailto:press@xsypher.com" className="text-[var(--accent)] hover:underline font-semibold">
                    press@xsypher.com
                  </a>
                  . For the rules we hold ourselves to on paid work, see the{" "}
                  <Link href="/page/transparency" className="text-[var(--accent)] hover:underline font-semibold">
                    transparency report
                  </Link>
                  .
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Small local mark so the guidelines heading keeps the icon-tile pattern. */
function Stamp() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3z" />
      <path d="M9.5 12l1.8 1.8 3.4-3.6" />
    </svg>
  );
}
