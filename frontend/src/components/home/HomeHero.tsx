'use client';
import { useRouter } from 'next/navigation';
import { LuBot } from 'react-icons/lu';
import HeroIllustration from '@/components/home/HeroIllustration';
import { useUserStore } from '@/store/useUserStore';
import { getStartLearningCourse } from '@/api/home';

export default function HomeHero() {
  const stats = [
    { value: '50+', label: '精品课程', color: 'bg-green-500' },
    { value: '1200+', label: '学习小节', color: 'bg-purple-500' },
    { value: '85%', label: '学习完成率', color: 'bg-yellow-500' },
    { value: '30K+', label: '注册用户', color: 'bg-blue-500 text-black' },
  ];
  const router = useRouter();
  const { user } = useUserStore();
  const startLearning = async () => {
    if (!user) {
      return router.push('/courses');
    }
    try {
      const res = await getStartLearningCourse();
      router.push(res.data.path ?? '/courses');
    } catch (error) {
      console.error('获取开始学习课程失败:', error);
    } 
  };
  return (
    <section
      className="  
        bg-white 
        py-8
        transition-all duration-150 
        relative z-10
      "
    >
      <div className="absolute z-[-1] top-10 left-10 w-32 h-32 bg-purple-200 rounded-full opacity-50" />
      <div className="absolute z-[-1] bottom-20 right-20 w-48 h-48 bg-green-200 rounded-full opacity-30" />
      <div className="absolute z-[-1] top-1/2 left-1/4 w-20 h-20 bg-yellow-200 rounded-full opacity-40" />

      <div className="px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full mb-6 border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-[4px] hover:shadow-none transition-all duration-200">
              <LuBot className="w-5 h-5" />
              <span className="text-sm font-semibold ">AI 驱动</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-black text-black mb-4">
              AI 驱动的编程学习平台
            </h1>

            <p className="text-lg text-gray-600 mb-8">
              与 AI Agent 一起学习编程，边学边练，快速掌握核心技能
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={startLearning}
                className="px-8 py-3 bg-purple-500 text-white font-bold text-lg border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
              >
                开始学习
              </button>
              <button
                onClick={() => router.push('/courses')}
                className="px-8 py-3 bg-white text-black font-bold text-lg border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
              >
                探索课程
              </button>
            </div>
          </div>

          {/* Right illustration */}
          <div className="flex-1 relative">
            <HeroIllustration />
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="px-8 py-8 ">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`${stat.color} text-white p-4 border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] text-center hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200`}
            >
              <div className="text-3xl font-black">{stat.value}</div>
              <div className="text-sm font-bold">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
