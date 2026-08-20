'use client';
import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { updateUserProfile } from '@/api/profile';
import type { LoginUserInfo } from '@/types/auth';
import type { UserProfileInfo, UpdateUserInfopRequest } from '@/types/profile';
import { userSexMap, userRoleMap, userLevelMap } from '@/utils/constants';
import { getProfile } from '@/api/profile';
import { LuMail } from 'react-icons/lu';
import { FaUserEdit, FaStar } from 'react-icons/fa';
import Img from 'next/image';
import UpdateUserInfoForm from '@/components/home/UpdateUserInfoForm';
import ErrorDataCard from '@/components/common/ErrorDataCard';
import Button from '@/components/ui/Button';
export default function HomeMyInfo() {
  const { user, isLoggedIn, isLoading, updateUserInfo } = useUserStore();
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (!isLoggedIn || isLoading) return;
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(false);
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
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    void fetchUserProfile();
  }, [isLoggedIn, isLoading, reloadKey, updateUserInfo]);

  if (loading) {
    return (
      <div className="flex min-h-72 w-full max-w-md items-center justify-center border-2 border-black bg-zinc-50 p-6" role="status">
        <div className="h-32 w-full animate-pulse bg-zinc-100 motion-reduce:animate-none" />
        <span className="sr-only">正在加载个人信息...</span>
      </div>
    );
  }

  const updateUserProfileHandler = async (data: UpdateUserInfopRequest) => {
    try {
      const res = await updateUserProfile(data);
      if (res.code === 200) {
        setUserInfo((prev) => ({
          ...prev,
          ...res.data,
        }));
        updateUserInfo(res.data);
        return;
      }
      throw new Error('更新个人信息失败');
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  };

  const onClose = () => {
    setIsOpen(false);
  };

  return (
    <section className="w-full flex-1 max-w-md bg-white border-2 border-gray-200 rounded-sm p-6 relative">
      {/* 个人信息卡片 */}
      {error ? (
        <ErrorDataCard
          variant="error"
          title="个人信息加载失败"
          description="暂时无法获取个人信息，请稍后重试。"
          action={<button type="button" className="cursor-pointer font-bold underline underline-offset-4" onClick={() => setReloadKey((key) => key + 1)}>重试</button>}
        />
      ) : isLoggedIn ? (
        <div>
          {/* 角色标签 */}
          <span
            className={`absolute top-[-7px] right-[-7px] rounded-full px-3 py-1 text-xs font-black border-2 border-black ${userRoleMap[userInfo.role]?.color || 'bg-gray-400 text-white'} `}
          >
            {userRoleMap[userInfo.role]?.text || '普通用户'}
          </span>

          {/* 头像和基本信息 */}
          <div className="flex items-start gap-4 mb-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className=" border-2 border-purple-300 rounded-full flex items-center justify-center">
                {userInfo.avatar ? (
                  <div className="w-24 h-24 rounded-full overflow-hidden">
                    <Img
                      src={userInfo.avatar || '/default-avatar.png'}
                      width={96}
                      height={96}
                      alt="User Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-500 text-2xl font-black">?</span>
                  </div>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-start mb-2">
                <h2 className="text-xl font-black text-black  truncate">
                  {userInfo.nickname || '用户'}
                </h2>
                <Button
                  onClick={() => setIsOpen(true)}
                  variant="ghost"
                  size="icon"
                  aria-label="编辑个人信息"
                  className="mx-2 shrink-0"
                >
                  <FaUserEdit className="w-6 h-6 text-gray-500 text-center" />
                </Button>
              </div>
              <div className="flex flex-col gap-1 text-sm text-gray-600">
                <span>性别: {userSexMap[userInfo.sex] || '未设置'}</span>
                <span>职业: {userInfo.occupation || '未设置'}</span>
                <span className="flex items-center gap-1">
                  <LuMail className="w-3 h-3" />
                  {userInfo.email}
                </span>
              </div>
            </div>
          </div>
          {/* 等级和积分卡片 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 等级卡片 */}
            <div
              className={`${userLevelMap[Math.min(userInfo.level || 0, 9)]?.color || 'bg-gray-700 text-white'} border-2  px-4 py-3 rounded-md flex flex-col items-center justify-center`}
            >
              <div className="text-xs font-bold opacity-80 mb-1">等级评价</div>
              <div className="text-lg font-black">
                {userLevelMap[Math.min(Math.floor(userInfo.level || 0), 9)]
                  ?.text || '无等级'}
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                {Array(Math.min(userInfo.level || 0, 9))
                  .fill(0)
                  .map((_, i) => (
                    <FaStar
                      key={i}
                      className={`w-4 h-4 flex-shrink-0 ${userLevelMap[Math.min(userInfo.level || 0, 9)]?.starColor || 'text-yellow-400'}`}
                    />
                  ))}
              </div>
            </div>

            {/* 积分卡片 */}
            <div className="bg-gradient-to-br from-purple-400 to-purple-600  px-4 py-3 rounded-md flex flex-col items-center justify-center">
              <div className="text-xs font-bold text-white opacity-80 mb-1">
                积分
              </div>
              <div className="text-xl font-black text-white">
                {userInfo.score || 0}
              </div>
            </div>
          </div>
          {/* 经验条 */}
          <div className="mt-4 pt-4 ">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-600">经验值</span>
              <span className="text-sm font-black text-gray-800">
                Lv.{userInfo.level}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ((userInfo.score % 1500) / 1500) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-xs font-medium text-gray-500 min-w-[100px] text-right">
                {userInfo.score % 1500}/1500
              </span>
            </div>
          </div>
        </div>
      ) : (
        <ErrorDataCard variant="auth" title="未登录" description="请先登录以查看个人信息" />
      )}
      {isOpen ? (
        <UpdateUserInfoForm
          isOpen
          onClose={onClose}
          initialData={userInfo}
          onSubmit={updateUserProfileHandler}
        />
      ) : null}
    </section>
  );
}
