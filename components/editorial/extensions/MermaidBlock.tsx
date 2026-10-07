import { Node, mergeAttributes, textblockTypeInputRule, nodePasteRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MermaidNodeView } from './MermaidNodeView';

export interface MermaidBlockOptions {
  HTMLAttributes: Record<string, any>;
}

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
        default: 'graph TD\n  A-->B;',
        parseHTML: element => 
          cleanMermaidCode(element.getAttribute('data-code')) || 
          cleanMermaidCode(element.getAttribute('data-graph-definition')) || 
          cleanMermaidCode(element.textContent),
        renderHTML: attributes => {
          const val = attributes.code ?? attributes.graphDefinition ?? 'graph TD\n  A-->B;';
          return {
            'data-code': val,
            'data-graph-definition': val,
          };
        },
      },
      graphDefinition: {
        default: 'graph TD\n  A-->B;',
        parseHTML: element => 
          cleanMermaidCode(element.getAttribute('data-graph-definition')) || 
          cleanMermaidCode(element.getAttribute('data-code')) || 
          cleanMermaidCode(element.textContent),
        renderHTML: attributes => {
          const val = attributes.graphDefinition ?? attributes.code ?? 'graph TD\n  A-->B;';
          return {
            'data-graph-definition': val,
            'data-code': val,
          };
        },
      },
      containerWidth: {
        default: '100%',
        parseHTML: element => element.getAttribute('data-container-width'),
        renderHTML: attributes => {
          return {
            'data-container-width': attributes.containerWidth,
          };
        },
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
          code: 'graph TD\n  A-->B;',
          graphDefinition: 'graph TD\n  A-->B;',
        }),
      }),
    ];
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: /```(?:mermaid)?[ \t]*[\r\n]+([\s\S]+?)```/gi,
        type: this.type,
        getAttributes: (match) => {
          const clean = match[1] ? cleanMermaidCode(match[1]) : 'graph TD\n  A-->B;';
          return {
            code: clean,
            graphDefinition: clean,
          };
        },
      }),
    ];
  },

  addCommands() {
    return {
      setMermaidBlock:
        attributes =>
        ({ commands }) => {
          const raw = attributes?.code ?? attributes?.graphDefinition ?? 'graph TD\n  A-->B;';
          const clean = cleanMermaidCode(raw) || 'graph TD\n  A-->B;';
          return commands.insertContent({
            type: this.name,
            attrs: {
              code: clean,
              graphDefinition: clean,
              ...attributes,
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
                graphDefinition: cleanText,
              },
            })
            .run();
        },
    };
  },
});
