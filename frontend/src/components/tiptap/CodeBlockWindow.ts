import CodeBlock, { type CodeBlockOptions } from '@tiptap/extension-code-block'
import {
  checkIcon,
  codeBlockLanguages,
  copyIcon,
  copyText,
  getLanguageLabel,
} from './CodeBlockWindow.helpers'

interface CodeBlockWindowOptions extends CodeBlockOptions {
  editableLanguage: boolean
}

export const CodeBlockWindow = CodeBlock.extend<CodeBlockWindowOptions>({
  addOptions() {
    const parentOptions = this.parent?.()

    return {
      languageClassPrefix: 'language-',
      exitOnTripleEnter: true,
      exitOnArrowDown: true,
      enableTabIndentation: false,
      tabSize: 4,
      HTMLAttributes: {},
      ...parentOptions,
      defaultLanguage: parentOptions?.defaultLanguage ?? 'plaintext',
      editableLanguage: false,
    }
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let currentNode = node
      let copiedTimer: ReturnType<typeof setTimeout> | undefined

      const dom = document.createElement('pre')
      dom.className = 'code-block-window'

      const toolbar = document.createElement('div')
      toolbar.className = 'code-block-toolbar'
      toolbar.contentEditable = 'false'

      const windowControls = document.createElement('div')
      windowControls.className = 'code-window-controls'

      const collapseButton = document.createElement('button')
      collapseButton.type = 'button'
      collapseButton.className = 'code-window-dot code-window-dot-collapse'
      collapseButton.title = '折叠代码'
      collapseButton.setAttribute('aria-label', '折叠代码')

      const fullscreenButton = document.createElement('button')
      fullscreenButton.type = 'button'
      fullscreenButton.className = 'code-window-dot code-window-dot-fullscreen'
      fullscreenButton.title = '全屏查看'
      fullscreenButton.setAttribute('aria-label', '全屏查看')

      windowControls.append(collapseButton, fullscreenButton)

      const toolbarActions = document.createElement('div')
      toolbarActions.className = 'code-toolbar-actions'

      const languageControl = this.options.editableLanguage
        ? document.createElement('select')
        : document.createElement('span')
      languageControl.className = this.options.editableLanguage
        ? 'code-language-select'
        : 'code-language-label'

      if (languageControl instanceof HTMLSelectElement) {
        codeBlockLanguages.forEach(([value, label]) => {
          const option = document.createElement('option')
          option.value = value
          option.textContent = label
          languageControl.appendChild(option)
        })

        languageControl.addEventListener('change', () => {
          const pos = typeof getPos === 'function' ? getPos() : undefined
          if (typeof pos !== 'number') return

          editor.view.dispatch(
            editor.state.tr.setNodeMarkup(pos, undefined, {
              ...currentNode.attrs,
              language: languageControl.value,
            }),
          )
        })
      }

      const copyButton = document.createElement('button')
      copyButton.type = 'button'
      copyButton.className = 'code-copy-button'
      copyButton.title = '复制代码'
      copyButton.setAttribute('aria-label', '复制代码')
      copyButton.innerHTML = copyIcon

      toolbarActions.append(languageControl, copyButton)
      toolbar.append(windowControls, toolbarActions)

      const contentDOM = document.createElement('code')
      dom.append(toolbar, contentDOM)

      const setCollapsed = (collapsed: boolean) => {
        dom.classList.toggle('code-block-collapsed', collapsed)
        collapseButton.title = collapsed ? '展开代码' : '折叠代码'
        collapseButton.setAttribute('aria-label', collapseButton.title)
      }

      const setFullscreen = (fullscreen: boolean) => {
        dom.classList.toggle('code-block-fullscreen', fullscreen)
        document.body.classList.toggle('code-block-fullscreen-open', fullscreen)
        fullscreenButton.title = fullscreen ? '退出全屏' : '全屏查看'
        fullscreenButton.setAttribute('aria-label', fullscreenButton.title)
      }

      collapseButton.addEventListener('click', () => {
        setCollapsed(!dom.classList.contains('code-block-collapsed'))
      })

      fullscreenButton.addEventListener('click', () => {
        setFullscreen(!dom.classList.contains('code-block-fullscreen'))
      })

      copyButton.addEventListener('click', async () => {
        try {
          await copyText(contentDOM.textContent || '')
          copyButton.innerHTML = checkIcon
          copyButton.classList.add('is-copied')
          clearTimeout(copiedTimer)
          copiedTimer = setTimeout(() => {
            copyButton.innerHTML = copyIcon
            copyButton.classList.remove('is-copied')
          }, 1500)
        } catch {
          copyButton.title = '复制失败，请手动复制'
        }
      })

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && dom.classList.contains('code-block-fullscreen')) {
          setFullscreen(false)
        }
      }
      document.addEventListener('keydown', handleKeyDown)

      const updateLanguage = (language: string | null) => {
        const value = language || 'plaintext'
        contentDOM.className = `language-${value}`

        if (languageControl instanceof HTMLSelectElement) {
          languageControl.value = value
        } else {
          languageControl.textContent = getLanguageLabel(value)
        }
      }
      updateLanguage(node.attrs.language)

      return {
        dom,
        contentDOM,
        update(updatedNode) {
          if (updatedNode.type !== currentNode.type) return false
          currentNode = updatedNode
          updateLanguage(updatedNode.attrs.language)
          return true
        },
        stopEvent(event) {
          return toolbar.contains(event.target as Node)
        },
        ignoreMutation(mutation) {
          return toolbar.contains(mutation.target)
        },
        destroy() {
          clearTimeout(copiedTimer)
          document.removeEventListener('keydown', handleKeyDown)
          if (dom.classList.contains('code-block-fullscreen')) {
            document.body.classList.remove('code-block-fullscreen-open')
          }
        },
      }
    }
  },
})
