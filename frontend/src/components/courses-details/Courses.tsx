'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import courseApi from '@/app/api/courses/courses';
import type { Course, CourseListRequest } from '@/types/course';
import { BsArrowClockwise, BsPersonFill, BsSearch } from 'react-icons/bs';
import { courseLevelMap, courseStatusMap } from '@/utils/constants';

const PAGE_SIZE = 12;

const levelMap = { 全部难度: undefined, 初级: 0, 中级: 1, 高级: 2 };
const learnStatusMap = { 全部状态: undefined, 未开始: 0, 进行中: 1, 已完成: 2 };
const studentCountRangeMap: Record<string, { min?: number; max?: number }> = {
  全部人数: {},
  '1-50 人': { min: 1, max: 50 },
  '51-200 人': { min: 51, max: 200 },
  '201-500 人': { min: 201, max: 500 },
  '501-1000 人': { min: 501, max: 1000 },
  '1000+ 人': { min: 1001 },
};

interface CourseQuery {
  keyword: string;
  level: string;
  status: string;
  studentRange: string;
}

const defaultCourseQuery: CourseQuery = {
  keyword: '',
  level: '全部难度',
  status: '全部状态',
  studentRange: '全部人数',
};

const buildCourseListRequest = (query: CourseQuery, page: number): CourseListRequest => {
  const range = studentCountRangeMap[query.studentRange];
  return {
    keyword: query.keyword || undefined,
    level: levelMap[query.level as keyof typeof levelMap],
    learnStatus: learnStatusMap[query.status as keyof typeof learnStatusMap],
    minStudentCount: range.min,
    maxStudentCount: range.max,
    page,
    size: PAGE_SIZE,
  };
};

