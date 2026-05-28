'use client';
import { useState, useEffect, useCallback } from 'react';
import { lessonDetailApi } from '@/app/api/courses/lesson-detail';
import type { LessonDetailData } from '@/types/lesson-detail';
import Question from './Question';
import Chat from './Chat';
import Content from './Content';
import { useLessonProgress } from '@/hooks/courses/useLessonProgress';
import { showToast } from '@/utils/toast';

export default function LessonPage({ lessonId }: { lessonId: string }) {
  const [data, setData] = useState<LessonDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const progress = useLessonProgress();

  const handleLessonCompleted = useCallback((lessonId: string) => {
    progress.saveProgress(lessonId);
    showToast.success('已记录学习进度');

    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        catalog: prev.catalog.map(chapter => ({
          ...chapter,
          lessons: chapter.lessons.map(lesson =>
            lesson.id === lessonId ? { ...lesson, status: 2 as const } : lesson
          )
        }))
      };
    });
  }, [progress]);

  const handleLessonSwitched = useCallback(async (newLessonId: string, newChapterId: string) => {
    console.log('🔄 LessonPage 收到切换通知:', newLessonId);

    try {
      const response = await lessonDetailApi.getById(newLessonId);
      const dataWithProgress = {
        ...response,
        catalog: progress.applyProgressToCatalog(response.catalog)
      };
      setData(dataWithProgress);
      console.log('✅ LessonPage 数据已更新（静默刷新）');
    } catch (error) {
      console.error('❌ 切换小节失败:', error);
    }
  }, [progress]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await lessonDetailApi.getById(lessonId);
        const dataWithProgress = {
          ...response,
          catalog: progress.applyProgressToCatalog(response.catalog)
        };
        setData(dataWithProgress);
      } catch (error) {
        console.error('获取课程详情失败');
      } finally {
        setLoading(false);
      }
    };

    if (lessonId) {
      fetchData();
    }
  }, [lessonId]);

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
    <div className="flex gap-3 p-3 box-border h-[calc(100vh-110px)]">
      <div
        className={`border-4 border-black rounded-lg shadow-[1px_1px_0_0_rgba(0,0,0,1)] bg-white z-10 relative flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-12' : 'w-[320px]'
        }`}
      >
        {!sidebarCollapsed && (
          <Content data={data} onLessonClick={handleLessonSwitched} />
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-3 right-[-18px] z-20 w-7 h-7 bg-white border-2 border-black rounded-full shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all duration-150 flex items-center justify-center font-bold text-sm"
        >
          {sidebarCollapsed ? '›' : '‹'}
        </button>
      </div>

      <div className="flex-1 border-4 border-black rounded-lg shadow-[1px_1px_0_0_rgba(0,0,0,1)] bg-white z-10 relative flex flex-col overflow-hidden min-w-0">
        <Question
          data={data}
          onLessonCompleted={handleLessonCompleted}
          onLessonSwitched={handleLessonSwitched}
        />
      </div>

      <div
        className="border-4 border-black rounded-lg shadow-[1px_1px_0_0_rgba(0,0,0,1)] bg-white z-10 relative flex flex-col overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0"
        style={{ width: sidebarCollapsed ? 'calc(320px + 320px - 48px)' : '320px' }}
      >
        <Chat />
      </div>
    </div>
  );
}
