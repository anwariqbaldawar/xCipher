import Link from 'next/link';

export default function RelatedArticleViewer({ slug, title, category, image, heading }: { slug: string; title: string; category: string; image: string; heading?: string }) {
  const src = image && /^(https?:\/\/|\/)/.test(image) ? image : '';
  return <aside aria-label="Related on xSypher" className="not-prose my-6">
    <div role="heading" aria-level={3} data-toc-exclude="true" data-wordcount-exclude="true" className="mb-3 text-xl font-bold leading-snug tracking-tight">{heading || 'RELATED ON XSYPHER'}</div>
    <Link href={`/article/${encodeURIComponent(slug)}`} title={title} className="group relative flex min-h-[96px] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-2)] transition duration-200 hover:border-[var(--accent)]/60 hover:shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_16%,transparent)] sm:min-h-[104px]">
      {src && <div aria-hidden="true" className="absolute inset-y-0 left-0 w-[42%] bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]" style={{ backgroundImage: `linear-gradient(90deg, transparent 0%, transparent 42%, var(--surface-2) 100%), url("${src}")` }} />}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[42%] bg-gradient-to-r from-transparent via-transparent to-[var(--surface-2)]" />
      <span aria-hidden="true" className="absolute bottom-2 left-2 z-[1] rounded bg-black/50 px-1.5 py-0.5 text-[8px] font-bold tracking-widest text-white/80">XSYPHER</span>
      <span className="relative z-[2] ml-[35%] flex min-w-0 flex-1 flex-col justify-center py-3 pl-3 pr-4 sm:ml-[38%]">
        <span className="mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--accent)]">{category || 'FEATURED'}</span>
        <strong className="line-clamp-2 text-sm font-bold leading-snug text-[var(--ink)] sm:text-base">{title}</strong>
      </span>
    </Link>
  </aside>;
}
