'use client'
import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table/kit'
import { ExerciseButton } from './ExerciseButtonExtension'
import './tiptap-editor.css'

interface TiptapViewerProps {
  content: string
  onExerciseClick?: (exerciseId: string) => void
  completedExercises?: Set<string>
}

export default function TiptapViewer({ content, onExerciseClick, completedExercises }: TiptapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

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
          resizable: true,
        },
      }),
      ExerciseButton,
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'tiptap-content prose prose-sm max-w-none',
      },
    },
  })

  useEffect(() => {
    if (!editor || !onExerciseClick) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const button = target.closest('[data-type="exercise-button"]')
      
      if (button) {
        const exerciseId = button.getAttribute('data-exercise-id')
        const status = button.getAttribute('data-status')
        
        if (exerciseId && status !== 'completed') {
          onExerciseClick(exerciseId)
        }
      }
    }

    const container = containerRef.current
    container?.addEventListener('click', handleClick)

    return () => {
      container?.removeEventListener('click', handleClick)
    }
  }, [editor, onExerciseClick])

  useEffect(() => {
    if (!editor || !completedExercises) return

    const buttons = editor.view.dom.querySelectorAll('[data-type="exercise-button"]')
    
    buttons.forEach((button) => {
      const exerciseId = button.getAttribute('data-exercise-id')
      const isCompleted = completedExercises.has(exerciseId || '')
      
      if (isCompleted) {
        button.setAttribute('data-status', 'completed')
        const label = button.getAttribute('data-label') || '请完成练习'
        button.textContent = '✅ ' + label
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
