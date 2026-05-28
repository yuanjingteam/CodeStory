'use client';
import { useState, useEffect, useCallback } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
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
    try {
      const response = await lessonDetailApi.getById(newLessonId);
      const dataWithProgress = {
        ...response,
        catalog: progress.applyProgressToCatalog(response.catalog)
      };
      setData(dataWithProgress);
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
              data={data}
              onLessonCompleted={handleLessonCompleted}
              onLessonSwitched={handleLessonSwitched}
            />
          </div>
        </Panel>

        <Separator className="w-3 flex items-center justify-center cursor-col-resize">
          <div className="w-1 h-8 bg-gray-400 rounded-full hover:bg-purple-600 active:bg-purple-700 transition-colors duration-150" />
        </Separator>

        <Panel defaultSize="28%" minSize="15%" maxSize="50%">
          <div className="h-full border-4 border-black rounded-lg shadow-[1px_1px_0_0_rgba(0,0,0,1)] bg-white relative flex flex-col overflow-hidden">
            <Chat />
          </div>
        </Panel>
      </Group>
    </div>
  );
}
