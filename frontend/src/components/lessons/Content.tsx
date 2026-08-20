import Progress from './Progress';
import { memo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LessonDetailData } from '@/types/lesson-detail';

interface ContentProps {
  data: LessonDetailData;
  onLessonClick?: (lessonId: string, chapterId: string) => void;
  isLessonSwitching?: boolean;
}

const STORAGE_PREFIX = 'codeStory:expandedChapters:v1';

function getCurrentChapterId(data: LessonDetailData): string | null {
  return data.catalog.find((chapter) =>
    chapter.lessons.some((lesson) => lesson.id === data.currentLesson.id)
  )?.id || null;
}

function readExpandedChapters(data: LessonDetailData): Set<string> {
  const currentChapterId = getCurrentChapterId(data);
  const fallback = new Set(currentChapterId ? [currentChapterId] : []);
  if (typeof window === 'undefined') return fallback;

  try {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}:${data.course.id}`);
    if (!stored) return fallback;
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      return fallback;
    }
    const validIds = new Set(data.catalog.map((chapter) => chapter.id));
    const expanded = new Set(parsed.filter((id) => validIds.has(id)));
    if (currentChapterId) expanded.add(currentChapterId);
    return expanded;
  } catch {
    return fallback;
  }
}

export default memo(function Content({ data, onLessonClick, isLessonSwitching = false }: ContentProps) {
  const router = useRouter();
  const currentChapterId = getCurrentChapterId(data);
  const storageKey = `${STORAGE_PREFIX}:${data.course.id}`;
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(() => readExpandedChapters(data));

  useEffect(() => {
    setExpandedChapters(readExpandedChapters(data));
  }, [data]);

  useEffect(() => {
    if (!currentChapterId) return;
    setExpandedChapters((previous) => {
      if (previous.has(currentChapterId)) return previous;
      const next = new Set(previous);
      next.add(currentChapterId);
      return next;
    });
  }, [currentChapterId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify([...expandedChapters]));
    } catch {
      // localStorage 被禁用时仅放弃持久化，不影响目录操作。
    }
  }, [expandedChapters, storageKey]);

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((previous) => {
      const next = new Set(previous);
      if (next.has(chapterId) && chapterId !== currentChapterId) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  const handleLessonClick = (lessonId: string, chapterId: string) => {
    if (lessonId === data.currentLesson.id || isLessonSwitching) return;
    if (onLessonClick) onLessonClick(lessonId, chapterId);
    else router.push(`/courses/${data.course.id}/chapters/${chapterId}/lessons/${lessonId}`);
  };

  return (
    <div className="flex h-full flex-col">
      <Progress data={data.course} />

      <nav className="relative z-10 flex-1 overflow-auto bg-white" aria-label="课程章节目录" aria-busy={isLessonSwitching}>
        <div className="border-b-2 border-black bg-white px-4 py-3 font-bold">章节目录</div>
        <div className="divide-y-2 divide-black">
          {data.catalog.map((chapter) => {
            const expanded = expandedChapters.has(chapter.id);
            const contentId = `catalog-chapter-${chapter.id}`;
            return (
              <section key={chapter.id}>
                <h2>
                  <button type="button" aria-expanded={expanded} aria-controls={contentId} onClick={() => toggleChapter(chapter.id)} className="flex min-h-12 w-full items-center justify-between bg-gray-200 px-4 py-3 text-left font-bold transition-colors hover:bg-gray-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-purple-600">
                    <span>{chapter.title}</span>
                    <span className="text-xl" aria-hidden="true">{expanded ? '−' : '+'}</span>
                  </button>
                </h2>

                {expanded ? (
                  <div id={contentId} className="bg-white">
                    {chapter.lessons.map((lesson) => {
                      const isActive = lesson.id === data.currentLesson.id;
                      const isCompleted = lesson.status === 2;
                      const isInProgress = lesson.status === 1;
                      const statusLabel = isCompleted ? '已完成' : isActive || isInProgress ? '学习中' : '未开始';
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => handleLessonClick(lesson.id, chapter.id)}
                          disabled={isActive || isLessonSwitching}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex min-h-12 w-full items-center gap-3 border-l-4 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-purple-600 disabled:cursor-default ${
                            isActive ? 'border-yellow-500 bg-yellow-300' : isCompleted ? 'border-green-500 bg-gray-50 hover:bg-green-50' : isInProgress ? 'border-black bg-white hover:bg-gray-50' : 'border-transparent bg-white hover:bg-gray-50'
                          }`}
                        >
                          <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-black text-xs font-black ${isCompleted || isInProgress || isActive ? 'bg-black text-white' : 'bg-white'}`} aria-hidden="true">
                            {isCompleted ? '✓' : isActive || isInProgress ? '▶' : ''}
                          </span>
                          <span className={`min-w-0 flex-1 truncate ${isActive ? 'font-black' : 'font-medium'}`} title={lesson.title}>{lesson.title}</span>
                          <span className="sr-only">{statusLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </nav>
    </div>
  );
});
