'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { lessonDetailApi } from '@/app/api/courses/lesson-detail';
import type { LessonDetailData } from '@/types/lesson-detail';
import Question from './Question';
import Chat from './Chat';
import Content from './Content';
import { showToast } from '@/utils/toast';
import { useUserStore } from '@/store/useUserStore';
import { handleAuthenticationFailure } from '@/utils/auth-session';
import { useRouter } from 'next/navigation';

type MobileWorkspace = 'catalog' | 'lesson' | 'assistant';

export default function LessonPage({
  courseId,
  chapterId,
  lessonId,
}: {
  courseId: string;
  chapterId: string;
  lessonId: string;
}) {
  const router = useRouter();
  const { isLoggedIn, isLoading: isAuthLoading } = useUserStore();
  const [data, setData] = useState<LessonDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryVersion, setRetryVersion] = useState(0);
  const [isLessonSwitching, setIsLessonSwitching] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);
  const [currentExerciseCode, setCurrentExerciseCode] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [mobileWorkspace, setMobileWorkspace] =
    useState<MobileWorkspace>('lesson');
  const requestIdRef = useRef(0);
  const pendingLessonIdRef = useRef<string | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsMobile(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  const handleLessonCompleted = useCallback((lessonId: string) => {
    showToast.success('已记录学习进度');

    setData(prev => {
      if (!prev) return prev;
      const totalLessons = prev.catalog.reduce((sum, ch) => sum + ch.lessons.length, 0);
      const currentLesson = prev.catalog.flatMap(ch => ch.lessons).find(l => l.id === lessonId);
      const isAlreadyCompleted = currentLesson?.status === 2;
      const completedLessons = prev.catalog.reduce((sum, ch) =>
        sum + ch.lessons.filter(l => l.status === 2).length, 0
      ) + (isAlreadyCompleted ? 0 : 1);
      const newProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      return {
        ...prev,
        course: { ...prev.course, progress: newProgress },
        catalog: prev.catalog.map(chapter => ({
          ...chapter,
          lessons: chapter.lessons.map(lesson =>
            lesson.id === lessonId ? { ...lesson, status: 2 as const } : lesson
          )
        }))
      };
    });
  }, []);

  const handleLessonSwitched = useCallback((newLessonId: string, newChapterId: string) => {
    if (pendingLessonIdRef.current || isLessonSwitching || newLessonId === data?.currentLesson.id) return;
    pendingLessonIdRef.current = newLessonId;
    setIsLessonSwitching(true);
    setLoadError('');
    router.push(`/courses/${courseId}/chapters/${newChapterId}/lessons/${newLessonId}`);
  }, [courseId, data?.currentLesson.id, isLessonSwitching, router]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isLoggedIn) {
      handleAuthenticationFailure();
      return;
    }

    if (!lessonId) return;

    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted && requestIdRef.current === requestId) {
        setLoading(true);
        setLoadError('');
      }
    });

    lessonDetailApi.startById(
      lessonId,
      { courseId, chapterId },
      controller.signal
    ).then((response) => {
      if (requestIdRef.current !== requestId) return;
      setData(response);
      pendingLessonIdRef.current = null;
      setIsLessonSwitching(false);
    }).catch(() => {
      if (controller.signal.aborted || requestIdRef.current !== requestId) return;
      setLoadError('小节加载失败，原内容已保留。');
      pendingLessonIdRef.current = null;
      setIsLessonSwitching(false);
    }).finally(() => {
      if (!controller.signal.aborted && requestIdRef.current === requestId) {
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, [chapterId, courseId, lessonId, isAuthLoading, isLoggedIn, retryVersion]);

  if ((loading && !data) || isMobile === null) {
    return (
      <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center">
        加载中...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center gap-4 px-4 text-center" role="alert">
        <p className="font-bold">{loadError || '小节加载失败'}</p>
        <button type="button" onClick={() => setRetryVersion((value) => value + 1)} className="min-h-11 border-2 border-black bg-yellow-300 px-5 font-bold shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
          重新加载
        </button>
      </div>
    );
  }

  const loadErrorBanner = loadError ? (
    <div role="alert" className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-black bg-red-50 px-3 py-2 text-sm font-bold text-red-800">
      <span>{loadError}</span>
      <button type="button" onClick={() => setRetryVersion((value) => value + 1)} className="border-2 border-black bg-white px-3 py-1 text-black">重试</button>
    </div>
  ) : null;

  if (isMobile) {
    const workspaceButtonClass = (workspace: MobileWorkspace) =>
      `min-h-11 border-2 border-black px-2 text-sm font-black ${
        mobileWorkspace === workspace
          ? 'translate-x-0.5 translate-y-0.5 bg-purple-600 text-white shadow-none'
          : 'bg-white text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]'
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300`;

    return (
      // 90px = 外壳 my-3 (24px) + 外壳上下边框 (4px) + Header (62px)
      <div className="flex h-[calc(100dvh-90px)] flex-col p-2">
        <div
          className="mb-3 grid shrink-0 grid-cols-3 gap-2"
          aria-label="小节移动端工作区"
        >
          <button
            type="button"
            className={workspaceButtonClass('catalog')}
            aria-pressed={mobileWorkspace === 'catalog'}
            onClick={() => setMobileWorkspace('catalog')}
          >
            目录
          </button>
          <button
            type="button"
            className={workspaceButtonClass('lesson')}
            aria-pressed={mobileWorkspace === 'lesson'}
            onClick={() => setMobileWorkspace('lesson')}
          >
            练习
          </button>
          <button
            type="button"
            className={workspaceButtonClass('assistant')}
            aria-pressed={mobileWorkspace === 'assistant'}
            onClick={() => setMobileWorkspace('assistant')}
          >
            AI 助手
          </button>
        </div>

        <div
          className={`min-h-0 overflow-hidden rounded-lg border-4 border-black bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
            mobileWorkspace === 'catalog' ? 'flex flex-1 flex-col' : 'hidden'
          }`}
        >
          {loadErrorBanner}
          <Content data={data} onLessonClick={handleLessonSwitched} isLessonSwitching={isLessonSwitching || loading} />
        </div>

        <div
          className={`min-h-0 overflow-hidden rounded-lg border-4 border-black bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
            mobileWorkspace === 'lesson' ? 'flex flex-1 flex-col' : 'hidden'
          }`}
        >
          {loadErrorBanner}
          <Question
            key={data.currentLesson.id}
            data={data}
            onLessonCompleted={handleLessonCompleted}
            onLessonSwitched={handleLessonSwitched}
            onCurrentExerciseChange={setCurrentExerciseId}
            onCurrentExerciseCodeChange={setCurrentExerciseCode}
            isLessonSwitching={isLessonSwitching || loading}
          />
        </div>

        <div
          className={`min-h-0 overflow-hidden rounded-lg border-4 border-black bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${
            mobileWorkspace === 'assistant' ? 'flex flex-1 flex-col' : 'hidden'
          }`}
        >
          <Chat
            key={data.currentLesson.id}
            lessonId={data.currentLesson.id}
            lessonTitle={data.currentLesson.title}
            exerciseId={currentExerciseId}
            currentCode={currentExerciseCode}
          />
        </div>
      </div>
    );
  }

  return (
    // 90px = 外壳 my-3 (24px) + 外壳上下边框 (4px) + Header (62px)
    <div className="p-3 box-border h-[calc(100dvh-90px)]">
      <Group orientation="horizontal" className="h-full">
        <Panel
          defaultSize="22%"
          minSize="260px"
          maxSize="420px"
          collapsible
          collapsedSize="44px"
          onResize={(size) => {
            setSidebarCollapsed(size.inPixels <= 48)
          }}
        >
          <div className="h-full border-4 border-black rounded-lg shadow-[1px_1px_0_0_rgba(0,0,0,1)] bg-white relative flex flex-col overflow-hidden">
            {!sidebarCollapsed && (
              <Content data={data} onLessonClick={handleLessonSwitched} isLessonSwitching={isLessonSwitching || loading} />
            )}
            {sidebarCollapsed && (
              <div className="flex items-center justify-center h-full">
                <span className="text-gray-400 text-sm font-bold tracking-widest" style={{ writingMode: 'vertical-rl' }}>目录</span>
              </div>
            )}
          </div>
        </Panel>

        <Separator className="w-3 flex items-center justify-center cursor-col-resize">
          <div className="w-1 h-8 bg-gray-400 rounded-full hover:bg-purple-600 active:bg-purple-700 transition-colors duration-150" />
        </Separator>

        <Panel defaultSize="50%" minSize="420px">
          <div className="h-full border-4 border-black rounded-lg shadow-[1px_1px_0_0_rgba(0,0,0,1)] bg-white relative flex flex-col overflow-hidden">
            {loadErrorBanner}
            <Question
              key={data.currentLesson.id}
              data={data}
              onLessonCompleted={handleLessonCompleted}
              onLessonSwitched={handleLessonSwitched}
              onCurrentExerciseChange={setCurrentExerciseId}
              onCurrentExerciseCodeChange={setCurrentExerciseCode}
              isLessonSwitching={isLessonSwitching || loading}
            />
          </div>
        </Panel>

        <Separator className="w-3 flex items-center justify-center cursor-col-resize">
          <div className="w-1 h-8 bg-gray-400 rounded-full hover:bg-purple-600 active:bg-purple-700 transition-colors duration-150" />
        </Separator>

        <Panel defaultSize="28%" minSize="340px" maxSize="560px" collapsible collapsedSize="44px"
          onResize={(size) => {
            setChatCollapsed(size.inPixels <= 48)
          }}
        >
          <div className="h-full border-4 border-black rounded-lg shadow-[1px_1px_0_0_rgba(0,0,0,1)] bg-white relative flex flex-col overflow-hidden">
            {!chatCollapsed && (
              <Chat
                key={data.currentLesson.id}
                lessonId={data.currentLesson.id}
                lessonTitle={data.currentLesson.title}
                exerciseId={currentExerciseId}
                currentCode={currentExerciseCode}
              />
            )}
            {chatCollapsed && (
              <div className="flex items-center justify-center h-full">
                <span className="text-gray-400 text-sm font-bold tracking-widest" style={{ writingMode: 'vertical-rl' }}>AI 助手</span>
              </div>
            )}
          </div>
        </Panel>
      </Group>
    </div>
  );
}
