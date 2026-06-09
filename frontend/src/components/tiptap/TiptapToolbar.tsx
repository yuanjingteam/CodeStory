import type { Editor } from '@tiptap/react'
import type { ActiveStates, Exercise } from './TiptapEditor.types'
import ExerciseSelector from './toolbar/ExerciseSelector'
import HeadingSelector from './toolbar/HeadingSelector'
import { Sep, ToolBtn } from './toolbar/ToolbarControls'

interface TiptapToolbarProps {
  editor: Editor
  activeStates: ActiveStates
  exercises: Exercise[]
  onInsertExercise: (exerciseId: string, exerciseTitle: string) => void
}

export default function TiptapToolbar({
  editor,
  activeStates,
  exercises,
  onInsertExercise,
}: TiptapToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b-2 border-black bg-purple-50 flex-wrap">
      <HeadingSelector editor={editor} activeStates={activeStates} />

      <Sep />

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

      <ToolBtn active={activeStates.code} onClick={() => editor.chain().focus().toggleCode().run()} title="行内代码">
        <span className="font-mono text-[11px]">code</span>
      </ToolBtn>
      <ToolBtn active={activeStates.codeBlock} onClick={() => editor.chain().focus().toggleCodeBlock({ language: 'plaintext' }).run()} title="代码块">
        <span className="font-mono text-[11px]">{'{ }'}</span>
      </ToolBtn>

      <Sep />

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

      <ExerciseSelector exercises={exercises} onInsertExercise={onInsertExercise} />
    </div>
  )
}
