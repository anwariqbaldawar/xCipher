import { Node, mergeAttributes, textblockTypeInputRule, nodePasteRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MermaidNodeView } from './MermaidNodeView';

export interface MermaidBlockOptions {
  HTMLAttributes: Record<string, any>;
}

export const DEFAULT_MERMAID_CODE = 'graph TD\n  A-->B;';

/**
 * Strip markdown code fences (```mermaid ... ```) if present.
 */
export function cleanMermaidCode(raw: string | null | undefined): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  // Strip leading ```mermaid or ``` (with optional spaces/newlines)
  cleaned = cleaned.replace(/^```(?:mermaid)?[ \t]*[\r\n]+/i, '');
  // Strip trailing ```
  cleaned = cleaned.replace(/[\r\n]+```$/i, '');
  return cleaned.trim();
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
        parseHTML: element =>
          cleanMermaidCode(element.getAttribute('data-code')) ||
          cleanMermaidCode(element.getAttribute('data-graph-definition')) ||
          cleanMermaidCode(element.textContent),
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

  addInputRules() {
    return [
      textblockTypeInputRule({
        find: /^```mermaid[ \t]*[\r\n]?$/,
        type: this.type,
        getAttributes: () => ({
          code: DEFAULT_MERMAID_CODE,
        }),
      }),
    ];
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: /```(?:mermaid)?[ \t]*[\r\n]+([\s\S]+?)```/gi,
        type: this.type,
        getAttributes: match => ({
          code: cleanMermaidCode(match[1]),
        }),
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
        ({ state, chain }) => {
          const { selection } = state;
          let rawText = '';
          let deleteRange: { from: number; to: number } | null = null;

          if (selection.empty) {
            const { $from } = selection;
            const parent = $from.parent;
            if (parent.type.name === 'codeBlock') {
              rawText = parent.textContent;
              deleteRange = { from: $from.before(), to: $from.after() };
            }
          } else {
            rawText = (selection as any).node?.textContent || state.doc.textBetween(selection.from, selection.to, '\n');
            deleteRange = { from: selection.from, to: selection.to };
          }

          const cleanText = cleanMermaidCode(rawText);
          if (!cleanText) {
            return false;
          }

          const tr = deleteRange
            ? chain().deleteRange(deleteRange)
            : chain().deleteSelection();

          return tr
            .insertContent({
              type: this.name,
              attrs: {
                code: cleanText,
                graphDefinition: null,
              },
            })
            .run();
        },
    };
  },
});
