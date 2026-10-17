import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import type { EditorialAuditEntry } from "@/lib/cached-queries";

// ─────────────────────────────────────────────────────────────────────────────
// SEO & Editorial Quality Readiness Audit
//
// Widget A on /admin. Runs five editorial health checks over the
// cached article-metadata index (lib/cached-queries
// getEditorialAuditIndex) — published and draft stories alike — so
// the Editor-in-Chief can see, at a glance, what is missing before
// a story ships to Google. Every number here is computed from the
// same tagged snapshot the rest of the dashboard reads, which is
// what keeps the widgets at zero extra database wake-ups.
//
// Checks (each with a 1-click Fix list linking to the editor):
//   1. Meta title length      — 30–60 characters
//   2. Meta description length — 70–160 characters
//   3. Featured image present
//   4. Alt text on every featured image
//   5. Internal structure      — deck + parsed body (reading time ≥ 1)
// ─────────────────────────────────────────────────────────────────────────────

interface AuditCheck {
  label: string;
  hint: string;
  pass: number;
  total: number;
  failing: { id: string; title: string }[];
}

function healthTone(ratio: number): "ok" | "warn" | "bad" {
  if (ratio >= 0.9) return "ok";
  if (ratio >= 0.6) return "warn";
  return "bad";
}

const TONE_STYLES: Record<string, { bar: string; icon: typeof CheckCircle2; text: string }> = {
  ok: { bar: "bg-emerald-500", icon: CheckCircle2, text: "text-emerald-600 dark:text-emerald-400" },
  warn: { bar: "bg-amber-500", icon: AlertTriangle, text: "text-amber-600 dark:text-amber-400" },
  bad: { bar: "bg-red-500", icon: XCircle, text: "text-red-600 dark:text-red-400" },
};

export default function SeoAuditPanel({ articles }: { articles: EditorialAuditEntry[] }) {
  // The audit covers the working corpus: everything that is published
  // or still being written. Rejected/archived pieces are excluded.
  const live = articles.filter(
    a => a.status === "PUBLISHED" || a.status === "DRAFT" || a.status === "SUBMITTED" || a.status === "REVISION_REQUESTED" || a.status === "SCHEDULED",
  );

  const withImage = live.filter(a => a.img);
  const checks: AuditCheck[] = [
    {
      label: "Meta title length",
      hint: "30–60 characters",
      pass: live.filter(a => {
        const title = (a.seoTitle || a.title || "").trim();
        return title.length >= 30 && title.length <= 60;
      }).length,
      total: live.length,
      failing: live.filter(a => {
        const title = (a.seoTitle || a.title || "").trim();
        return title.length < 30 || title.length > 60;
      }).map(a => ({ id: a.id, title: a.title })),
    },
    {
      label: "Meta description length",
      hint: "70–160 characters",
      pass: live.filter(a => {
        const desc = (a.seoDesc || a.deck || "").trim();
        return desc.length >= 70 && desc.length <= 160;
      }).length,
      total: live.length,
      failing: live.filter(a => {
        const desc = (a.seoDesc || a.deck || "").trim();
        return desc.length < 70 || desc.length > 160;
      }).map(a => ({ id: a.id, title: a.title })),
    },
    {
      label: "Featured image present",
      hint: "OG card + social previews",
      pass: withImage.length,
      total: live.length,
      failing: live.filter(a => !a.img).map(a => ({ id: a.id, title: a.title })),
    },
    {
      label: "Featured image alt text",
      hint: "accessibility + Images SEO",
      pass: withImage.filter(a => (a.featuredImageAlt || "").trim().length > 0).length,
      total: withImage.length,
      failing: withImage.filter(a => !(a.featuredImageAlt || "").trim()).map(a => ({ id: a.id, title: a.title })),
    },
    {
      label: "Internal structure health",
      hint: "deck + parsed body",
      pass: live.filter(a => (a.deck || "").trim().length > 0 && a.readingTime >= 1).length,
      total: live.length,
      failing: live.filter(a => !(a.deck || "").trim() || a.readingTime < 1).map(a => ({ id: a.id, title: a.title })),
    },
  ];

  const readyCount = checks.filter(c => c.total > 0 && c.pass === c.total).length;

  return (
    <div className="glass-panel bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-surface glass-panel-header">
        <div>
          <h2 className="text-sm font-bold text-ink tracking-wide uppercase font-[var(--f-ui)] flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-accent rounded-sm" />
            SEO &amp; Editorial Readiness
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {live.length === 0 ? "Nothing to audit yet" : `${readyCount} of 5 checks pass`}
          </p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {live.length} stories audited
        </span>
      </div>

      <div className="divide-y divide-line">
        {checks.map(check => {
          const ratio = check.total === 0 ? 1 : check.pass / check.total;
          const tone = TONE_STYLES[check.total === 0 ? "ok" : healthTone(ratio)];
          const HealthIcon = tone.icon;
          const pct = Math.round(ratio * 100);
          return (
            <div key={check.label} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <HealthIcon className={`w-4 h-4 shrink-0 ${tone.text}`} aria-hidden="true" />
                  <span className="text-sm font-semibold text-ink truncate">{check.label}</span>
                  <span className="hidden sm:inline text-[11px] text-muted">— {check.hint}</span>
                </div>
                <span className="text-xs font-semibold tabular-nums text-ink shrink-0">
                  {check.pass}/{check.total}
                  <span className="text-muted font-normal"> ({pct}%)</span>
                </span>
              </div>
              <div className="mt-2.5 h-1.5 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${check.label}: ${pct}%`}>
                <div className={`h-full rounded-full transition-all duration-500 ${tone.bar}`} style={{ width: `${pct}%` }} />
              </div>
              {check.failing.length > 0 && (
                <ul className="mt-2.5 space-y-1">
                  {check.failing.slice(0, 3).map(item => (
                    <li key={item.id}>
                      <Link
                        href={`/admin/editor/${item.id}`}
                        className="group flex items-center justify-between gap-2 text-xs text-muted hover:text-ink transition-colors py-0.5"
                        title={`Fix ${check.label.toLowerCase()} on “${item.title}”`}
                      >
                        <span className="truncate">
                          <span className="text-accent font-semibold">Fix</span> · {item.title}
                        </span>
                        <ArrowRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                  {check.failing.length > 3 && (
                    <li className="text-[11px] text-muted pl-1">
                      + {check.failing.length - 3} more — open a story above to fix it
                    </li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
