import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ArrowUpRight, Mail, ShieldCheck } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Policy page kit — shared chrome for the legal / standards routes
//
// The four pages this serves (editorial standards, cookie policy, technical
// disclaimer, privacy policy) used to carry a hand-rolled copy of the same
// three-column shell each, which is how they drifted apart. The pieces are
// presentational only: no client hooks, no state, so the pages stay
// server-rendered and nothing is shipped to the reader that they do not read.
//
// Card geometry is the part with a real bug behind it. The old cards were
// `flex-col sm:flex-row`, so from 640px up — which is most tablets and every
// phone in landscape — the icon claimed a full column of its own and squeezed
// the body into a narrow strip beside it. {@link PolicyCard} is a two-column
// grid instead:
//
//   mobile   [icon][title]                        ← row 1
//            [ body spanning both columns ]       ← row 2
//   desktop  [icon] [title]                       ← row 1
//                   [ body, aligned under title ] ← row 2
//
// One <h2> in the DOM at every breakpoint (a hidden duplicate heading is a
// heading a crawler still reads), and the body always starts at the card's
// inner edge on mobile, so the paragraph measure is the full card width.
// ─────────────────────────────────────────────────────────────────────────────

export interface PolicySection {
  id: string;
  label: string;
}

export interface PolicyMetaBadge {
  label: string;
  value: string;
}

export interface PolicyHeroProps {
  kicker: string;
  title: string;
  deck: string;
  updated: string;
  /** Render as <h1> (pages) or <p> (page-level headers that are not the title). */
  badges?: PolicyMetaBadge[];
  children?: ReactNode;
}

/** Page header: kicker, title, deck and the metadata badge strip. */
export function PolicyHero({ kicker, title, deck, updated, badges = [], children }: PolicyHeroProps) {
  const strip: PolicyMetaBadge[] = [{ label: "Last updated", value: updated }, ...badges];

  return (
    <header className="relative border-b border-[var(--line)] bg-[var(--surface-2)] overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 pt-28 pb-12 sm:px-8 sm:pt-36 sm:pb-16 lg:px-12">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {kicker}
          </span>
          <h1 className="mt-4 font-[family:var(--f-display)] text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 font-[family:var(--f-body)] text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            {deck}
          </p>

          <dl className="mt-7 flex flex-wrap gap-2.5">
            {strip.map((badge) => (
              <div
                key={badge.label}
                className="rounded-lg border border-[var(--line)] bg-[var(--surface)]/70 px-3 py-2 backdrop-blur-sm"
              >
                <dt className="font-[family:var(--f-mono)] text-[9px] uppercase tracking-[0.16em] text-[var(--faint)]">
                  {badge.label}
                </dt>
                <dd className="mt-0.5 font-[family:var(--f-ui)] text-xs font-semibold text-[var(--ink)]">
                  {badge.value}
                </dd>
              </div>
            ))}
          </dl>

          {children}
        </div>
      </div>
    </header>
  );
}

interface PolicyLayoutProps {
  sections: PolicySection[];
  /** Right-hand note under the desktop contents list. */
  footerNote?: ReactNode;
  children: ReactNode;
}

/**
 * Body shell: sticky contents rail on desktop, horizontally scrollable
 * quick-jump strip on touch (where the rail is hidden, so the page still has
 * section navigation without a hamburger).
 */
export function PolicyLayout({ sections, footerNote, children }: PolicyLayoutProps) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-8 sm:py-14 lg:flex-row lg:gap-14 lg:px-12">
      <aside className="hidden shrink-0 lg:block lg:w-1/4" aria-label="On this page">
        <div className="sticky top-32">
          <h2 className="mb-4 border-b border-[var(--line)] pb-2 font-[family:var(--f-display)] text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink)]">
            On this page
          </h2>
          <nav className="flex flex-col border-l-2 border-[var(--line-2)] font-[family:var(--f-ui)] text-sm">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="-ml-[2px] border-l-2 border-transparent py-2 pl-4 font-medium text-[var(--muted)] transition-all hover:border-[var(--accent)] hover:text-[var(--ink)]"
              >
                {section.label}
              </a>
            ))}
          </nav>
          {footerNote ? (
            <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-xs leading-relaxed text-[var(--muted)]">
              {footerNote}
            </div>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Touch quick-jump. `-mx-4 px-4` lets the chips bleed to the screen
            edge while the page keeps its gutters. */}
        <nav
          aria-label="Jump to section"
          className="-mx-4 mb-8 flex snap-x gap-2 overflow-x-auto px-4 pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 snap-start rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-1.5 font-[family:var(--f-ui)] text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]"
            >
              {section.label}
            </a>
          ))}
        </nav>

        <article className="max-w-3xl space-y-6 text-[var(--ink)] sm:space-y-8">{children}</article>
      </div>
    </div>
  );
}

interface PolicyCardProps {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  /** Small uppercase line above the heading (a clause number, a rule family). */
  eyebrow?: string;
  /** Highlight rules drawn from the accent set rather than plain answers. */
  emphasis?: boolean;
  children: ReactNode;
}

