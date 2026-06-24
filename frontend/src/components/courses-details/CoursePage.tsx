'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { courseDetailApi } from '@/app/api/courses/course-detail';
import type { CourseDetailData, Chapter } from '@/types/course-detail';
import { courseLevelMap } from '@/utils/constants';
import { useUserStore } from '@/store/useUserStore';

export default function CourseDetails({
  courseId,
}: {
  courseId: string;
  }) {
  const { isLoggedIn, isLoading } = useUserStore();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn || isLoading) return;
    const fetchCourseDetail = async () => {
      try {
        setLoading(true);
        const response = await courseDetailApi.getById(courseId);
        setCourse(response);
      } catch (error) {
        console.error('获取课程详情失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetail();
  }, [courseId, isLoading, isLoggedIn]);

  if (loading) {
    return (
      <section className="bg-white p-8 mx-8 relative z-10">
        <div className="text-center py-10 font-bold">加载中...</div>
      </section>
    );
  }

  if (!course) {
    return (
      <section className="bg-white p-8 mx-8 relative z-10">
        <div className="text-center py-10 font-bold">课程不存在</div>
      </section>
    );
  }

  return (
    <section className="bg-white p-8 mx-8 relative z-10 max-h-[88vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black mb-2">{course.title}</h2>
          <p className="text-gray-600">{course.description}</p>
        </div>

        <button
          onClick={() => router.push('/courses')}
          className="border-2 border-black px-4 py-2 bg-purple-500 text-white font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all rounded-md"
        >
          ← 返回
        </button>
      </div>

      {/* 课程信息卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-black text-blue-600">{course.chapterCount}</div>
          <div className="text-sm text-gray-600">章节</div>
        </div>
        <div className="border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-black text-green-600">{course.lessonCount}</div>
          <div className="text-sm text-gray-600">小节</div>
        </div>
        <div className="border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-black text-purple-600">{course.estimatedTotalTime}分钟</div>
          <div className="text-sm text-gray-600">预计总时长</div>
        </div>
      </div>

      {/* 课程大纲 */}
      <div className="mt-6">
        <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
          <span>📚</span> 课程大纲
        </h3>
        <div className="space-y-4">
          {course.chapters.map((chapter) => (
            <ChapterItem key={chapter.id} chapter={chapter} courseId={course.id} />
          ))}
        </div>
      </div>
    </section>
  );
}

// 章节组件
function ChapterItem({ chapter, courseId }: { chapter: Chapter; courseId: string }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleLessonClick = (lessonId: string) => {
    router.push(`/courses/${courseId}/chapters/${chapter.id}/lessons/${lessonId}`);
  };

  return (
    <div className="border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] bg-white rounded-lg">
      {/* 章标题 */}
      <div 
        className="bg-gradient-to-r from-purple-100 to-purple-200 p-4 border-b-2 border-black rounded-t-lg cursor-pointer hover:from-purple-200 hover:to-purple-300 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div>
              <h4 className="font-bold text-lg">{chapter.title}</h4>
              <p className="text-sm text-gray-600">{chapter.lessonCount} 小节</p>
            </div>
          </div>
          <span className="text-xl transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        </div>
      </div>

      {/* 小节列表 */}
      {isExpanded && (
        <div className="divide-y-2 divide-black">
          {chapter.lessons.map((lesson) => {
            const difficulty = courseLevelMap[lesson.difficulty] || { text: '未知', color: 'bg-gray-300' };
            return (
              <div
                key={lesson.id}
                onClick={() => handleLessonClick(lesson.id)}
                className="p-4 hover:bg-yellow-50 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xl">📄</span>
                  <div className="flex-1">
                    <div className="font-bold">{lesson.title}</div>
                  </div>
                </div>
                <span className={`${difficulty.color} border-2 border-black px-3 py-1 text-xs font-bold rounded-lg`}>
                  {difficulty.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