const getLevelNumber = (level: string | number): number => {
  if (typeof level === 'number') return level;
  const parsed = Number.parseInt(level, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getLearnStatus = (status: number | undefined, progress: number | undefined): number => {
  if (progress !== undefined && progress >= 100) return 2;
  if (status === undefined) return 0;
  return status >= 2 ? 2 : status;
};

export default function CoursesSection() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryVersion, setRetryVersion] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState<CourseQuery>(defaultCourseQuery);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setError('');
      }
    });
    courseApi
      .getList(buildCourseListRequest(query, page))
      .then((response) => {
        if (cancelled) return;
        setCourses(response.records || []);
        setTotal(response.total || 0);
      })
      .catch(() => {
        if (!cancelled) setError('课程加载失败，请检查网络后重试。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, query, retryVersion]);

  const updateFilter = (field: keyof CourseQuery, value: string) => {
    setPage(1);
    setQuery((current) => ({ ...current, [field]: value }));
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateFilter('keyword', searchTerm.trim());
  };

  const handleReset = () => {
    setSearchTerm('');
    setPage(1);
    setQuery({ ...defaultCourseQuery });
  };

  return (
    <section className="relative z-10 mx-auto w-full max-w-[1400px] bg-white px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-black">全部课程</h1>
        <p className="text-gray-600">选择你感兴趣的课程，开始学习之旅</p>
      </header>

      <form className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(150px,1fr))_minmax(280px,1.6fr)]" onSubmit={handleSearch} role="search">
        <FilterSelect label="课程难度" value={query.level} options={Object.keys(levelMap)} onChange={(value) => updateFilter('level', value)} />
        <FilterSelect label="学习状态" value={query.status} options={Object.keys(learnStatusMap)} onChange={(value) => updateFilter('status', value)} />
        <FilterSelect label="学习人数" value={query.studentRange} options={Object.keys(studentCountRangeMap)} onChange={(value) => updateFilter('studentRange', value)} />

        <div className="grid gap-2 font-bold">
          <label htmlFor="course-search">搜索课程</label>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
            <input id="course-search" type="search" placeholder="输入课程名称" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="min-h-11 min-w-0 rounded-lg border-2 border-black bg-white px-4 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600" />
            <button type="submit" aria-label="搜索课程" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border-2 border-black bg-purple-600 px-3 text-white shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300">
              <BsSearch aria-hidden="true" />
            </button>
            <button type="button" onClick={handleReset} className="inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-black bg-white px-3 shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600">
              <BsArrowClockwise aria-hidden="true" /><span className="hidden sm:inline">重置</span>
            </button>
          </div>
        </div>
      </form>

      <div aria-busy={loading} aria-live="polite">
        {error ? (
          <div role="alert" className="mb-6 flex flex-col items-start justify-between gap-3 border-2 border-black bg-red-50 p-4 sm:flex-row sm:items-center">
            <p className="font-bold text-red-800">{error}</p>
            <button type="button" onClick={() => setRetryVersion((current) => current + 1)} className="min-h-11 border-2 border-black bg-white px-4 font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700">重新加载</button>
          </div>
        ) : null}

        {loading && courses.length === 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="课程加载中">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-80 animate-pulse rounded-xl border-2 border-black bg-gray-100 motion-reduce:animate-none" />)}
          </div>
        ) : null}

        {courses.length > 0 ? (
          <div className={`grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            {courses.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        ) : null}

        {!loading && !error && courses.length === 0 ? (
          <div className="border-2 border-black bg-yellow-50 px-4 py-16 text-center">
            <h2 className="text-2xl font-black">没有找到匹配的课程</h2>
            <p className="mt-2 text-gray-600">调整筛选条件或清空搜索内容后再试。</p>
            <button type="button" onClick={handleReset} className="mt-5 min-h-11 border-2 border-black bg-white px-5 font-bold shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600">清空筛选</button>
          </div>
        ) : null}
      </div>

      {!error && totalPages > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-3" aria-label="课程分页">
          <button type="button" disabled={page === 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="min-h-11 border-2 border-black bg-white px-4 font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none">上一页</button>
          <span className="px-2 font-bold" aria-current="page">第 {page} / {totalPages} 页</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="min-h-11 border-2 border-black bg-white px-4 font-bold shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none">下一页</button>
        </nav>
      ) : null}
    </section>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 font-bold">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-lg border-2 border-black bg-white px-4 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function CourseCard({ course }: { course: Course }) {
  const levelConfig = courseLevelMap[getLevelNumber(course.level)] || { text: '未知', color: 'bg-gray-300' };
  const learnStatus = getLearnStatus(course.learnStatus, course.progress);
  const statusConfig = courseStatusMap[learnStatus] || courseStatusMap[0];
  const progress = Math.min(Math.max(course.progress || 0, 0), 100);

  return (
    <Link href={`/courses/${course.id}`} className="group flex min-h-80 flex-col overflow-hidden rounded-xl border-2 border-black bg-white shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-600 motion-reduce:transition-none">
      <div className="relative h-40 w-full shrink-0 overflow-hidden border-b-2 border-black bg-purple-100">
        {course.cover_url ? <Image src={course.cover_url} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw" className="object-cover transition-transform group-hover:scale-[1.02] motion-reduce:transition-none" /> : <div className="flex h-full items-center justify-center font-mono text-5xl font-black" aria-hidden="true">{'</>'}</div>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="mb-1 line-clamp-1 text-xl font-black" title={course.title}>{course.title}</h2>
        <p className="mb-4 line-clamp-2 text-sm text-gray-600">{course.description}</p>
        <div className="mt-auto space-y-3">
          {course.progress !== undefined ? (
            <div className="flex items-center gap-2">
              <div className="h-3 flex-1 overflow-hidden border-2 border-black bg-gray-200" role="progressbar" aria-label={`${course.title}学习进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <div className={`h-full ${learnStatus === 2 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-bold">{progress}%</span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`${levelConfig.color} border-2 border-black px-2 py-1 text-xs font-bold`}>{levelConfig.text}</span>
            <span className={`${statusConfig.color} border-2 border-black px-2 py-1 text-xs font-bold`}>{statusConfig.text}</span>
          </div>
          {course.studentCount !== undefined ? <span className="flex items-center justify-end gap-1 text-xs font-bold text-gray-600"><BsPersonFill aria-hidden="true" />{course.studentCount.toLocaleString()} 人学习</span> : null}
        </div>
      </div>
    </Link>
  );
}
