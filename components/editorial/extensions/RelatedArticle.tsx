import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { Pencil, Trash2 } from 'lucide-react';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    relatedArticle: { insertRelatedArticle: (attrs: { slug: string; title: string; category?: string; image?: string; heading?: string }) => ReturnType };
  }
}

function RelatedArticleNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const attrs = node.attrs as { slug: string; title: string; category: string; image: string; heading: string };
  return <NodeViewWrapper as="aside" contentEditable={false} className={`not-prose my-5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] ${selected ? 'ring-2 ring-[var(--accent)]' : ''}`}>
    <div role="heading" aria-level={3} data-toc-exclude="true" data-wordcount-exclude="true" className="mb-3 text-xl font-bold leading-snug tracking-tight">{attrs.heading || 'RELATED ON XSYPHER'}</div>
    <div className="flex min-h-[100px] overflow-hidden rounded-xl border border-[var(--line)]">
      <div className="relative w-[38%] shrink-0 bg-cover bg-center" style={{ backgroundImage: attrs.image ? `linear-gradient(90deg,transparent 55%,var(--surface-2)),url("${attrs.image}")` : undefined, backgroundColor: 'var(--surface-3)' }} />
      <div className="flex min-w-0 flex-1 flex-col justify-center p-3"><span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">{attrs.category}</span><strong className="line-clamp-2 text-sm leading-snug text-[var(--ink)]">{attrs.title}</strong></div>
    </div>
    <div className="mt-1 flex justify-end gap-1"><button type="button" title="Edit related article" onClick={() => { const heading = window.prompt('Custom heading (leave empty for RELATED ON XSYPHER)', attrs.heading); if (heading !== null) updateAttributes({ heading }); }} className="rounded p-1 text-xs"><Pencil size={13} /></button><button type="button" title="Delete related article" onClick={deleteNode} className="rounded p-1 text-xs"><Trash2 size={13} /></button></div>
  </NodeViewWrapper>;
}

export const RelatedArticle = Node.create({
  name: 'relatedArticle', group: 'block', atom: true, draggable: true, selectable: true,
  addAttributes() {
    const attr = (key: string) => ({ default: '', parseHTML: (el: HTMLElement) => el.getAttribute(`data-related-${key}`) || '', renderHTML: (attrs: Record<string, string>) => ({ [`data-related-${key}`]: attrs[key] || '' }) });
    return { slug: attr('slug'), title: attr('title'), category: attr('category'), image: attr('image'), heading: attr('heading') };
  },
  parseHTML() { return [{ tag: 'aside[data-type="related-article"]' }]; },
  renderHTML({ node, HTMLAttributes }) {
    const { slug, title, category, image, heading } = node.attrs;
    return ['aside', mergeAttributes(HTMLAttributes, { 'data-type': 'related-article', 'aria-label': 'Related on xSypher' }),
      ['div', { role: 'heading', 'aria-level': '3', 'data-toc-exclude': 'true', 'data-wordcount-exclude': 'true', class: 'related-article-heading' }, heading || 'RELATED ON XSYPHER'],
      ['a', { href: `/article/${slug}`, title, 'data-related-link': 'true' }, ['span', {}, image || ''], ['span', {}, category || ''], ['strong', {}, title || '']]];
  },
  addNodeView() { return ReactNodeViewRenderer(RelatedArticleNodeView); },
  addCommands() { return { insertRelatedArticle: attrs => ({ commands }) => commands.insertContent([{ type: this.name, attrs }, { type: 'paragraph' }]) }; },
});
