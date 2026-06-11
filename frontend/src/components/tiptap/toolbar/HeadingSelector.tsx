import type { Editor } from '@tiptap/react'
import { useState } from 'react'
import type { ActiveStates } from '../TiptapEditor.types'

interface HeadingSelectorProps {
  editor: Editor
  activeStates: ActiveStates
}

export default function HeadingSelector({ editor, activeStates }: HeadingSelectorProps) {
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)

  const activeLabel = activeStates.heading1 ? '标题1'
    : activeStates.heading2 ? '标题2'
    : activeStates.heading3 ? '标题3'
    : activeStates.heading4 ? '标题4'
    : activeStates.codeBlock ? '代码块'
    : activeStates.blockquote ? '引用'
    : '正文'

  return (
    <div className="relative">
      <button
        onClick={() => setShowHeadingMenu(!showHeadingMenu)}
        className="px-2.5 py-1.5 text-sm border-1 border-black hover:bg-purple-100 bg-white flex items-center gap-1.5 min-w-[72px] justify-between font-bold"
        onBlur={() => setTimeout(() => setShowHeadingMenu(false), 150)}
      >
        <span>{activeLabel}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showHeadingMenu && (
        <div className="absolute top-full left-0 mt-1 bg-white border-2 border-black shadow-[1px_1px_0_0_rgba(0,0,0,1)] z-50 min-w-[120px] py-1 overflow-hidden">
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
  )
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
      className={`w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors font-bold ${
        active ? 'bg-purple-100 text-purple-600' : 'text-gray-700'
      }`}
      style={style}
    >
      {children}
    </button>
  )
}
