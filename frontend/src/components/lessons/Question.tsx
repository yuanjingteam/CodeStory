'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { lessonDetailApi } from '@/app/api/courses/lesson-detail'
import type { LessonDetailData } from '@/types/lesson-detail'
import ExerciseModal from './ExerciseModal'
import TiptapViewer from '@/components/tiptap/TiptapViewer'

interface QuestionProps {
  data: LessonDetailData
  onLessonCompleted?: (lessonId: string) => void
  onLessonSwitched?: (lessonId: string, chapterId: string) => void
}

export default function Question({ data, onLessonCompleted, onLessonSwitched }: QuestionProps) {
  const router = useRouter()
  const [currentLessonId, setCurrentLessonId] = useState<string | undefined>(data?.currentLesson?.id)
  const [currentLessonTitle, setCurrentLessonTitle] = useState<string | undefined>(data?.currentLesson?.title)
  const [currentContent, setCurrentContent] = useState<string>(data?.currentLesson?.content || '')
  const [exercises, setExercises] = useState(data?.exercises || [])
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(() => {
    return new Set(
      (data?.exercises || [])
        .filter(ex => ex.isCompleted)
        .map(ex => ex.id)
    )
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null)
  const [hasPrev, setHasPrev] = useState(false)
  const [hasNext, setHasNext] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null)
  const exerciseButtonOrderRef = useRef<Map<string, number>>(new Map())
  const buttonIdToExerciseIdRef = useRef<Map<string, string>>(new Map())
  const exercisesRef = useRef(exercises)
  exercisesRef.current = exercises
  const onLessonCompletedRef = useRef(onLessonCompleted)
  onLessonCompletedRef.current = onLessonCompleted

  const currentChapter = data?.catalog.find(ch =>
    ch.lessons.some(l => l.id === currentLessonId)
  )
  const currentChapterId = currentChapter?.id
  const courseId = data?.course?.id

  const getAllLessons = () => {
    return data?.catalog.flatMap(ch => ch.lessons) || []
  }

  const getCurrentLessonIndex = () => {
    if (!currentLessonId) return -1
    const allLessons = getAllLessons()
    return allLessons.findIndex(l => l.id === currentLessonId)
  }

  const updateNavigationState = useCallback(() => {
    const currentIndex = getCurrentLessonIndex()
    const allLessons = getAllLessons()
    setHasPrev(currentIndex > 0)
    setHasNext(currentIndex < allLessons.length - 1)
  }, [currentLessonId, data?.catalog])

  const completedExerciseCount = exercises.filter(ex => completedExercises.has(ex.id)).length
  const allExercisesCompleted = exercises.length > 0 && completedExerciseCount === exercises.length

  const handleExerciseComplete = useCallback((exerciseId: string) => {
    setCompletedExercises(prev => {
      const next = new Set(prev)
      next.add(exerciseId)

      buttonIdToExerciseIdRef.current.forEach((realId, buttonId) => {
        if (realId === exerciseId) {
          next.add(buttonId)
        }
      })

      return next
    })
  }, [])

  useEffect(() => {
    if (allExercisesCompleted && currentLessonId) {
      onLessonCompletedRef.current?.(currentLessonId)
    }
  }, [allExercisesCompleted, currentLessonId])

  const handleNavigate = async (direction: 'prev' | 'next') => {
    if (!currentLessonId || !courseId || !currentChapterId) return

    try {
      const allLessons = getAllLessons()
      const currentIndex = allLessons.findIndex(l => l.id === currentLessonId)
      const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1

      if (targetIndex < 0 || targetIndex >= allLessons.length) return

      const targetLessonId = allLessons[targetIndex].id
      const targetChapter = data.catalog.find(ch =>
        ch.lessons.some(l => l.id === targetLessonId)
      )
      const targetChapterId = targetChapter?.id || currentChapterId

      setTransitionDirection(direction === 'next' ? 'left' : 'right')
      setIsTransitioning(true)

      await new Promise(resolve => setTimeout(resolve, 150))

      try {
        const lessonDetail = await lessonDetailApi.getById(targetLessonId)

        setCurrentLessonId(targetLessonId)
        setCurrentLessonTitle(lessonDetail.currentLesson?.title)
        setCurrentContent(lessonDetail.currentLesson?.content || '')
        setExercises(lessonDetail.exercises || [])
        
        const completedIds = new Set(
          (lessonDetail.exercises || [])
            .filter(ex => ex.isCompleted)
            .map(ex => ex.id)
        )
        setCompletedExercises(completedIds)

        setHasPrev(targetIndex > 0)
        setHasNext(targetIndex < allLessons.length - 1)

        const newUrl = `/courses/${courseId}/chapters/${targetChapterId}/lessons/${targetLessonId}`
        window.history.pushState({ path: newUrl }, '', newUrl)
        onLessonSwitched?.(targetLessonId, targetChapterId)

        setTimeout(() => setIsTransitioning(false), 50)
      } catch (error) {
        setIsTransitioning(false)
      }
    } catch (error) {
      console.error('切换小节失败:', error)
    }
  }

  useEffect(() => {
    if (data?.currentLesson?.id && data.currentLesson.id !== currentLessonId) {
      setCurrentLessonId(data.currentLesson.id)
      setCurrentLessonTitle(data.currentLesson.title)
      setCurrentContent(data.currentLesson.content || '')
      setExercises(data.exercises || [])
      
      const completedIds = new Set(
        (data.exercises || [])
          .filter(ex => ex.isCompleted)
          .map(ex => ex.id)
      )
      setCompletedExercises(completedIds)
    }
  }, [data?.currentLesson?.id])

  useEffect(() => {
    updateNavigationState()
  }, [currentLessonId, updateNavigationState])

  const currentChapterTitle = currentChapter?.title || ''

  const hasContent = currentContent && currentContent.trim().length > 0
  const hasExercises = exercises.length > 0

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="bg-purple-600 text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold">{currentChapterTitle}</span>
          <span className="text-yellow-300">›</span>
          <span>{currentLessonTitle}</span>
        </div>
        <button
          onClick={() => router.back()}
          className="border-2 border-white px-3 py-1 bg-purple-700 text-white font-bold rounded-lg shadow-[2px_2px_0_0_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
        >
          <span>‹</span>
          <span>返回</span>
        </button>
      </div>

      {/* 主内容区 */}
      <div
        className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ease-in-out ${
          isTransitioning
            ? 'opacity-0 ' + (transitionDirection === 'left' ? '-translate-x-4' : 'translate-x-4')
            : 'opacity-100 translate-x-0'
        }`}
      >
        {/* 学习内容 */}
        {hasContent && (
          <div className="mb-8">
            <TiptapViewer
              content={currentContent}
              onExerciseClick={(exerciseId) => {
                const exercise = exercises.find(ex => ex.id === exerciseId);
                if (exercise) {
                  buttonIdToExerciseIdRef.current.set(exerciseId, exercise.id)
                  setCurrentExerciseId(exercise.id);
                  setModalOpen(true);
                } else {
                  const buttonOrder = exerciseButtonOrderRef.current.get(exerciseId)
                  if (buttonOrder !== undefined && exercises[buttonOrder]) {
                    const realExerciseId = exercises[buttonOrder].id
                    buttonIdToExerciseIdRef.current.set(exerciseId, realExerciseId)
                    setCurrentExerciseId(realExerciseId);
                    setModalOpen(true);
                  } else {
                    const index = parseInt(exerciseId.split('_')[1] || '0');
                    if (exercises[index]) {
                      const realExerciseId = exercises[index].id
                      buttonIdToExerciseIdRef.current.set(exerciseId, realExerciseId)
                      setCurrentExerciseId(realExerciseId);
                      setModalOpen(true);
                    }
                  }
                }
              }}
              onButtonOrderMapped={(buttonIdMap) => {
                exerciseButtonOrderRef.current = buttonIdMap

                const currentExercises = exercisesRef.current
                setCompletedExercises(prev => {
                  const next = new Set(prev)
                  let hasNewIds = false
                  buttonIdMap.forEach((index, buttonId) => {
                    if (index < currentExercises.length && currentExercises[index] && prev.has(currentExercises[index].id)) {
                      if (!next.has(buttonId)) {
                        next.add(buttonId)
                        hasNewIds = true
                      }
                    }
                  })
                  return hasNewIds ? next : prev
                })
              }}
              completedExercises={completedExercises}
            />
          </div>
        )}



        {/* 无内容也无练习 */}
        {!hasContent && !hasExercises && (
          <div className="flex items-center justify-center h-full">
            <span className="font-bold text-gray-400">暂无内容</span>
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <div className="bg-white border-t-4 border-black px-6 py-4 flex-shrink-0">
        <div className="grid grid-cols-5 gap-3 max-w-4xl mx-auto">
          <button
            onClick={() => handleNavigate('prev')}
            disabled={!hasPrev}
            className={`col-span-1 py-3 px-4 font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 text-base ${
              hasPrev
                ? 'bg-yellow-400 text-black hover:bg-yellow-500 rounded-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed rounded-lg'
            }`}
          >
            <span>‹</span>
            <span>上一节</span>
          </button>
          <div className="col-span-3 flex items-center justify-center">
            {hasExercises && (
              <div className="w-full max-w-md px-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-600">练习进度</span>
                  <span className="text-sm font-bold text-purple-600">
                    {completedExerciseCount}/{exercises.length}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${exercises.length > 0 ? (completedExerciseCount / exercises.length) * 100 : 0}%` }}
                  />
                </div>
                {allExercisesCompleted && (
                  <div className="mt-1 text-center text-green-600 text-sm font-bold">
                    🎉 所有练习已完成
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => handleNavigate('next')}
            disabled={!hasNext}
            className={`col-span-1 py-3 px-4 font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 text-base ${
              hasNext
                ? 'bg-yellow-400 text-black hover:bg-yellow-500 rounded-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed rounded-lg'
            }`}
          >
            <span>下一节</span>
            <span>›</span>
          </button>
        </div>
      </div>

      {/* 题目弹窗 */}
      <ExerciseModal
        isOpen={modalOpen}
        exerciseId={currentExerciseId}
        onClose={() => setModalOpen(false)}
        onComplete={handleExerciseComplete}
      />
    </div>
  )
}
