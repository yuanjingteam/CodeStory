import React from 'react';
import AdminHeader from '@/components/layout/AdminHeader';
import AdminSider from '@/components/layout/AdminSider';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader />
      <div className="flex">
        <AdminSider />
        <main className="flex-1 p-4  relative z-10">{children}</main>
      </div>
    </div>
  );
}
