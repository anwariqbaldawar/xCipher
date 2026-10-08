// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Editor, type JSONContent } from '@tiptap/core';
import { AllSelection, NodeSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { CodeBlockLowlight } from '@/components/editorial/extensions/CodeBlockLowlight';
import { MermaidBlock, cleanMermaidCode, convertMermaidSelection } from '@/components/editorial/extensions/MermaidBlock';
import { sanitizeArticleHtml } from '@/lib/sanitize';

const graph = `flowchart TD
    A[Client starts TLS]
    B[Server negotiates parameters]
    C{Hybrid exchange available?}
    D[Hybrid key exchange]
    E[Classical key exchange]
    F[[Handshake derives TLS secrets<br>from the negotiated exchange]]
    G[(Application protocol<br>continues unchanged)]
    A --> B
    B --> C
    C -- Yes --> D
    C -- No --> E
    D --> F
    E --> F
    F --> G
    classDef default fill:#1e293b,stroke:#475569,stroke-width:2px,color:#ffffff,rx:8px,ry:8px;
    classDef decision fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#ffffff;
    classDef accent fill:#e11d48,stroke:#be123c,stroke-width:2px,color:#ffffff,rx:8px,ry:8px;
    classDef fallback fill:#334155,stroke:#64748b,stroke-width:2px,color:#ffffff,stroke-dasharray: 5 5;
    class C decision;
    class D accent;
    class E fallback;`;
const fenced = '```mermaid\n' + graph + '\n```';
const editors: Editor[] = [];

function makeEditor(content: JSONContent | string) {
  const editor = new Editor({
    extensions: [Markdown, StarterKit.configure({ codeBlock: false }), MermaidBlock, CodeBlockLowlight],
    content,
  });
  editors.push(editor);
  return editor;
}

const paragraph = (text: string): JSONContent => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const codeBlock = (text: string): JSONContent => ({ type: 'codeBlock', attrs: { language: 'mermaid' }, content: [{ type: 'text', text }] });

function selectAll(editor: Editor) {
  editor.view.dispatch(editor.state.tr.setSelection(new AllSelection(editor.state.doc)));
}

function pasteText(editor: Editor, text: string) {
  // jsdom has no ClipboardEvent/DataTransfer constructors; supply the actual
  // text/plain payload through the same event API used by a browser paste.
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: (type: string) => type === 'text/plain' ? text : '' },
  });
  return editor.view.pasteText(text, event);
}

function diagramCodes(editor: Editor): string[] {
  const codes: string[] = [];
  editor.state.doc.descendants(node => {
    if (node.type.name === 'mermaidBlock') codes.push(node.attrs.code);
  });
  return codes;
}

afterEach(() => {
  editors.splice(0).forEach(editor => editor.destroy());
  vi.restoreAllMocks();
});

describe('complete Mermaid conversion', () => {
  it('expands a tail-only code selection to include the declaration and all node definitions', async () => {
    const editor = makeEditor({ type: 'doc', content: [codeBlock(graph), paragraph('Keep this article text.')] });
    editor.commands.setTextSelection({ from: 1 + graph.indexOf('F[['), to: 1 + graph.length });
    const before = editor.getJSON();
    expect(await convertMermaidSelection(editor)).toBeNull();
    expect(diagramCodes(editor)).toEqual([graph]);
    expect(editor.state.doc.textContent).toBe('Keep this article text.');
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(before);
    expect(editor.commands.redo()).toBe(true);
    expect(diagramCodes(editor)).toEqual([graph]);
  });

  it.each(['cursor', 'node', 'all'] as const)('converts a code block with a %s selection', mode => {
    const editor = makeEditor({ type: 'doc', content: [codeBlock(fenced)] });
    if (mode === 'cursor') editor.commands.setTextSelection(20);
    if (mode === 'node') editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)));
    if (mode === 'all') selectAll(editor);
    expect(editor.commands.convertSelectionToMermaid()).toBe(true);
    expect(diagramCodes(editor)).toEqual([graph]);
  });

  it('preserves every line of fully selected Markdown spread across paragraphs', async () => {
    const editor = makeEditor({ type: 'doc', content: fenced.split('\n').map(paragraph) });
    selectAll(editor);
    expect(await convertMermaidSelection(editor)).toBeNull();
    expect(diagramCodes(editor)).toEqual([graph]);
  });

  it('preserves Shift+Enter hard breaks in a selected paragraph', async () => {
    const content: JSONContent[] = [];
    fenced.split('\n').forEach((line, index) => {
      if (index) content.push({ type: 'hardBreak' });
      content.push({ type: 'text', text: line });
    });
    const editor = makeEditor({ type: 'doc', content: [{ type: 'paragraph', content }] });
    selectAll(editor);
    expect(await convertMermaidSelection(editor)).toBeNull();
    expect(diagramCodes(editor)).toEqual([graph]);
  });

  it('converts a diagram imported by the actual Markdown extension', async () => {
    const editor = makeEditor(fenced);
    selectAll(editor);
    expect(await convertMermaidSelection(editor)).toBeNull();
    expect(diagramCodes(editor)).toEqual([graph]);
    const saved = sanitizeArticleHtml(editor.getHTML());
    expect(diagramCodes(makeEditor(saved))).toEqual([graph]);
  });

  it('keeps unselected text when replacing an inline selection', () => {
    const source = 'graph TD; A-->B';
    const editor = makeEditor({ type: 'doc', content: [paragraph('Before ' + source + ' After')] });
    editor.commands.setTextSelection({ from: 8, to: 8 + source.length });
    expect(editor.commands.convertSelectionToMermaid()).toBe(true);
    expect(diagramCodes(editor)).toEqual(['graph TD; A-->B']);
    expect(editor.state.doc.textContent).toBe('Before  After');
  });

  it('does not modify the document during capability checks', () => {
    const editor = makeEditor({ type: 'doc', content: [codeBlock(graph)] });
    editor.commands.setTextSelection(10);
    const before = editor.getJSON();
    expect(editor.can().convertSelectionToMermaid()).toBe(true);
    expect(editor.getJSON()).toEqual(before);
  });

  it('rejects selections containing existing diagram atoms', () => {
    const editor = makeEditor({ type: 'doc', content: [codeBlock(graph), { type: 'mermaidBlock', attrs: { code: 'graph TD; X-->Y' } }] });
    selectAll(editor);
    const before = editor.getJSON();
    expect(editor.commands.convertSelectionToMermaid()).toBe(false);
    expect(editor.getJSON()).toEqual(before);
  });
});