/** One numbered clause / rule, responsive across every breakpoint. */
export function PolicyCard({ id, title, icon: Icon, eyebrow, emphasis = false, children }: PolicyCardProps) {
  return (
    <section id={id} className="scroll-mt-28">
      <div
        className={`group relative overflow-hidden rounded-2xl border bg-[var(--surface-2)]/70 p-5 backdrop-blur-sm transition-colors sm:p-7 ${
          emphasis ? "border-[var(--accent)]/35" : "border-[var(--line)] hover:border-[var(--line-2)]"
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent"
        />
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-5 sm:gap-x-4 md:gap-x-6">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[var(--accent)] sm:h-11 sm:w-11 ${
              emphasis
                ? "border-[var(--accent)]/30 bg-[var(--accent)]/10"
                : "border-[var(--line)] bg-[var(--surface)]"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>

          <div className="min-w-0">
            {eyebrow ? (
              <p className="font-[family:var(--f-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="font-[family:var(--f-display)] text-lg font-bold leading-snug tracking-tight text-[var(--ink)] sm:text-2xl">
              {title}
            </h2>
          </div>

          {/* Full card width on mobile (both columns), aligned under the title
              from `md` up. */}
          <div className="col-span-2 min-w-0 font-[family:var(--f-body)] text-sm leading-relaxed text-[var(--muted)] [&_a]:font-semibold [&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-2 [&_h3]:mt-6 [&_h3]:font-[family:var(--f-display)] [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-[var(--ink)] [&_li]:mt-2 [&_p+p]:mt-4 [&_strong]:font-semibold [&_strong]:text-[var(--ink)] [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 md:col-span-1 md:col-start-2">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Callout used for the TL;DR summary and warnings. */
export function PolicyCallout({
  title,
  icon: Icon,
  children,
  tone = "neutral",
}: {
  title: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  children: ReactNode;
  tone?: "neutral" | "accent";
}) {
  return (
    <aside
      className={`rounded-2xl border p-5 sm:p-7 ${
        tone === "accent"
          ? "border-[var(--accent)]/30 bg-[var(--accent)]/5"
          : "border-[var(--line)] bg-[var(--surface-2)]"
      }`}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-4 sm:gap-x-4">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[var(--accent)] ${
            tone === "accent" ? "border-[var(--accent)]/30 bg-[var(--accent)]/10" : "border-[var(--line)] bg-[var(--surface)]"
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="font-[family:var(--f-display)] text-base font-bold tracking-tight text-[var(--ink)] sm:text-lg">
          {title}
        </h2>
        <div className="col-span-2 font-[family:var(--f-body)] text-sm leading-relaxed text-[var(--muted)] [&_a]:font-semibold [&_a]:text-[var(--accent)] [&_a]:underline [&_li]:mt-2 [&_p+p]:mt-3 [&_strong]:font-semibold [&_strong]:text-[var(--ink)] [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </aside>
  );
}

export interface PolicyTableProps {
  caption: string;
  head: string[];
  rows: ReactNode[][];
}

/**
 * Data table. Scrolls horizontally inside its own box rather than pushing the
 * page wide, which is the failure mode of every "simple" table on a phone.
 */
export function PolicyTable({ caption, head, rows }: PolicyTableProps) {
  return (
    <div className="mt-5">
      <p className="mb-2 font-[family:var(--f-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
        {caption}
      </p>
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="w-full min-w-[560px] border-collapse text-left text-xs sm:text-[13px]">
          <thead>
            <tr className="bg-[var(--surface-2)]">
              {head.map((cell) => (
                <th
                  key={cell}
                  scope="col"
                  className="whitespace-nowrap border-b border-[var(--line)] px-3.5 py-2.5 font-[family:var(--f-ui)] text-[11px] font-bold uppercase tracking-wider text-[var(--ink)]"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="align-top odd:bg-transparent even:bg-[var(--surface-2)]/40">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="border-b border-[var(--line)]/70 px-3.5 py-3 text-[var(--muted)] last:border-r-0"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Closing panel: who to write to and what happens next. */
export function PolicyFooter({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary: { href: string; label: string; mail?: boolean };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5 sm:p-8">
      <h2 className="font-[family:var(--f-display)] text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
        {title}
      </h2>
      <p className="mt-2 font-[family:var(--f-body)] text-sm leading-relaxed text-[var(--muted)]">{body}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href={primary.href}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 font-[family:var(--f-ui)] text-sm font-bold text-[var(--on-accent)] transition-all hover:brightness-110"
        >
          {primary.mail ? <Mail className="h-4 w-4" aria-hidden="true" /> : null}
          {primary.label}
        </a>
        {secondary ? (
          <Link
            href={secondary.href}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-5 py-3 font-[family:var(--f-ui)] text-sm font-bold text-[var(--ink)] transition-colors hover:bg-[var(--surface-3)]"
          >
            {secondary.label}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
