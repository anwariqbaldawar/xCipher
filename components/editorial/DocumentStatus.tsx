"use client";

import { memo } from 'react';
import { type Editor, useEditorState } from '@tiptap/react';
import { getDocumentCounts } from '@/lib/editor/document-state';

/**
 * Header word count. Subscribes to the editor itself, so it stays current
 * while typing without re-rendering the editor page, and shares
 * getDocumentCounts' one-count-per-document cache with the status bar.
 */
export const WordCountBadge = memo(function WordCountBadge({ editor }: { editor: Editor }) {
  const words = useEditorState({ editor, selector: ({ editor }) => getDocumentCounts(editor).words });
  const isBelowMin = words < 50;
  return (
    <span className={`text-xs ml-2 font-medium flex items-center gap-1 ${isBelowMin ? 'text-[var(--warn)] hidden sm:flex' : 'text-[var(--muted)] hidden md:flex'}`}>
      Word count: {words}
      {isBelowMin && <span className="hidden sm:inline">(Min 50)</span>}
    </span>
  );
});

function DocumentStatus({ editor, zoom, setZoom, status }: { editor: Editor; zoom: number; setZoom: (zoom: number) => void; status: string }) {
  const counts = useEditorState({ editor, selector: ({ editor }) => {
    const { words, characters } = getDocumentCounts(editor);
    return {
      words, characters,
      selected: editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ').trim().split(/\s+/u).filter(Boolean).length,
    };
  } });
  return <footer className="studio-status"><div><span>{counts.words.toLocaleString()} words</span><span>{Math.max(1, Math.ceil(counts.words / 200))} min read</span><span className="studio-character-count">{counts.characters.toLocaleString()} / 50,000 characters</span>{counts.selected > 0 && <span>{counts.selected} selected</span>}</div><div><span className="studio-status-sync" role="status">{status || 'Ready to write'}</span><label>Zoom <select value={zoom} onChange={event => setZoom(Number(event.target.value))}>{[75, 90, 100, 110, 125].map(value => <option key={value} value={value}>{value}%</option>)}</select></label></div></footer>;
}

// Memoised: re-renders only for its own props or when its editor selector changes.
export default memo(DocumentStatus);
