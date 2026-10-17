import Link from "next/link";
import { fmtViews } from "@/lib/utils";
import type { EditorialAuditEntry } from "@/lib/cached-queries";

// ─────────────────────────────────────────────────────────────────────────────
// Category Coverage & Readership Breakdown
//
// Widget B on /admin. A visual distribution of article volume and
// accumulated reads across the publication's beats, computed from the
// same cached metadata index as the SEO audit — again, zero extra
// database wake-ups. The Editor-in-Chief can see at a glance which
// beats are saturated and which need fresh coverage.
//
// Bars encode total reads; the volume count sits alongside so a beat
// with one viral story does not masquerade as a healthy section.
// ─────────────────────────────────────────────────────────────────────────────

interface CategoryStat {
  slug: string | null;
  name: string;
  articles: number;
  reads: number;
}

export default function CategoryCoveragePanel({ articles }: { articles: EditorialAuditEntry[] }) {
  const byCategory = new Map<string, CategoryStat>();
  for (const article of articles) {
    if (article.status !== "PUBLISHED" && article.status !== "SCHEDULED") continue;
    const key = article.categorySlug ?? "uncategorized";
    const stat = byCategory.get(key) ?? {
      slug: article.categorySlug,
      name: article.categoryName ?? "Uncategorized",
      articles: 0,
      reads: 0,
    };
    stat.articles += 1;
    stat.reads += article.views;
    byCategory.set(key, stat);
  }

  const stats = [...byCategory.values()].sort((a, b) => b.reads - a.reads);
  const maxReads = Math.max(1, ...stats.map(s => s.reads));
  const totalReads = stats.reduce((sum, s) => sum + s.reads, 0);

  return (
    <div className="glass-panel bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-surface glass-panel-header">
        <div>
          <h2 className="text-sm font-bold text-ink tracking-wide uppercase font-[var(--f-ui)] flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-blue-500 rounded-sm" />
            Category Coverage &amp; Readership
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Volume and reads per beat — where coverage is thin
          </p>
        </div>
        <Link
          href="/admin/taxonomy"
          className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Manage</span>
        </Link>
      </div>

      {stats.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted text-center">
          No published stories yet — coverage data appears once the first
          piece goes live.
        </p>
      ) : (
        <ul className="px-5 py-4 space-y-3.5">
          {stats.map(stat => {
            const share = totalReads > 0 ? (stat.reads / totalReads) * 100 : 0;
            const width = Math.max(3, Math.round((stat.reads / maxReads) * 100));
            return (
              <li key={stat.slug ?? "none"}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-ink truncate">{stat.name}</span>
                  <span className="text-[11px] text-muted tabular-nums shrink-0">
                    {stat.articles} {stat.articles === 1 ? "story" : "stories"} · {fmtViews(stat.reads)} reads · {share.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-surface-2 overflow-hidden" role="img" aria-label={`${stat.name}: ${stat.articles} stories, ${fmtViews(stat.reads)} reads, ${share.toFixed(0)} percent of total reads`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500/80 to-accent/90 transition-all duration-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
