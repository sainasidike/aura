'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getProfileById, getProfiles, type StoredProfile } from '@/lib/storage';
import { fetchNatalChart } from '@/lib/chart-cache';
import { BaziDisplay } from '@/components/chart/BaziDisplay';
import type { BaziChart, TimeStandardization } from '@/types';

export default function BaziPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>加载中...</div>}>
      <BaziContent />
    </Suspense>
  );
}

function BaziContent() {
  const searchParams = useSearchParams();
  const paramProfileId = searchParams.get('profileId');
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [data, setData] = useState<{ timeInfo: TimeStandardization; chart: BaziChart } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (paramProfileId) {
      const p = getProfileById(paramProfileId);
      if (p) { setProfile(p); return; }
    }
    const all = getProfiles();
    if (all.length > 0) setProfile(all[0]);
  }, [paramProfileId]);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    setError('');
    fetchNatalChart<{ timeInfo: TimeStandardization; chart: BaziChart }>(profile, 'bazi')
      .then(d => setData(d))
      .catch(e => setError(e instanceof Error ? e.message : '计算失败'))
      .finally(() => setLoading(false));
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-4" style={{ color: 'var(--text-tertiary)' }}>请先创建一个档案</p>
          <Link href="/profile" className="rounded-lg px-4 py-2 text-sm" style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}>前往档案管理</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 pb-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/chart" className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <span>&larr;</span>
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 500 }}>国学八字</span>
          </Link>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{profile.name} · {profile.year}.{profile.month}.{profile.day}</div>
        </div>
        {loading && <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>计算中...</div>}
        {error && <div className="text-center py-12" style={{ color: 'var(--error)' }}>{error}</div>}
        {data && !loading && <BaziDisplay data={data} />}
      </div>
    </div>
  );
}
