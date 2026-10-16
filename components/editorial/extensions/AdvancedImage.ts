import { mergeAttributes, Node, type CommandProps } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import FigureBlock from './FigureBlock'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      setFigure: (options: { src: string; alt?: string; caption?: string; credit?: string; title?: string }) => ReturnType
    }
  }
}

export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  content: 'inline*',
  /**
   * A figure is a block, stated explicitly.
   *
   * `inline: false` is the default for a node in the `block` group, and it is
   * written out because the failure it guards against is subtle: an inline node
   * participates in the surrounding line box, so an image inserted into a
   * paragraph can be laid out *below* the text around it — the baseline and
   * line-height decide the position, not the caret. Insertion is meant to place
   * a block between two paragraphs, never inside a line.
   */
  inline: false,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('src'),
      },
      alt: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('alt'),
      },
      title: {
        default: null,
        parseHTML: element => element.querySelector('img')?.getAttribute('title'),
      },
      caption: {
        default: null,
        parseHTML: element => element.querySelector('figcaption')?.textContent?.trim() || null,
      },
      credit: {
        default: null,
        parseHTML: element => element.getAttribute('data-credit'),
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        contentElement: 'figcaption',
      },
      {
        tag: 'img',
        getAttrs: (node) => {
          // If we encounter a stray img, turn it into a figure automatically
          const img = node as HTMLElement;
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
          }
        },
      }
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureBlock)
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      { 'data-credit': HTMLAttributes.credit, class: 'ed-figure' },
      ['img', { 
        src: HTMLAttributes.src, 
        alt: HTMLAttributes.alt, 
        title: HTMLAttributes.title 
      }],
      ['figcaption', 0],
    ]
  },

  addCommands() {
    return {
      /**
       * Insert a figure at the current selection.
       *
       * Two deliberate behaviours:
       *
       *  1. The node is inserted against the selection as it stands *now* — the
       *     caller (toolbar or bubble menu) is responsible for having restored
       *     the caret the media dialog was opened from, so the image lands where
       *     the writer was typing rather than wherever focus ended up when the
       *     dialog closed.
       *  2. When the caret is at the very end of the document, an empty
       *     paragraph is inserted after the figure. Without it the story ends on
       *     an image and the writer has to hunt for the gap cursor to keep
       *     typing below it; with it the document reads the way it looks, and
       *     nothing that was already in the document moves.
       */
      setFigure:
        (options: any) =>
        ({ commands, state }: CommandProps) => {
          const figure = {
            type: this.name,
            attrs: options,
            content: options.caption ? [{ type: 'text', text: options.caption }] : [],
          };

          const atDocumentEnd = state.selection.to >= state.doc.content.size - 1;

          return commands.insertContent(
            atDocumentEnd ? [figure, { type: 'paragraph' }] : figure,
          )
        },
    }
  },
})
