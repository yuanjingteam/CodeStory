import Progress from './Progress';
import { useState, useEffect, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { LessonDetailData, Chapter } from '@/types/lesson-detail';
import {
  getLessonRecommendations,
  recordRecommendationEvent,
  recordRecommendationEvents,
} from '@/api/recommendations';
import type { RecommendationItem } from '@/types/recommendations';

interface ContentProps {
  data: LessonDetailData;
  onLessonClick?: (lessonId: string, chapterId: string) => void;
}

const EXPANDED_CHAPTERS_STORAGE_KEY = 'expandedChapters';

export default memo(function Content({ data, onLessonClick }: ContentProps) {
  const router = useRouter();
  
  const getStoredExpandedChapters = () => {
    if (typeof window === 'undefined') return new Set<string>();
    const stored = localStorage.getItem(EXPANDED_CHAPTERS_STORAGE_KEY);
    if (!stored) return new Set<string>(['chapter_id_1']);
    const chapters = JSON.parse(stored) as string[];
    return new Set<string>(chapters);
  };

  const getInitialExpandedChapters = () => {
    const stored = getStoredExpandedChapters();
    if (stored.size > 0) return stored;

    const currentChapter = data.catalog.find((chapter) =>
      chapter.lessons.some((lesson) => lesson.status === 1)
    );
    return currentChapter ? new Set([currentChapter.id]) : stored;
  };

  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    getInitialExpandedChapters
  );
  const [related, setRelated] = useState<RecommendationItem[]>([]);
  const relatedRef = useRef<HTMLDivElement>(null);
  useEffect(() => { getLessonRecommendations(data.course.id, data.currentLesson.id).then((r) => setRelated(r.data?.items || [])).catch(() => setRelated([])); }, [data.currentLesson.id, data.course.id]);
  useEffect(() => {
    const node = relatedRef.current;
    if (!node || !related.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void recordRecommendationEvents(
            related.map((item) => ({
              trackingToken: item.trackingToken,
              eventType: 'impression',
            }))
          ).catch(() => undefined);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [related]);

  useEffect(() => {
    localStorage.setItem(EXPANDED_CHAPTERS_STORAGE_KEY, JSON.stringify([...expandedChapters]));
  }, [expandedChapters]);

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

  const handleLessonClick = (lessonId: string, chapterId: string) => {
    if (onLessonClick) {
      onLessonClick(lessonId, chapterId);
    } else {
      const courseId = data.course.id;
      router.push(`/courses/${courseId}/chapters/${chapterId}/lessons/${lessonId}`);
    }
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
                    const isActive = lesson.id === data.currentLesson.id;
                    const isCompleted = lesson.status === 2;
                    const isInProgress = lesson.status === 1;
                    return (
                      <div
                        key={lesson.id}
                        onClick={() => handleLessonClick(lesson.id, chapter.id)}
                        className={`flex items-center justify-between px-4 py-3 border-l-4 cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-yellow-400 border-yellow-500'
                            : isCompleted
                            ? 'bg-gray-50 border-green-500'
                            : isInProgress
                            ? 'bg-white border-black hover:bg-gray-50'
                            : 'bg-white border-transparent hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {isCompleted ? (
                            <div className="w-6 h-6 rounded-full border-2 border-black bg-black flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          ) : isInProgress ? (
                            <div className="w-6 h-6 rounded-full border-2 border-black bg-black flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs">▶</span>
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-black bg-transparent flex items-center justify-center flex-shrink-0">
                            </div>
                          )}
                          <span 
                            className={`flex-1 truncate ${isActive ? 'font-bold' : ''}`} 
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
        {related.length > 0 && <div ref={relatedRef} className="border-t-2 border-black p-4 bg-yellow-50"><h3 className="font-black mb-2">相关学习</h3><div className="grid gap-2">{related.map((item) => <button key={item.trackingToken} onClick={() => { recordRecommendationEvent(item.trackingToken, 'clicked').catch(() => undefined); router.push(item.href); }} className="text-left border-2 border-black bg-white px-3 py-2 font-bold hover:bg-yellow-300">{item.title}</button>)}</div></div>}
      </div>
    </div>
  );
})
