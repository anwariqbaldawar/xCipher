import type { Editor } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';

type Heading = { text: string; level: number; pos: number };
const outlines = new WeakMap<Node, Heading[]>();
const counts = new WeakMap<Editor, { doc: Node; words: number; characters: number }>();
const formatting = new WeakMap<Editor, { state: EditorState; value: ReturnType<typeof readEditorFormattingState> }>();

/** Selection transactions reuse the immutable document and its derived data. */
export function getDocumentOutline(editor: Editor): Heading[] {
  const doc = editor.state.doc;
  const cached = outlines.get(doc);
  if (cached) return cached;
  const headings: Heading[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && node.textContent.trim()) {
      headings.push({ text: node.textContent, level: node.attrs.level, pos });
    }
  });
  outlines.set(doc, headings);
  return headings;
}

export function getDocumentCounts(editor: Editor) {
  const doc = editor.state.doc;
  const cached = counts.get(editor);
  if (cached?.doc === doc) return cached;
  const result = {
    doc,
    words: editor.storage.characterCount.words() as number,
    characters: editor.storage.characterCount.characters() as number,
  };
  counts.set(editor, result);
  return result;
}

function readEditorFormattingState(editor: Editor) {
  const table = editor.isActive('table');
  return {
    active: ['bold', 'italic', 'underline', 'highlight', 'strike', 'subscript', 'superscript', 'code', 'link',
      'heading', 'bulletList', 'orderedList', 'blockquote', 'figure', 'image', 'table'].map(name => editor.isActive(name)),
    headingLevel: editor.getAttributes('heading').level ?? null,
    alignment: ['left', 'center', 'right'].map(textAlign => editor.isActive({ textAlign })),
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
    canMergeCells: table && editor.can().mergeCells(),
    canSplitCell: table && editor.can().splitCell(),
  };
}

/** Toolbar and bubble menu share one calculation per immutable editor state. */
export function getEditorFormattingState(editor: Editor) {
  const state = editor.state;
  const cached = formatting.get(editor);
  if (cached?.state === state) return cached.value;
  const value = readEditorFormattingState(editor);
  formatting.set(editor, { state, value });
  return value;
}
