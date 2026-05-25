'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { exerciseApi } from '@/app/api/courses/exercise';
import { lessonDetailApi } from '@/app/api/courses/lesson-detail';
import type { LessonDetailData } from '@/types/lesson-detail';
import type { ExerciseDetailData } from '@/types/exercise';
import MarkdownContent from './MarkdownContent';
import ChoiceQuestion, { ChoiceQuestionHandle } from './ChoiceQuestion';
import CodeQuestion, { CodeQuestionHandle } from './CodeQuestion';

interface QuestionProps {
  data: LessonDetailData;
  onLessonCompleted?: (lessonId: string) => void;
  onLessonSwitched?: (lessonId: string, chapterId: string) => void;
}

export default function Question({ data, onLessonCompleted, onLessonSwitched }: QuestionProps) {
  const router = useRouter();
  const [exerciseData, setExerciseData] = useState<ExerciseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitResult, setSubmitResult] = useState<{ correct: boolean; score: number; feedback: string } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null);
  const [currentHintLevelUsed, setCurrentHintLevelUsed] = useState(0);

  const [currentLessonId, setCurrentLessonId] = useState<string | undefined>(data?.currentLesson?.id);
  const [currentLessonTitle, setCurrentLessonTitle] = useState<string | undefined>(data?.currentLesson?.title);

  const choiceQuestionRef = useRef<ChoiceQuestionHandle>(null);
  const codeQuestionRef = useRef<CodeQuestionHandle>(null);

  const currentChapter = data?.catalog.find(ch =>
    ch.lessons.some(l => l.id === currentLessonId)
  );
  const currentChapterId = currentChapter?.id;
  const courseId = data?.course?.id;

  const getAllLessons = () => {
    return data?.catalog.flatMap(ch => ch.lessons) || [];
  };

  const getCurrentLessonIndex = () => {
    if (!currentLessonId) return -1;
    const allLessons = getAllLessons();
    return allLessons.findIndex(l => l.id === currentLessonId);
  };

  const updateNavigationState = () => {
    const currentIndex = getCurrentLessonIndex();
    const allLessons = getAllLessons();
    setHasPrev(currentIndex > 0);
    setHasNext(currentIndex < allLessons.length - 1);
  };

  const handleSubmit = async (answer: string) => {
    if (!exerciseData?.id) return;

    try {
      const response = await exerciseApi.submit(exerciseData.id, answer, currentHintLevelUsed);
      setSubmitResult({
        correct: response.correct,
        score: response.score,
        feedback: response.feedback
      });
      setShowResultModal(true);
      if (currentLessonId) {
        onLessonCompleted?.(currentLessonId);
      }
    } catch (error) {
      console.error('提交答案失败');
    }
  };

  const handleNavigate = async (direction: 'prev' | 'next') => {
    if (!currentLessonId || !courseId || !currentChapterId) return;

    try {
      const allLessons = getAllLessons();
      const currentIndex = allLessons.findIndex(l => l.id === currentLessonId);
      const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= allLessons.length) {
        return;
      }

      const targetLessonId = allLessons[targetIndex].id;
      const targetChapter = data.catalog.find(ch =>
        ch.lessons.some(l => l.id === targetLessonId)
      );
      const targetChapterId = targetChapter?.id || currentChapterId;


      setTransitionDirection(direction === 'next' ? 'left' : 'right');
      setIsTransitioning(true);
      setSubmitResult(null);
      setShowResultModal(false);

      await new Promise(resolve => setTimeout(resolve, 150));

      try {
        const lessonDetail = await lessonDetailApi.getById(targetLessonId);

        setCurrentLessonId(targetLessonId);
        setCurrentLessonTitle(lessonDetail.currentLesson?.title);

        if (lessonDetail.exercise?.id) {
          const exerciseResponse = await exerciseApi.getDetail(lessonDetail.exercise.id);
          setExerciseData(exerciseResponse);
          setCurrentHintLevelUsed(0);
        } else {
          setExerciseData(null);
          setCurrentHintLevelUsed(0);
        }
        setHasPrev(targetIndex > 0);
        setHasNext(targetIndex < allLessons.length - 1);
        const newUrl = `/courses/${courseId}/chapters/${targetChapterId}/lessons/${targetLessonId}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
        onLessonSwitched?.(targetLessonId, targetChapterId);
        setTimeout(() => setIsTransitioning(false), 50);
      } catch (error) {
        setIsTransitioning(false);
        throw error;
      }
    } catch (error) {
      console.error('切换题目失败:', error);
    }
  };

  useEffect(() => {
    const exerciseId = data?.exercise?.id;

    if (!exerciseId) {
      setLoading(false);
      return;
    }

    const fetchExercise = async () => {
      try {
        setLoading(true);
        const response = await exerciseApi.getDetail(exerciseId);
        setExerciseData(response);
        updateNavigationState();
      } catch (error) {
        console.error('获取题目详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchExercise();
  }, [currentLessonId, data?.exercise?.id]);

  useEffect(() => {
    if (data?.currentLesson?.id && data.currentLesson.id !== currentLessonId) {
      setCurrentLessonId(data.currentLesson.id);
      setCurrentLessonTitle(data.currentLesson.title);

      if (data.exercise?.id) {
        exerciseApi.getDetail(data.exercise.id)
          .then(response => {
            setExerciseData(response);
          })
          .catch(error => console.error('同步题目失败:', error));
      }
    }
  }, [data?.currentLesson?.id, data?.exercise?.id]);

  const currentChapterTitle = currentChapter?.title || '第 1 章 Python 基础语法';

  return (
    <div className="h-full flex flex-col">
      <div className="bg-purple-600 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold">{currentChapterTitle}</span>
          <span className="text-yellow-300">›</span>
          <span>{currentLessonTitle}</span>
        </div>
        <button
          onClick={() => router.back()}
          className="border-2 border-black px-3 py-1 bg-green-600 text-white font-bold rounded-lg shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
        >
          <span>‹</span>
          <span>返回</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {loading && !exerciseData ? (
          <div className="flex items-center justify-center h-full">
            <span className="font-bold">加载中...</span>
          </div>
        ) : !exerciseData ? (
          <div className="flex items-center justify-center h-full">
            <span className="font-bold">加载失败</span>
          </div>
        ) : (
          <>
            <div
              className={`flex-1 overflow-y-auto p-4 transition-all duration-300 ease-in-out ${
                isTransitioning
                  ? 'opacity-0 ' + (transitionDirection === 'left' ? '-translate-x-4' : 'translate-x-4')
                  : 'opacity-100 translate-x-0'
              }`}
            >
              <div className="mb-6">
                <MarkdownContent content={exerciseData.content} />
              </div>

              {exerciseData.type === 'single_choice' ? (
                <ChoiceQuestion
                  ref={choiceQuestionRef}
                  key={currentLessonId}
                  exercise={exerciseData}
                  onSubmit={handleSubmit}
                  onHintUsed={setCurrentHintLevelUsed}
                />
              ) : exerciseData.type === 'code' ? (
                <CodeQuestion
                  ref={codeQuestionRef}
                  key={currentLessonId}
                  exercise={exerciseData}
                  onSubmit={handleSubmit}
                  onHintUsed={setCurrentHintLevelUsed}
                />
              ) : (
                <div className="text-center font-bold">暂不支持的题型</div>
              )}
            </div>

            {exerciseData && (
              <div className="bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0iI2RkZCIvPjwvc3ZnPg==')] border-t-4 border-black px-6 py-4">
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
                    <span>上一题</span>
                  </button>
                  <button
                    onClick={() => {
                      if (exerciseData.type === 'single_choice') {
                        const selectedAnswer = choiceQuestionRef.current?.getSelectedAnswer();
                        if (selectedAnswer) {
                          handleSubmit(selectedAnswer);
                        }
                      } else if (exerciseData.type === 'code') {
                        const code = codeQuestionRef.current?.getCode();
                        if (code) {
                          handleSubmit(code);
                        }
                      }
                    }}
                    className={`col-span-3 py-3 font-bold border-4 border-black rounded-lg shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all text-lg ${
                      exerciseData.type === 'code' 
                        ? 'bg-green-600 text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none' 
                        : 'bg-green-600 text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                    }`}
                  >
                    {exerciseData.type === 'code' ? '运行代码' : '提交'}
                  </button>
                  <button
                    onClick={() => handleNavigate('next')}
                    disabled={!hasNext}
                    className={`col-span-1 py-3 px-4 font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 text-base ${
                      hasNext
                        ? 'bg-yellow-400 text-black hover:bg-yellow-500 rounded-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed rounded-lg'
                    }`}
                  >
                    <span>下一题</span>
                    <span>›</span>
                  </button>
                </div>
              </div>
            )}

            {showResultModal && submitResult && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-6 max-w-md w-full mx-4">
                  <div className="text-center">
                    {submitResult.correct ? (
                      <div className="text-6xl mb-4">🎉</div>
                    ) : (
                      <div className="text-6xl mb-4">💪</div>
                    )}
                    
                    <h3 className="text-2xl font-black mb-2">
                      {submitResult.correct ? '恭喜你答对了！' : '要继续加油哦！'}
                    </h3>
                    
                    <div className="border-2 border-black bg-gray-100 p-4 my-4">
                      <div className="text-4xl font-black text-purple-600 mb-2">
                        {submitResult.score}分
                      </div>
                      <p className="text-gray-700 text-sm">{submitResult.feedback}</p>
                    </div>

                    <button
                      onClick={() => setShowResultModal(false)}
                      className="w-full py-3 bg-green-600 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                    >
                      确定
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}