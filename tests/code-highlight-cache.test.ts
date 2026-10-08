// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import type { DecorationSet } from '@tiptap/pm/view';
import { createLowlight } from 'lowlight';
import { CodeBlockLowlight } from '@/components/editorial/extensions/CodeBlockLowlight';

function decorations(editor: Editor) {
  return (editor.state.plugins.map(plugin => plugin.getState(editor.state))
    .find((state): state is DecorationSet => state?.find instanceof Function && state?.map instanceof Function))!.find();
}

vi.mock('lowlight', async importOriginal => {
  const original = await importOriginal<typeof import('lowlight')>();
  return {
    ...original,
    createLowlight: vi.fn((...args: Parameters<typeof original.createLowlight>) => {
      const instance = original.createLowlight(...args);
      vi.spyOn(instance, 'highlight');
      vi.spyOn(instance, 'highlightAuto');
      return instance;
    }),
  };
});

describe('incremental syntax highlighting', () => {
  it('reuses unchanged blocks when selecting/typing and moves their decorations correctly', () => {
    const lowlight = vi.mocked(createLowlight).mock.results[0].value as ReturnType<typeof createLowlight>;
    const editor = new Editor({
      extensions: [StarterKit.configure({ codeBlock: false }), CodeBlockLowlight],
      content: '<p>Text</p><pre><code class="language-javascript">const answer = 42;</code></pre><pre><code class="language-javascript">return true;</code></pre>',
    });
    try {
      const before = decorations(editor).map(decoration => ({ from: decoration.from, to: decoration.to }));
      vi.mocked(lowlight.highlight).mockClear();
      vi.mocked(lowlight.highlightAuto).mockClear();
      editor.commands.setTextSelection({ from: 1, to: 4 });
      editor.commands.setTextSelection(2);
      editor.commands.insertContent('longer ');
      expect(lowlight.highlight).not.toHaveBeenCalled();
      expect(lowlight.highlightAuto).not.toHaveBeenCalled();
      expect(decorations(editor).map(decoration => ({ from: decoration.from, to: decoration.to })))
        .toEqual(before.map(decoration => ({ from: decoration.from + 7, to: decoration.to + 7 })));

      editor.commands.setTextSelection(editor.state.doc.firstChild!.nodeSize + 1);
      editor.view.dispatch(editor.state.tr.insertText('// edited\n'));
      expect(lowlight.highlight).toHaveBeenCalledTimes(1);
      expect(decorations(editor).map(decoration => editor.state.doc.textBetween(decoration.from, decoration.to))).toContain('// edited');
      vi.mocked(lowlight.highlight).mockClear();
      editor.commands.undo();
      expect(editor.getText()).not.toContain('// edited');
      expect(decorations(editor).map(decoration => editor.state.doc.textBetween(decoration.from, decoration.to))).toContain('const');
    } finally {
      editor.destroy();
    }
  });

  it('invalidates tokens after a language change', () => {
    const lowlight = vi.mocked(createLowlight).mock.results[0].value as ReturnType<typeof createLowlight>;
    const editor = new Editor({
      extensions: [StarterKit.configure({ codeBlock: false }), CodeBlockLowlight],
      content: '<pre><code class="language-javascript">const answer = 42;</code></pre>',
    });
    try {
      vi.mocked(lowlight.highlight).mockClear();
      editor.commands.setTextSelection(1);
      editor.commands.setCodeBlock({ language: 'plaintext' });
      expect(lowlight.highlight).toHaveBeenCalledTimes(1);
      expect(lowlight.highlight).toHaveBeenCalledWith('plaintext', 'const answer = 42;');
      expect(decorations(editor)).toHaveLength(0);
    } finally {
      editor.destroy();
    }
  });
});
