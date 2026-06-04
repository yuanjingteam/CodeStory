import React, { useMemo } from 'react';
import { useUserStore } from '@/store/useUserStore';
import ErrorDataCard from '@/components/common/ErrorDataCard';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {


  return <> {children}</>;
}
