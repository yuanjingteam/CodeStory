'use client';
import Link from 'next/link';
import React from 'react';
import { usePathname } from 'next/navigation';
import {
  HiOutlineUsers,
  HiOutlineBookOpen,
  HiOutlineQueueList,
  HiOutlineDocumentText,
} from 'react-icons/hi2';
const menuItems = [
  { name: '用户管理', href: '/users-manage', icon: HiOutlineUsers },
  { name: '课程管理', href: '/courses-manage', icon: HiOutlineBookOpen },
  { name: '章节管理', href: '/chapters-manage', icon: HiOutlineQueueList },
  { name: '小节管理', href: '/lessons-manage', icon: HiOutlineDocumentText },
];

const AdminSider: React.FC = () => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href);
  };

  return (
    <aside className="w-52  bg-white border-r-2 border-gray-300">
      {/* 菜单列表 */}
      <nav className="p-3 space-y-2">
        {menuItems.map((item) => {
          const isItemActive = isActive(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold transition-all duration-200
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
