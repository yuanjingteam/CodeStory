'use client';
import { useState, useEffect } from 'react';
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
  const progress = useLessonProgress();

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

  const handleLessonCompleted = (lessonId: string) => {
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
  };

  return (
    <div className="flex gap-3 p-3 box-border max-h-[88vh] overflow-y-auto">
      <div
        className="flex-shrink-0 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white z-10 relative flex flex-col"
        style={{ width: '320px' }}
      >
        <Content data={data} />
      </div>

      <div className="flex-1 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white z-10 relative flex flex-col">
        <Question data={data} onLessonCompleted={handleLessonCompleted} />
      </div>

      <div
        className="flex-shrink-0 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] bg-white z-10 relative flex flex-col"
        style={{ width: '320px' }}
      >
        <Chat />
      </div>
    </div>
  );
}