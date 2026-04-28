'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getProfileById, getProfiles, getActiveProfileId, type StoredProfile } from '@/lib/storage';

interface FirdariaSubPeriod {
  ruler: string;
  coRuler: string;
  startAge: number;
  endAge: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface FirdariaPeriod {
  ruler: string;
  startAge: number;
  endAge: number;
  startDate: string;
  endDate: string;
  years: number;
  isCurrent: boolean;
  subPeriods: FirdariaSubPeriod[];
}

interface FirdariaResult {
  isDayBirth: boolean;
  currentPeriod: { major: string; sub: string } | null;
  periods: FirdariaPeriod[];
}

const PLANET_COLORS: Record<string, string> = {
  '太阳': '#e8a020',
  '月亮': '#b0b8c8',
  '水星': '#70b0a0',
  '金星': '#d08090',
  '火星': '#d06050',
  '木星': '#7090d0',
  '土星': '#908070',
  '北交点': '#9080c0',
  '南交点': '#807090',
};

const PLANET_ICONS: Record<string, string> = {
  '太阳': '☉',
  '月亮': '☽',
  '水星': '☿',
  '金星': '♀',
  '火星': '♂',
  '木星': '♃',
  '土星': '♄',
  '北交点': '☊',
  '南交点': '☋',
};

export default function FirdariaPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>加载中...</div>}>
      <FirdariaContent />
    </Suspense>
  );
}

function FirdariaContent() {
  const searchParams = useSearchParams();
  const paramProfileId = searchParams.get('profileId');
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [data, setData] = useState<FirdariaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Load profile
  useEffect(() => {
    if (paramProfileId) {
      const p = getProfileById(paramProfileId);
      if (p) { setProfile(p); return; }
    }
    const savedId = getActiveProfileId();
    if (savedId) {
      const p = getProfileById(savedId);
      if (p) { setProfile(p); return; }
    }
    const all = getProfiles();
    if (all.length > 0) setProfile(all[0]);
  }, [paramProfileId]);

  // Fetch firdaria data
  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    setError('');
    fetch('/api/astrology/firdaria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: profile.year, month: profile.month, day: profile.day,
        hour: profile.hour, minute: profile.minute ?? 0,
        longitude: profile.longitude, latitude: profile.latitude, timezone: profile.timezone,
      }),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data: d }) => {
        if (!ok) throw new Error((d as { error?: string }).error || '计算失败');
        const result = d as FirdariaResult;
        setData(result);
        // Auto-expand current period
        const curIdx = result.periods.findIndex(p => p.isCurrent);
        if (curIdx >= 0) setExpandedIdx(curIdx);
      })
      .catch(e => setError(e instanceof Error ? e.message : '法达计算失败'))
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
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <Link href="/chart" className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <span>&larr;</span>
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 500 }}>法达星限</span>
          </Link>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {profile.name} · {profile.year}.{profile.month}.{profile.day}
          </div>
        </div>

        {/* Day/Night birth indicator */}
        {data && (
          <div className="mb-4 rounded-lg px-3 py-2 text-center text-xs font-medium"
            style={{ background: 'rgba(123,108,184,0.08)', color: 'var(--accent-primary)', border: '1px solid rgba(123,108,184,0.12)' }}>
            {data.isDayBirth ? '☉ 日生' : '☽ 夜生'} — 当前大限：{data.currentPeriod?.major}{data.currentPeriod?.sub !== data.currentPeriod?.major ? ` / 小限：${data.currentPeriod?.sub}` : ''}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>正在计算法达星限...</div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-12" style={{ color: 'var(--error)' }}>{error}</div>
        )}

        {/* Timeline */}
        {!loading && !error && data && (
          <div className="space-y-2">
            {data.periods.map((period, idx) => {
              const color = PLANET_COLORS[period.ruler] || '#888';
              const icon = PLANET_ICONS[period.ruler] || '?';
              const isExpanded = expandedIdx === idx;

              return (
                <div key={idx}>
                  {/* Major period row */}
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="w-full rounded-xl px-4 py-3 text-left transition-all active:scale-[0.99]"
                    style={{
                      background: period.isCurrent
                        ? `linear-gradient(135deg, ${color}18, ${color}08)`
                        : 'var(--bg-base)',
                      border: period.isCurrent
                        ? `1.5px solid ${color}40`
                        : '1px solid var(--border-subtle)',
                      boxShadow: period.isCurrent ? `0 2px 12px ${color}15` : 'var(--shadow-card)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
                          style={{ background: `${color}15`, color }}>
                          {icon}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {period.ruler}
                            </span>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{ background: `${color}12`, color }}>
                              {period.years} 年
                            </span>
                            {period.isCurrent && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                style={{ background: `${color}20`, color }}>
                                当前
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                            {period.startDate} — {period.endDate}（{Math.floor(period.startAge)} — {Math.floor(period.endAge)} 岁）
                          </div>
                        </div>
                      </div>
                      <span className="text-xs transition-transform" style={{
                        color: 'var(--text-quaternary)',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}>
                        {period.subPeriods.length > 0 ? '›' : ''}
                      </span>
                    </div>
                  </button>

                  {/* Sub-periods */}
                  {isExpanded && period.subPeriods.length > 0 && (
                    <div className="ml-6 mt-1 space-y-0.5 border-l-2 pl-4 py-1"
                      style={{ borderColor: `${color}25` }}>
                      {period.subPeriods.map((sub, si) => {
                        const subColor = PLANET_COLORS[sub.ruler] || '#888';
                        const subIcon = PLANET_ICONS[sub.ruler] || '?';
                        return (
                          <div key={si}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors"
                            style={{
                              background: sub.isCurrent ? `${subColor}10` : 'transparent',
                              border: sub.isCurrent ? `1px solid ${subColor}25` : '1px solid transparent',
                            }}
                          >
                            <span className="text-sm" style={{ color: subColor }}>{subIcon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {sub.coRuler}
                                </span>
                                {sub.isCurrent && (
                                  <span className="text-[9px] font-medium px-1 py-0.5 rounded-full"
                                    style={{ background: `${subColor}18`, color: subColor }}>
                                    当前
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
                                {sub.startDate} — {sub.endDate}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
