import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Ban, CheckCircle2, ChevronDown, Terminal } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// PolicyKit — the shared layout language for xSypher's policy documents.
//
// Editorial Standards, Editorial Policy, Technical Disclaimer and the
// Transparency Report are the documents a reader, a regulator and an AdSense
// reviewer all read together. They were built one at a time and drifted: the
// transparency report had a hero, a fact strip, numbered sections and cards; the
// standards page was a single narrow column; the disclaimer was a bare list of
// clauses. The result reads as three different sites.
//
// This module is the fix: one set of building blocks assembled from the
// transparency report's own classes, so every policy page renders with the same
// card, the same kicker, the same spacing rhythm and the same callout — and a
// future edit to any of them lands everywhere at once.
//
// Layout rule that matters on a phone: the icon tile only ever shares a row
// with the *heading*, and body copy is always a full-width sibling below it.
// The pattern this replaces put the icon and the body in the same flex row, so
// on a narrow screen the text column was squeezed to the right of the tile —
// which is what "aligned in the middle with an extra gap" actually was.
// ─────────────────────────────────────────────────────────────────────────────

type Icon = React.ComponentType<{ className?: string }>;

/** A tint a block can take. `no` is intentionally loud — it marks refusals. */
export type Tone = "neutral" | "accent" | "ok" | "warn" | "no";

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-[var(--accent)]",
  accent: "text-[var(--accent)]",
  ok: "text-[var(--ok)]",
  warn: "text-[var(--warn)]",
  no: "text-[var(--bad)]",
};

const TONE_BORDER: Record<Tone, string> = {
  neutral: "border-l-[var(--line-2)]",
  accent: "border-l-[var(--accent)]",
  ok: "border-l-[var(--ok)]",
  warn: "border-l-[var(--warn)]",
  no: "border-l-[var(--bad)]",
};

const TONE_TILE: Record<Tone, string> = {
  neutral: "bg-[var(--surface-2)] border-[var(--line)]",
  accent: "bg-[var(--accent-soft)] border-[var(--accent)]/20",
  ok: "bg-[var(--surface-2)] border-[var(--ok)]/25",
  warn: "bg-[var(--surface-2)] border-[var(--warn)]/30",
  no: "bg-[var(--surface-2)] border-[var(--bad)]/30",
};

const TONE_ICON: Record<Tone, typeof Terminal> = {
  neutral: Terminal,
  accent: Terminal,
  ok: CheckCircle2,
  warn: Terminal,
  no: Ban,
};

/* ── Page shell ─────────────────────────────────────────────────────────────── */

