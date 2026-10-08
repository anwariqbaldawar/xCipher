import { Node, mergeAttributes, textblockTypeInputRule } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { common, createLowlight } from 'lowlight'
import { CodeBlockComponent } from './CodeBlockComponent'

import go from 'highlight.js/lib/languages/go'
import bash from 'highlight.js/lib/languages/bash'
import rust from 'highlight.js/lib/languages/rust'
import python from 'highlight.js/lib/languages/python'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import javascript from 'highlight.js/lib/languages/javascript'
import html from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'

// Create a shared lowlight instance with common languages
// Includes: js, ts, python, java, c, cpp, csharp, go, rust, php, html, css, json, bash, sql, xml, yaml, markdown, and more
const lowlight = createLowlight(common)

lowlight.register('go', go)
lowlight.register('bash', bash)
lowlight.register('rust', rust)
lowlight.register('python', python)
lowlight.register('typescript', typescript)
lowlight.register('json', json)
lowlight.register('sql', sql)
lowlight.register('yaml', yaml)
lowlight.register('c', c)
lowlight.register('cpp', cpp)
lowlight.register('javascript', javascript)
lowlight.register('html', html)
lowlight.register('css', css)

// Language display names for the selector
export const CODE_LANGUAGES: Record<string, string> = {
  '': 'Auto-detect',
  'javascript': 'JavaScript',
  'typescript': 'TypeScript',
  'python': 'Python',
  'java': 'Java',
  'c': 'C',
  'cpp': 'C++',
  'csharp': 'C#',
  'go': 'Go',
  'rust': 'Rust',
  'php': 'PHP',
  'ruby': 'Ruby',
  'swift': 'Swift',
  'kotlin': 'Kotlin',
  'html': 'HTML',
  'css': 'CSS',
  'json': 'JSON',
  'bash': 'Bash',
  'shell': 'Shell',
  'sql': 'SQL',
  'xml': 'XML',
  'yaml': 'YAML',
  'markdown': 'Markdown',
  'graphql': 'GraphQL',
  'dockerfile': 'Dockerfile',
  'plaintext': 'Plain Text',
}

function parseNodes(nodes: any[], className: string[] = []): { text: string; classes: string[] }[] {
  return nodes.flatMap((node) => {
    const classes = [
      ...className,
      ...(node.properties?.className || []),
    ]

    if (node.children) {
      return parseNodes(node.children, classes)
    }

    return {
      text: node.value,
      classes,
    }
  })
}

function getDecorations({
  doc,
  name,
  lowlight: lw,
  defaultLanguage,
  cache,
}: {
  doc: ProseMirrorNode
  name: string
  lowlight: typeof lowlight
  defaultLanguage: string | null
  cache: WeakMap<ProseMirrorNode, { text: string; classes: string[] }[]>
}) {
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (node.type.name !== name) {
      return
    }

    let from = pos + 1
    const language = node.attrs.language || defaultLanguage
    const nodeText = node.textContent

    if (!nodeText) return

    let parsed = cache.get(node)
    if (!parsed) {
      let result
      try {
        result = language
          ? lw.highlight(language, nodeText)
          : lw.highlightAuto(nodeText)
      } catch {
        // Language not registered, try auto-detect
        try {
          result = lw.highlightAuto(nodeText)
        } catch {
          return
        }
      }
      parsed = parseNodes(result.children)
      cache.set(node, parsed)
    }

    for (const { text, classes } of parsed) {
      const to = from + text.length

      if (classes.length) {
        const decoration = Decoration.inline(from, to, {
          class: classes.join(' '),
        })

        decorations.push(decoration)
      }

      from = to
    }
  })

  return DecorationSet.create(doc, decorations)
}

export interface CodeBlockLowlightOptions {
  HTMLAttributes: Record<string, any>
  languageClassPrefix: string
  defaultLanguage: string | null
  exitOnTripleEnter: boolean
  exitOnArrowDown: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    codeBlockLowlight: {
      setCodeBlock: (attributes?: { language: string }) => ReturnType
      toggleCodeBlock: (attributes?: { language: string }) => ReturnType
      convertSelectionToCodeBlock: (attributes?: { language?: string }) => ReturnType
    }
  }
}

