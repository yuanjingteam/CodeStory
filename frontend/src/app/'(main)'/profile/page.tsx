'use client';
import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/useUserStore';
import request from '@/utils/request';
import { getUserCourses } from '@/api/profile';

type Item = { rank: number; type: string; title: string; reason: string; href: string; trackingToken: string };
export default function ProfilePage() {
  const { user, isLoggedIn } = useUserStore();
  const [items, setItems] = useState<Item[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  useEffect(() => { if (!isLoggedIn) return; request.get('/recommendations/review').then((r: any) => setItems(r?.data?.items || [])).catch(() => setError(true)).finally(() => setLoading(false)); }, [isLoggedIn]);
  if (!isLoggedIn) return <main className="p-8 text-center font-bold">请先登录</main>;
  return <main className="max-w-5xl mx-auto p-6"><section className="border-2 border-black bg-yellow-300 p-6 shadow-[6px_6px_0_#000]"><h1 className="text-3xl font-black">个人中心</h1><p className="mt-2 font-bold">{user?.nickname || '学习者'} · 复习清单</p></section><section className="mt-8"><h2 className="text-2xl font-black">建议复习</h2>{loading ? <p className="mt-4 font-bold">正在加载…</p> : error ? <p className="mt-4 font-bold text-red-700">加载失败，请稍后重试。</p> : items.length === 0 ? <p className="mt-4 font-bold">暂无复习建议，完成几道题后再来看看。</p> : <div className="mt-4 grid gap-4">{items.map(item => <a key={item.trackingToken} href={item.href} className="block border-2 border-black bg-white p-4 shadow-[4px_4px_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"><div className="font-black">{item.rank}. {item.title}</div><div className="mt-1 text-sm font-bold">{item.reason}</div></a>)}</div>}</section></main>;
}
