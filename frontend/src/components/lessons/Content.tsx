import Progress from './Progress';
import { useState, useEffect } from 'react';
import type { LessonDetailData, Chapter } from '@/types/lesson-detail';

interface ContentProps {
  data: LessonDetailData;
}

export default function Content({ data }: ContentProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set(['chapter_id_1']));

  useEffect(() => {
    const currentChapter = data.catalog.find((ch) =>
      ch.lessons.some((l) => l.status === 1)
    );
    if (currentChapter) {
      setExpandedChapters(new Set([currentChapter.id]));
    }
  }, [data]);

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
                    const isCompleted = lesson.status === 2;
                    const isCurrent = lesson.status === 1;
                    const isNotStarted = lesson.status === 0;

                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center justify-between px-4 py-3 border-l-4 cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-yellow-400 border-yellow-500'
                            : isCompleted
                            ? 'bg-gray-50 border-green-500'
                            : isNotStarted
                            ? 'bg-white border-transparent hover:bg-gray-50'
                            : 'bg-white border-transparent hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {isCurrent ? (
                            <div className="w-6 h-6 rounded-full border-2 border-black bg-black flex items-center justify-center flex-shrink-0">
                              <span className="text-yellow-400 text-sm">▶</span>
                            </div>
                          ) : isCompleted ? (
                            <div className="w-6 h-6 rounded-full border-2 border-green-500 bg-green-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-gray-400 bg-transparent flex items-center justify-center flex-shrink-0">
                            </div>
                          )}
                          <span 
                            className={`flex-1 truncate ${isCurrent ? 'font-bold' : ''}`} 
                            title={lesson.title}
                          >
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
