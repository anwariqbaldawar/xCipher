import type { Editor } from '@tiptap/core';

// ─────────────────────────────────────────────────────────────────────────────
// Caret-anchored figure insertion
// ─────────────────────────────────────────────────────────────────────────────
//
// Bug being fixed: inserting an image from the toolbar (or the bubble menu)
// often landed at the *bottom* of the document instead of at the caret, and the
// author had to drag it back up.
//
// Cause: the insert ran against `editor.state.selection` at the moment the media
// dialog resolved. Opening the dialog moves DOM focus to an input that sits after
// the editor in the document tree, and the upload that follows is asynchronous,
// so by the time the insert ran the editor's live selection could no longer be
// trusted — ProseMirror had either dropped it or re-derived it from a DOM
// selection that now resolves below the editor, which is the end of the document.
//
// Fix: capture the caret while the editor still owns focus (before the dialog or
// file picker opens) and insert strictly at that saved position. A saved
// coordinate that is no longer valid falls back to the live caret — never to the
// document size, which is exactly the "snaps to the bottom" behaviour.
// ─────────────────────────────────────────────────────────────────────────────

/** A caret/selection captured before the editor lost focus. */
export interface EditorSelection {
  from: number;
  to: number;
}

export interface FigureAttrs {
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
  credit?: string;
  width?: string | number | null;
  alignment?: string | null;
}

/**
 * Snapshot the current selection. Call this synchronously in the handler that
 * opens a dialog, file picker or any other focus-stealing surface.
 */
export function captureSelection(editor: Editor | null | undefined): EditorSelection | null {
  if (!editor || editor.isDestroyed) return null;
  const { from, to } = editor.state.selection;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return { from, to };
}

/** Whether a captured position still addresses a point inside the document. */
function isPositionUsable(editor: Editor, position: number): boolean {
  return Number.isFinite(position) && position >= 0 && position <= editor.state.doc.content.size;
}

/**
 * Insert a `figure` block at `at` (or at the live caret when `at` is null).
 *
 * `insertContentAt` is used rather than `insertContent` so the insert target is
 * explicit instead of being read from a selection that may have moved, and the
 * caret is placed after the inserted block so the author can keep typing under
 * the image.
 */
export function insertFigureAt(
  editor: Editor | null | undefined,
  at: number | null,
  attrs: FigureAttrs,
): boolean {
  if (!editor || editor.isDestroyed || !attrs.src) return false;

  const figureType = editor.state.schema.nodes.figure;
  if (!figureType) return false;

  const target = typeof at === 'number' && isPositionUsable(editor, at) ? at : editor.state.selection.from;

  const caption = (attrs.caption || '').trim();
  const node = figureType.create(
    {
      src: attrs.src,
      alt: attrs.alt || '',
      title: attrs.title ?? null,
      caption: attrs.caption || null,
      credit: attrs.credit || null,
    },
    caption ? editor.state.schema.text(caption) : null,
  );

  const inserted = editor.commands.insertContentAt(target, node, {
    updateSelection: true,
    applyInputRules: false,
    applyPasteRules: false,
  });

  if (!inserted) return false;

  // A figure that lands at the very end leaves nowhere to type after it, so a
  // trailing paragraph is added. Anywhere else the surrounding blocks already
  // provide the typing target, and adding one would litter the document.
  if (editor.state.doc.lastChild?.type.name === 'figure') {
    editor.commands.insertContentAt(editor.state.doc.content.size, { type: 'paragraph' });
  }

  // Focus last: focusing a blurred editor restores the DOM selection, and doing
  // that before the insert is what let the target drift.
  editor.commands.focus(undefined, { scrollIntoView: true });
  return true;
}

/** Convenience wrapper for a selection captured with {@link captureSelection}. */
export function insertFigureAtSelection(
  editor: Editor | null | undefined,
  selection: EditorSelection | null,
  attrs: FigureAttrs,
): boolean {
  return insertFigureAt(editor, selection?.from ?? null, attrs);
}
