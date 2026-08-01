'use client';
import Link from 'next/link';
import React from 'react';
import { usePathname } from 'next/navigation';
import {
  HiOutlineUsers,
  HiOutlineBookOpen,
  HiOutlineQueueList,
  HiOutlineDocumentText,
  HiOutlineClipboardDocumentCheck,
} from 'react-icons/hi2';
const menuItems = [
  { name: '用户管理', href: '/users-manage', icon: HiOutlineUsers },
  { name: '课程管理', href: '/courses-manage', icon: HiOutlineBookOpen },
  { name: '章节管理', href: '/chapters-manage', icon: HiOutlineQueueList },
  { name: '小节管理', href: '/lessons-manage', icon: HiOutlineDocumentText },
  {
    name: '题目管理',
    href: '/exercises-manage',
    icon: HiOutlineClipboardDocumentCheck,
  },
];

const AdminSider: React.FC = () => {
  const pathname = usePathname();
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href);
  };

  return (
    <aside className="w-full border-b-2 border-gray-300 bg-white md:w-52 md:shrink-0 md:border-b-0 md:border-r-2">
      {/* 菜单列表 */}
      <nav className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-5 md:grid-cols-1">
        {menuItems.map((item) => {
          const isItemActive = isActive(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex w-full items-center space-x-2 rounded-lg px-3 py-2 text-sm font-bold transition-all duration-200 md:space-x-3 md:px-4 md:py-3 md:text-base
                ${
                  isItemActive
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <Icon
                icon={item.icon}
                className={isItemActive ? 'text-white' : 'text-gray-600'}
              />
              <span className="flex-1 text-left">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

function Icon({
  icon: IconComponent,
  className = 'text-black',
}: {
  icon: React.ElementType;
  className?: string;
}) {
  return <IconComponent className={`h-5 w-5 ${className}`} />;
}

export default AdminSider;