export function PolicyPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-full bg-[var(--paper)] text-[var(--ink)] min-h-screen ${className}`}>
      {children}
    </div>
  );
}

/* ── Hero ───────────────────────────────────────────────────────────────────── */

export function PolicyHero({
  badge,
  badgeIcon: BadgeIcon,
  meta,
  title,
  lede,
  actions,
}: {
  badge: string;
  badgeIcon: Icon;
  /** Short line beside the badge — review date, jurisdiction, status. */
  meta?: string;
  title: ReactNode;
  lede: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="relative w-full border-b border-[var(--line)] bg-[var(--surface)] overflow-hidden">
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
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[var(--accent)] opacity-[0.07] blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-32 pb-14 sm:pt-40 sm:pb-16 relative z-10">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20">
              <BadgeIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {badge}
            </span>
            {meta ? (
              <span className="text-xs font-medium text-[var(--faint)] font-[family:var(--f-ui)]">
                {meta}
              </span>
            ) : null}
          </div>

          <h1 className="font-[family:var(--f-display)] text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] text-balance">
            {title}
          </h1>

          <div className="mt-6 text-base sm:text-lg text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed space-y-4">
            {lede}
          </div>

          {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}

/* ── At-a-glance fact strip ─────────────────────────────────────────────────── */

/** Edge rules for the fact strip: 1 column on phones, 2 on tablets, 4 on desktop. */
const FACT_CELL_CLASS = [
  "py-6 sm:py-7 sm:pr-8",
  "py-6 sm:py-7 border-t border-[var(--line)] sm:border-t-0 sm:border-l sm:border-[var(--line)] sm:pl-8",
  "py-6 sm:py-7 sm:pr-8 sm:border-t sm:border-[var(--line)] lg:border-t-0 lg:border-l lg:pl-8",
  "py-6 sm:py-7 border-t border-[var(--line)] sm:border-l sm:border-[var(--line)] sm:pl-8 sm:border-t lg:border-t-0",
];

export function PolicyFacts({
  facts,
}: {
  facts: { label: string; value: string; note: string }[];
}) {
  return (
    <div className="border-b border-[var(--line)] bg-[var(--surface-2)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact, index) => (
            <div key={fact.label} className={FACT_CELL_CLASS[index] ?? "py-6 sm:py-7"}>
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--faint)] mb-2">
                {fact.label}
              </span>
              <span className="font-[family:var(--f-display)] text-lg sm:text-xl font-bold text-[var(--ink)] leading-snug">
                {fact.value}
              </span>
              <p className="text-sm text-[var(--muted)] font-[family:var(--f-body)] mt-1 leading-relaxed">
                {fact.note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Contents rail ──────────────────────────────────────────────────────────── */

export function PolicyLayout({
  contents,
  asideNote,
  children,
}: {
  contents: { id: string; label: string }[];
  asideNote?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-16 flex flex-col lg:flex-row gap-10 lg:gap-16">
      <aside className="lg:w-1/4 shrink-0 lg:order-1">
        {/* Desktop: a sticky card. Phone: a collapsed disclosure, because a
            twelve-item list pushed above the first section is worse than no
            contents at all. */}
        <nav
          aria-label="On this page"
          className="hidden lg:block lg:sticky lg:top-32 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm"
        >
          <h2 className="font-[family:var(--f-display)] font-bold text-xs uppercase tracking-[0.16em] text-[var(--ink)] mb-3">
            On this page
          </h2>
          <ul className="flex flex-col font-[family:var(--f-ui)] text-sm">
            {contents.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="block py-1.5 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          {asideNote ? (
            <div className="mt-4 pt-4 border-t border-[var(--line)] text-xs text-[var(--faint)] font-[family:var(--f-body)] leading-relaxed">
              {asideNote}
            </div>
          ) : null}
        </nav>

        <details className="lg:hidden group rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
          <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-5 py-4 font-[family:var(--f-display)] font-bold text-sm text-[var(--ink)]">
            <span>On this page</span>
            <ChevronDown
              className="w-4 h-4 text-[var(--muted)] transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ul className="px-5 pb-4 flex flex-col font-[family:var(--f-ui)] text-sm border-t border-[var(--line)] pt-3">
            {contents.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="block py-1.5 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </aside>

      <article className="lg:w-3/4 lg:order-2 min-w-0 space-y-12 sm:space-y-16">
        {children}
      </article>
    </div>
  );
}

/* ── Section ────────────────────────────────────────────────────────────────── */

/**
 * One numbered section: icon tile and heading in a header row, body copy in a
 * full-width block underneath. See the note at the top of this file for why the
 * body is never nested inside the icon's column.
 */
export function PolicySection({
  id,
  index,
  title,
  icon: SectionIcon,
  children,
}: {
  id: string;
  index: number;
  title: string;
  icon: Icon;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32">
      <div className="flex items-start gap-3.5 sm:gap-4 mb-5">
        <span className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)] shadow-sm">
          <SectionIcon className="w-5 h-5" />
        </span>
        <div className="min-w-0 pt-0.5">
          <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--faint)] mb-0.5">
            Section {index}
          </span>
          <h2 className="font-[family:var(--f-display)] text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
            {title}
          </h2>
        </div>
      </div>
      <div className="space-y-4 text-sm sm:text-base text-[var(--muted)] font-[family:var(--f-body)] leading-relaxed">
        {children}
      </div>
    </section>
  );
}

/* ── Card ───────────────────────────────────────────────────────────────────── */

export function PolicyCard({
  title,
  tone = "neutral",
  icon,
  children,
  className = "",
}: {
  title?: string;
  tone?: Tone;
  icon?: Icon;
  children: ReactNode;
  className?: string;
}) {
  const ToneIcon = icon;
  return (
    <div
      className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-sm ${className}`}
    >
      {title ? (
        <div className="flex items-center gap-3 mb-4">
          {ToneIcon ? (
            <span
              className={`w-9 h-9 shrink-0 rounded-lg border flex items-center justify-center ${TONE_TILE[tone]} ${TONE_TEXT[tone]}`}
            >
              <ToneIcon className="w-4 h-4" aria-hidden="true" />
            </span>
          ) : (
            <span className={`w-1.5 h-6 rounded-full bg-current shrink-0 ${TONE_TEXT[tone]}`} aria-hidden="true" />
          )}
          <h3 className="font-[family:var(--f-display)] font-bold text-sm uppercase tracking-wider text-[var(--ink)] leading-snug">
            {title}
          </h3>
        </div>
      ) : null}
      {children}
    </div>
  );
}

/* ── Callout ────────────────────────────────────────────────────────────────── */

