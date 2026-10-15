import { Node, type CommandProps } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import type { Schema } from '@tiptap/pm/model'
import { TextSelection, type Transaction } from '@tiptap/pm/state'
import FigureBlock from './FigureBlock'

/**
 * insertContent leaves the caret at the end of the new figure's caption, so
 * whatever the writer typed next went into the image block (and the next
 * paragraph appeared under the photo). Put the caret on the line directly
 * below the figure instead: the empty paragraph that is already there when
 * the image was dropped into blank space, or a new one.
 */
function placeCaretAfterFigure(tr: Transaction, figureName: string, schema: Schema) {
  const { $from } = tr.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name !== figureName) continue
    const after = $from.after(depth)
    const next = tr.doc.nodeAt(after)
    if (!next || !next.isTextblock) {
      const paragraph = schema.nodes.paragraph
      const $after = tr.doc.resolve(after)
      if (!paragraph || !$after.parent.canReplaceWith($after.index(), $after.index(), paragraph)) return
      tr.insert(after, paragraph.create())
    }
    tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView()
    return
  }
}

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
      setFigure:
        (options: { src: string; alt?: string; caption?: string; credit?: string; title?: string }) =>
        ({ commands, tr, dispatch, state }: CommandProps) => {
          // Inserted at the caret; an empty paragraph there is replaced.
          const inserted = commands.insertContent({
            type: this.name,
            attrs: options,
            content: options.caption ? [{ type: 'text', text: options.caption }] : [],
          })
          if (inserted && dispatch) placeCaretAfterFigure(tr, this.name, state.schema)
          return inserted
        },
    }
  },
})
