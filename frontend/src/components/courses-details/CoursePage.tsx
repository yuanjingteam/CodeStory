'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BsBook, BsChevronDown } from 'react-icons/bs';
import { courseDetailApi } from '@/app/api/courses/course-detail';
import type { CourseDetailData, Chapter } from '@/types/course-detail';
import { courseLevelMap } from '@/utils/constants';
import { useUserStore } from '@/store/useUserStore';

type LoadError = 'not-found' | 'request' | null;

export default function CourseDetails({ courseId }: { courseId: string }) {
  const { isLoggedIn, isLoading } = useUserStore();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError>(null);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      router.replace('/auth/login');
      return;
    }

    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setError(null);
      }
    });
    courseDetailApi
      .getById(courseId, controller.signal)
      .then((response) => setCourse(response))
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          axios.isAxiosError(requestError) && requestError.response?.status === 404
            ? 'not-found'
            : 'request'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [courseId, isLoading, isLoggedIn, retryVersion, router]);

  if (loading && !course) {
    return (
      <section className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6" aria-busy="true" aria-label="课程详情加载中">
        <div className="h-32 animate-pulse border-2 border-black bg-gray-100 motion-reduce:animate-none" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-24 animate-pulse border-2 border-black bg-gray-100 motion-reduce:animate-none" />)}
        </div>
      </section>
    );
  }

  if (error || !course) {
    const notFound = error === 'not-found';
    return (
      <section className="mx-auto w-full max-w-[900px] px-4 py-16 sm:px-6">
        <div role="alert" className="border-2 border-black bg-white p-8 text-center shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <h1 className="text-2xl font-black">{notFound ? '课程不存在' : '课程加载失败'}</h1>
          <p className="mt-2 text-gray-600">{notFound ? '该课程可能已下架或链接有误。' : '请检查网络后重新加载。'}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!notFound ? <button type="button" onClick={() => setRetryVersion((value) => value + 1)} className="min-h-11 border-2 border-black bg-yellow-300 px-5 font-bold shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">重新加载</button> : null}
            <Link href="/courses" className="inline-flex min-h-11 items-center border-2 border-black bg-white px-5 font-bold shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600">返回课程列表</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8" aria-busy={loading}>
      <header className="mb-8 flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
        <div className="min-w-0">
          <h1 className="mb-2 text-3xl font-black sm:text-4xl">{course.title}</h1>
          <p className="max-w-3xl leading-relaxed text-gray-600">{course.description}</p>
        </div>
        <Link href="/courses" className="inline-flex min-h-11 shrink-0 items-center border-2 border-black bg-purple-600 px-4 py-2 font-bold text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300">
          返回课程列表
        </Link>
      </header>

      <dl className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat value={course.chapterCount} label="章节" color="bg-blue-50" />
        <Stat value={course.lessonCount} label="小节" color="bg-green-50" />
        <Stat value={`${course.estimatedTotalTime} 分钟`} label="预计总时长" color="bg-purple-50" />
      </dl>

      <div>
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-black"><BsBook aria-hidden="true" />课程大纲</h2>
        {course.chapters.length > 0 ? (
          <div className="space-y-4">
            {course.chapters.map((chapter) => <ChapterItem key={chapter.id} chapter={chapter} courseId={course.id} />)}
          </div>
        ) : (
          <div className="border-2 border-black bg-yellow-50 p-8 text-center font-bold">课程内容正在准备中</div>
        )}
      </div>
    </section>
  );
}

function Stat({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className={`${color} border-2 border-black p-4 shadow-[2px_2px_0_0_rgba(0,0,0,1)]`}>
      <dd className="text-2xl font-black">{value}</dd>
      <dt className="text-sm text-gray-600">{label}</dt>
    </div>
  );
}

function ChapterItem({ chapter, courseId }: { chapter: Chapter; courseId: string }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const contentId = `chapter-${chapter.id}-lessons`;

  return (
    <section className="border-2 border-black bg-white shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
      <h3>
        <button type="button" aria-expanded={isExpanded} aria-controls={contentId} onClick={() => setIsExpanded((expanded) => !expanded)} className="flex min-h-14 w-full items-center justify-between gap-4 bg-purple-100 p-4 text-left transition-colors hover:bg-purple-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-purple-600">
          <span>
            <span className="block text-lg font-black">{chapter.title}</span>
            <span className="text-sm font-medium text-gray-600">{chapter.lessonCount} 小节</span>
          </span>
          <BsChevronDown aria-hidden="true" className={`shrink-0 text-xl transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </h3>

      {isExpanded ? (
        <div id={contentId} className="divide-y-2 divide-black">
          {chapter.lessons.length > 0 ? chapter.lessons.map((lesson) => {
            const difficulty = courseLevelMap[lesson.difficulty] || { text: '未知', color: 'bg-gray-300' };
            return (
              <Link key={lesson.id} href={`/courses/${courseId}/chapters/${chapter.id}/lessons/${lesson.id}`} className="flex min-h-14 items-center justify-between gap-4 p-4 transition-[background-color,box-shadow] hover:bg-white hover:shadow-[inset_4px_0_0_0_#18181b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-purple-600">
                <span className="min-w-0 truncate font-bold">{lesson.title}</span>
                <span className={`${difficulty.color} shrink-0 border-2 border-black px-3 py-1 text-xs font-bold`}>{difficulty.text}</span>
              </Link>
            );
          }) : <p className="p-4 text-gray-600">本章暂无小节</p>}
        </div>
      ) : null}
    </section>
  );
}
