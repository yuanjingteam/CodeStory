'use client';
import { useState, useEffect } from 'react';
import { lessonDetailApi } from '@/app/api/courses/lesson-detail';
import type { LessonDetailData } from '@/types/lesson-detail';

export default function Question() {
  const [data, setData] = useState<LessonDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await lessonDetailApi.getById('lesson_id');
        setData(response);
      } catch (error) {
        console.error('获取课程详情失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentChapter = data?.catalog.find(ch => 
    ch.lessons.some(l => l.status === 1)
  );

  if (loading) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center h-screen">加载失败</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* 导航栏 */}
      <div className="bg-purple-600 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold">{currentChapter?.title || '第1章 Python基础语法'}</span>
          <span className="text-yellow-300">›</span>
          <span>{data.currentLesson.title}</span>
        </div>
        <button className="bg-green-600 hover:bg-green-600 px-4 py-1 rounded font-bold transition-colors flex items-center gap-1">
          <span>‹</span>
          <span>返回</span>
        </button>
      </div>
    </div>
  );
}