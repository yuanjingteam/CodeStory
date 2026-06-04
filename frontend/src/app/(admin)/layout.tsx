import React from 'react';
import { useMemo } from 'react';
import AdminHeader from '@/components/layout/AdminHeader';
import AdminSider from '@/components/layout/AdminSider';
import { useUserStore } from '@/store/useUserStore';
import ErrorDataCard from '@/components/common/ErrorDataCard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getRoleByToken } = useUserStore();
  const isAdmin = useMemo(() => getRoleByToken() === 1, [getRoleByToken]);
  return (
    <div className="bg-white">
      <AdminHeader />
      <div className="flex ">
        <AdminSider />
        {isAdmin ? (
          <main className="flex-1 p-4  relative z-10">{children}</main>
        ) : (
          <ErrorDataCard title="无权限访问" />
        )}
      </div>
    </div>
  );
}
