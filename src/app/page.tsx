'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getProfiles, type StoredProfile } from '@/lib/storage';

export default function Home() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfiles(getProfiles());
    setLoaded(true);
  }, []);

  const goTo = (path: string, profile: StoredProfile) => {
    router.push(`${path}?profileId=${profile.id}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-12 text-center">
        <h1 className="mb-2 text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-amber-300 bg-clip-text text-transparent">
            Aura
          </span>
        </h1>
        <p className="text-lg text-purple-200/70">AI 命理 · 洞见未来</p>
      </div>

      {loaded && profiles.length > 0 ? (
        <>
          {/* 有档案：显示快捷入口 */}
          <div className="w-full max-w-md space-y-3">
            {profiles.slice(0, 3).map(p => (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
              >
                <div className="mb-3">
                  <h3 className="text-lg font-medium text-purple-100">{p.name}</h3>
                  <p className="text-xs text-purple-300/50">
                    {p.year}.{p.month}.{p.day} {String(p.hour).padStart(2, '0')}:{String(p.minute).padStart(2, '0')} · {p.city}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => goTo('/chart', p)}
                    className="flex-1 rounded-xl bg-purple-600/30 py-2 text-sm text-purple-200 hover:bg-purple-600/50 transition"
                  >
                    排盘分析
                  </button>
                  <button
                    onClick={() => goTo('/chat', p)}
                    className="flex-1 rounded-xl bg-purple-600/30 py-2 text-sm text-purple-200 hover:bg-purple-600/50 transition"
                  >
                    AI 对话
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/profile"
            className="mt-4 text-sm text-purple-300/50 hover:text-purple-200 transition"
          >
            管理档案 ({profiles.length})
          </Link>
        </>
      ) : loaded ? (
        /* 无档案：引导创建 */
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <p className="mb-2 text-purple-200/80">开始你的命理探索</p>
            <p className="mb-6 text-sm text-purple-300/50">创建个人档案，获取八字、紫微、星盘三大体系解读</p>
            <Link
              href="/profile"
              className="inline-block rounded-xl bg-purple-600 px-8 py-3 font-medium hover:bg-purple-500 transition"
            >
              创建档案
            </Link>
          </div>
        </div>
      ) : null}

      <p className="mt-16 text-xs text-purple-300/30">
        命理分析仅供参考和娱乐
      </p>
    </div>
  );
}
