'use client';
import Link from 'next/link';
import React from 'react';
import { useUserStore } from '@/store/useUserStore';
import { usePathname } from 'next/navigation';
import { FiLogIn } from 'react-icons/fi';
import UserMenu from './UserMenu';

const Header: React.FC = () => {
  const pathname = usePathname();
  const { user, isLoggedIn } = useUserStore();
  const canManage = isLoggedIn && user?.role === 1;
  const navClass = (href: string) => {
    const active = href === '/' ? pathname === href : pathname.startsWith(href);
    return `min-h-10 inline-flex items-center underline-offset-4 decoration-2 decoration-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
      active ? 'underline' : 'hover:underline'
    }`;
  };
  return (
    <header className="h-[62px] relative z-20 flex-shrink-0">
      <div className="h-full border-b-2 border-black bg-yellow-400">
        <div className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500">
          <div className="flex h-full items-center justify-between gap-2 px-3 md:px-6">
            <div className="flex min-w-0 items-center gap-3 md:gap-10">
              <Link
                href="/"
                aria-label="CodeStory 首页"
                className="flex min-h-10 items-center space-x-2 font-black text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                <div className="rounded-sm border-2 border-black px-2 py-1 bg-yellow-200 shadow-[2px_2px_0px_#000] transition-all duration-100 motion-reduce:transition-none">
                  {'</>'}
                </div>
                <span className="hidden text-lg tracking-wide sm:inline">
                  CODE STORY
                </span>
              </Link>
              <nav className="flex items-center gap-3 font-bold text-black md:gap-8">
                <Link
                  href="/"
                  aria-current={pathname === '/' ? 'page' : undefined}
                  className={navClass('/')}
                >
                  首页
                </Link>
                <Link
                  href="/courses"
                  aria-current={pathname.startsWith('/courses') ? 'page' : undefined}
                  className={navClass('/courses')}
                >
                  课程
                </Link>
                <Link
                  href="/about"
                  aria-current={pathname.startsWith('/about') ? 'page' : undefined}
                  className={`hidden md:inline-flex ${navClass('/about')}`}
                >
                  关于我们
                </Link>
                {canManage && (
                  <Link
                    href="/users-manage"
                    className={`hidden md:inline-flex ${navClass('/users-manage')}`}
                  >
                    后台管理
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex shrink-0 items-center px-2 py-1">
              {isLoggedIn ? (
                <UserMenu />
              ) : (
                <Link
                  href="/auth/login"
                  className="flex min-h-10 items-center gap-1 font-bold text-purple-700 transition-colors hover:text-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                >
                  登录
                  <FiLogIn />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
