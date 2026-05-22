'use client';
import { useState, useEffect } from 'react';
import { getUserCourses } from '@/api/profile';
import { UserCourse } from 'shared/types/profile';
import { LuBookOpen, LuBadgeCheck } from 'react-icons/lu';
import Img from 'next/image';
import { useRouter } from 'next/navigation';
import { courseLevelMap, courseStatusMap } from '@/utils/constants';
import { formatPercentage } from '@/utils/format';

export default function HomeMyCourses() {
  const [courses, setCourses] = useState<UserCourse[]>([]);
  
    const stats = [
      {
        label: '在学习课程',
        value: courses.filter((course) => course.status === 1).length,
        icon: LuBookOpen,
        color: 'bg-yellow-400',
      },
      {
        label: '已完成课程',
        value: courses.filter((course) => course.status === 2).length,
        icon: LuBadgeCheck,
        color: 'bg-green-400',
      },
    ];
    useEffect(() => {
      const fetchCourses = async () => {
        try {
          const res = await getUserCourses();
          if (res.code === 200) {
            setCourses(res.data);
          }
        } catch (err) {
          console.error('获取用户课程失败', err);
        } finally {
        }
      };
      fetchCourses();
    }, []);
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null);
  const router = useRouter();
  const inProgressCourses = courses.filter((course) => course.status === 1);
  const completedCourses = courses.filter((course) => course.status === 2);
  const notStartedCourses = courses.filter((course) => course.status === 0);

  const renderCourseCard = (course: UserCourse) => {
    return (
      <div
        key={`${course.title}-${course.last_learned_at}`}
        className={`relative bg-white border-2 border-black p-4 cursor-pointer transition-all duration-200 ${
          hoveredCourse === course.title
            ? 'translate-x-[4px] translate-y-[4px] shadow-none'
            : 'shadow-[4px_4px_0_0_rgba(0,0,0,1)]'
        }`}
        onMouseEnter={() => setHoveredCourse(course.title)}
        onClick={() => router.push(`/courses/${course.id}`)}
        onMouseLeave={() => setHoveredCourse(null)}
      >
        {/* 难度标签 */}
        <div
          className={`absolute -top-2 -right-2 px-2 py-1 text-xs font-black border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${courseLevelMap[course.level]?.color || 'bg-gray-500 text-white'}`}
        >
          {courseLevelMap[course.level]?.text || '未知'}
        </div>

        {/* 课程封面和标题 */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-20 h-20 bg-gray-100 border-2 border-black flex items-center justify-center">
            <Img
              src={course.cover_url}
              alt={course.title}
              width={80}
              height={80}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <h3 className="font-black text-black text-sm line-clamp-2">
              {course.title}
            </h3>
          </div>
        </div>

        {/* 进度信息 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 font-bold">
            进度{' '}
            {formatPercentage(course.completed_lessons, course.total_lessons)}
          </span>
          <span
            className={`text-xs font-bold px-2 py-0.5 border border-black rounded ${courseStatusMap[course.status]?.color || 'bg-gray-500 text-white'}`}
          >
            {courseStatusMap[course.status]?.text || '未知'}
          </span>
        </div>

        {/* 进度条 */}
        <div className="w-full bg-gray-200 h-2 border-2 border-black rounded overflow-hidden">
          <div
            className={`h-full ${course.status === 2 ? 'bg-green-500' : 'bg-purple-500'} transition-all duration-300`}
            style={{
              width: `${formatPercentage(course.completed_lessons, course.total_lessons)}`,
            }}
          />
        </div>
      </div>
    );
  };

  if (courses.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-xl font-black text-black">Loading courses...</div>
      </div>
    );
  }

  return (
    <section>
      {/* 四项统计数据 */}
      <div className="flex-[2] flex flex-col gap-3">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`${stat.color} border-3 border-black px-4 py-3 shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all duration-150 flex items-center gap-3 min-h-[60px]`}
          >
            <stat.icon className="w-6 h-6 text-black opacity-80 flex-shrink-0" />
            <div>
              <div className="text-xl font-black text-black">{stat.value}</div>
              <div className="text-xs font-bold text-black opacity-80">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-8">
        {/* 进行中 */}
        {inProgressCourses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-yellow-500 border-2 border-black rounded-full" />
              <h3 className="text-lg font-black text-black">进行中</h3>
              <span className="text-sm text-gray-500">
                ({inProgressCourses.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressCourses.map(renderCourseCard)}
            </div>
          </div>
        )}

        {/* 已完成 */}
        {completedCourses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-green-500 border-2 border-black rounded-full" />
              <h3 className="text-lg font-black text-black">已完成</h3>
              <span className="text-sm text-gray-500">
                ({completedCourses.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedCourses.map(renderCourseCard)}
            </div>
          </div>
        )}

        {/* 未开始 */}
        {notStartedCourses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-gray-500 border-2 border-black rounded-full" />
              <h3 className="text-lg font-black text-black">未开始</h3>
              <span className="text-sm text-gray-500">
                ({notStartedCourses.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {notStartedCourses.map(renderCourseCard)}
            </div>
          </div>
        )}

        {/* 无课程提示 */}
        {courses.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">暂无课程</div>
          </div>
        )}
      </div>
    </section>
  );
}
