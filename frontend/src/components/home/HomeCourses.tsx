'use client';
import { useState, useEffect } from 'react';
import type { HomeCourse } from '@/types/home';
import { getHomeCourses } from '@/api/home';
import Img from 'next/image';
import Link from 'next/link';
import { courseLevelMap } from '@/utils/constants';
import { LuArrowRight } from 'react-icons/lu';
import { FiUsers } from 'react-icons/fi';
import ErrorDataCard from '@/components/common/ErrorDataCard';
export default function HomeCourses() {
  const [homeCourses, setHomeCourses] = useState<HomeCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await getHomeCourses();
        setHomeCourses(res.data || []);
      } catch (err) {
        console.error('获取热门课程失败', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    void fetchCourses();
  }, [reloadKey]);

  return (
    <section className="my-8 w-full border-2 border-black bg-white md:my-10">
      <div className="flex p-4  items-center justify-between mb-4 border-b-2 border-gray-300">
        <h2 className="text-xl font-black text-black">热门课程</h2>
        <Link
          className="flex min-h-10 cursor-pointer items-center gap-1 text-sm font-bold text-purple-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2"
          href="/courses"
        >
          查看全部 <LuArrowRight className="w-4 h-4" />
        </Link>
      </div>
      {/* 课程列表 */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4" role="status">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse border-2 border-black bg-zinc-100 motion-reduce:animate-none" />
          ))}
          <span className="sr-only">正在加载热门课程...</span>
        </div>
      ) : error ? (
        <ErrorDataCard
          variant="error"
          title="热门课程加载失败"
          description="暂时无法获取课程，请稍后重试。"
          action={<button type="button" className="cursor-pointer font-bold underline underline-offset-4" onClick={() => setReloadKey((key) => key + 1)}>重试</button>}
        />
      ) : homeCourses.length > 0 ? (
        <div className="px-6 py-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {homeCourses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="relative cursor-pointer rounded-xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#18181b] transition-[transform,box-shadow,background-color] hover:bg-white hover:shadow-[5px_5px_0_0_#18181b] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
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
            </Link>
          ))}
        </div>
      ) : (
        <ErrorDataCard title="暂无数据" description="当前没有可展示的信息" />
      )}
    </section>
  );
}
