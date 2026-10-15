// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Editor, type AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { DecorationSet } from "@tiptap/pm/view";
import { CodeBlockLowlight } from "@/components/editorial/extensions/CodeBlockLowlight";
import { Figure } from "@/components/editorial/extensions/AdvancedImage";
import TableOfContents from "@/components/article/TableOfContents";
import { countWords, getDocumentOutline } from "@/lib/editor/document-state";

// ─────────────────────────────────────────────────────────────────────────────
// Editor performance and image placement.
//
// Measured in a browser harness on a 2,200-word article: the inspector's TOC
// wrote heading ids into ProseMirror's DOM, ProseMirror redrew those headings,
// the TOC's MutationObserver fired again — ~5,000 DOM mutations every 2 s with
// no input at all, keystrokes up to ~300 ms and clicks up to ~180 ms. On top
// of that, every keystroke serialised the whole document to HTML and rebuilt
// every code block's highlighting. These tests pin each fix.
// ─────────────────────────────────────────────────────────────────────────────

const read = (relative: string) => readFileSync(path.join(process.cwd(), relative), "utf8");
const editors: Editor[] = [];
const make = (content: string, extensions: AnyExtension[] = []) => {
  const editor = new Editor({ extensions: [StarterKit.configure({ codeBlock: false }), ...extensions], content });
  editors.push(editor);
  return editor;
};
afterEach(() => { while (editors.length) editors.pop()!.destroy(); });

const blocks = (editor: Editor) => {
  const out: string[] = [];
  editor.state.doc.forEach(node => out.push(node.type.name === "paragraph" ? (node.textContent ? `p:${node.textContent}` : "p:") : node.type.name));
  return out;
};

describe("table of contents never writes into the editor's DOM", () => {
  let root: Root | null = null;
  // jsdom has no IntersectionObserver (the TOC's scroll-spy uses one).
  beforeEach(() => vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} }));
  afterEach(() => { act(() => root?.unmount()); root = null; document.body.innerHTML = ""; vi.unstubAllGlobals(); });

  const mount = (containerHtml: string, selector: string) => {
    document.body.innerHTML = `${containerHtml}<div id="toc"></div>`;
    root = createRoot(document.getElementById("toc")!);
    act(() => root!.render(<TableOfContents containerSelector={selector} />));
  };

  it("leaves ProseMirror's heading ids alone (its slugify and the TOC's disagree on apostrophes and duplicates)", () => {
    mount('<div class="ProseMirror" contenteditable="true"><h2 id="whats-new">What\'s new</h2><h2 id="overview">Overview</h2><h2 id="overview">Overview</h2></div>', ".ProseMirror");
    expect(Array.from(document.querySelectorAll(".ProseMirror h2")).map(h => h.id)).toEqual(["whats-new", "overview", "overview"]);
    // The list itself still renders.
    expect(document.querySelectorAll("#toc a")).toHaveLength(3);
  });

  it("still assigns ids on the static published article", () => {
    mount('<div class="tiptap-content"><h2>What\'s new</h2><h2>Overview</h2><h2>Overview</h2></div>', ".tiptap-content");
    expect(Array.from(document.querySelectorAll(".tiptap-content h2")).map(h => h.id)).toEqual(["what-s-new", "overview", "overview-2"]);
  });
});

describe("code highlighting only rebuilds when a code block changes", () => {
  const code = '<p>Intro paragraph</p><pre><code class="language-javascript">const answer = 42;</code></pre><p>Outro</p>';

  it("maps existing decorations while typing in a paragraph", () => {
    const editor = make(code, [CodeBlockLowlight]);
    const create = vi.spyOn(DecorationSet, "create");
    try {
      editor.commands.setTextSelection(3);
      for (const char of "abcdef") editor.commands.insertContent(char);
      editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      editor.commands.insertContent("!");
      expect(create).not.toHaveBeenCalled();
    } finally {
      create.mockRestore();
    }
  });

  it("rebuilds as soon as the code itself is edited", () => {
    const editor = make(code, [CodeBlockLowlight]);
    const create = vi.spyOn(DecorationSet, "create");
    try {
      let inside = -1;
      editor.state.doc.descendants((node, pos) => { if (node.type.name === "codeBlock") inside = pos + 3; });
      editor.commands.setTextSelection(inside);
      editor.commands.insertContent("let ");
      expect(create).toHaveBeenCalled();
    } finally {
      create.mockRestore();
    }
  });
});

