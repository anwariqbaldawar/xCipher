// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Figure } from "@/components/editorial/extensions/AdvancedImage";

// React only flushes updates inside act() when the environment
// is declared test-capable; without this flag the dialog's
// controlled inputs never commit their state in jsdom.
(globalThis as unknown as Record<string, boolean>).IS_REACT_ACT_ENVIRONMENT = true;

interface FigureNodeAttrs {
  src?: string | null;
  alt?: string | null;
  caption?: string | null;
  credit?: string | null;
  width?: string | null;
  alignment?: string | null;
}

function findFigureNode(editor: Editor): { attrs: FigureNodeAttrs } | null {
  let found: { attrs: FigureNodeAttrs } | null = null;
  editor.state.doc.descendants((node: ProsemirrorNode) => {
    if (node.type.name === "figure") {
      found = node as unknown as { attrs: FigureNodeAttrs };
      return false;
    }
    return true;
  });
  return found;
}

/**
 * Saved-article image editing.
 *
 * When an article is re-opened for editing, its body is hydrated
 * with editor.commands.setContent(json-or-html). These tests replay
 * that flow with the real React mounting path (EditorContent sets
 * editor.contentComponent, which ReactNodeViewRenderer portals
 * through) and assert that every figure keeps its attributes and
 * that the Edit button on the image box opens the metadata dialog
 * pre-populated, with saves landing on the exact node.
 */

const extensions = () => [
  StarterKit.configure({ codeBlock: false, heading: false, link: false, underline: false }),
  Figure,
];

function mountEditor() {
  const editor = new Editor({
    extensions: extensions(),
    content: "<p>Start writing...</p>",
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  function Harness() {
    return <EditorContent editor={editor} />;
  }
  return { editor, container, root, Harness } as const;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 30));

async function renderHarness(harness: ReturnType<typeof mountEditor>) {
  await act(async () => {
    harness.root.render(<harness.Harness />);
  });
}

const SAVED_JSON = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Before." }] },
    {
      type: "figure",
      attrs: {
        src: "https://cdn.xsypher.com/photo.jpg",
        alt: "A photo",
        title: null,
        caption: "Night mode",
        credit: "Test Photographer",
        width: "720",
        alignment: "center",
      },
      content: [{ type: "text", text: "Night mode" }],
    },
    { type: "paragraph", content: [{ type: "text", text: "After." }] },
  ],
};

const SAVED_HTML =
  '<figure class="ed-figure" data-credit="Credit Person" data-width="640" data-alignment="right">' +
  '<img src="https://cdn.xsypher.com/pic.jpg" alt="Alt text" title="The title">' +
  "<figcaption>A caption</figcaption></figure>";

describe("figure hydration from saved content", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("retains src/alt/caption/credit/width/alignment from JSON and renders the Edit button", async () => {
    const harness = mountEditor();
    await renderHarness(harness);

    await act(async () => {
      harness.editor.commands.setContent(SAVED_JSON as never);
    });
    await act(async () => {
      await flush();
    });

    const figureNode = findFigureNode(harness.editor);

    expect(figureNode).toBeTruthy();
    expect(figureNode!.attrs.src).toBe("https://cdn.xsypher.com/photo.jpg");
    expect(figureNode!.attrs.alt).toBe("A photo");
    expect(figureNode!.attrs.caption).toBe("Night mode");
    expect(figureNode!.attrs.credit).toBe("Test Photographer");
    expect(figureNode!.attrs.width).toBe("720");
    expect(figureNode!.attrs.alignment).toBe("center");

    const editButton = harness.editor.view.dom.querySelector(
      '.editorial-node-bar button[title="Edit details"]',
    ) as HTMLButtonElement | null;
    expect(editButton).toBeTruthy();

    harness.root.unmount();
    harness.editor.destroy();
  });

  it("retains attributes from sanitized HTML and opens the dialog pre-populated", async () => {
    const harness = mountEditor();
    await renderHarness(harness);

    await act(async () => {
      harness.editor.commands.setContent(SAVED_HTML);
    });
    await act(async () => {
      await flush();
    });

    const figureNode = findFigureNode(harness.editor);

    expect(figureNode).toBeTruthy();
    expect(figureNode!.attrs.src).toBe("https://cdn.xsypher.com/pic.jpg");
    expect(figureNode!.attrs.alt).toBe("Alt text");
    expect(figureNode!.attrs.caption).toBe("A caption");
    expect(figureNode!.attrs.credit).toBe("Credit Person");
    expect(figureNode!.attrs.width).toBe("640");
    expect(figureNode!.attrs.alignment).toBe("right");

    // Clicking Edit on the hydrated image box opens the dialog…
    const editButton = harness.editor.view.dom.querySelector(
      '.editorial-node-bar button[title="Edit details"]',
    ) as HTMLButtonElement;
    await act(async () => {
      editButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await flush();
    });

    const dialog = document.querySelector(".imd-panel");
    expect(dialog).toBeTruthy();

    // …pre-populated with the node's current metadata.
    const dialogHtml = dialog!.outerHTML;
    expect(dialogHtml).toContain("Alt text");
    expect(dialogHtml).toContain("A caption");
    expect(dialogHtml).toContain("Credit Person");

    harness.root.unmount();
    harness.editor.destroy();
  });

  it("saves dialog edits onto the exact node at its document position", async () => {
    const harness = mountEditor();
    await renderHarness(harness);

    await act(async () => {
      harness.editor.commands.setContent(SAVED_JSON as never);
    });
    await act(async () => {
      await flush();
    });

    const editButton = harness.editor.view.dom.querySelector(
      '.editorial-node-bar button[title="Edit details"]',
    ) as HTMLButtonElement;
    await act(async () => {
      editButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await flush();
    });

    // Edit alt text and credit, then save through the dialog.
    const inputs = Array.from(
      document.querySelectorAll(".imd-panel input"),
    ) as HTMLInputElement[];
    const altInput = inputs.find((input) => input.value === "A photo");
    const creditInput = inputs.find((input) => input.value === "Test Photographer");
    expect(altInput).toBeTruthy();
    expect(creditInput).toBeTruthy();

    await act(async () => {
      const setNative = (el: HTMLInputElement, value: string) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
        setter.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
      setNative(altInput!, "Updated alt text");
      setNative(creditInput!, "Updated Credit");
    });

    const saveButton = Array.from(
      document.querySelectorAll(".imd-panel .imd-btn-primary"),
    ).pop() as HTMLButtonElement;
    expect(saveButton.textContent).toContain("Update Image");

    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      await flush();
    });

    // The exact figure node now carries the edited metadata.
    const figureNode = findFigureNode(harness.editor);
    expect(figureNode!.attrs.alt).toBe("Updated alt text");
    expect(figureNode!.attrs.credit).toBe("Updated Credit");
    expect(figureNode!.attrs.src).toBe("https://cdn.xsypher.com/photo.jpg");

    harness.root.unmount();
    harness.editor.destroy();
  });
});
