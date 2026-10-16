import type { Node } from '@tiptap/pm/model';
import type { Decoration, DecorationSource } from '@tiptap/pm/view';

// ─────────────────────────────────────────────────────────────────────────────
// Node view memoisation
// ─────────────────────────────────────────────────────────────────────────────
//
// Heavy block node views (diagrams, charts, code, figures, review blocks) are
// re-rendered by the React node view renderer every time ProseMirror reports the
// node as updated. On a 1,200+ word story, typing in one paragraph still causes
// unrelated blocks to re-run their React render — and for a Mermaid diagram or
// a Recharts chart that is real work the reader never asked for.
//
// `ReactNodeViewRenderer` accepts an `update` hook for exactly this: it is given
// the old node, the new node and their decorations, plus an `updateProps()`
// function that triggers the React re-render. Returning `true` keeps the
// existing DOM; the re-render only happens when something about *this* node
// actually changed.
//
// This must return `true` in the unchanged case too — returning `false` tells
// ProseMirror the node view cannot handle the node, which tears the view down
// and rebuilds it. That is the opposite of what we want.
// ─────────────────────────────────────────────────────────────────────────────

export interface NodeViewUpdateProps {
  oldNode: Node;
  newNode: Node;
  oldDecorations: readonly Decoration[];
  newDecorations: readonly Decoration[];
  oldInnerDecorations: DecorationSource;
  innerDecorations: DecorationSource;
  updateProps: () => void;
}

/**
 * Skip the React re-render when the node itself and its decorations are
 * untouched (identical object references — ProseMirror documents are immutable,
 * so an unchanged block is the *same* object).
 */
export function memoNodeViewUpdate({
  oldNode,
  newNode,
  oldDecorations,
  newDecorations,
  updateProps,
}: NodeViewUpdateProps): boolean {
  const unchanged = oldNode === newNode && oldDecorations === newDecorations;
  if (!unchanged) updateProps();
  return true;
}
