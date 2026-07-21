'use client';

import React, { useSyncExternalStore } from 'react';
import AdminHeader from '@/components/layout/AdminHeader';
import AdminSider from '@/components/layout/AdminSider';
import { useUserStore } from '@/store/useUserStore';
import ErrorDataCard from '@/components/common/ErrorDataCard';

const subscribe = () => () => {};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getRoleByToken } = useUserStore();
  const hasMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const isAdmin = hasMounted && getRoleByToken() === 1;

  return (
    <div className="bg-white">
      <AdminHeader />
      <div className="flex ">
        <AdminSider />
        {!hasMounted ? (
          <ErrorDataCard title="正在验证访问权限" />
        ) : isAdmin ? (
          <main className="flex-1 p-4  relative z-10">{children}</main>
        ) : (
          <ErrorDataCard title="无权限访问" />
        )}
      </div>
    </div>
  );
}
