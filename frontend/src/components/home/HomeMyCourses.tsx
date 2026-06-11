'use client';
import { useState, useEffect } from 'react';
import { getUserCourses } from '@/api/profile';
import type { UserCourse } from '@/types/profile';
import { LuBookOpen, LuBadgeCheck, LuBadgeX, LuPlus } from 'react-icons/lu';
import Img from 'next/image';
import { useRouter } from 'next/navigation';
import { formatPercentage } from '@/utils/format';
import ErrorDataCard from '@/components/common/ErrorDataCard';
import { useUserStore } from '@/store/useUserStore';

export default function HomeMyCourses() {
  const { isLoggedIn, isLoading } = useUserStore();
  const [courses, setCourses] = useState<UserCourse[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!isLoggedIn || isLoading) return;
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await getUserCourses();
        if (res.code === 200) {
          setCourses(res.data || []);
        }
      } catch (err) {
        console.error('获取用户课程失败', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const router = useRouter();
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
      <div
        key={`${course.id}-${course.last_learned_at}`}
        onClick={() => router.push(`/courses/${course.id}`)}
        className="group flex items-center gap-4 p-4 rounded-xl bg-white border-2 border-gray-200 hover:shadow-lg hover:border-blue-300 hover:border-2 transition-all  cursor-pointer"
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/courses/${course.id}`);
          }}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition-colors flex-shrink-0 shadow-sm"
        >
          {course.status === 2 ? '查看' : '继续学习'}
        </button>
      </div>
    );
  };

  const renderEllipsisCard = () => (
    <div
      onClick={() => router.push('/courses')}
      className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
    >
      <LuPlus className="w-5 h-5 text-gray-400" />
      <span className="text-sm text-gray-500">探索更多课程，开启学习之旅</span>
    </div>
  );

  const getEllipsisCount = (courseCount: number) => {
    if (courseCount >= maxCourses) return 0;
    return maxCourses - courseCount;
  };

  if (loading && isLoggedIn) {
    return (
      <section className="flex-1 h-[280px] flex items-center justify-center">
        <div className="text-lg font-black text-gray-500">加载中...</div>
      </section>
    );
  }
  const displayCourses = [
    ...inProgressCourses.slice(0, maxCourses),
    ...completedCourses.slice(
      0,
      Math.max(0, maxCourses - inProgressCourses.length)
    ),
  ];

  return (
    <section className="flex-1 h-[350px] flex flex-col border-2 border-gray-200 rounded-sm px-6 pt-6">
      {/* 标题行 */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-purple-500 rounded-full" />
          <h2 className="text-xl font-bold text-gray-900">我的学习</h2>
        </div>
        {/* 统计信息 */}
        <div className="flex items-center gap-4">
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
      {courses.length > 0 && isLoggedIn ? (
        <div className="flex-1 overflow-hidden border-gray-200">
          <style>{`
          .scrollbar-hidden::-webkit-scrollbar {
            display: none;
          }
        `}</style>
          <div
            className="h-full flex flex-col gap-5 pt-3 overflow-y-auto scrollbar-hidden"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {displayCourses.map(renderCourseCard)}
            {Array(getEllipsisCount(displayCourses.length))
              .fill(0)
              .map((_, index) => (
                <div key={`ellipsis-${index}`}>{renderEllipsisCard()}</div>
              ))}
          </div>
        </div>
      ) : (
        <ErrorDataCard title="暂无数据" description="当前没有可展示的信息" />
      )}
    </section>
  );
}
