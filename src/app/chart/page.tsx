'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getProfileById, type StoredProfile } from '@/lib/storage';
import type { BaziChart, ZiweiChart, AstrologyChart, TimeStandardization } from '@/types';

type Tab = 'bazi' | 'ziwei' | 'astrology';

export default function ChartPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-purple-300/40">加载中...</div>}>
      <ChartContent />
    </Suspense>
  );
}

function ChartContent() {
  const searchParams = useSearchParams();
  const profileId = searchParams.get('profileId');

  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [tab, setTab] = useState<Tab>('bazi');
  const [baziData, setBaziData] = useState<{ timeInfo: TimeStandardization; chart: BaziChart } | null>(null);
  const [ziweiData, setZiweiData] = useState<{ timeInfo: TimeStandardization; chart: ZiweiChart } | null>(null);
  const [astroData, setAstroData] = useState<{ timeInfo: TimeStandardization; chart: AstrologyChart } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profileId) return;
    const p = getProfileById(profileId);
    if (p) setProfile(p);
  }, [profileId]);

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

  if (!profileId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-purple-300/60 mb-4">请先选择一个档案</p>
          <Link href="/profile" className="rounded-lg bg-purple-600 px-4 py-2 text-sm hover:bg-purple-500">
            前往档案管理
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/profile" className="text-purple-300/60 hover:text-purple-200 text-sm">&larr; 档案</Link>
          {profile && (
            <p className="text-sm text-purple-300/60">
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
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === t
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-purple-300/60 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-12 text-purple-300/40">计算中...</div>}
        {error && <div className="text-center py-12 text-red-400">{error}</div>}

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
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
        <div className="flex items-center gap-2 text-purple-300/80">
          <span>真太阳时: {String(timeInfo.trueSolarTime.hour).padStart(2, '0')}:{String(timeInfo.trueSolarTime.minute).padStart(2, '0')}</span>
          <span className="text-white/20">|</span>
          <span>{timeInfo.shichenName}</span>
          <span className="text-white/20">|</span>
          <span>修正 {timeInfo.totalCorrection > 0 ? '+' : ''}{Math.round(timeInfo.totalCorrection)}分</span>
          {timeInfo.isDST && <span className="rounded bg-yellow-600/30 px-1.5 text-yellow-300 text-xs">夏令时</span>}
        </div>
        {timeInfo.nearBoundary && (
          <p className="mt-2 text-xs text-yellow-400/80">{timeInfo.boundaryWarning}</p>
        )}
      </div>

      {/* 四柱表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead>
            <tr className="text-sm text-purple-300/60">
              <td className="p-2"></td>
              <td className="p-2">年柱</td>
              <td className="p-2">月柱</td>
              <td className="p-2">日柱</td>
              <td className="p-2">时柱</td>
            </tr>
          </thead>
          <tbody className="text-purple-100">
            <tr className="text-xs text-purple-400/60">
              <td className="p-1 text-right text-purple-300/40">十神</td>
              <td className="p-1">{chart.shiShen.tianGan.year}</td>
              <td className="p-1">{chart.shiShen.tianGan.month}</td>
              <td className="p-1">{chart.shiShen.tianGan.day}</td>
              <td className="p-1">{chart.shiShen.tianGan.time}</td>
            </tr>
            <tr className="text-xl sm:text-2xl font-bold">
              <td className="p-1.5 sm:p-2 text-right text-sm font-normal text-purple-300/40">天干</td>
              <td className="p-1.5 sm:p-2">{p.year.gan}</td>
              <td className="p-1.5 sm:p-2">{p.month.gan}</td>
              <td className="p-1.5 sm:p-2 text-amber-300">{p.day.gan}</td>
              <td className="p-1.5 sm:p-2">{p.time.gan}</td>
            </tr>
            <tr className="text-xl sm:text-2xl font-bold">
              <td className="p-1.5 sm:p-2 text-right text-sm font-normal text-purple-300/40">地支</td>
              <td className="p-1.5 sm:p-2">{p.year.zhi}</td>
              <td className="p-1.5 sm:p-2">{p.month.zhi}</td>
              <td className="p-1.5 sm:p-2">{p.day.zhi}</td>
              <td className="p-1.5 sm:p-2">{p.time.zhi}</td>
            </tr>
            <tr className="text-xs text-purple-400/60">
              <td className="p-1 text-right text-purple-300/40">藏干</td>
              <td className="p-1">{chart.hideGan.year.join(' ')}</td>
              <td className="p-1">{chart.hideGan.month.join(' ')}</td>
              <td className="p-1">{chart.hideGan.day.join(' ')}</td>
              <td className="p-1">{chart.hideGan.time.join(' ')}</td>
            </tr>
            <tr className="text-xs text-purple-400/50">
              <td className="p-1 text-right text-purple-300/40">纳音</td>
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
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-purple-300/60">农历</p>
          <p className="text-purple-100">{chart.lunarDate}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-purple-300/60">生肖</p>
          <p className="text-purple-100">{chart.shengXiao}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-purple-300/60">命宫</p>
          <p className="text-purple-100">{chart.mingGong}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-purple-300/60">身宫</p>
          <p className="text-purple-100">{chart.shenGong}</p>
        </div>
      </div>

      {/* 大运 */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="mb-3 text-sm text-purple-300/60">大运</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-2">
          {chart.dayun.map((d, i) => (
            <div key={i} className="rounded-lg bg-white/5 px-2 py-1.5 text-center">
              <p className="text-xs text-purple-300/50">{d.startAge}岁</p>
              <p className="font-medium text-purple-100">{d.ganZhi}</p>
              <p className="text-xs text-purple-300/40">{d.startYear}</p>
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
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
        <div className="flex items-center gap-4 text-purple-300/80">
          <span>命主: <strong className="text-purple-100">{chart.destinyMaster}</strong></span>
          <span>身主: <strong className="text-purple-100">{chart.bodyMaster}</strong></span>
          <span>五行局: <strong className="text-purple-100">{chart.element}</strong></span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-purple-300/60 text-xs">
          <span>真太阳时: {String(timeInfo.trueSolarTime.hour).padStart(2, '0')}:{String(timeInfo.trueSolarTime.minute).padStart(2, '0')}</span>
          <span>{timeInfo.shichenName}</span>
          {timeInfo.isDST && <span className="rounded bg-yellow-600/30 px-1.5 text-yellow-300">夏令时</span>}
        </div>
      </div>

      {/* 十二宫 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {chart.cells.map((cell, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3 ${
              cell.temples.some(t => t.includes('命宫'))
                ? 'border-amber-400/30 bg-amber-400/5'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-300/50">{cell.ground}</span>
              <span className="text-sm font-medium text-purple-200">
                {cell.temples.join(' / ')}
              </span>
            </div>
            <div className="mt-2">
              {cell.majorStars.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {cell.majorStars.map((s, j) => (
                    <span key={j} className={`rounded px-1.5 py-0.5 text-sm font-medium ${
                      s.fourInfluence
                        ? 'bg-purple-500/20 text-purple-200'
                        : 'text-purple-100'
                    }`}>
                      {s.name}
                      {s.fourInfluence && (
                        <span className="ml-0.5 text-xs text-amber-300">{s.fourInfluence}</span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-purple-300/30">无主星</span>
              )}
            </div>
            {cell.minorStars.length > 0 && (
              <div className="mt-1 text-xs text-purple-300/50">
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
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
        <span className="text-purple-300/80">
          上升星座: <strong className="text-purple-100">{ascSign} {ascDeg}°</strong>
        </span>
      </div>

      {/* 行星表格 */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-purple-300/60">
              <th className="px-4 py-2.5 text-left font-medium">行星</th>
              <th className="px-4 py-2.5 text-left font-medium">星座</th>
              <th className="px-4 py-2.5 text-left font-medium">度数</th>
              <th className="px-4 py-2.5 text-left font-medium">宫位</th>
            </tr>
          </thead>
          <tbody className="text-purple-100">
            {chart.planets.map((p, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="px-4 py-2">
                  {p.name}
                  {p.retrograde && <span className="ml-1 text-xs text-red-400">R</span>}
                </td>
                <td className="px-4 py-2">{p.sign}</td>
                <td className="px-4 py-2 text-purple-300/70">{p.degree}°{p.minute}&apos;</td>
                <td className="px-4 py-2 text-purple-300/70">第{p.house}宫</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 相位 */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="mb-3 text-sm text-purple-300/60">主要相位</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {chart.aspects.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-purple-100">{a.planet1}</span>
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                a.type === '合相' ? 'bg-blue-500/20 text-blue-300' :
                a.type === '三合' || a.type === '六合' ? 'bg-green-500/20 text-green-300' :
                a.type === '四分' || a.type === '对冲' ? 'bg-red-500/20 text-red-300' :
                'bg-white/10 text-white/60'
              }`}>
                {a.type}
              </span>
              <span className="text-purple-100">{a.planet2}</span>
              <span className="text-xs text-purple-300/40">{a.orb}°</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
