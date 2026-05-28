'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table/kit'
import { ExerciseButton } from './ExerciseButtonExtension'
import './tiptap-editor.css'

interface TiptapViewerProps {
  content: string
  onExerciseClick?: (exerciseId: string) => void
  onButtonOrderMapped?: (buttonIdMap: Map<string, number>) => void
  completedExercises?: Set<string>
}

export default function TiptapViewer({ content, onExerciseClick, onButtonOrderMapped, completedExercises }: TiptapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onExerciseClickRef = useRef(onExerciseClick)
  const onButtonOrderMappedRef = useRef(onButtonOrderMapped)
  const mutationObserverRef = useRef<MutationObserver | null>(null)
  onExerciseClickRef.current = onExerciseClick
  onButtonOrderMappedRef.current = onButtonOrderMapped

  const handleExerciseClick = useCallback((exerciseId: string) => {
    if (onExerciseClickRef.current) {
      onExerciseClickRef.current(exerciseId)
    }
  }, [])

  const editor = useEditor({
    immediatelyRender: true,
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      TableKit.configure({
        table: {
          resizable: false,
        },
      }),
      ExerciseButton.configure({
        onClick: handleExerciseClick,
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'tiptap-content prose prose-sm max-w-none',
      },
      handleClickOn(view, pos, node, nodePos, event, direct) {
        if (node.type.name === 'exerciseButton') {
          const exerciseId = node.attrs.exerciseId as string

          if (exerciseId) {
            event.stopPropagation()
            handleExerciseClick(exerciseId)
            return true
          }
        }
        return false
      },
    },
  })

  const contentRef = useRef(content)
  useEffect(() => {
    if (!editor || content === contentRef.current) return
    contentRef.current = content
    editor.commands.setContent(content || '')
  }, [editor, content])

  const updateButtonOrderMap = useCallback(() => {
    if (!editor || !onButtonOrderMappedRef.current) return

    const buttons = editor.view.dom.querySelectorAll('[data-type="exercise-button"]')
    if (buttons.length === 0) return

    const buttonIdMap = new Map<string, number>()
    buttons.forEach((btn, index) => {
      const btnId = btn.getAttribute('data-exercise-id') || ''
      buttonIdMap.set(btnId, index)
    })
    onButtonOrderMappedRef.current(buttonIdMap)
  }, [editor])

  useEffect(() => {
    if (!editor) return

    const dom = editor.view.dom

    if (mutationObserverRef.current) {
      mutationObserverRef.current.disconnect()
    }

    const observer = new MutationObserver(() => {
      updateButtonOrderMap()
    })

    observer.observe(dom, { childList: true, subtree: true })
    mutationObserverRef.current = observer

    const timeouts = [50, 200, 500].map(delay =>
      setTimeout(updateButtonOrderMap, delay)
    )

    return () => {
      observer.disconnect()
      mutationObserverRef.current = null
      timeouts.forEach(clearTimeout)
    }
  }, [editor, content, updateButtonOrderMap])

  useEffect(() => {
    if (!editor || !completedExercises) return

    const buttons = editor.view.dom.querySelectorAll('[data-type="exercise-button"]')

    buttons.forEach((button) => {
      const exerciseId = button.getAttribute('data-exercise-id')
      const isCompleted = completedExercises.has(exerciseId || '')

      if (isCompleted) {
        button.setAttribute('data-status', 'completed')
        const rawLabel = button.getAttribute('data-label') || '请完成练习'
        const cleanLabel = rawLabel.replace(/^[💡\s]+/, '')

        button.innerHTML = ''

        const contentDiv = document.createElement('div')
        contentDiv.className = 'btn-content'

        const icon = document.createElement('span')
        icon.className = 'btn-icon'
        icon.textContent = '✅'

        const labelSpan = document.createElement('span')
        labelSpan.className = 'btn-label'
        labelSpan.textContent = cleanLabel

        contentDiv.appendChild(icon)
        contentDiv.appendChild(labelSpan)
        button.appendChild(contentDiv)

        const arrow = document.createElement('span')
        arrow.className = 'btn-arrow'
        arrow.textContent = '›'
        button.appendChild(arrow)
      } else {
        button.setAttribute('data-status', 'pending')
      }
    })
  }, [editor, completedExercises, content])

  if (!editor) return <div className="p-4 text-gray-400">加载内容...</div>

  return (
    <div ref={containerRef} className="tiptap-viewer">
      <EditorContent editor={editor} />
    </div>
  )
}