describe("inserting an image", () => {
  const caretIn = (editor: Editor) => editor.state.selection.$from.parent;

  it("replaces the empty line at the caret and puts the caret on the line below", () => {
    const editor = make("<p>Intro</p><p></p><p></p><p>After</p>", [Figure]);
    editor.commands.setTextSelection(8); // first empty paragraph
    editor.commands.setFigure({ src: "https://media.xsypher.com/a.webp", alt: "A" });
    expect(blocks(editor)).toEqual(["p:Intro", "figure", "p:", "p:After"]);
    expect(caretIn(editor).type.name).toBe("paragraph");
    expect(caretIn(editor).textContent).toBe("");
    expect(editor.state.selection.$from.index(0)).toBe(2);
  });

  it("adds a line after an image that ends the document, and puts the caret there", () => {
    const editor = make("<p>Intro</p><p></p>", [Figure]);
    editor.commands.setTextSelection(8);
    editor.commands.setFigure({ src: "https://media.xsypher.com/a.webp" });
    expect(blocks(editor)).toEqual(["p:Intro", "figure", "p:"]);
    expect(editor.state.selection.$from.index(0)).toBe(2);
  });

  it("splits a paragraph at the caret and continues on the text after the image", () => {
    const editor = make("<p>Hello world</p>", [Figure]);
    editor.commands.setTextSelection(6); // after "Hello"
    editor.commands.setFigure({ src: "https://media.xsypher.com/a.webp", caption: "Cap" });
    expect(blocks(editor)).toEqual(["p:Hello", "figure", "p: world"]);
    expect(caretIn(editor).textContent).toBe(" world");
  });

  it("never leaves the caret inside the caption", () => {
    for (const [content, pos] of [["<p>End here</p>", 9], ["<p>A</p><p></p><p>B</p>", 4], ["<p>Only</p>", 5]] as const) {
      const editor = make(content, [Figure]);
      editor.commands.setTextSelection(pos);
      editor.commands.setFigure({ src: "https://media.xsypher.com/a.webp", caption: "Caption" });
      expect(caretIn(editor).type.name, content).not.toBe("figure");
    }
  });

  it("keeps the photo from being natively dragged and reserves its frame while loading", () => {
    const block = read("components/editorial/extensions/FigureBlock.tsx");
    expect(block).toContain("draggable={false}");
    expect(block).toMatch(/className=\{isLoading \? 'is-loading' : undefined\}/);
    const studio = read("components/editorial/styles/studio.css");
    expect(studio).toMatch(/\.editorial-node--figure \.ed-figure img\.is-loading \{[^}]*aspect-ratio: 16 \/ 9/);
    expect(studio).toMatch(/\.editorial-node--figure \.ed-figure \{ margin: 0; \}/);
  });
});

describe("document-derived counts stay cheap", () => {
  it("countWords matches /\\w+/g exactly", () => {
    const samples = ["", "one", "  two  words ", "snake_case and CamelCase 42x", "naïve café — résumé", "a-b c.d e_f", "Ünïcödé ✓ 3.14 v2.0.1", "\n\ttabs\nand\nlines"];
    for (let i = 0; i < 200; i++) samples.push(Array.from({ length: 40 }, () => String.fromCharCode(32 + Math.floor(Math.random() * 300))).join(""));
    for (const text of samples) expect(countWords(text), JSON.stringify(text)).toBe((text.match(/\w+/g) || []).length);
  });

  it("the outline walks blocks but still finds nested headings", () => {
    const editor = make("<h2>Top</h2><p>Body <strong>text</strong></p><blockquote><h3>Quoted</h3></blockquote><ul><li><h4>In list</h4></li></ul>");
    expect(getDocumentOutline(editor).map(h => [h.text, h.level])).toEqual([["Top", 2], ["Quoted", 3], ["In list", 4]]);
  });
});

describe("the editor page does not re-render or re-serialise per keystroke", () => {
  const source = read("components/editorial/ArticleEditor.tsx");

  it("creates extensions and editor props once, so re-renders never call setOptions()", () => {
    expect(source).toMatch(/const \[editorExtensions\] = useState\(\(\) => \[/);
    expect(source).toMatch(/const \[editorProps\] = useState\(\(\) => \(\{/);
    expect(source).toMatch(/extensions: editorExtensions,\s*\n\s*editorProps,/);
    expect(source).toContain("shouldRerenderOnTransaction: false");
  });

  it("debounces the HTML sync instead of serialising on every keystroke", () => {
    const onUpdate = source.slice(source.indexOf("onUpdate: ({ editor: instance }"), source.indexOf("// A pending sync must not outlive"));
    expect(onUpdate).toContain("setTimeout(() => syncBodyHtml(instance), wait)");
    expect(onUpdate).not.toContain("getHTML()");
    expect(source).toMatch(/const BODY_SYNC_DEBOUNCE_MS = \d+;/);
    expect(source).toMatch(/const BODY_SYNC_MAX_WAIT_MS = \d+;/);
    // Unload paths flush a pending sync, and it counts as unsynced work.
    expect(source).toContain('window.addEventListener("pagehide", flushPendingBody)');
    expect(source).toMatch(/const unsynced =\s*\n\s*bodyPending \|\|/);
  });

  it("uses the state-driven TOC preview and a subscribed word count", () => {
    expect(source).not.toMatch(/import TableOfContents/);
    expect(source).toContain("<TocPreview editor={editor} />");
    expect(source).toContain("<WordCountBadge editor={editor} />");
    // The render-time count is gone; the only remaining call is the one-off
    // publish pre-flight check ("at least 50 words").
    expect(source).not.toContain("const words = editor.storage.characterCount.words();");
    expect(source.match(/characterCount\.words\(\)/g) ?? []).toHaveLength(1);
    expect(source).toMatch(/if \(editor\.storage\.characterCount\.words\(\) < 50\)/);
  });

  it("memoises the heavy editor sub-components", () => {
    expect(read("components/editorial/EditorToolbar.tsx")).toContain("export const EditorToolbar = memo(EditorToolbarView);");
    expect(read("components/editorial/EditorBubbleMenu.tsx")).toContain("export const EditorBubbleMenu = memo(EditorBubbleMenuView);");
    expect(read("components/editorial/DocumentOutline.tsx")).toContain("export default memo(DocumentOutline);");
    expect(read("components/editorial/DocumentStatus.tsx")).toContain("export default memo(DocumentStatus);");
    expect(read("components/editorial/TocPreview.tsx")).toContain("export default memo(TocPreview);");
    // …and hands them stable callbacks, or memo would be defeated.
    expect(source).toContain("toggleFullscreen={toggleFullscreen}");
    expect(source).toContain("close={closeOutline}");
  });
});
