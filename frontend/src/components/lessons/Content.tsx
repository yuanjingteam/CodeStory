import Progress from './Progress';
import { useState, useEffect } from 'react';
import { lessonDetailApi } from '@/app/api/courses/lesson-detail';
import type { LessonDetailData, Chapter } from '@/types/lesson-detail';

export default function Content() {
  const [data, setData] = useState<LessonDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set(['chapter_id_1']));

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 尝试调用 API，如果失败则使用模拟数据
        const response = await lessonDetailApi.getById('lesson_id');
        setData(response);
        
        // 默认展开包含当前课程的章节
        const currentChapter = response.catalog.find((ch) =>
          ch.lessons.some((l) => l.status === 'current')
        );
        if (currentChapter) {
          setExpandedChapters(new Set([currentChapter.id]));
        }
      } catch (error) {
        console.error('获取课程详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <span className="font-bold">加载中...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <span className="font-bold">加载失败</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 进度条 */}
      <Progress data={data.course} />

      {/* 章节目录 */}
      <div className="flex-1 overflow-auto relative z-10 bg-white">
        {/* 章节目录标题 */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b-2 border-black">
          <span className="font-bold">章节目录</span>
          <button className="text-xl transition-transform duration-200">
            ▲
          </button>
        </div>

        {/* 章节列表 */}
        <div className="divide-y-2 divide-black">
          {data.catalog.map((chapter: Chapter) => (
            <div key={chapter.id}>
              {/* 章节标题 */}
              <div
                className="flex items-center justify-between px-4 py-3 bg-gray-200 cursor-pointer hover:bg-gray-300 transition-colors"
                onClick={() => toggleChapter(chapter.id)}
              >
                <span className="font-bold">{chapter.title}</span>
                <span className="text-xl">
                  {expandedChapters.has(chapter.id) ? '−' : '+'}
                </span>
              </div>

              {/* 小节列表 */}
              {expandedChapters.has(chapter.id) && (
                <div className="bg-white">
                  {chapter.lessons.map((lesson) => {
                    const isCompleted = lesson.status === 'completed';
                    const isCurrent = lesson.status === 'current';
                    const isLocked = lesson.status === 'locked';

                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center justify-between px-4 py-3 border-l-4 cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-yellow-400 border-yellow-500'
                            : isCompleted
                            ? 'bg-gray-50 border-green-500'
                            : isLocked
                            ? 'bg-gray-100 border-gray-300 opacity-60'
                            : 'bg-white border-transparent hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* 状态图标 */}
                          {isCurrent ? (
                            <span className="text-lg">▶</span>
                          ) : isCompleted ? (
                            <span className="text-green-500 text-lg">✓</span>
                          ) : isLocked ? (
                            <span className="text-gray-400">🔒</span>
                          ) : (
                            <span className="text-gray-400">○</span>
                          )}
                          <span className={isCurrent ? 'font-bold' : ''}>
                            {lesson.title}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
