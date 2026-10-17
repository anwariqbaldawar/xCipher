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
    // Every attribute carries its own parseHTML reader so a figure
    // hydrated from saved HTML keeps its metadata even when the
    // saved markup predates a schema change. `width` and
    // `alignment` are read from the figure's data attributes
    // with the img's own width as fallback — older saves wrote
    // the sizing straight onto the img tag.
    const readImg = (element: HTMLElement, name: string) =>
      element.querySelector('img')?.getAttribute(name) ?? null

    return {
      src: {
        default: null,
        parseHTML: element => readImg(element, 'src'),
      },
      alt: {
        default: null,
        parseHTML: element => readImg(element, 'alt'),
      },
      title: {
        default: null,
        parseHTML: element => readImg(element, 'title'),
      },
      caption: {
        default: null,
        parseHTML: element => element.querySelector('figcaption')?.textContent?.trim() || null,
      },
      credit: {
        default: null,
        parseHTML: element => element.getAttribute('data-credit'),
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('data-width') ?? readImg(element, 'width'),
      },
      alignment: {
        default: null,
        parseHTML: element => element.getAttribute('data-alignment'),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        contentElement: 'figcaption',
        // Defensive reader: when a saved document is hydrated
        // from HTML, every attribute is resolved directly from
        // the figure element (and its img) in one pass, so a
        // figure whose markup was written by an older editor
        // version still opens with its caption, credit and
        // sizing intact.
        getAttrs: (element) => {
          const figure = element as HTMLElement
          const img = figure.querySelector('img')
          return {
            src: img?.getAttribute('src') ?? null,
            alt: img?.getAttribute('alt') ?? null,
            title: img?.getAttribute('title') ?? null,
            caption: figure.querySelector('figcaption')?.textContent?.trim() || null,
            credit: figure.getAttribute('data-credit'),
            width: figure.getAttribute('data-width') ?? img?.getAttribute('width') ?? null,
            alignment: figure.getAttribute('data-alignment'),
          }
        },
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
            width: img.getAttribute('width'),
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
      {
        'data-credit': HTMLAttributes.credit,
        'data-width': HTMLAttributes.width,
        'data-alignment': HTMLAttributes.alignment,
        class: 'ed-figure',
      },
      ['img', {
        src: HTMLAttributes.src,
        alt: HTMLAttributes.alt,
        title: HTMLAttributes.title,
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
