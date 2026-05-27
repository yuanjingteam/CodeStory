'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { lessonDetailApi } from '@/app/api/courses/lesson-detail'
import type { LessonDetailData } from '@/types/lesson-detail'
import ExerciseModal from './ExerciseModal'
import MarkdownContent from './MarkdownContent'

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
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null)
  const [hasPrev, setHasPrev] = useState(false)
  const [hasNext, setHasNext] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null)

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

  const allExercisesCompleted = exercises.length > 0 && completedExercises.size === exercises.length

  const handleExerciseComplete = useCallback((exerciseId: string) => {
    setCompletedExercises(prev => {
      const next = new Set(prev)
      next.add(exerciseId)
      return next
    })
  }, [])

  useEffect(() => {
    if (allExercisesCompleted && currentLessonId) {
      onLessonCompleted?.(currentLessonId)
    }
  }, [allExercisesCompleted, currentLessonId, onLessonCompleted])

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
        setCompletedExercises(new Set())

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
      setCompletedExercises(new Set())
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
            <MarkdownContent 
              content={currentContent} 
              onExerciseClick={(exerciseId) => {
                const exercise = exercises.find(ex => ex.id === exerciseId);
                if (exercise) {
                  setCurrentExerciseId(exercise.id);
                  setModalOpen(true);
                } else {
                  const index = parseInt(exerciseId.split('_')[1] || '0');
                  if (exercises[index]) {
                    setCurrentExerciseId(exercises[index].id);
                    setModalOpen(true);
                  }
                }
              }}
              completedExercises={completedExercises}
            />
          </div>
        )}

        {/* 练习按钮列表 */}
        {hasExercises && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold">📝 练习题</span>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {completedExercises.size}/{exercises.length} 已完成
              </span>
            </div>

            {exercises.map((exercise, index) => {
              const isCompleted = completedExercises.has(exercise.id)
              return (
                <button
                  key={exercise.id}
                  onClick={() => {
                    if (!isCompleted) {
                      setCurrentExerciseId(exercise.id)
                      setModalOpen(true)
                    }
                  }}
                  className={`w-full py-4 px-6 font-bold border-4 border-black rounded-xl shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all text-left flex items-center justify-between ${
                    isCompleted
                      ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white cursor-default'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{isCompleted ? '✅' : '💡'}</span>
                    <div>
                      <div className="text-base">
                        {isCompleted ? '已完成' : `请完成练习 ${index + 1}`}
                      </div>
                      <div className={`text-sm ${isCompleted ? 'text-green-100' : 'text-purple-200'}`}>
                        {exercise.type === 'choice' ? '选择题' : exercise.type === 'code' ? '编程题' : '填空题'}
                      </div>
                    </div>
                  </div>
                  {!isCompleted && (
                    <span className="text-2xl">›</span>
                  )}
                </button>
              )
            })}

            {/* 完成进度 */}
            {hasExercises && (
              <div className="mt-6 p-4 border-2 border-black rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">完成进度</span>
                  <span className="font-bold text-sm text-purple-600">
                    {completedExercises.size}/{exercises.length}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${exercises.length > 0 ? (completedExercises.size / exercises.length) * 100 : 0}%` }}
                  />
                </div>
                {allExercisesCompleted && (
                  <div className="mt-3 text-center text-green-600 font-bold">
                    🎉 恭喜！所有练习已完成，小节已标记为已完成！
                  </div>
                )}
              </div>
            )}
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
              <span className="text-sm text-gray-500">
                {allExercisesCompleted ? '✅ 已完成所有练习' : `还需完成 ${exercises.length - completedExercises.size} 道练习`}
              </span>
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
