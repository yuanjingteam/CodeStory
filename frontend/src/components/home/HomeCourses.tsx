'use client';
import { useState, useEffect } from 'react';
import type { HomeCourse } from '@/types/home';
import { getHomeCourses } from '@/api/home';
import Img from 'next/image';
import { useRouter } from 'next/navigation';
import { courseLevelMap } from '@/utils/constants';
import { LuArrowRight } from 'react-icons/lu';
import { FiUsers } from 'react-icons/fi';
import ErrorDataCard from '@/components/common/ErrorDataCard';
export default function HomeCourses() {
  const [homeCourses, setHomeCourses] = useState<HomeCourse[]>([]);
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await getHomeCourses();
        setHomeCourses(res.data);
      } catch (err) {
        console.error('获取热门课程失败', err);
      }
    };
    fetchCourses();
  }, []);

  return (
    <section className="w-full mx-8 my-10 bg-white border-2 border-gray-300 rounded-sm  mx-auto">
      <div className="flex p-4  items-center justify-between mb-4 border-b-2 border-gray-300">
        <h2 className="text-xl font-black text-black">热门课程</h2>
        <button
          className="flex items-center gap-1 text-purple-600 font-bold hover:underline text-sm"
          onClick={() => router.push('/courses')}
        >
          查看全部 <LuArrowRight className="w-4 h-4" />
        </button>
      </div>
      {/* 课程列表 */}
      {homeCourses.length > 0 ? (
        <div className="px-6 py-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {homeCourses.map((course) => (
            <div
              key={course.id}
              className={`relative rounded-xl bg-white border-2 border-black p-4 cursor-pointer transition-all duration-200 ${
                hoveredCourse === course.id
                  ? 'translate-x-[4px] translate-y-[4px] shadow-none'
                  : 'shadow-[2px_2px_0_0_rgba(0,0,0,1)]'
              }`}
              onMouseEnter={() => setHoveredCourse(course.id)}
              onClick={() => router.push(`/courses/${course.id}`)}
              onMouseLeave={() => setHoveredCourse(null)}
            >
              <div
                className={`absolute -top-2 -right-2 px-2 py-1 text-xs font-black text-white border-2 border-black  ${courseLevelMap[course.level]?.color || 'bg-gray-500 text-gray-700'}`}
              >
                {courseLevelMap[course.level]?.text || '未知'}
              </div>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-20 h-20 bg-gray-100 border-2 border-black flex items-center justify-center">
                  <Img
                    src={course.cover_url}
                    alt={course.title}
                    width={50}
                    height={50}
                    className="w-full h-full"
                    unoptimized
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between min-h-[80px]">
                  <div>
                    <h3 className="font-black text-black text-sm">
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {course.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 font-bold">
                    <FiUsers className="w-4 h-4" />{' '}
                    {`${course.study_count}人学习`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ErrorDataCard title="暂无数据" description="当前没有可展示的信息" />
      )}
    </section>
  );
}
