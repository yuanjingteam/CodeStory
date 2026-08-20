'use client';
import { useState, useEffect } from 'react';
import { getUserCourses } from '@/api/profile';
import type { UserCourse } from '@/types/profile';
import { LuBookOpen, LuBadgeCheck, LuBadgeX, LuPlus } from 'react-icons/lu';
import Img from 'next/image';
import Link from 'next/link';
import { formatPercentage } from '@/utils/format';
import ErrorDataCard from '@/components/common/ErrorDataCard';
import { useUserStore } from '@/store/useUserStore';

export default function HomeMyCourses() {
  const { isLoggedIn, isLoading } = useUserStore();
  const [courses, setCourses] = useState<UserCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) return;
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await getUserCourses();
        if (res.code === 200) {
          setCourses(res.data || []);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('获取用户课程失败', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [isLoading, isLoggedIn, reloadKey]);

  const inProgressCourses = courses.filter((course) => course.status === 1);
  const completedCourses = courses.filter((course) => course.status === 2);
  const noStartCourses = courses.filter((course) => course.status === 0);
  const maxCourses = 5;

  const renderCourseCard = (course: UserCourse) => {
    const progress = formatPercentage(
      course.completed_lessons,
      course.total_lessons
    );

    return (
      <Link
        key={`${course.id}-${course.last_learned_at}`}
        href={`/courses/${course.id}`}
        className="group flex cursor-pointer items-center gap-3 border-2 border-black bg-white p-3 shadow-[3px_3px_0_0_#18181b] transition-[transform,box-shadow,background-color] hover:bg-white hover:shadow-[5px_5px_0_0_#18181b] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none sm:gap-4 sm:p-4"
      >
        <div className="relative w-20 h-20 flex-shrink-0">
          {course.cover_url ? (
            <Img
              src={course.cover_url}
              alt={course.title}
              fill
              className="w-full h-full object-cover rounded-lg"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
              <LuBookOpen className="w-8 h-8 text-white" />
            </div>
          )}
        </div>

        {/* 课程信息 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 truncate">
            {course.title || '无标题课程'}
          </h3>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>进度 {progress}</span>
              <span>
                {course.completed_lessons}/{course.total_lessons} 节课
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  course.status === 2 ? 'bg-green-500' : 'bg-purple-500'
                }`}
                style={{ width: progress }}
              />
            </div>
          </div>
        </div>

        {/* 继续学习按钮 */}
        <span
          className="hidden shrink-0 border-2 border-black bg-yellow-300 px-3 py-2 text-sm font-bold text-black sm:inline-flex"
        >
          {course.status === 0
            ? '开始学习'
            : course.status === 2
              ? '查看'
              : '继续学习'}
        </span>
      </Link>
    );
  };

  const renderEllipsisCard = () => (
    <Link
      href="/courses"
      className="flex min-h-12 cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-black bg-zinc-50 p-4 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2"
    >
      <LuPlus className="w-5 h-5 text-gray-400" />
      <span className="text-sm text-gray-500">探索更多课程，开启学习之旅</span>
    </Link>
  );

  if (loading && isLoggedIn) {
    return (
      <section className="flex min-h-72 flex-1 flex-col gap-4 border-2 border-zinc-300 p-6" role="status">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-20 animate-pulse border-2 border-black bg-zinc-100 motion-reduce:animate-none" />
        ))}
        <span className="sr-only">正在加载我的课程...</span>
      </section>
    );
  }
  const displayCourses = [
    ...inProgressCourses,
    ...completedCourses,
    ...noStartCourses,
  ].slice(0, maxCourses);

  return (
    <section className="flex min-h-96 min-w-0 flex-1 flex-col border-2 border-black px-4 pt-5 sm:px-6 sm:pt-6 lg:max-h-[430px]">
      {/* 标题行 */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-purple-500 rounded-full" />
          <h2 className="text-xl font-bold text-gray-900">我的学习</h2>
        </div>
        {/* 统计信息 */}
        <div className="hidden items-center gap-4 sm:flex">
          <div className="flex items-center gap-1.5 text-sm">
            <LuBookOpen className="w-4 h-4 text-yellow-500" />
            <span className="font-medium text-gray-600">学习中</span>
            <span className="font-bold text-gray-900">
              {inProgressCourses.length || 0}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <LuBadgeCheck className="w-4 h-4 text-green-500" />
            <span className="font-medium text-gray-600">已学完</span>
            <span className="font-bold text-gray-900">
              {completedCourses.length || 0}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <LuBadgeX className="w-4 h-4 text-red-500" />
            <span className="font-medium text-gray-600">未学习</span>
            <span className="font-bold text-gray-900">
              {noStartCourses.length || 0}
            </span>
          </div>
        </div>
      </div>

      {/* 课程列表 */}
      {error ? (
        <ErrorDataCard
          variant="error"
          title="课程加载失败"
          description="暂时无法获取你的学习课程，请稍后重试。"
          action={<button type="button" className="cursor-pointer font-bold underline underline-offset-4" onClick={() => setReloadKey((key) => key + 1)}>重试</button>}
        />
      ) : courses.length > 0 && isLoggedIn ? (
        <div className="min-h-0 flex-1 overflow-hidden border-gray-200">
          <div
            className="flex h-full flex-col gap-4 overflow-y-auto py-3 pr-1"
          >
            {displayCourses.map(renderCourseCard)}
            {displayCourses.length < maxCourses ? renderEllipsisCard() : null}
          </div>
        </div>
      ) : (
        <ErrorDataCard
          variant={isLoggedIn ? 'empty' : 'auth'}
          title={isLoggedIn ? '还没有学习课程' : '登录后查看学习进度'}
          description={isLoggedIn ? '从课程列表选择一门课程，开始你的学习。' : '登录后可以继续上次的课程并查看完成进度。'}
          action={<Link href={isLoggedIn ? '/courses' : '/auth/login'} className="font-bold underline underline-offset-4">{isLoggedIn ? '探索课程' : '去登录'}</Link>}
        />
      )}
    </section>
  );
}
