'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { updateUserProfile } from '@/api/profile';
import type { LoginUserInfo } from 'shared/types/auth';
import type {
  UserProfileInfo,
  UserCourse,
  UpdateUserInfopRequest,
} from 'shared/types/profile';
import { userSexMap, userRoleMap, userLevelMap } from '@/utils/constants';
import { getProfile, getUserCourses } from '@/api/profile';
import { LuFlame, LuMail, LuBookOpen, LuBadgeCheck } from 'react-icons/lu';
import { FaUserEdit, FaStar } from 'react-icons/fa';
import Img from 'next/image';
import UpdateUserInfoForm from '@/components/profile/UpdateUserInfoForm';
import UserCourses from '@/components/profile/UserCourses';
export default function ProfilePage() {
  const { user, isLoggedIn, isLoading, updateUserInfo } = useUserStore();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserProfileInfo>({
    email: user?.email || '',
    nickname: user?.nickname || '',
    avatar: user?.avatar || '',
    sex: user?.sex || 0,
    occupation: user?.occupation || '',
    role: user?.role || 0,
    level: user?.level || 0,
    score: user?.score || 0,
    created_at: user?.created_at || '',
  });
  const [courses, setCourses] = useState<UserCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoggedIn || isLoading) return;
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const res = await getProfile();
        if (res.code === 200 && res.data) {
          setUserInfo((prev) => ({
            ...prev,
            ...res.data,
          }));
          updateUserInfo({
            nickname: res.data.nickname,
            avatar: res.data.avatar,
            sex: res.data.sex,
            occupation: res.data.occupation,
            level: res.data.level,
            score: res.data.score,
            role: res.data.role,
          } as Partial<LoginUserInfo>);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [isLoggedIn, isLoading, updateUserInfo]);
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
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-black text-black">Loading...</div>
      </div>
    );
  }

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
    { label: '待定选项1', value: '？', icon: LuFlame, color: 'bg-gray-400' },
    { label: '待定选项2', value: '？', icon: LuFlame, color: 'bg-gray-400' },
  ];

  const updateUserProfileHandler = async (data: UpdateUserInfopRequest) => {
    setLoading(true);
    try {
      const res = await updateUserProfile(data);
      if (res.code === 200) {
        updateUserInfo(res.data);
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const onClose = () => {
    setIsOpen(false);
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
      {/* Main Content Row */}
      <div className="flex gap-4 mb-8">
        {/* 个人信息卡片 */}
        <div className="flex-[3] bg-gray-100 border-4 border-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex items-center gap-6 relative">
          <span
            className={`absolute -top-4 -right-4 px-3 py-2 text-xs font-black border-2 border-black  ${userRoleMap[userInfo.role]?.color || 'bg-gray-400 text-white'} shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all duration-150`}
          >
            {userRoleMap[userInfo.role]?.text || '普通用户'}
          </span>
          {/* Avatar */}
          <div className="relative">
            <div className="w-40 h-40 bg-purple-100 border-4 border-black rounded-full flex items-center justify-center ">
              <Img
                src={userInfo.avatar || '/default-avatar.png'}
                width={50}
                height={50}
                alt="User Avatar"
                objectFit="cover"
                className="w-32 h-32 rounded-full"
              />
            </div>
          </div>
          {/* User Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-black text-black mb-3">
              {userInfo.nickname || '用户'}
            </h2>
            <div className="flex flex-col gap-1 text-sm text-gray-600">
              <span>性别: {userSexMap[userInfo.sex] || '未设置'}</span>
              <span>职业: {userInfo.occupation || '未设置'}</span>
              <span className="flex items-center gap-1">
                <LuMail className="w-3 h-3" />
                {userInfo.email}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="absolute -bottom-3 -right-3 w-10 h-10 bg-green-400 border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all duration-150"
          >
            <FaUserEdit className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* 四项统计数据 */}
        <div className="flex-[2] flex flex-col gap-3">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`${stat.color} border-3 border-black px-4 py-3 shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all duration-150 flex items-center gap-3 min-h-[60px]`}
            >
              <stat.icon className="w-6 h-6 text-black opacity-80 flex-shrink-0" />
              <div>
                <div className="text-xl font-black text-black">
                  {stat.value}
                </div>
                <div className="text-xs font-bold text-black opacity-80">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-[2]  flex flex-col gap-3">
          {/* 等级卡片 */}
          <div
            className={`${userLevelMap[userInfo.level || 0]?.color || 'bg-gray-700 text-white'} border-3 border-black px-6 py-4 shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all duration-150 flex flex-col items-center justify-center flex-1`}
          >
            <div className="text-xs font-bold opacity-80 mb-2">等级</div>
            <div className="text-xl font-black">
              {userLevelMap[userInfo.level || 0]?.text || '无等级'}
            </div>
            <div className="flex items-center gap-1">
              {Array(userInfo.level || 0)
                .fill(0)
                .map((_, i) => {
                  return (
                    <FaStar
                      key={i}
                      className="w-6 h-6 text-yellow-500 opacity-80 flex-shrink-0"
                    />
                  );
                })}
            </div>
          </div>
          {/* 积分卡片 */}
          <div className="bg-gradient-to-br from-purple-400 to-purple-600 border-3 border-black px-6 py-4 shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all duration-150 flex flex-col items-center justify-center flex-1">
            <div className="text-xs font-bold text-white opacity-80 mb-2">
              积分
            </div>
            <div className="text-xl font-black text-white font-bold text-center">
              {userInfo.score || 0}
            </div>
          </div>
        </div>
      </div>
      {/* MY Courses - 用户课程 */}
      <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-black">MY COURSES</h3>
        </div>
        <UserCourses courses={courses} loading={loading} />
      </div>

      <UpdateUserInfoForm
        isOpen={isOpen}
        onClose={onClose}
        initialData={userInfo}
        onSubmit={updateUserProfileHandler}
      />
    </main>
  );
}
