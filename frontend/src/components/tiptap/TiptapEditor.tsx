'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table/kit'
import { ExerciseButton } from './ExerciseButtonExtension'
import { CodeBlockWindow } from './CodeBlockWindow'
import TiptapToolbar from './TiptapToolbar'
import { defaultActiveStates, type ActiveStates, type Exercise } from './TiptapEditor.types'
import './tiptap-editor.css'

interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  exercises?: Exercise[]
  onInsertExercise?: (exerciseId: string, label: string) => void
}

export default function TiptapEditor({
  content,
  onChange,
  exercises = [],
}: TiptapEditorProps) {
  const [activeStates, setActiveStates] = useState<ActiveStates>(defaultActiveStates)
  const contentRef = useRef(content)
  const onChangeRef = useRef(onChange)
  // eslint-disable-next-line react-hooks/refs
  onChangeRef.current = onChange

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        codeBlock: false,
      }),
      CodeBlockWindow.configure({
        editableLanguage: true,
      }),
      TableKit.configure({
        table: {
          resizable: true,
        },
      }),
      ExerciseButton,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      contentRef.current = html
      onChangeRef.current(html)
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content',
      },
    },
  })

  useEffect(() => {
    if (!editor) return

    const updateActiveStates = () => {
      setActiveStates({
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        strike: editor.isActive('strike'),
        code: editor.isActive('code'),
        codeBlock: editor.isActive('codeBlock'),
        bulletList: editor.isActive('bulletList'),
        orderedList: editor.isActive('orderedList'),
        blockquote: editor.isActive('blockquote'),
        heading1: editor.isActive('heading', { level: 1 }),
        heading2: editor.isActive('heading', { level: 2 }),
        heading3: editor.isActive('heading', { level: 3 }),
        heading4: editor.isActive('heading', { level: 4 }),
        paragraph: editor.isActive('paragraph'),
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      })
    }

    editor.on('transaction', updateActiveStates)
    updateActiveStates()

    return () => {
      editor.off('transaction', updateActiveStates)
    }
  }, [editor])

  useEffect(() => {
    if (!editor || content === contentRef.current) return
    contentRef.current = content
    editor.commands.setContent(content || '')
  }, [editor, content])

  const handleInsertExercise = useCallback((exerciseId: string, exerciseTitle: string) => {
    if (!editor) return
    editor.commands.insertExerciseButton({
      exerciseId,
      label: `💡 请完成练习：${exerciseTitle}`,
    })
  }, [editor])

  if (!editor) return <div className="p-4 text-gray-400">加载编辑器...</div>

  return (
    <div className="border-2 border-black rounded-lg overflow-hidden bg-white">
      <TiptapToolbar
        editor={editor}
        activeStates={activeStates}
        exercises={exercises}
        onInsertExercise={handleInsertExercise}
      />

      <div className="min-h-[300px] max-h-[500px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
