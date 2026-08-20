'use client';
import { useState, useEffect } from 'react';
import { getHomeStats } from '@/api/home';
import type { HomeData } from '@/types/home';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LuBot } from 'react-icons/lu';
import HeroIllustration from '@/components/home/HeroIllustration';
import { useUserStore } from '@/store/useUserStore';
import { getStartLearningCourse } from '@/api/home';
import Button from '@/components/ui/Button';

export default function HomeHero() {
  const [homeStats, setHomeStats] = useState<HomeData>({
    course_count: 0,
    lesson_count: 0,
    completion_rate: 0,
    user_count: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  const fetchHomeStats = async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const res = await getHomeStats();
      if (res.code === 200 && res.data) {
        setHomeStats(res.data);
      } else {
        setStatsError(true);
      }
    } catch (error) {
      console.error('获取首页统计失败:', error);
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getHomeStats()
      .then((res) => {
        if (!active) return;
        if (res.code === 200 && res.data) {
          setHomeStats(res.data);
        } else {
          setStatsError(true);
        }
      })
      .catch((error) => {
        if (!active) return;
        console.error('获取首页统计失败:', error);
        setStatsError(true);
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const statsList = [
    {
      value: `${homeStats.course_count}+`,
      label: '精品课程',
      color: 'bg-green-500',
    },
    {
      value: `${homeStats.lesson_count}+`,
      label: '学习小节',
      color: 'bg-purple-500',
    },
    {
      value: `${homeStats.completion_rate}%`,
      label: '学习完成率',
      color: 'bg-yellow-500',
    },
    {
      value: `${homeStats.user_count}+`,
      label: '注册用户',
      color: 'bg-blue-500 text-black',
    },
  ];

  const router = useRouter();
  const { user } = useUserStore();
  const startLearning = async () => {
    if (!user) {
      return router.push('/courses');
    }
    if (starting) return;
    setStarting(true);
    setStartError('');
    try {
      const res = await getStartLearningCourse();
      router.push(res.data.path ?? '/courses');
    } catch (error) {
      console.error('获取开始学习课程失败:', error);
      setStartError('暂时无法进入课程，请稍后重试。');
    } finally {
      setStarting(false);
    }
  };
  return (
    <section className="relative z-10 mb-4 overflow-x-clip bg-white pt-8">
      <div className="absolute z-[-1] top-10 left-10 w-32 h-32 bg-purple-200 rounded-full opacity-50" />
      <div className="absolute z-[-1] bottom-20 right-20 w-48 h-48 bg-green-200 rounded-full opacity-30" />
      <div className="absolute z-[-1] top-1/2 left-1/4 w-20 h-20 bg-yellow-200 rounded-full opacity-40" />

      <div className="px-4 md:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-black bg-purple-100 px-4 py-2 text-purple-700 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
              <LuBot className="w-5 h-5" />
              <span className="text-sm font-semibold ">AI 驱动</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-black text-black mb-4">
              AI 驱动的编程学习平台
            </h1>

            <p className="text-lg text-gray-600 mb-8">
              与 AI 学习助手一起学习编程，边学边练，快速掌握核心技能
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                onClick={() => void startLearning()}
                loading={starting}
                loadingText="正在进入..."
                aria-describedby={startError ? 'start-learning-error' : undefined}
                className="min-h-12 px-8 text-lg sm:min-w-40"
                variant="primary"
              >
                开始学习
              </Button>
              <Link
                href="/courses"
                className="inline-flex min-h-12 cursor-pointer items-center justify-center border-2 border-zinc-950 bg-zinc-100 px-8 text-lg font-bold text-zinc-950 shadow-[3px_3px_0_0_#18181b] transition-[transform,box-shadow,background-color] duration-150 hover:bg-white active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none sm:min-w-40"
              >
                探索课程
              </Link>
            </div>
            {startError ? (
              <p id="start-learning-error" className="mt-3 text-sm font-bold text-red-700" role="alert">
                {startError}
              </p>
            ) : null}
          </div>

          {/* Right illustration */}
          <div className="flex-1 relative">
            <HeroIllustration />
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="px-4 py-8 md:px-6">
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" role="status">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-24 animate-pulse border-2 border-black bg-zinc-100 motion-reduce:animate-none" />
            ))}
            <span className="sr-only">正在加载平台统计...</span>
          </div>
        ) : statsError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-red-600 bg-red-50 p-4" role="alert">
            <p className="font-bold text-red-800">平台统计暂时无法加载。</p>
            <Button size="sm" onClick={() => void fetchHomeStats()}>重试</Button>
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statsList.map((stat) => (
            <div
              key={stat.label}
              className={`${stat.color} border-2 border-black p-4 text-center text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]`}
            >
              <div className="text-3xl font-black">{stat.value}</div>
              <div className="text-sm font-bold">{stat.label}</div>
            </div>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
