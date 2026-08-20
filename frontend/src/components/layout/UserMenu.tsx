'use client';
import Link from 'next/link';
import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import Img from 'next/image';
import { FiChevronDown, FiLogOut } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { logout } from '@/api/auth/auth';
import { AlertDialog } from '@/components/ui';
import { showToast } from '@/utils/toast';
import { publishAuthSessionChange } from '@/utils/auth-session';

const itemClass =
  'flex min-h-10 w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-bold text-black hover:bg-white hover:shadow-[inset_4px_0_0_0_#18181b] focus-visible:bg-white focus-visible:outline-none focus-visible:shadow-[inset_4px_0_0_0_#18181b]';

export default function UserMenu() {
  const router = useRouter();
  const { user, clearUser, isLoading, isLoggedIn } = useUserStore();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const canManage = isLoggedIn && user?.role === 1;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // 会话在服务端可能已失效，本地状态仍需清理
    } finally {
      clearUser();
      publishAuthSessionChange({ type: 'signed-out' });
      setLoggingOut(false);
      setConfirmOpen(false);
      showToast.success('已退出登录');
      router.push('/');
    }
  };

  if (!isLoggedIn) return null;

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label="用户菜单"
            className="flex min-h-10 cursor-pointer items-center gap-2 px-1 font-bold text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded-full border border-black">
              <Img
                src={user?.avatar || '/default-avatar.png'}
                alt=""
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            </span>
            <span className="hidden max-w-[100px] truncate text-sm md:block">
              {isLoading ? '...' : user?.nickname || 'UserName'}
            </span>
            <FiChevronDown className="size-4" aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            className="z-50 w-44 border-2 border-black bg-white py-1 shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:outline-none"
          >
            <Link href="/profile" className={itemClass} onClick={() => setOpen(false)}>
              个人中心
            </Link>
            {canManage && (
              <Link
                href="/users-manage"
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                后台管理
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmOpen(true);
              }}
              className={`${itemClass} border-t-2 border-black text-red-700`}
            >
              <FiLogOut className="size-4" aria-hidden="true" />
              退出登录
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <AlertDialog
        open={confirmOpen}
        title="退出登录？"
        description="退出后需要重新登录才能继续学习。"
        confirmText="退出登录"
        variant="danger"
        loading={loggingOut}
        onConfirm={handleLogout}
        onOpenChange={setConfirmOpen}
      />
    </>
  );
}
