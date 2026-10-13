import React from 'react';
import { CheckCircle2, XCircle, Scale } from 'lucide-react';

interface Props {
  pros: string[];
  cons: string[];
}

export default function ProsConsViewer({ pros, cons }: Props) {
  const hasPros = Array.isArray(pros) && pros.length > 0;
  const hasCons = Array.isArray(cons) && cons.length > 0;

  if (!hasPros && !hasCons) return null;

  return (
    <div className="my-8 font-sans">
      {/* Sleek Floating Verdict Header */}
      <div className="flex items-center gap-2 mb-3.5 px-0.5">
        <Scale className="w-4 h-4 text-red-600 dark:text-red-500" />
        <span className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-wider">
          The Verdict
        </span>
      </div>

      {/* Grid Layout of Glassmorphic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">

        {/* Pros Glassmorphic Card */}
        {hasPros && (
          <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 backdrop-blur-xl bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.03] to-emerald-500/[0.01] dark:from-emerald-400/[0.12] dark:via-emerald-400/[0.04] dark:to-transparent border border-emerald-500/20 dark:border-emerald-400/25 ring-1 ring-inset ring-white/40 dark:ring-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
            <h4 className="text-xs font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-3.5 m-0 flex items-center gap-2">
              Pros
            </h4>
            <ul className="flex flex-col divide-y divide-emerald-500/10 dark:divide-emerald-400/15 m-0 p-0 list-none">
              {pros.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                  <CheckCircle2 className="text-emerald-500 dark:text-emerald-400 w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal">
                    {p}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cons Glassmorphic Card */}
        {hasCons && (
          <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 backdrop-blur-xl bg-gradient-to-br from-rose-500/[0.08] via-rose-500/[0.03] to-rose-500/[0.01] dark:from-rose-400/[0.12] dark:via-rose-400/[0.04] dark:to-transparent border border-rose-500/20 dark:border-rose-400/25 ring-1 ring-inset ring-white/40 dark:ring-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
            <h4 className="text-xs font-bold tracking-widest uppercase text-rose-600 dark:text-rose-400 mb-3.5 m-0 flex items-center gap-2">
              Cons
            </h4>
            <ul className="flex flex-col divide-y divide-rose-500/10 dark:divide-rose-400/15 m-0 p-0 list-none">
              {cons.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                  <XCircle className="text-rose-500 dark:text-rose-400 w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal">
                    {c}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}
