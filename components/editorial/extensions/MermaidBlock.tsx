import { Node, mergeAttributes, type Editor } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MermaidNodeView } from './MermaidNodeView';

export interface MermaidBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const DEFAULT_MERMAID_CODE = 'graph TD\n  A-->B;';

/**
 * Strip markdown code fences (```mermaid ... ```) if present.
 */
export function cleanMermaidCode(raw: string | null | undefined): string {
  if (!raw) return '';
  const cleaned = raw.trim();
  const opening = /^(`{3,}|~{3,})[ \t]*(?:mermaid)?[ \t]*\r?\n/i.exec(cleaned);
  if (!opening) return cleaned;

  const lastLine = cleaned.lastIndexOf('\n');
  const closing = cleaned.slice(lastLine + 1).trim();
  const fence = opening[1];
  // Only unwrap a complete, matching fence. Never discard part of the source.
  if (closing.length < fence.length || [...closing].some(char => char !== fence[0])) {
    return cleaned;
  }
  return cleaned.slice(opening[0].length, lastLine).trim();
}

/**
 * Read the canonical `code` attribute, falling back to the legacy
 * `graphDefinition` attribute when older documents have no usable code value.
 */
export function resolveMermaidCode(
  code: string | null | undefined,
  graphDefinition: string | null | undefined,
): string {
  return cleanMermaidCode(code) || cleanMermaidCode(graphDefinition) || '';
}

/** Preserve code-block boundaries and hard breaks when extracting a selection. */
export function getMermaidSelection(state: EditorState) {
  const { selection, doc } = state;
  const { $from, $to } = selection;
  let { from, to } = selection;

  if (selection.empty) {
    if (!$from.parent.isTextblock) return null;
    from = $from.before();
    to = $from.after();
  } else {
    // A partial code-block selection still refers to the complete diagram.
    // Otherwise its declaration and earlier node definitions can be lost.
    if ($from.parent.type.spec.code || ($from.parent.isTextblock && $from.parentOffset === 0)) {
      from = $from.before();
    }
    if ($to.parent.type.spec.code || ($to.parent.isTextblock && $to.parentOffset === $to.parent.content.size)) {
      to = $to.after();
    }
  }

  const raw = doc.textBetween(from, to, '\n', node => node.type.name === 'hardBreak' ? '\n' : '\ufffc');
  // Never replace a mixed selection containing images, embeds, or other atoms.
  if (raw.includes('\ufffc')) return null;
  const code = cleanMermaidCode(raw);
  return code ? { from, to, code } : null;
}

/** Validate on the browser interaction path before replacing any source text. */
export async function convertMermaidSelection(editor: Editor): Promise<string | null> {
  const { doc, selection } = editor.state;
  const source = getMermaidSelection(editor.state);
  if (!source) return 'Select the complete Mermaid source, or place the cursor inside its code block.';

  try {
    const { default: mermaid } = await import('mermaid');
    await mermaid.parse(source.code);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'UnknownDiagramError') {
      return 'Include the diagram declaration (for example, flowchart TD) and select the complete Mermaid source.';
    }
    return error instanceof Error ? `Could not convert diagram: ${error.message}` : 'Could not validate the Mermaid diagram. Please try again.';
  }

  if (editor.isDestroyed) return 'The editor was closed before conversion finished.';
  if (editor.state.doc !== doc) return 'The document changed while checking the diagram. Select it again and retry.';

  const converted = editor.chain().focus().command(({ tr }) => {
    tr.setSelection(selection);
    return true;
  }).convertSelectionToMermaid().run();
  return converted ? null : 'Could not convert this selection. Select only the complete Mermaid source.';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaidBlock: {
      setMermaidBlock: (attributes?: { code?: string; graphDefinition?: string; containerWidth?: string }) => ReturnType;
      convertSelectionToMermaid: () => ReturnType;
    };
  }
}

export const MermaidBlock = Node.create<MermaidBlockOptions>({
  name: 'mermaidBlock',
  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      code: {
        // Commands that insert a new diagram provide a sample explicitly. An
        // empty default lets old JSON containing only graphDefinition win.
        default: '',
        parseHTML: element => {
          const code = resolveMermaidCode(
            element.getAttribute('data-code'),
            element.getAttribute('data-graph-definition'),
          );
          return code || cleanMermaidCode(element.textContent);
        },
        // `data-code` is the single canonical HTML representation. Legacy
        // graphDefinition JSON is resolved here for lossless HTML output.
        renderHTML: attributes => ({
          'data-code': resolveMermaidCode(attributes.code, attributes.graphDefinition),
        }),
      },
      graphDefinition: {
        // Retained in the schema so previously saved Tiptap JSON can still be
        // read. It is no longer emitted as a second, competing HTML attribute.
        default: null,
        parseHTML: element => cleanMermaidCode(element.getAttribute('data-graph-definition')) || null,
        renderHTML: () => ({}),
      },
      containerWidth: {
        default: '100%',
        parseHTML: element => element.getAttribute('data-container-width'),
        renderHTML: attributes => ({
          'data-container-width': attributes.containerWidth,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid-block"]',
      },
      {
        tag: 'pre.mermaid',
      },
      {
        tag: 'div.mermaid',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'mermaid-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  },

  // Let the code-block extension handle typed fences: an atomic diagram cannot
  // be the target of textblockTypeInputRule, and its source is not written yet.
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('mermaidClipboard'),
        props: {
          handlePaste: (view, event) => {
            if (view.state.selection.$from.parent.type.spec.code) return false;
            const raw = event.clipboardData?.getData('text/plain')?.trim();
            if (!raw || !/^(`{3,}|~{3,})[ \t]*mermaid[ \t]*\r?\n/i.test(raw)) return false;
            const code = cleanMermaidCode(raw);
            // Read the complete clipboard payload, not individual paragraphs
            // or text nodes. Leave incomplete/multiple fences as editable text.
            if (!code || code === raw || /^[ \t]*(?:`{3,}|~{3,})/m.test(code)) return false;
            view.dispatch(view.state.tr.replaceSelectionWith(this.type.create({ code, graphDefinition: null }))
              .setMeta('paste', true).setMeta('uiEvent', 'paste').scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setMermaidBlock:
        attributes =>
        ({ commands }) => {
          const clean = resolveMermaidCode(attributes?.code, attributes?.graphDefinition) || DEFAULT_MERMAID_CODE;
          return commands.insertContent({
            type: this.name,
            attrs: {
              code: clean,
              graphDefinition: null,
              ...(attributes?.containerWidth ? { containerWidth: attributes.containerWidth } : {}),
            },
          });
        },
      convertSelectionToMermaid:
        () =>
        ({ state, tr, dispatch }) => {
          const source = getMermaidSelection(state);
          if (!source) return false;
          if (dispatch) {
            tr.replaceRangeWith(source.from, source.to, this.type.create({
              code: source.code,
              graphDefinition: null,
            })).scrollIntoView();
          }
          return true;
        },
    };
  },
});
