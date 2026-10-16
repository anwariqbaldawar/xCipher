import { mergeAttributes, Node, type Editor } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import FigureBlock from './FigureBlock'
import { insertFigureAt, type FigureAttrs } from '@/lib/editor/figure-insert'
import { memoNodeViewUpdate } from '@/lib/editor/node-view-memo'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      /**
       * Insert a figure block.
       *
       * `at` is the caret position captured before the media dialog opened. Pass
       * it whenever the insert follows an async step (upload, external import) or
       * any focus change — omitting it falls back to the live selection, which is
       * what used to drop the image at the end of the document.
       */
      setFigure: (options: FigureAttrs, at?: number | null) => ReturnType
    }
  }
}

export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  content: 'inline*',
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
    // `update` skips the React re-render when this figure's node object and
    // decorations are untouched, so typing elsewhere in a long story does not
    // re-render every image block on the page.
    return ReactNodeViewRenderer(FigureBlock, { update: memoNodeViewUpdate })
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
      setFigure:
        (options: FigureAttrs, at: number | null = null) =>
        ({ editor }: { editor: Editor }) =>
          insertFigureAt(editor, at, options),
    }
  },
})
