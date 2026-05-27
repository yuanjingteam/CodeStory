import { Node, mergeAttributes } from '@tiptap/core'

export interface ExerciseButtonOptions {
  HTMLAttributes: Record<string, string>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    exerciseButton: {
      insertExerciseButton: (attrs: { exerciseId: string; label: string }) => ReturnType
    }
  }
}

export const ExerciseButton = Node.create<ExerciseButtonOptions>({
  name: 'exerciseButton',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      exerciseId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-exercise-id'),
        renderHTML: (attributes) => {
          if (!attributes.exerciseId) {
            return {}
          }
          return { 'data-exercise-id': attributes.exerciseId }
        },
      },
      label: {
        default: '请完成练习',
        parseHTML: (element) => element.getAttribute('data-label') || element.textContent,
        renderHTML: (attributes) => {
          return { 'data-label': attributes.label }
        },
      },
      status: {
        default: 'pending',
        parseHTML: (element) => element.getAttribute('data-status') || 'pending',
        renderHTML: (attributes) => {
          return { 'data-status': attributes.status }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="exercise-button"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'exercise-button',
      }),
      HTMLAttributes.label || '请完成练习',
    ]
  },

  addCommands() {
    return {
      insertExerciseButton:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          })
        },
    }
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.setAttribute('data-type', 'exercise-button')
      dom.setAttribute('data-exercise-id', node.attrs.exerciseId || '')
      dom.setAttribute('data-status', node.attrs.status || 'pending')
      
      const icon = node.attrs.status === 'completed' ? '✅ ' : '💡 '
      dom.textContent = icon + (node.attrs.label || '请完成练习')

      return { dom }
    }
  },
})