export function PolicyCallout({
  title,
  tone = "accent",
  icon,
  children,
}: {
  title: string;
  tone?: Tone;
  icon?: Icon;
  children: ReactNode;
}) {
  const ToneIcon = icon;
  return (
    <div
      className={`rounded-xl border border-[var(--line)] border-l-4 ${TONE_BORDER[tone]} bg-[var(--surface)] p-5`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        {ToneIcon ? <ToneIcon className={`w-4 h-4 shrink-0 ${TONE_TEXT[tone]}`} aria-hidden="true" /> : null}
        <h3 className="font-[family:var(--f-display)] font-bold text-base text-[var(--ink)] leading-snug">
          {title}
        </h3>
      </div>
      <div className="text-sm leading-relaxed text-[var(--muted)]">{children}</div>
    </div>
  );
}

/* ── Point list ─────────────────────────────────────────────────────────────── */

export function PolicyPoints({ children }: { children: ReactNode }) {
  return <ul className="space-y-3">{children}</ul>;
}

export function PolicyPoint({
  label,
  tone = "neutral",
  children,
}: {
  label: string;
  tone?: Tone;
  children: ReactNode;
}) {
  const MarkIcon = TONE_ICON[tone];
  return (
    <li className="flex items-start gap-3 text-sm leading-relaxed">
      <MarkIcon className={`w-4 h-4 ${TONE_TEXT[tone]} shrink-0 mt-[3px]`} aria-hidden="true" />
      <span className="min-w-0">
        <strong className="font-semibold text-[var(--ink)]">{label}</strong> {children}
      </span>
    </li>
  );
}

/* ── Numbered steps ─────────────────────────────────────────────────────────── */

export function PolicySteps({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="flex items-start gap-3.5 sm:gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"
        >
          <span className="w-7 h-7 shrink-0 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center font-[family:var(--f-mono)] text-xs font-bold">
            {index + 1}
          </span>
          <span className="min-w-0 text-sm leading-relaxed">
            <strong className="block font-semibold text-[var(--ink)] mb-1">{step.title}</strong>
            {step.body}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ── Definition rows (label → value) ────────────────────────────────────────── */

export function PolicyRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] divide-y divide-[var(--line)] overflow-hidden">
      {rows.map((row) => (
        <div key={row.label} className="px-5 py-4 sm:grid sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-5 flex flex-col gap-1.5">
          <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--faint)] sm:pt-0.5">
            {row.label}
          </dt>
          <dd className="text-sm leading-relaxed text-[var(--muted)] min-w-0">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Inline link (the one accent style used across the documents) ───────────── */

export function PolicyLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[var(--accent)] hover:underline font-semibold">
      {children}
    </Link>
  );
}

export function PolicyExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--accent)] hover:underline font-semibold"
    >
      {children}
    </a>
  );
}

/* ── Button ─────────────────────────────────────────────────────────────────── */

export function PolicyButton({
  href,
  children,
  icon: ButtonIcon,
  variant = "primary",
  external = false,
}: {
  href: string;
  children: ReactNode;
  icon?: Icon;
  variant?: "primary" | "ghost";
  external?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]";
  const styles =
    variant === "primary"
      ? "!bg-[var(--accent)] !text-white hover:brightness-110 shadow-sm"
      : "text-[var(--ink)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--line)]";

  const content = (
    <>
      {children}
      {ButtonIcon ? <ButtonIcon className="w-4 h-4" aria-hidden="true" /> : null}
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} ${styles}`}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={`${base} ${styles}`}>
      {content}
    </Link>
  );
}

/* ── Closing CTA ────────────────────────────────────────────────────────────── */

export function PolicyCta({
  title,
  body,
  children,
}: {
  title: string;
  body: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <span className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center">
          <ArrowUpRight className="w-5 h-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-[family:var(--f-display)] text-lg sm:text-xl font-bold text-[var(--ink)]">
            {title}
          </h2>
          <div className="text-sm text-[var(--muted)] font-[family:var(--f-body)] mt-1 leading-relaxed">
            {body}
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">{children}</div>
    </div>
  );
}

/* ── Accountability footer ──────────────────────────────────────────────────── */

/**
 * The accountability line every policy document ends with: who wrote it, when it
 * was last reviewed, and what it links to. It is the cheapest E-E-A-T signal a
 * publication can carry — a named editor, a date, and a path to challenge the
 * text — so it is a component here rather than a paragraph somebody remembers to
 * add.
 */
export function PolicyFooterNote({
  reviewed,
  editor,
  links,
}: {
  reviewed: string;
  editor?: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="border-t border-[var(--line)] pt-6 space-y-3">
      <p className="text-xs text-[var(--faint)] font-[family:var(--f-ui)] leading-relaxed">
        Last reviewed: {reviewed} · Published by xSypher, Peshawar, Pakistan
        {editor ? ` · Edited by ${editor}` : ""}
      </p>
      <nav aria-label="Related documents" className="flex flex-wrap gap-x-4 gap-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
