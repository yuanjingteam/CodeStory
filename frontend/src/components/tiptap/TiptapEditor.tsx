'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table/kit'
import { ExerciseButton } from './ExerciseButtonExtension'
import './tiptap-editor.css'

interface Exercise {
  id: string
  title: string
  type: string
}

interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  exercises?: Exercise[]
  onInsertExercise?: (exerciseId: string, label: string) => void
}

interface ActiveStates {
  bold: boolean
  italic: boolean
  strike: boolean
  code: boolean
  codeBlock: boolean
  bulletList: boolean
  orderedList: boolean
  blockquote: boolean
  heading1: boolean
  heading2: boolean
  heading3: boolean
  heading4: boolean
  paragraph: boolean
  canUndo: boolean
  canRedo: boolean
}

const defaultActiveStates: ActiveStates = {
  bold: false,
  italic: false,
  strike: false,
  code: false,
  codeBlock: false,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  heading1: false,
  heading2: false,
  heading3: false,
  heading4: false,
  paragraph: false,
  canUndo: false,
  canRedo: false,
}

export default function TiptapEditor({
  content,
  onChange,
  exercises = [],
}: TiptapEditorProps) {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)
  const [showExerciseMenu, setShowExerciseMenu] = useState(false)
  const [activeStates, setActiveStates] = useState<ActiveStates>(defaultActiveStates)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    immediatelyRender: true,
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
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML())
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

  const contentRef = useRef(content)
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
    setShowExerciseMenu(false)
  }, [editor])

  if (!editor) return <div className="p-4 text-gray-400">加载编辑器...</div>

  const activeLabel = activeStates.heading1 ? '标题1'
    : activeStates.heading2 ? '标题2'
    : activeStates.heading3 ? '标题3'
    : activeStates.heading4 ? '标题4'
    : activeStates.codeBlock ? '代码块'
    : activeStates.blockquote ? '引用'
    : '正文'

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* 工具栏 */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50/80 flex-wrap">
        
        {/* 标题选择器 */}
        <div className="relative">
          <button
            onClick={() => setShowHeadingMenu(!showHeadingMenu)}
            className="px-2.5 py-1.5 text-sm border border-gray-300 rounded hover:bg-white bg-white flex items-center gap-1.5 min-w-[72px] justify-between"
            onBlur={() => setTimeout(() => setShowHeadingMenu(false), 150)}
          >
            <span className="font-medium">{activeLabel}</span>
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showHeadingMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[120px] py-1 overflow-hidden">
              <HeadingMenuItem
                active={activeStates.paragraph && !activeStates.heading1 && !activeStates.heading2 && !activeStates.heading3 && !activeStates.heading4}
                onClick={() => { editor.chain().focus().setParagraph().run(); setShowHeadingMenu(false); }}
              >
                正文
              </HeadingMenuItem>
              <HeadingMenuItem
                active={activeStates.heading1}
                onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setShowHeadingMenu(false); }}
                style={{ fontSize: '18px', fontWeight: 700 }}
              >
                标题1
              </HeadingMenuItem>
              <HeadingMenuItem
                active={activeStates.heading2}
                onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setShowHeadingMenu(false); }}
                style={{ fontSize: '16px', fontWeight: 700 }}
              >
                标题2
              </HeadingMenuItem>
              <HeadingMenuItem
                active={activeStates.heading3}
                onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setShowHeadingMenu(false); }}
                style={{ fontSize: '15px', fontWeight: 600 }}
              >
                标题3
              </HeadingMenuItem>
              <HeadingMenuItem
                active={activeStates.heading4}
                onClick={() => { editor.chain().focus().toggleHeading({ level: 4 }).run(); setShowHeadingMenu(false); }}
                style={{ fontSize: '14px', fontWeight: 600 }}
              >
                标题4
              </HeadingMenuItem>
            </div>
          )}
        </div>

        <Sep />

        {/* 文本格式 */}
        <ToolBtn active={activeStates.bold} onClick={() => editor.chain().focus().toggleBold().run()} title="粗体 Ctrl+B">
          <span className="font-bold text-[13px]">B</span>
        </ToolBtn>
        <ToolBtn active={activeStates.italic} onClick={() => editor.chain().focus().toggleItalic().run()} title="斜体 Ctrl+I">
          <span className="italic text-[13px] font-serif">I</span>
        </ToolBtn>
        <ToolBtn active={activeStates.strike} onClick={() => editor.chain().focus().toggleStrike().run()} title="删除线">
          <span className="line-through text-[13px]">S</span>
        </ToolBtn>

        <Sep />

        {/* 代码 */}
        <ToolBtn active={activeStates.code} onClick={() => editor.chain().focus().toggleCode().run()} title="行内代码">
          <span className="font-mono text-[11px]">code</span>
        </ToolBtn>
        <ToolBtn active={activeStates.codeBlock} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="代码块">
          <span className="font-mono text-[11px]">{'{ }'}</span>
        </ToolBtn>

        <Sep />

        {/* 列表 */}
        <ToolBtn active={activeStates.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} title="无序列表">
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
            <line x1="9" y1="6" x2="20" y2="6"/>
            <line x1="9" y1="12" x2="20" y2="12"/>
            <line x1="9" y1="18" x2="20" y2="18"/>
          </svg>
        </ToolBtn>
        <ToolBtn active={activeStates.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="有序列表">
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <text x="2" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="bold">1</text>
            <text x="2" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="bold">2</text>
            <text x="2" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="bold">3</text>
            <line x1="10" y1="6" x2="20" y2="6"/>
            <line x1="10" y1="12" x2="20" y2="12"/>
            <line x1="10" y1="18" x2="20" y2="18"/>
          </svg>
        </ToolBtn>

        <Sep />

        {/* 引用和分割线 */}
        <ToolBtn active={activeStates.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="引用">
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
          </svg>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分割线">
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="3" y1="12" x2="21" y2="12"/>
          </svg>
        </ToolBtn>

        <Sep />

        {/* 表格 */}
        <ToolBtn
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="插入表格"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="3" y1="15" x2="21" y2="15"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
            <line x1="15" y1="3" x2="15" y2="21"/>
          </svg>
        </ToolBtn>

        <Sep />

        {/* 撤销重做 */}
        <ToolBtn disabled={!activeStates.canUndo} onClick={() => editor.chain().focus().undo().run()} title="撤销 Ctrl+Z">
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10h10a5 5 0 015 5v2M3 10l5-5M3 10l5 5"/>
          </svg>
        </ToolBtn>
        <ToolBtn disabled={!activeStates.canRedo} onClick={() => editor.chain().focus().redo().run()} title="重做 Ctrl+Y">
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10H11a5 5 0 00-5 5v2M21 10l-5-5M21 10l-5 5"/>
          </svg>
        </ToolBtn>

        <div className="flex-1" />

        {/* 插入练习 */}
        <div className="relative">
          <button
            onClick={() => setShowExerciseMenu(!showExerciseMenu)}
            disabled={exercises.length === 0}
            className="ml-2 px-3 py-1.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:text-gray-500 rounded transition-colors shadow-sm flex items-center gap-1"
            title="插入练习按钮"
            onBlur={() => setTimeout(() => setShowExerciseMenu(false), 150)}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            练习
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showExerciseMenu && exercises.length > 0 && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] py-1 overflow-hidden">
              {exercises.map((exercise, index) => (
                <button
                  key={exercise.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInsertExercise(exercise.id, exercise.title || `练习 ${index + 1}`)}
                  className="w-full px-4 py-2 text-left hover:bg-emerald-50 transition-colors text-gray-700 hover:text-emerald-600 flex items-center gap-2"
                >
                  <span className="text-emerald-500">📝</span>
                  <span>{exercise.title || `练习 ${index + 1}`}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {exercise.type === 'choice' ? '选择题' : exercise.type === 'code' ? '编程题' : '填空题'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="min-h-[300px] max-h-[500px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function ToolBtn({ children, active = false, disabled = false, onClick, title }: {
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
        active
          ? 'bg-blue-100 text-blue-600'
          : disabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px h-5 bg-gray-300 mx-1" />
}

function HeadingMenuItem({ children, active, onClick, style }: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  style?: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors ${
        active ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
      }`}
      style={style}
    >
      {children}
    </button>
  )
}
