'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { exerciseApi } from '@/app/api/courses/exercise';
import type { LessonDetailData } from '@/types/lesson-detail';
import type { ExerciseDetailData } from '@/types/exercise';
import MarkdownContent from './MarkdownContent';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';

interface QuestionProps {
  data: LessonDetailData;
  onLessonCompleted?: (lessonId: string) => void;
}

export default function Question({ data, onLessonCompleted }: QuestionProps) {
  const router = useRouter();
  const [exerciseData, setExerciseData] = useState<ExerciseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitResult, setSubmitResult] = useState<{ correct: boolean; score: number; feedback: string } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  const currentLessonId = data?.currentLesson?.id;
  const currentLessonTitle = data?.currentLesson?.title;

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
      const response = await exerciseApi.submit(exerciseData.id, answer);
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
      
      console.log('切换到小节:', targetLessonId);
      console.log('路由路径:', `/courses/${courseId}/chapters/${targetChapterId}/lessons/${targetLessonId}`);
      
      // 直接跳转路由，让 LessonPage 组件重新获取数据
      router.push(`/courses/${courseId}/chapters/${targetChapterId}/lessons/${targetLessonId}`);
    } catch (error) {
      console.error('切换题目失败:', error);
    }
  };

  useEffect(() => {
    if (!data?.exercise?.id) {
      setLoading(false);
      return;
    }

    const fetchExercise = async () => {
      try {
        setLoading(true);
        const response = await exerciseApi.getDetail(data.exercise.id);
        setExerciseData(response);
        updateNavigationState();
      } catch (error) {
        console.error('获取题目详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchExercise();
  }, [data?.exercise?.id]);

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
          className="border-2 border-black px-3 py-1 bg-green-600 text-white font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
        >
          <span>‹</span>
          <span>返回</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="font-bold">加载中...</span>
          </div>
        ) : !exerciseData ? (
          <div className="flex items-center justify-center h-full">
            <span className="font-bold">加载失败</span>
          </div>
        ) : (
          <>
            {/* 上半部分：固定渲染题干 Markdown */}
            <div className="flex-4 overflow-auto border-b-4 border-black p-4">
              <MarkdownContent content={exerciseData.content} />
            </div>

            {/* 下半部分：根据题型动态切换 */}
            <div className="flex-5 overflow-auto p-4">
              {exerciseData.type === 'single_choice' ? (
                <ChoiceQuestion 
                  exercise={exerciseData} 
                  onSubmit={handleSubmit} 
                  onNavigate={handleNavigate}
                  hasPrev={hasPrev}
                  hasNext={hasNext}
                />
              ) : exerciseData.type === 'code' ? (
                <CodeQuestion 
                  exercise={exerciseData} 
                  onSubmit={handleSubmit} 
                  onNavigate={handleNavigate}
                  hasPrev={hasPrev}
                  hasNext={hasNext}
                />
              ) : (
                <div className="text-center font-bold">暂不支持的题型</div>
              )}
            </div>

            {/* 提交结果弹窗 - 半透明覆盖在中间区域 */}
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

interface ChoiceQuestionProps {
  exercise: ExerciseDetailData;
  onSubmit: (answer: string) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
}

function ChoiceQuestion({ exercise, onSubmit, onNavigate, hasPrev, hasNext }: ChoiceQuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const options = (exercise.metadata as any)?.options || [];

  const handleSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    if (selectedOption) {
      onSubmit(selectedOption);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-lg">请选择正确答案：</div>
        <button className="py-2 px-4 bg-yellow-400 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
          💡 提示
        </button>
      </div>

      {options.map((option: string, index: number) => {
        const optionLabel = String.fromCharCode(65 + index);
        const isSelected = selectedOption === optionLabel;

        return (
          <div
            key={index}
            onClick={() => handleSelect(optionLabel)}
            className={`py-3 px-4 border-4 border-black cursor-pointer transition-all font-bold ${
              isSelected
                ? 'bg-yellow-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)] translate-x-[2px] translate-y-[2px]'
                : 'bg-white hover:bg-gray-100 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]'
            }`}
          >
            <span className="mr-2">{optionLabel}.</span>
            <span>{option.replace(/^[A-D]\.\s*/, '')}</span>
          </div>
        );
      })}

      <div className="grid grid-cols-5 gap-2 mt-4">
        <button 
          onClick={() => onNavigate?.('prev')}
          disabled={!hasPrev}
          className={`col-span-1 py-3 font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-1 ${
            hasPrev
              ? 'bg-gray-400 text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>‹</span>
          <span>上一题</span>
        </button>
        <button 
          onClick={handleSubmit}
          disabled={!selectedOption}
          className={`col-span-3 py-3 font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all text-lg ${
            selectedOption
              ? 'bg-green-600 text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          提交答案
        </button>
        <button 
          onClick={() => onNavigate?.('next')}
          disabled={!hasNext}
          className={`col-span-1 py-3 font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-1 ${
            hasNext
              ? 'bg-gray-400 text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>下一题</span>
          <span>›</span>
        </button>
      </div>
    </div>
  );
}

// 编程题组件
interface CodeQuestionProps {
  exercise: ExerciseDetailData;
  onSubmit: (answer: string) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
}

function CodeQuestion({ exercise, onSubmit, onNavigate, hasPrev, hasNext }: CodeQuestionProps) {
  const [userCode, setUserCode] = useState('');

  useEffect(() => {
    const code = (exercise.metadata as any)?.codeTemplate || '';
    setUserCode(code);
  }, [exercise]);

  const handleSubmit = () => {
    onSubmit(userCode);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 标题和提示按钮同行 */}
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-lg">请编写代码：</div>
        <button className="py-2 px-4 bg-yellow-400 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
          💡 提示
        </button>
      </div>

      <div className="flex-1 min-h-0 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden">
        <CodeMirror
          value={userCode}
          onChange={setUserCode}
          height="100%"
          theme="dark"
          extensions={[
            python(),
            EditorView.lineWrapping
          ]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
          }}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* 按钮组：上一题、运行代码、下一题 */}
      <div className="grid grid-cols-5 gap-2 mt-4">
        <button 
          onClick={() => onNavigate?.('prev')}
          disabled={!hasPrev}
          className={`col-span-1 py-3 font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-1 ${
            hasPrev
              ? 'bg-gray-400 text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>‹</span>
          <span>上一题</span>
        </button>
        <button 
          onClick={handleSubmit}
          className="col-span-3 py-3 bg-green-600 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-lg"
        >
          运行代码
        </button>
        <button 
          onClick={() => onNavigate?.('next')}
          disabled={!hasNext}
          className={`col-span-1 py-3 font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-1 ${
            hasNext
              ? 'bg-gray-400 text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>下一题</span>
          <span>›</span>
        </button>
      </div>
    </div>
  );
}