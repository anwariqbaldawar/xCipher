// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Editor, Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { captureSelection, insertFigureAt, insertFigureAtSelection } from '@/lib/editor/figure-insert';

/**
 * A stand-in for the real `figure` node (components/editorial/extensions/
 * AdvancedImage.ts).
 *
 * The extension itself is not imported here on purpose: it pulls in
 * `ReactNodeViewRenderer` and the React figure component, and a node view is
 * irrelevant to the question this file asks — *where* the block lands. The
 * schema shape below mirrors the real one (`group: 'block'`, `content:
 * 'inline*'`, `isolating: true`) plus the same attribute defaults, which is all
 * `insertFigureAt` reads.
 */
const FigureStub = Node.create({
  name: 'figure',
  group: 'block',
  content: 'inline*',
  draggable: true,
  isolating: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      caption: { default: null },
      credit: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'figure' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['figure', HTMLAttributes, 0];
  },
});

const ATTRS = { src: 'https://media.xsypher.com/2026/10/diagram.webp', alt: 'Firmware diagram' };

/** A story long enough to matter: 120 paragraphs of 12 words = 1,440 words. */
function longStory(paragraphs = 120): string {
  const sentence = 'Firmware auditing requires a reproducible harness and a documented threat model for every build tested here';
  return Array.from({ length: paragraphs }, (_, i) => `<p>${i} ${sentence}</p>`).join('');
}

function makeEditor(content: string) {
  return new Editor({ extensions: [StarterKit, FigureStub], content });
}

function figurePositions(editor: Editor): number[] {
  const positions: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'figure') positions.push(pos);
  });
  return positions;
}

function wordCount(editor: Editor): number {
  return editor.state.doc.textContent.trim().split(/\s+/).filter(Boolean).length;
}

describe('figure insertion is anchored to the captured caret', () => {
  it('inserts at the saved position when the live selection has drifted to the end', () => {
    const editor = makeEditor(longStory());
    try {
      expect(wordCount(editor)).toBeGreaterThan(1200);

      // The author's caret sits in the middle of the story when they click the
      // toolbar button.
      const caret = 900;
      editor.commands.setTextSelection(caret);
      const captured = captureSelection(editor);
      expect(captured).toEqual({ from: caret, to: caret });

      // …then the media dialog takes DOM focus, and by the time the upload
      // resolves ProseMirror's selection has been re-derived at the document's
      // end. This is the state that used to swallow the image.
      editor.commands.setTextSelection(editor.state.doc.content.size);
      const docEnd = editor.state.doc.content.size;

      expect(insertFigureAtSelection(editor, captured, ATTRS)).toBe(true);

      const [position] = figurePositions(editor);
      expect(position).toBeLessThan(docEnd);
      // And specifically not bolted onto the end of the document.
      expect(editor.state.doc.lastChild?.type.name).not.toBe('figure');
      // The insert landed near the captured caret, not at the drifted one.
      expect(Math.abs(position - caret)).toBeLessThan(60);

      // The figure carries the uploaded image, so it is the real block and not
      // an empty placeholder that merely moved the caret.
      expect(JSON.stringify(editor.getJSON())).toContain('diagram.webp');
    } finally {
      editor.destroy();
    }
  });

  it('falls back to the live caret, never the document end, when the saved position is out of range', () => {
    const editor = makeEditor('<p>Alpha</p><p>Bravo</p><p>Charlie</p>');
    try {
      editor.commands.setTextSelection(3); // inside the first paragraph
      const docEnd = editor.state.doc.content.size;

      expect(insertFigureAt(editor, docEnd + 5000, ATTRS)).toBe(true);

      const [position] = figurePositions(editor);
      expect(position).toBeLessThan(docEnd - 1);
    } finally {
      editor.destroy();
    }
  });

  it('adds a trailing paragraph only when the figure lands at the very end', () => {
    const middle = makeEditor('<p>Alpha</p><p>Bravo</p><p>Charlie</p>');
    const end = makeEditor('<p>Alpha</p><p>Bravo</p><p>Charlie</p>');
    try {
      middle.commands.setTextSelection(3);
      expect(insertFigureAt(middle, 3, ATTRS)).toBe(true);
      expect(middle.state.doc.lastChild?.type.name).toBe('paragraph');

      end.commands.setTextSelection(end.state.doc.content.size - 1);
      expect(insertFigureAt(end, end.state.doc.content.size, ATTRS)).toBe(true);
      expect(end.state.doc.lastChild?.type.name).toBe('paragraph');
    } finally {
      middle.destroy();
      end.destroy();
    }
  });

  it('keeps a caption and reports failure instead of inserting an empty figure', () => {
    const editor = makeEditor('<p>Alpha</p>');
    try {
      expect(insertFigureAt(editor, 2, { ...ATTRS, caption: 'Pinout of the exposed debug header' })).toBe(true);
      expect(editor.getHTML()).toContain('Pinout of the exposed debug header');

      // No src means nothing to insert — a silent no-op, not a broken block.
      expect(insertFigureAt(editor, 2, { src: '' })).toBe(false);
      expect(figurePositions(editor)).toHaveLength(1);
    } finally {
      editor.destroy();
    }
  });

  it('refuses to touch a destroyed editor', () => {
    const editor = makeEditor('<p>Alpha</p>');
    editor.destroy();
    expect(captureSelection(editor)).toBeNull();
    expect(insertFigureAtSelection(editor, { from: 1, to: 1 }, ATTRS)).toBe(false);
  });
});
