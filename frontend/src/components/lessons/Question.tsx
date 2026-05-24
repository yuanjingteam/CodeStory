'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { exerciseApi } from '@/app/api/courses/exercise';
import { lessonDetailApi } from '@/app/api/courses/lesson-detail';
import type { LessonDetailData } from '@/types/lesson-detail';
import type { ExerciseDetailData } from '@/types/exercise';
import MarkdownContent from './MarkdownContent';
import HintModal from './HintModal';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';

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
  const [currentHintLevelUsed, setCurrentHintLevelUsed] = useState(0); // 当前使用的提示等级

  // 改为本地状态，支持切换题目时更新
  const [currentLessonId, setCurrentLessonId] = useState<string | undefined>(data?.currentLesson?.id);
  const [currentLessonTitle, setCurrentLessonTitle] = useState<string | undefined>(data?.currentLesson?.title);

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

      console.log('切换到小节:', targetLessonId);

      // 平滑切换：先淡出，再更新，最后淡入
      setTransitionDirection(direction === 'next' ? 'left' : 'right'); // 设置滑动方向
      setIsTransitioning(true); // 开始淡出
      setSubmitResult(null);
      setShowResultModal(false);

      // 延迟一小段时间让淡出动画执行（150ms）
      await new Promise(resolve => setTimeout(resolve, 150));

      try {
        // 获取新小节的详情数据
        console.log('📡 请求小节详情:', targetLessonId);
        const lessonDetail = await lessonDetailApi.getById(targetLessonId);
        console.log('📥 收到小节详情:', lessonDetail);

        // 更新本地状态
        setCurrentLessonId(targetLessonId);
        setCurrentLessonTitle(lessonDetail.currentLesson?.title);
        console.log('✅ 更新标题:', lessonDetail.currentLesson?.title);

        if (lessonDetail.exercise?.id) {
          console.log('📡 请求题目详情:', lessonDetail.exercise.id);
          const exerciseResponse = await exerciseApi.getDetail(lessonDetail.exercise.id);
          console.log('📥 收到题目详情:', exerciseResponse);
          setExerciseData(exerciseResponse);
          setCurrentHintLevelUsed(0); // 切换题目时重置提示等级
          console.log('✅ 题目数据已更新');
        } else {
          console.log('⚠️ 该小节没有题目');
          setExerciseData(null);
          setCurrentHintLevelUsed(0); // 切换题目时重置提示等级
        }

        // 更新导航状态
        setHasPrev(targetIndex > 0);
        setHasNext(targetIndex < allLessons.length - 1);

        // 更新浏览器URL（不触发页面重新加载）
        const newUrl = `/courses/${courseId}/chapters/${targetChapterId}/lessons/${targetLessonId}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
        console.log('🌐 URL已更新:', newUrl);

        // 通知父组件：当前小节已切换
        onLessonSwitched?.(targetLessonId, targetChapterId);

        // 延迟一小段时间让淡入动画执行
        setTimeout(() => setIsTransitioning(false), 50);

      } catch (error) {
        console.error('❌ 切换题目失败:', error);
        setIsTransitioning(false); // 出错时恢复显示
        throw error;
      }

    } catch (error) {
      console.error('切换题目失败:', error);
    }
  };

  useEffect(() => {
    // 初始化或从data prop同步状态
    const lessonId = currentLessonId || data?.currentLesson?.id;
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

  // 监听 props.data 变化，同步内部状态（当父组件更新时）
  useEffect(() => {
    if (data?.currentLesson?.id && data.currentLesson.id !== currentLessonId) {
      console.log('📢 检测到父组件数据变化，同步状态:', data.currentLesson.id);
      setCurrentLessonId(data.currentLesson.id);
      setCurrentLessonTitle(data.currentLesson.title);

      if (data.exercise?.id) {
        exerciseApi.getDetail(data.exercise.id)
          .then(response => {
            console.log('📥 同步题目数据:', response.id);
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
          className="border-2 border-black px-3 py-1 bg-green-600 text-white font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center gap-1"
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
            {/* 整体内容区域：题目 + 选项/代码，统一滚动（带淡入淡出 + 滑动动画） */}
            <div
              className={`flex-1 overflow-y-auto p-4 transition-all duration-300 ease-in-out ${
                isTransitioning
                  ? 'opacity-0 ' + (transitionDirection === 'left' ? '-translate-x-4' : 'translate-x-4')
                  : 'opacity-100 translate-x-0'
              }`}
            >
              {/* 题目内容 */}
              <div className="mb-6">
                <MarkdownContent content={exerciseData.content} />
              </div>

              {/* 根据题型动态切换：选项或代码块 */}
              {exerciseData.type === 'single_choice' ? (
                <ChoiceQuestion
                  key={currentLessonId}
                  exercise={exerciseData}
                  onSubmit={handleSubmit}
                  onNavigate={handleNavigate}
                  hasPrev={hasPrev}
                  hasNext={hasNext}
                  onHintUsed={setCurrentHintLevelUsed} // 传递提示使用回调
                />
              ) : exerciseData.type === 'code' ? (
                <CodeQuestion
                  key={currentLessonId}
                  exercise={exerciseData}
                  onSubmit={handleSubmit}
                  onNavigate={handleNavigate}
                  hasPrev={hasPrev}
                  hasNext={hasNext}
                  onHintUsed={setCurrentHintLevelUsed} // 传递提示使用回调
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
  onHintUsed?: (level: number) => void; // 新增：提示使用回调
}

function ChoiceQuestion({ exercise, onSubmit, onNavigate, hasPrev, hasNext, onHintUsed }: ChoiceQuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintLevelUsed, setHintLevelUsed] = useState(0);

  const options = (exercise.metadata as any)?.options || [];

  const handleSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    if (selectedOption) {
      onSubmit(selectedOption);
    }
  };

  const handleUseHint = (newLevel: number) => {
    setHintLevelUsed(newLevel);
    onHintUsed?.(newLevel); // 通知父组件
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-lg">请选择正确答案：</div>
        <button
          onClick={() => setShowHintModal(true)}
          disabled={!exercise.hints || hintLevelUsed >= exercise.hints?._meta.max_level}
          className={`
            py-2 px-4 font-bold border-4 border-black
            shadow-[4px_4px_0_0_rgba(0,0,0,1)]
            hover:translate-x-[2px] hover:translate-y-[2px]
            hover:shadow-none transition-all
            ${exercise.hints && hintLevelUsed < exercise.hints._meta.max_level
              ? 'bg-yellow-400 text-black cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          💡 提示 {exercise.hints ? `(${exercise.hints._meta.max_level - hintLevelUsed})` : ''}
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
              ? 'bg-yellow-400 text-black hover:bg-yellow-500 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
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
              ? 'bg-yellow-400 text-black hover:bg-yellow-500 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>下一题</span>
          <span>›</span>
        </button>
      </div>

      {showHintModal && (
        <HintModal
          hints={exercise.hints || null}
          currentLevel={hintLevelUsed}
          onUseHint={handleUseHint}
          onClose={() => setShowHintModal(false)}
        />
      )}
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
  onHintUsed?: (level: number) => void; // 新增：提示使用回调
}

function CodeQuestion({ exercise, onSubmit, onNavigate, hasPrev, hasNext, onHintUsed }: CodeQuestionProps) {
  const [userCode, setUserCode] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintLevelUsed, setHintLevelUsed] = useState(0);

  useEffect(() => {
    const code = (exercise.metadata as any)?.codeTemplate || '';
    setUserCode(code);
  }, [exercise]);

  const handleSubmit = () => {
    onSubmit(userCode);
  };

  const handleUseHint = (newLevel: number) => {
    setHintLevelUsed(newLevel);
    onHintUsed?.(newLevel); // 通知父组件
  };

  return (
    <div className="flex flex-col h-full">
      {/* 标题和提示按钮同行 */}
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-lg">请编写代码：</div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="py-2 px-4 bg-purple-500 text-white font-bold border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
          >
            {isCollapsed ? (
              <>
                <span>▶</span>
                <span>展开代码块</span>
              </>
            ) : (
              <>
                <span>▼</span>
                <span>收起代码块</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowHintModal(true)}
            disabled={!exercise.hints || hintLevelUsed >= exercise.hints?._meta.max_level}
            className={`
              py-2 px-4 font-bold border-4 border-black
              shadow-[4px_4px_0_0_rgba(0,0,0,1)]
              hover:translate-x-[2px] hover:translate-y-[2px]
              hover:shadow-none transition-all
              ${exercise.hints && hintLevelUsed < exercise.hints._meta.max_level
                ? 'bg-yellow-400 text-black cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            💡 提示 {exercise.hints ? `(${exercise.hints._meta.max_level - hintLevelUsed})` : ''}
          </button>
        </div>
      </div>

      {/* 代码编辑器区域：收起/展开 */}
      <div className={`border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden transition-all duration-300 ${
        isCollapsed ? 'h-[180px]' : 'flex-1 min-h-0'
      }`}>
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
              ? 'bg-yellow-400 text-black hover:bg-yellow-500 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
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
              ? 'bg-yellow-400 text-black hover:bg-yellow-500 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>下一题</span>
          <span>›</span>
        </button>
      </div>

      {showHintModal && (
        <HintModal
          hints={exercise.hints || null}
          currentLevel={hintLevelUsed}
          onUseHint={handleUseHint}
          onClose={() => setShowHintModal(false)}
        />
      )}
    </div>
  );
}