'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getProfileById, getProfiles, type StoredProfile } from '@/lib/storage';
import type { BaziChart, ZiweiChart, AstrologyChart, TimeStandardization } from '@/types';

type Tab = 'bazi' | 'ziwei' | 'astrology';

export default function ChartPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>加载中...</div>}>
      <ChartContent />
    </Suspense>
  );
}

function ChartContent() {
  const searchParams = useSearchParams();
  const paramProfileId = searchParams.get('profileId');

  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [tab, setTab] = useState<Tab>('bazi');
  const [baziData, setBaziData] = useState<{ timeInfo: TimeStandardization; chart: BaziChart } | null>(null);
  const [ziweiData, setZiweiData] = useState<{ timeInfo: TimeStandardization; chart: ZiweiChart } | null>(null);
  const [astroData, setAstroData] = useState<{ timeInfo: TimeStandardization; chart: AstrologyChart } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (paramProfileId) {
      const p = getProfileById(paramProfileId);
      if (p) { setProfile(p); return; }
    }
    // 没有 URL 参数时，自动加载第一个档案
    const all = getProfiles();
    if (all.length > 0) setProfile(all[0]);
  }, [paramProfileId]);

  const fetchChart = async (type: Tab) => {
    if (!profile) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: profile.year, month: profile.month, day: profile.day,
          hour: profile.hour, minute: profile.minute,
          gender: profile.gender,
          longitude: profile.longitude,
          latitude: profile.latitude,
          timezone: profile.timezone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (type === 'bazi') setBaziData(data);
      else if (type === 'ziwei') setZiweiData(data);
      else setAstroData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '计算失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile) fetchChart(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, tab]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-4" style={{ color: 'var(--text-tertiary)' }}>请先创建一个档案</p>
          <Link
            href="/profile"
            className="rounded-lg px-4 py-2 text-sm"
            style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
          >
            前往档案管理
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/fortune" className="text-sm" style={{ color: 'var(--text-tertiary)' }}>&larr; 返回</Link>
          {profile && (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {profile.name} · {profile.year}.{profile.month}.{profile.day} {String(profile.hour).padStart(2, '0')}:{String(profile.minute).padStart(2, '0')} · {profile.city}
            </p>
          )}
        </div>

        {/* Tab 切换 */}
        <div className="mb-6 flex gap-2">
          {([['bazi', '八字四柱'], ['ziwei', '紫微斗数'], ['astrology', '西洋星盘']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="rounded-lg px-4 py-2 text-sm font-medium transition"
              style={tab === t
                ? { background: 'var(--accent-primary)', color: 'var(--text-inverse)' }
                : { background: 'var(--bg-surface)', color: 'var(--text-tertiary)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>计算中...</div>}
        {error && <div className="text-center py-12" style={{ color: 'var(--error)' }}>{error}</div>}

        {/* 八字展示 */}
        {tab === 'bazi' && baziData && !loading && (
          <BaziDisplay data={baziData} />
        )}

        {/* 紫微展示 */}
        {tab === 'ziwei' && ziweiData && !loading && (
          <ZiweiDisplay data={ziweiData} />
        )}

        {/* 星盘展示 */}
        {tab === 'astrology' && astroData && !loading && (
          <AstrologyDisplay data={astroData} />
        )}
      </div>
    </div>
  );
}

function BaziDisplay({ data }: { data: { timeInfo: TimeStandardization; chart: BaziChart } }) {
  const { timeInfo, chart } = data;
  const p = chart.fourPillars;

  return (
    <div className="space-y-6">
      {/* 时间修正信息 */}
      <div
        className="rounded-xl p-4 text-sm"
        style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <span>真太阳时: {String(timeInfo.trueSolarTime.hour).padStart(2, '0')}:{String(timeInfo.trueSolarTime.minute).padStart(2, '0')}</span>
          <span style={{ color: 'var(--border-default)' }}>|</span>
          <span>{timeInfo.shichenName}</span>
          <span style={{ color: 'var(--border-default)' }}>|</span>
          <span>修正 {timeInfo.totalCorrection > 0 ? '+' : ''}{Math.round(timeInfo.totalCorrection)}分</span>
          {timeInfo.isDST && <span className="rounded px-1.5 text-xs" style={{ background: 'rgba(192,144,48,0.15)', color: 'var(--warning)' }}>夏令时</span>}
        </div>
        {timeInfo.nearBoundary && (
          <p className="mt-2 text-xs" style={{ color: 'var(--warning)' }}>{timeInfo.boundaryWarning}</p>
        )}
      </div>

      {/* 四柱表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead>
            <tr className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <td className="p-2"></td>
              <td className="p-2">年柱</td>
              <td className="p-2">月柱</td>
              <td className="p-2">日柱</td>
              <td className="p-2">时柱</td>
            </tr>
          </thead>
          <tbody style={{ color: 'var(--text-primary)' }}>
            <tr className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <td className="p-1 text-right" style={{ color: 'var(--text-tertiary)' }}>十神</td>
              <td className="p-1">{chart.shiShen.tianGan.year}</td>
              <td className="p-1">{chart.shiShen.tianGan.month}</td>
              <td className="p-1">{chart.shiShen.tianGan.day}</td>
              <td className="p-1">{chart.shiShen.tianGan.time}</td>
            </tr>
            <tr className="text-xl sm:text-2xl font-bold">
              <td className="p-1.5 sm:p-2 text-right text-sm font-normal" style={{ color: 'var(--text-tertiary)' }}>天干</td>
              <td className="p-1.5 sm:p-2">{p.year.gan}</td>
              <td className="p-1.5 sm:p-2">{p.month.gan}</td>
              <td className="p-1.5 sm:p-2" style={{ color: 'var(--accent-warm)' }}>{p.day.gan}</td>
              <td className="p-1.5 sm:p-2">{p.time.gan}</td>
            </tr>
            <tr className="text-xl sm:text-2xl font-bold">
              <td className="p-1.5 sm:p-2 text-right text-sm font-normal" style={{ color: 'var(--text-tertiary)' }}>地支</td>
              <td className="p-1.5 sm:p-2">{p.year.zhi}</td>
              <td className="p-1.5 sm:p-2">{p.month.zhi}</td>
              <td className="p-1.5 sm:p-2">{p.day.zhi}</td>
              <td className="p-1.5 sm:p-2">{p.time.zhi}</td>
            </tr>
            <tr className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <td className="p-1 text-right" style={{ color: 'var(--text-tertiary)' }}>藏干</td>
              <td className="p-1">{chart.hideGan.year.join(' ')}</td>
              <td className="p-1">{chart.hideGan.month.join(' ')}</td>
              <td className="p-1">{chart.hideGan.day.join(' ')}</td>
              <td className="p-1">{chart.hideGan.time.join(' ')}</td>
            </tr>
            <tr className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <td className="p-1 text-right" style={{ color: 'var(--text-tertiary)' }}>纳音</td>
              <td className="p-1">{chart.nayin.year}</td>
              <td className="p-1">{chart.nayin.month}</td>
              <td className="p-1">{chart.nayin.day}</td>
              <td className="p-1">{chart.nayin.time}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 补充信息 */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-xl p-4" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>农历</p>
          <p style={{ color: 'var(--text-primary)' }}>{chart.lunarDate}</p>
        </div>
        <div className="rounded-xl p-4" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>生肖</p>
          <p style={{ color: 'var(--text-primary)' }}>{chart.shengXiao}</p>
        </div>
        <div className="rounded-xl p-4" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>命宫</p>
          <p style={{ color: 'var(--text-primary)' }}>{chart.mingGong}</p>
        </div>
        <div className="rounded-xl p-4" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>身宫</p>
          <p style={{ color: 'var(--text-primary)' }}>{chart.shenGong}</p>
        </div>
      </div>

      {/* 大运 */}
      <div className="rounded-xl p-4" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>大运</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-2">
          {chart.dayun.map((d, i) => (
            <div key={i} className="rounded-lg px-2 py-1.5 text-center" style={{ background: 'var(--bg-hover)' }}>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{d.startAge}岁</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{d.ganZhi}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{d.startYear}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ZiweiDisplay({ data }: { data: { timeInfo: TimeStandardization; chart: ZiweiChart } }) {
  const { timeInfo, chart } = data;

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div
        className="rounded-xl p-4 text-sm"
        style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-4" style={{ color: 'var(--text-secondary)' }}>
          <span>命主: <strong style={{ color: 'var(--text-primary)' }}>{chart.destinyMaster}</strong></span>
          <span>身主: <strong style={{ color: 'var(--text-primary)' }}>{chart.bodyMaster}</strong></span>
          <span>五行局: <strong style={{ color: 'var(--text-primary)' }}>{chart.element}</strong></span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <span>真太阳时: {String(timeInfo.trueSolarTime.hour).padStart(2, '0')}:{String(timeInfo.trueSolarTime.minute).padStart(2, '0')}</span>
          <span>{timeInfo.shichenName}</span>
          {timeInfo.isDST && <span className="rounded px-1.5" style={{ background: 'rgba(192,144,48,0.15)', color: 'var(--warning)' }}>夏令时</span>}
        </div>
      </div>

      {/* 十二宫 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {chart.cells.map((cell, i) => (
          <div
            key={i}
            className="rounded-xl p-3"
            style={
              cell.temples.some(t => t.includes('命宫'))
                ? { border: '1px solid var(--accent-warm-dim)', background: 'rgba(184,150,62,0.05)' }
                : { border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }
            }
          >
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{cell.ground}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {cell.temples.join(' / ')}
              </span>
            </div>
            <div className="mt-2">
              {cell.majorStars.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {cell.majorStars.map((s, j) => (
                    <span
                      key={j}
                      className="rounded px-1.5 py-0.5 text-sm font-medium"
                      style={s.fourInfluence
                        ? { background: 'var(--accent-primary-dim)', color: 'var(--text-primary)' }
                        : { color: 'var(--text-primary)' }
                      }
                    >
                      {s.name}
                      {s.fourInfluence && (
                        <span className="ml-0.5 text-xs" style={{ color: 'var(--accent-warm)' }}>{s.fourInfluence}</span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>无主星</span>
              )}
            </div>
            {cell.minorStars.length > 0 && (
              <div className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {cell.minorStars.map(s => s.name).join(' · ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AstrologyDisplay({ data }: { data: { timeInfo: TimeStandardization; chart: AstrologyChart } }) {
  const { chart } = data;
  const SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];
  const ascSign = SIGNS[Math.floor(chart.ascendant / 30)];
  const ascDeg = Math.floor(chart.ascendant % 30);

  return (
    <div className="space-y-6">
      {/* 上升点 */}
      <div
        className="rounded-xl p-4 text-sm"
        style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>
          上升星座: <strong style={{ color: 'var(--text-primary)' }}>{ascSign} {ascDeg}°</strong>
        </span>
      </div>

      {/* 行星表格 */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
              <th className="px-4 py-2.5 text-left font-medium">行星</th>
              <th className="px-4 py-2.5 text-left font-medium">星座</th>
              <th className="px-4 py-2.5 text-left font-medium">度数</th>
              <th className="px-4 py-2.5 text-left font-medium">宫位</th>
            </tr>
          </thead>
          <tbody style={{ color: 'var(--text-primary)' }}>
            {chart.planets.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="px-4 py-2">
                  {p.name}
                  {p.retrograde && <span className="ml-1 text-xs" style={{ color: 'var(--error)' }}>R</span>}
                </td>
                <td className="px-4 py-2">{p.sign}</td>
                <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>{p.degree}°{p.minute}&apos;</td>
                <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>第{p.house}宫</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 相位 */}
      <div
        className="rounded-xl p-4"
        style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <p className="mb-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>主要相位</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {chart.aspects.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span style={{ color: 'var(--text-primary)' }}>{a.planet1}</span>
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                a.type === '合相' ? 'bg-blue-500/20 text-blue-600' :
                a.type === '三合' || a.type === '六合' ? 'bg-green-500/20 text-green-600' :
                a.type === '四分' || a.type === '对冲' ? 'bg-red-500/20 text-red-600' :
                ''
              }`}
              style={
                !(a.type === '合相' || a.type === '三合' || a.type === '六合' || a.type === '四分' || a.type === '对冲')
                  ? { background: 'var(--bg-hover)', color: 'var(--text-secondary)' }
                  : undefined
              }
              >
                {a.type}
              </span>
              <span style={{ color: 'var(--text-primary)' }}>{a.planet2}</span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{a.orb}°</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
