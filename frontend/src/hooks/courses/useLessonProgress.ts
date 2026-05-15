'use client';

import type { Chapter, LessonItem } from '@/types/lesson-detail';

const STORAGE_KEY = 'lessonProgress';

export function useLessonProgress() {
  const getStoredProgress = (): Record<string, boolean> => {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  };

  const saveProgress = (lessonId: string) => {
    if (typeof window === 'undefined') return;
    const progress = getStoredProgress();
    progress[lessonId] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  };

  const applyProgressToCatalog = (catalog: Chapter[]): Chapter[] => {
    const progress = getStoredProgress();
    return catalog.map(chapter => ({
      ...chapter,
      lessons: chapter.lessons.map(lesson => {
        if (progress[lesson.id] && lesson.status !== 2) {
          return { ...lesson, status: 2 as const };
        }
        return lesson;
      })
    }));
  };

  const isLessonCompleted = (lessonId: string): boolean => {
    const progress = getStoredProgress();
    return !!progress[lessonId];
  };

  const clearProgress = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    saveProgress,
    applyProgressToCatalog,
    isLessonCompleted,
    clearProgress,
  };
}
