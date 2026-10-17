"use client";

import { useEffect, useMemo, useState } from 'react';
import { type Editor, useEditorState } from '@tiptap/react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { findText } from '@/lib/editor/find-text';
import {
  clearFindMatches,
  setFindMatches,
  type FindMatchRange,
} from '@/lib/editor/find-replace';

/**
 * Find & Replace panel.
 *
 * Matches are computed from the live document and mirrored into a
 * ProseMirror DecorationSet (lib/editor/find-replace.ts) so every
 * occurrence is highlighted inline while the query is typed. The
 * match the panel is positioned on carries the active class and is
 * scrolled to the centre of the editor viewport; cycling with the
 * arrows or Enter moves both the selection and the highlight.
 *
 * Replace / Replace all build a single transaction (insertText from
 * the end of the document backwards so earlier offsets stay valid),
 * which keeps the whole operation in one undo step.
 */
export default function FindReplace({ editor, close }: { editor: Editor; close: () => void }) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const doc = useEditorState({ editor, selector: ({ editor }) => editor.state.doc });
  const matches = useMemo(() => findText(doc, query, caseSensitive), [doc, query, caseSensitive]);

  // Never point past the end of a shrunken match list. Computed during
  // render rather than in an effect so the decorations dispatched
  // below always carry a valid index.
  const safeIndex = matches.length ? Math.min(activeIndex, matches.length - 1) : 0;

  // Mirror the match list into the editor as inline decorations and
  // bring the active match to the centre of the viewport.
  useEffect(() => {
    if (!matches.length) {
      clearFindMatches(editor);
      return;
    }
    setFindMatches(editor, matches, safeIndex);
    const frame = requestAnimationFrame(() => {
      editor.view.dom
        .querySelector('.find-match-active')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [editor, matches, safeIndex]);

  // Drop the highlights when the panel closes so they cannot linger
  // in the document after the search is abandoned.
  useEffect(() => () => clearFindMatches(editor), [editor]);

  // Position the active match on the first hit at or after the caret,
  // so typing a query lands the writer on a match near where they
  // were reading rather than always at the top of the document.
  const activateNearestMatch = (items: FindMatchRange[]) => {
    if (!items.length) return 0;
    const caret = editor.state.selection.from;
    const nearest = items.findIndex(item => item.from >= caret);
    return nearest >= 0 ? nearest : 0;
  };

  const jump = (backward = false) => {
    if (!matches.length) return;
    const next = backward
      ? (safeIndex - 1 + matches.length) % matches.length
      : (safeIndex + 1) % matches.length;
    setActiveIndex(next);
    editor.chain().setTextSelection(matches[next]).scrollIntoView().run();
  };

  const replace = (all: boolean) => {
    if (!matches.length) return;
    const selected = matches.find(
      item => item.from === editor.state.selection.from && item.to === editor.state.selection.to,
    );
    const targets = all ? matches : [selected || matches[safeIndex]].filter(Boolean);
    const transaction = editor.state.tr;
    // Walk backwards so the offsets of the remaining matches stay
    // valid as earlier spans are rewritten.
    [...targets].reverse().forEach(match => transaction.insertText(replacement, match.from, match.to));
    editor.view.dispatch(transaction);
    clearFindMatches(editor);
  };

  return <div className="studio-find" role="search" aria-label="Find and replace" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); clearFindMatches(editor); close(); editor.commands.focus(); } }}>
    <input aria-label="Find in document" autoFocus placeholder="Find in document" value={query} onChange={event => {
      const nextQuery = event.target.value;
      setQuery(nextQuery);
      setActiveIndex(activateNearestMatch(findText(doc, nextQuery, caseSensitive)));
    }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); jump(event.shiftKey); } }} />
    <span aria-live="polite">{matches.length ? `${safeIndex + 1} of ${matches.length} matches` : 'No matches'}</span>
    <button type="button" disabled={!matches.length} onClick={() => jump(true)} aria-label="Previous match"><ChevronUp size={16} /></button>
    <button type="button" disabled={!matches.length} onClick={() => jump()} aria-label="Next match"><ChevronDown size={16} /></button>
    <label><input type="checkbox" checked={caseSensitive} onChange={event => {
      const nextSensitive = event.target.checked;
      setCaseSensitive(nextSensitive);
      setActiveIndex(activateNearestMatch(findText(doc, query, nextSensitive)));
    }} /> Match case</label>
    <input aria-label="Replace with" placeholder="Replace with" value={replacement} onChange={event => setReplacement(event.target.value)} />
    <button type="button" disabled={!matches.length} onClick={() => replace(false)}>Replace</button><button type="button" disabled={!matches.length} onClick={() => replace(true)}>Replace all</button>
    <button type="button" onClick={close} aria-label="Close find and replace"><X size={16} /></button>
  </div>;
}
