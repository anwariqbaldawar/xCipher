// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { findText } from '@/lib/editor/find-text';
import {
  clearFindMatches,
  findReplacePluginKey,
  FindReplaceHighlight,
  setFindMatches,
} from '@/lib/editor/find-replace';

/**
 * Find & Replace highlighting.
 *
 * The panel computes matches from the document; this plugin
 * mirrors them into a ProseMirror DecorationSet so every
 * occurrence is highlighted inline, with the active match
 * carrying the distinct class the panel scrolls to.
 */
describe('find & replace decorations', () => {
  it('finds every occurrence in the document', () => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [
        StarterKit.configure({ codeBlock: false, heading: false, link: false, underline: false }),
        FindReplaceHighlight,
      ],
      content: '<p>hello world, hello again, hello thrice</p>',
    });

    const matches = findText(editor.state.doc, 'hello');
    expect(matches).toHaveLength(3);

    editor.destroy();
  });

  it('highlights all matches and marks the active one', () => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [
        StarterKit.configure({ codeBlock: false, heading: false, link: false, underline: false }),
        FindReplaceHighlight,
      ],
      content: '<p>hello world, hello again</p>',
    });

    const matches = findText(editor.state.doc, 'hello');
    setFindMatches(editor, matches, 1);

    const decorationSet = findReplacePluginKey.getState(editor.state);
    expect(decorationSet).toBeTruthy();
    expect(decorationSet!.find()).toHaveLength(2);

    // The decorations are painted into the editor DOM: two
    // highlights, exactly one of them the active match.
    expect(editor.view.dom.querySelectorAll('.find-match')).toHaveLength(2);
    expect(editor.view.dom.querySelectorAll('.find-match-active')).toHaveLength(1);

    // Cycling the active match moves the distinct class.
    setFindMatches(editor, matches, 0);
    const firstActive = editor.view.dom.querySelector('.find-match-active');
    expect(firstActive?.textContent).toBe('hello');

    editor.destroy();
  });

  it('clears every highlight', () => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [
        StarterKit.configure({ codeBlock: false, heading: false, link: false, underline: false }),
        FindReplaceHighlight,
      ],
      content: '<p>hello world</p>',
    });

    setFindMatches(editor, findText(editor.state.doc, 'hello'), 0);
    expect(editor.view.dom.querySelectorAll('.find-match')).toHaveLength(1);

    clearFindMatches(editor);
    expect(findReplacePluginKey.getState(editor.state)?.find()).toHaveLength(0);
    expect(editor.view.dom.querySelectorAll('.find-match')).toHaveLength(0);

    editor.destroy();
  });

  it('replaces every occurrence in a single transaction', () => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [
        StarterKit.configure({ codeBlock: false, heading: false, link: false, underline: false }),
        FindReplaceHighlight,
      ],
      content: '<p>cats and cats</p>',
    });

    const matches = findText(editor.state.doc, 'cats');
    const transaction = editor.state.tr;
    [...matches].reverse().forEach((match) =>
      transaction.insertText('dogs', match.from, match.to),
    );
    editor.view.dispatch(transaction);

    expect(editor.state.doc.textContent).toBe('dogs and dogs');
    // One transaction = one undo step restores both words.
    editor.commands.undo();
    expect(editor.state.doc.textContent).toBe('cats and cats');

    editor.destroy();
  });

  it('maps highlights through document edits', () => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: [
        StarterKit.configure({ codeBlock: false, heading: false, link: false, underline: false }),
        FindReplaceHighlight,
      ],
      content: '<p>hello world</p>',
    });

    setFindMatches(editor, findText(editor.state.doc, 'hello'), 0);
    expect(editor.view.dom.querySelectorAll('.find-match')).toHaveLength(1);

    // Typing before the match shifts its position; the
    // decoration must follow rather than vanish or stick.
    editor.commands.insertContentAt(1, 'oh ');
    const decorations = findReplacePluginKey.getState(editor.state)?.find();
    expect(decorations).toHaveLength(1);
    expect(decorations![0].from).toBe(4);
    expect(decorations![0].to).toBe(9);

    editor.destroy();
  });
});