const backtickInputRegex = /^```([a-z]*)?[\s\n]$/
const tildeInputRegex = /^~~~([a-z]*)?[\s\n]$/

export const CodeBlockLowlight = Node.create<CodeBlockLowlightOptions>({
  name: 'codeBlock',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  isolating: true,
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      languageClassPrefix: 'language-',
      defaultLanguage: null,
      exitOnTripleEnter: true,
      exitOnArrowDown: true,
    }
  },

  addAttributes() {
    return {
      language: {
        default: this.options.defaultLanguage,
        parseHTML: element => {
          const { languageClassPrefix } = this.options
          const classAttr = (element.firstElementChild as HTMLElement)?.getAttribute('class')

          if (!classAttr) {
            return null
          }

          const regexResult = new RegExp(`${languageClassPrefix}([\\w-]+)`).exec(classAttr)
          return regexResult ? regexResult[1] : null
        },
        rendered: false,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'pre',
        preserveWhitespace: 'full',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const lang = node.attrs.language;
    const label = lang ? (CODE_LANGUAGES[lang] || CODE_LANGUAGES[lang.toLowerCase()] || 'Code') : 'Code';
    return [
      'pre',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      [
        'code',
        {
          class: lang
            ? this.options.languageClassPrefix + lang
            : null,
          'data-language-label': label,
        },
        0,
      ],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent)
  },

  addCommands() {
    return {
      setCodeBlock:
        attributes =>
        ({ commands }) => {
          return commands.setNode(this.name, attributes)
        },
      toggleCodeBlock:
        attributes =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph', attributes)
        },
      convertSelectionToCodeBlock:
        attributes =>
        ({ state, dispatch, commands }) => {
          const { selection, schema } = state
          const selectedText = state.doc.textBetween(selection.from, selection.to, '\n')
          if (!selectedText.trim()) {
            return commands.toggleNode(this.name, 'paragraph', attributes)
          }

          const blockRange = selection.$from.blockRange(selection.$to)
          if (!blockRange) {
            return false
          }

          const from = selection.$from.before(blockRange.depth + 1)
          const to = selection.$to.after(blockRange.depth + 1)
          const codeBlock = this.type.create(
            { language: attributes?.language || null },
            schema.text(selectedText),
          )

          if (dispatch) {
            dispatch(state.tr.replaceRangeWith(from, to, codeBlock).scrollIntoView())
          }
          return true
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),

      // exit node on triple enter
      Enter: ({ editor }) => {
        if (!this.options.exitOnTripleEnter) {
          return false
        }

        const { state } = editor
        const { selection } = state
        const { $from, empty } = selection

        if (!empty || $from.parent.type !== this.type) {
          return false
        }

        const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2
        const endsWithDoubleNewline = $from.parent.textContent.endsWith('\n\n')

        if (!isAtEnd || !endsWithDoubleNewline) {
          return false
        }

        return editor
          .chain()
          .command(({ tr }) => {
            tr.delete($from.pos - 2, $from.pos)
            return true
          })
          .exitCode()
          .run()
      },

      // exit node on arrow down at last line
      ArrowDown: ({ editor }) => {
        if (!this.options.exitOnArrowDown) {
          return false
        }

        const { state } = editor
        const { selection, doc } = state
        const { $from, empty } = selection

        if (!empty || $from.parent.type !== this.type) {
          return false
        }

        const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2

        if (!isAtEnd) {
          return false
        }

        const after = $from.after()

        if (after === undefined) {
          return false
        }

        const nodeAfter = doc.nodeAt(after)

        if (nodeAfter) {
          return false
        }

        return editor.commands.exitCode()
      },

      // Prevent Tab from leaving the editor
      Tab: ({ editor }) => {
        const { state } = editor
        const { selection } = state
        const { $from } = selection

        if ($from.parent.type !== this.type) {
          return false
        }

        return editor.commands.command(({ tr }) => {
          tr.insertText('  ')
          return true
        })
      },
    }
  },

  addInputRules() {
    return [
      textblockTypeInputRule({
        find: backtickInputRegex,
        type: this.type,
        getAttributes: match => ({
          language: match[1],
        }),
      }),
      textblockTypeInputRule({
        find: tildeInputRegex,
        type: this.type,
        getAttributes: match => ({
          language: match[1],
        }),
      }),
    ]
  },

  addProseMirrorPlugins() {
    // ProseMirror shares unchanged nodes across transactions. Cache relative
    // tokens, not absolute decorations: edits before a block move its position.
    const cache = new WeakMap<ProseMirrorNode, { text: string; classes: string[] }[]>()
    return [
      new Plugin({
        key: new PluginKey('lowlightPlugin'),
        state: {
          init: (_, { doc }) =>
            getDecorations({
              doc,
              name: this.name,
              lowlight,
              defaultLanguage: this.options.defaultLanguage,
              cache,
            }),
          apply: (transaction, decorationSet, oldState, newState) => {
            const oldNodeName = oldState.selection.$head.parent.type.name
            const newNodeName = newState.selection.$head.parent.type.name
            const oldNodes = oldState.doc.content
            const newNodes = newState.doc.content

            if (
              transaction.docChanged &&
              ([oldNodeName, newNodeName].includes(this.name) ||
                newNodes !== oldNodes)
            ) {
              return getDecorations({
                doc: transaction.doc,
                name: this.name,
                lowlight,
                defaultLanguage: this.options.defaultLanguage,
                cache,
              })
            }

            return decorationSet.map(transaction.mapping, transaction.doc)
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})
