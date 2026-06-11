import { useState } from 'react'
import type { Exercise } from '../TiptapEditor.types'

interface ExerciseSelectorProps {
  exercises: Exercise[]
  onInsertExercise: (exerciseId: string, exerciseTitle: string) => void
}

export default function ExerciseSelector({ exercises, onInsertExercise }: ExerciseSelectorProps) {
  const [showExerciseMenu, setShowExerciseMenu] = useState(false)

  const insertExercise = (exerciseId: string, exerciseTitle: string) => {
    onInsertExercise(exerciseId, exerciseTitle)
    setShowExerciseMenu(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowExerciseMenu(!showExerciseMenu)}
        disabled={exercises.length === 0}
        className="ml-2 px-3 py-1.5 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:text-gray-500 border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
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
        <div className="absolute top-full right-0 mt-1 bg-white border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] z-50 min-w-[140px] py-1 overflow-hidden">
          {exercises.map((exercise, index) => (
            <button
              key={exercise.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertExercise(exercise.id, `练习 ${index + 1}`)}
              className="w-full px-4 py-2 text-left hover:bg-emerald-50 transition-colors text-gray-700 hover:text-emerald-600 flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-lg flex-shrink-0">{exercise.type === 'code' ? '💻' : '📝'}</span>
              <span className="font-medium flex-shrink-0">练习 {index + 1}</span>
              <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                {exercise.type === 'code' ? '代码' : '选择'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
