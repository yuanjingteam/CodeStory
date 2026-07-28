'use client';
import { useState, useEffect, useCallback } from 'react';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);
  const [currentExerciseCode, setCurrentExerciseCode] = useState<string | null>(null);

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

  const handleLessonSwitched = useCallback(async (newLessonId: string, newChapterId: string) => {
    try {
      const response = await lessonDetailApi.startById(newLessonId, {
        courseId,
        chapterId: newChapterId,
      });
      setData(response);
      router.push(`/courses/${response.course.id}/chapters/${newChapterId}/lessons/${response.currentLesson.id}`);
    } catch (error) {
      console.error('❌ 切换小节失败:', error);
    }
  }, [courseId, router]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isLoggedIn) {
      handleAuthenticationFailure();
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await lessonDetailApi.startById(lessonId, {
          courseId,
          chapterId,
        });
        setData(response);
      } catch {
        console.error('获取课程详情失败');
      } finally {
        setLoading(false);
      }
    };

    if (lessonId) {
      fetchData();
    }
  }, [chapterId, courseId, lessonId, isAuthLoading, isLoggedIn]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">加载中...</div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">加载失败</div>
    );
  }

  return (
    <div className="p-3 box-border h-[calc(100vh-110px)]">
      <Group orientation="horizontal" className="h-full">
        <Panel
          defaultSize="22%"
          minSize="3%"
          maxSize="35%"
          collapsible
          collapsedSize="3%"
          onResize={(size) => {
            setSidebarCollapsed(size.asPercentage <= 3)
          }}
        >
          <div className="h-full border-4 border-black rounded-lg shadow-[1px_1px_0_0_rgba(0,0,0,1)] bg-white relative flex flex-col overflow-hidden">
            {!sidebarCollapsed && (
              <Content data={data} onLessonClick={handleLessonSwitched} />
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

        <Panel defaultSize="50%" minSize="30%">
          <div className="h-full border-4 border-black rounded-lg shadow-[1px_1px_0_0_rgba(0,0,0,1)] bg-white relative flex flex-col overflow-hidden">
            <Question
              key={data.currentLesson.id}
              data={data}
              onLessonCompleted={handleLessonCompleted}
              onLessonSwitched={handleLessonSwitched}
              onCurrentExerciseChange={setCurrentExerciseId}
              onCurrentExerciseCodeChange={setCurrentExerciseCode}
            />
          </div>
        </Panel>

        <Separator className="w-3 flex items-center justify-center cursor-col-resize">
          <div className="w-1 h-8 bg-gray-400 rounded-full hover:bg-purple-600 active:bg-purple-700 transition-colors duration-150" />
        </Separator>

        <Panel defaultSize="28%" minSize="3%" maxSize="50%" collapsible collapsedSize="3%"
          onResize={(size) => {
            setChatCollapsed(size.asPercentage <= 3)
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
