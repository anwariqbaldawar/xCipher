"use client";

import { memo } from 'react';
import { type Editor, useEditorState } from '@tiptap/react';
import { getDocumentOutline } from '@/lib/editor/document-state';

/** Heading levels the published table of contents lists (h2–h4). */
const isTocLevel = (level: number) => level >= 2 && level <= 4;

/**
 * Editor-side preview of the reader's table of contents.
 *
 * Built from editor state, never from the editable DOM. The public
 * TableOfContents scans the rendered article and assigns heading ids; pointed
 * at ProseMirror it wrote ids into nodes ProseMirror owns, ProseMirror redrew
 * those headings, and the observer fired again — a loop on every animation
 * frame that made long articles lag and swallow clicks.
 *
 * The selector returns text and level only (no positions), so typing in a
 * paragraph never re-renders this list; positions are resolved on click.
 */
function TocPreview({ editor }: { editor: Editor }) {
  const items = useEditorState({
    editor,
    selector: ({ editor }) => getDocumentOutline(editor)
      .filter(heading => isTocLevel(heading.level))
      .map(({ text, level }) => ({ text, level })),
  });

  const jumpTo = (index: number) => {
    const heading = getDocumentOutline(editor).filter(item => isTocLevel(item.level))[index];
    if (heading) editor.chain().focus().setTextSelection(heading.pos + 1).scrollIntoView().run();
  };

  return (
    <div data-toc className="article-toc bg-[var(--surface-2)] border border-[var(--line)] p-4 rounded-xl my-4">
      <div className="text-xs font-bold uppercase tracking-widest text-[var(--ink)] mb-3">In this article</div>
      {items.length ? (
        <nav aria-label="In this article" className="relative flex flex-col max-h-[65vh] overflow-y-auto no-scrollbar">
          {items.map((item, index) => (
            <button
              type="button"
              key={`${index}-${item.text}`}
              onClick={() => jumpTo(index)}
              className={`block text-left relative text-sm py-1.5 pr-2 border-l-[3px] border-transparent rounded-r-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-3)]/50 ${item.level === 3 ? 'pl-6' : item.level === 4 ? 'pl-8' : 'pl-3'}`}
            >
              {(item.level === 3 || item.level === 4) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-2 -translate-y-[1px]" />}
              {item.text}
            </button>
          ))}
        </nav>
      ) : (
        <p className="text-xs text-[var(--muted)]">Add section headings to build an outline.</p>
      )}
    </div>
  );
}

export default memo(TocPreview);
