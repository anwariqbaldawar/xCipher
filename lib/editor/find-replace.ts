import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// ─────────────────────────────────────────────────────────────────────────────
// Find & Replace — match highlighting
// ─────────────────────────────────────────────────────────────────────────────
//
// The Find & Replace panel used to jump the selection to each match without
// ever marking the matched ranges in the document, so a writer could not see
// where the matches were, how many there were, or which one was active.
//
// This plugin keeps a ProseMirror DecorationSet of inline decorations:
// every match gets the `find-match` class, and the match the panel is
// currently positioned on additionally gets `find-match-active`. The React
// panel dispatches a transaction with this plugin's meta whenever the query,
// the case sensitivity or the active index changes; regular document
// transactions map the decorations through the change so highlights stay
// attached to their text while the writer types.
// ─────────────────────────────────────────────────────────────────────────────

export interface FindMatchRange {
  from: number;
  to: number;
}

/** Payload carried on the meta transaction that (re)builds the set. */
interface FindReplaceMeta {
  matches: FindMatchRange[];
  decorations: Decoration[];
  activeIndex: number;
}

export const findReplacePluginKey = new PluginKey<DecorationSet>('findReplace');

/**
 * Rebuild the decoration set from scratch. Called by the panel whenever
 * the match list changes (new query, document edit, case toggle).
 */
export function setFindMatches(editor: Editor, matches: FindMatchRange[], activeIndex: number): void {
  const decorations = matches.map((match, index) =>
    Decoration.inline(match.from, match.to, {
      class: index === activeIndex ? 'find-match find-match-active' : 'find-match',
    }),
  );

  const meta: FindReplaceMeta = { matches, decorations, activeIndex };
  editor.view.dispatch(editor.state.tr.setMeta(findReplacePluginKey, meta));
}

/**
 * Clear every highlight — called when the panel closes or the query
 * empties. An empty match list, not a null meta: the plugin treats a
 * missing meta as "ordinary document transaction" and would map the
 * stale decorations forward instead of clearing them.
 */
export function clearFindMatches(editor: Editor): void {
  const meta: FindReplaceMeta = { matches: [], decorations: [], activeIndex: 0 };
  editor.view.dispatch(editor.state.tr.setMeta(findReplacePluginKey, meta));
}

/**
 * The plugin itself. Meta transactions carry the fresh match list; all other
 * transactions (typing, undo, paste) simply map the existing decorations so
 * highlights track their text through edits instead of going stale.
 */
export const findReplacePlugin: Plugin<DecorationSet> = new Plugin({
  key: findReplacePluginKey,
  state: {
    init: () => DecorationSet.empty,
    apply(transaction: Transaction, decorationSet: DecorationSet): DecorationSet {
      const meta = transaction.getMeta(findReplacePluginKey) as FindReplaceMeta | undefined;
      if (meta) {
        if (!meta.matches || meta.matches.length === 0) return DecorationSet.empty;
        return DecorationSet.create(transaction.doc, meta.decorations);
      }
      // Map through the transaction: a decoration that ends up covering
      // changed content is dropped by ProseMirror's mapping rules, and
      // the panel rebuilds the set from the re-scanned document anyway.
      return decorationSet.map(transaction.mapping, transaction.doc);
    },
  },
  props: {
    decorations(state): DecorationSet | null {
      return findReplacePlugin.getState(state) ?? null;
    },
  },
});

/**
 * Tiptap wrapper so the decoration plugin lives in the editor's
 * extension list alongside the rest of the studio schema.
 */
export const FindReplaceHighlight = Extension.create({
  name: 'findReplaceHighlight',
  addProseMirrorPlugins() {
    return [findReplacePlugin];
  },
});
