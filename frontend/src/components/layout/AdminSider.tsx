import Link from 'next/link';
import React from 'react';

const menuItems = [
  { name: '用户管理', href: '/users-manage', icon: 'users' },
  { name: '课程管理', href: '/courses-manage', icon: 'book' },
  { name: '章节管理', href: '/chapters-manage', icon: 'list' },
  { name: '小节管理', href: '/lessons-manage', icon: 'file-text' },
  { name: '题目管理', href: '/exercises-manage', icon: 'edit' },
];

const AdminSider: React.FC = () => {
  return (
    <aside className="w-44 min-h-[calc(100vh-84px)] p-4 ">
      <nav className="space-y-2 relative z-10">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center space-x-3 px-4 py-3 bg-gray-100 border-2 border-black shadow-[3px_3px_0px_#000] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all duration-100 text-black font-bold"
          >
            <Icon icon={item.icon} />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};

function Icon({ icon }: { icon: string }) {
  const icons: Record<string, string> = {
    users:
      'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    book: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    list: 'M4 6h16M4 10h16M4 14h16M4 18h16',
    'file-text':
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-black"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={icons[icon]} />
    </svg>
  );
}

export default AdminSider;
