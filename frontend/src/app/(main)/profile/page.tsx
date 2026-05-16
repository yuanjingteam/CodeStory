'use client';
import { useUserStore } from '@/store/useUserStore';
import {
  LuUser,
  LuMail,
  LuAward,
  LuBookOpen,
  LuStar,
  LuUpload,
} from 'react-icons/lu';

export default function ProfilePage() {
  const { user } = useUserStore();


  const stats = [
    {
      label: '已完成课程',
      value: '12',
      icon: LuBookOpen,
      color: 'bg-green-400',
    },
    { label: '学习进度', value: '78%', icon: LuStar, color: 'bg-purple-400' },
    { label: '获得成就', value: '8', icon: LuAward, color: 'bg-yellow-400' },
    { label: '学习天数', value: '45', icon: LuUser, color: 'bg-blue-400' },
  ];

  const recentCourses = [
    { id: 1, title: 'React 高级进阶', progress: 65, status: 'learning' },
    { id: 2, title: 'TypeScript 实战', progress: 100, status: 'done' },
    { id: 3, title: 'Node.js 后端开发', progress: 30, status: 'paused' },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-500 text-white';
      case 'paused':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'done':
        return 'DONE';
      case 'paused':
        return 'PAUSE';
      default:
        return 'LEARNING';
    }
  };

  return (
   


      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-black">MY PROFILE</h1>
            <p className="text-gray-600 mt-1">管理你的学习进度和个人信息</p>
          </div>
        </div>
        {/* Profile Card */}
        <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)] mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* Avatar */}
            <div className="relative">
              <div className="w-28 h-28 bg-purple-100 border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                <LuUser className="w-14 h-14 text-purple-600" />
              </div>
              <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-400 border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all duration-150">
                <LuUpload className="w-5 h-5 text-black" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                <h2 className="text-3xl font-black text-black">
                  {user?.nickname || '用户'}
                </h2>
                <span
                  className={`px-3 py-1 text-xs font-black border-2 border-black rounded ${getStatusStyle('done')}`}
                >
                  PRO
                </span>
              </div>
              <div className="flex items-center gap-2 justify-center md:justify-start text-gray-600">
                <LuMail className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`${stat.color} border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all duration-150`}
            >
              <stat.icon className="w-8 h-8 mb-2 text-black opacity-80" />
              <div className="text-2xl font-black text-black">{stat.value}</div>
              <div className="text-sm font-bold text-black opacity-80">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Courses */}
        <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-black">RECENT LEARNING</h3>
            <button className="text-purple-600 font-bold hover:underline">
              VIEW ALL →
            </button>
          </div>

          <div className="space-y-4">
            {recentCourses.map((course) => (
              <div
                key={course.id}
                className="bg-gray-50 border-2 border-black p-4 shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all duration-150 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-black">{course.title}</span>
                  <span
                    className={`px-2 py-1 text-xs font-black border-2 border-black rounded ${getStatusStyle(course.status)}`}
                  >
                    {getStatusText(course.status)}
                  </span>
                </div>
                <div className="relative h-3 bg-gray-200 border-2 border-black rounded-full overflow-hidden">
                  <div
                    className={`h-full ${course.progress === 100 ? 'bg-green-400' : 'bg-purple-400'}`}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
                <div className="text-right text-sm font-bold text-gray-600 mt-1">
                  {course.progress}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
  
  );
}