describe('validation before replacing source', () => {
  it('explains a missing declaration without inventing one or deleting source', async () => {
    const fragment = graph.slice(graph.indexOf('F[['));
    const editor = makeEditor({ type: 'doc', content: [codeBlock(fragment)] });
    selectAll(editor);
    const before = editor.getJSON();
    expect(await convertMermaidSelection(editor)).toContain('diagram declaration');
    expect(editor.getJSON()).toEqual(before);
    expect(diagramCodes(editor)).toEqual([]);
  });

  it('retains source when Mermaid reports a syntax error', async () => {
    const editor = makeEditor({ type: 'doc', content: [codeBlock('graph TD\nA[unclosed')] });
    selectAll(editor);
    const before = editor.getJSON();
    expect(await convertMermaidSelection(editor)).toContain('Could not convert');
    expect(editor.getJSON()).toEqual(before);
  });

  it.each([
    'sequenceDiagram\nAlice->>Bob: Hello',
    '---\ntitle: Example\n---\nflowchart LR\nA-->B',
    '%%{init: {"theme": "dark"}}%%\n%% A comment\ngraph TD\nA-->B',
  ])('uses Mermaid itself to validate declarations, comments, and configuration', async source => {
    const editor = makeEditor({ type: 'doc', content: [codeBlock(source)] });
    selectAll(editor);
    expect(await convertMermaidSelection(editor)).toBeNull();
    expect(diagramCodes(editor)).toEqual([source]);
  });

  it('does not overwrite edits made while the parser loads', async () => {
    const { default: mermaid } = await import('mermaid');
    let finish!: () => void;
    vi.spyOn(mermaid, 'parse').mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const editor = makeEditor({ type: 'doc', content: [codeBlock(graph)] });
    selectAll(editor);
    const pending = convertMermaidSelection(editor);
    await vi.waitFor(() => expect(finish).toBeDefined());
    editor.commands.setContent({ type: 'doc', content: [paragraph('New work')] });
    finish();
    expect(await pending).toContain('document changed');
    expect(editor.state.doc.textContent).toBe('New work');
    expect(diagramCodes(editor)).toEqual([]);
  });
});

describe('Mermaid fences and clipboard', () => {
  it.each(['```', '````', '~~~'])('unwraps complete %s fences without changing graph text', fence => {
    expect(cleanMermaidCode(`${fence} mermaid\r\n${graph}\r\n${fence}`)).toBe(graph);
  });

  it.each(['```mermaid\ngraph TD\nA-->B', '```mermaid\ngraph TD\nA-->B\n~~~', '```javascript\nconsole.log(1)\n```'])('leaves incomplete, mismatched, and other-language fences intact', source => {
    expect(cleanMermaidCode(source)).toBe(source);
  });

  it('pastes a complete fenced graph once, preserving its first and last lines', () => {
    const editor = makeEditor({ type: 'doc', content: [{ type: 'paragraph' }] });
    expect(pasteText(editor, fenced)).toBe(true);
    expect(diagramCodes(editor)).toEqual([graph]);
    expect(editor.commands.undo()).toBe(true);
    expect(diagramCodes(editor)).toEqual([]);
  });

  it('keeps a paste inside a code block as editable source', () => {
    const editor = makeEditor({ type: 'doc', content: [{ type: 'codeBlock' }] });
    editor.commands.setTextSelection(1);
    pasteText(editor, fenced);
    expect(diagramCodes(editor)).toEqual([]);
    expect(editor.state.doc.firstChild?.textContent).toBe(fenced);
  });

  it.each(['```javascript\nconsole.log(1)\n```', '```\nplain text\n```', '```mermaid\ngraph TD\nA-->B', fenced + '\n\n' + fenced])('does not hijack unrelated, incomplete, or multiple fenced blocks', source => {
    const editor = makeEditor({ type: 'doc', content: [{ type: 'paragraph' }] });
    pasteText(editor, source);
    expect(diagramCodes(editor)).toEqual([]);
    // Normal ProseMirror text paste collapses blank paragraph separators.
    expect(editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n').split('\n').filter(Boolean))
      .toEqual(source.split('\n').filter(Boolean));
  });

  it('typing a Mermaid fence creates an editable code block instead of an atomic placeholder', () => {
    const editor = makeEditor({ type: 'doc', content: [paragraph('```mermaid')] });
    const position = editor.state.doc.firstChild!.content.size + 1;
    editor.commands.setTextSelection(position);
    editor.view.someProp('handleTextInput', handler => handler(editor.view, position, position, ' ', () => editor.state.tr.insertText(' ', position)));
    expect(editor.state.doc.firstChild?.type.name).toBe('codeBlock');
    expect(editor.state.doc.firstChild?.attrs.language).toBe('mermaid');
    expect(diagramCodes(editor)).toEqual([]);
  });
});
