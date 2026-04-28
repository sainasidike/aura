'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProfileById, getProfiles, getActiveProfileId, type StoredProfile } from '@/lib/storage';
import { fetchNatalChart } from '@/lib/chart-cache';
import { NatalChartSVG, ParamsDisplay, AspectGrid, TransitOverlaySVG, ReturnDetailPanel, TransitAspectsList } from '@/components/chart/AstrologyComponents';
import type { AstrologyChart } from '@/types';

const CHART_TYPES = [
  { key: 'natal', label: '本命' },
  { key: 'transit', label: '行运' },
  { key: 'progression', label: '次限' },
  { key: 'tertiary', label: '三限' },
  { key: 'solar_return', label: '日返' },
  { key: 'lunar_return', label: '月返' },
] as const;

const AI_QUESTIONS: Record<string, string> = {
  natal: '请帮我全面解读我的本命盘',
  transit: '我最近的运势如何？',
  progression: '请帮我解读当前次限盘的影响',
  tertiary: '请帮我解读当前三限盘的影响',
  solar_return: '我今年的年运如何？',
  lunar_return: '我这个月的运势如何？',
};

export default function AstrologyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>加载中...</div>}>
      <AstrologyContent />
    </Suspense>
  );
}

interface TransitData {
  natalChart: AstrologyChart;
  transitChart: AstrologyChart;
  crossAspects: { planet1: string; planet2: string; type: string; angle: number; orb: number }[];
  transitTime: string;
}

interface ReturnData {
  type: string;
  typeCn: string;
  returnMoment: { date: string; time: string; precisionArcsec: number };
  nextReturn?: { date: string; time: string } | null;
  chart: AstrologyChart;
  natalChart: AstrologyChart;
}

interface ProgressionData {
  type: string;
  typeCn: string;
  progressedDate: string;
  targetDate: string;
  ageYears: number;
  chart: AstrologyChart;
  natalChart: AstrologyChart;
  crossAspects: { planet1: string; planet2: string; type: string; angle: number; orb: number }[];
}

/* ─── helpers ─── */
function cstToday(): string {
  const d = new Date(Date.now() + 8 * 3600000);
  return d.toISOString().slice(0, 10);
}
function cstNowHour(): number {
  return new Date(Date.now() + 8 * 3600000).getUTCHours();
}
function cstNowMinute(): number {
  return new Date(Date.now() + 8 * 3600000).getUTCMinutes();
}
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}.${m}.${d}`;
}

/* ─── Swipeable number adjuster ─── */
function SwipeNum({ value, onChange, min, max, pad, suffix }: {
  value: number; onChange: (v: number) => void;
  min: number; max: number; pad?: number; suffix?: string;
}) {
  const x0 = useRef(0);
  const v0 = useRef(0);
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const txt = pad ? String(value).padStart(pad, '0') : String(value);

  return (
    <span className="inline-flex items-center select-none" style={{ touchAction: 'pan-y' }}>
      <button
        onClick={() => onChange(clamp(value - 1))}
        className="flex h-7 w-5 items-center justify-center opacity-30 active:opacity-70 transition-opacity"
        style={{ color: 'var(--text-secondary)', fontSize: 10 }}
      >&lsaquo;</button>
      <span
        className="min-w-[1.6rem] text-center text-[13px] font-semibold tabular-nums"
        style={{ color: 'var(--accent-primary)', cursor: 'ew-resize' }}
        onTouchStart={e => { x0.current = e.touches[0].clientX; v0.current = value; }}
        onTouchMove={e => {
          const n = clamp(v0.current + Math.round((e.touches[0].clientX - x0.current) / 20));
          if (n !== value) onChange(n);
        }}
        onPointerDown={e => {
          if (e.pointerType === 'touch') return;
          x0.current = e.clientX; v0.current = value;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          if (e.pointerType === 'touch' || !e.buttons) return;
          const n = clamp(v0.current + Math.round((e.clientX - x0.current) / 20));
          if (n !== value) onChange(n);
        }}
      >{txt}</span>
      <button
        onClick={() => onChange(clamp(value + 1))}
        className="flex h-7 w-5 items-center justify-center opacity-30 active:opacity-70 transition-opacity"
        style={{ color: 'var(--text-secondary)', fontSize: 10 }}
      >&rsaquo;</button>
      {suffix && <span className="text-[10px] ml-0.5" style={{ color: 'var(--text-quaternary)' }}>{suffix}</span>}
    </span>
  );
}

/* ─── Swipeable date (±day, tap to open picker) ─── */
function SwipeDate({ value, onChange }: {
  value: string; onChange: (v: string) => void;
}) {
  const x0 = useRef(0);
  const d0 = useRef(value);
  const moved = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <span className="relative inline-flex items-center select-none" style={{ touchAction: 'pan-y' }}>
      <button
        onClick={() => onChange(shiftDate(value, -1))}
        className="flex h-7 w-5 items-center justify-center opacity-30 active:opacity-70 transition-opacity"
        style={{ color: 'var(--text-secondary)', fontSize: 10 }}
      >&lsaquo;</button>
      <span
        className="min-w-[4rem] text-center text-[13px] font-semibold tabular-nums"
        style={{ color: 'var(--accent-primary)', cursor: 'ew-resize' }}
        onTouchStart={e => { x0.current = e.touches[0].clientX; d0.current = value; moved.current = false; }}
        onTouchMove={e => {
          const days = Math.round((e.touches[0].clientX - x0.current) / 30);
          if (Math.abs(e.touches[0].clientX - x0.current) > 8) moved.current = true;
          const n = shiftDate(d0.current, days);
          if (n !== value) onChange(n);
        }}
        onTouchEnd={() => { if (!moved.current) inputRef.current?.showPicker?.(); }}
        onClick={e => { if (!(e.nativeEvent instanceof TouchEvent)) inputRef.current?.showPicker?.(); }}
      >{fmtDate(value)}</span>
      <button
        onClick={() => onChange(shiftDate(value, 1))}
        className="flex h-7 w-5 items-center justify-center opacity-30 active:opacity-70 transition-opacity"
        style={{ color: 'var(--text-secondary)', fontSize: 10 }}
      >&rsaquo;</button>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={e => e.target.value && onChange(e.target.value)}
        className="absolute opacity-0 pointer-events-none"
        style={{ width: 0, height: 0 }}
        tabIndex={-1}
      />
    </span>
  );
}

function AstrologyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paramProfileId = searchParams.get('profileId');
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [chartType, setChartType] = useState('natal');

  // Natal chart state
  const [natalData, setNatalData] = useState<{ timeInfo: unknown; chart: AstrologyChart } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Natal time adjustment
  const [natalHour, setNatalHour] = useState(0);
  const [natalMinute, setNatalMinute] = useState(0);

  // Transit state
  const [transitData, setTransitData] = useState<TransitData | null>(null);
  const [transitLoading, setTransitLoading] = useState(false);
  const [transitDate, setTransitDate] = useState(cstToday);
  const [transitHour, setTransitHour] = useState(cstNowHour);
  const [transitMinute, setTransitMinute] = useState(cstNowMinute);

  // Progression state (次限/三限)
  const [progressionData, setProgressionData] = useState<ProgressionData | null>(null);
  const [progressionLoading, setProgressionLoading] = useState(false);
  const [progDate, setProgDate] = useState(cstToday);
  const [progHour, setProgHour] = useState(cstNowHour);
  const [progMinute, setProgMinute] = useState(cstNowMinute);
  const [tertiaryData, setTertiaryData] = useState<ProgressionData | null>(null);
  const [tertiaryLoading, setTertiaryLoading] = useState(false);
  const [tertiaryDate, setTertiaryDate] = useState(cstToday);
  const [tertiaryHourVal, setTertiaryHourVal] = useState(cstNowHour);
  const [tertiaryMinuteVal, setTertiaryMinuteVal] = useState(cstNowMinute);

  // Return chart state
  const [returnData, setReturnData] = useState<ReturnData | null>(null);
  const [returnLoading, setReturnLoading] = useState(false);
  // Solar return: full date+time (year extracted for API)
  const [solarDate, setSolarDate] = useState(cstToday);
  const [solarHour, setSolarHour] = useState(cstNowHour);
  const [solarMinute, setSolarMinute] = useState(cstNowMinute);
  // Lunar return: date+time (full datetime for API)
  const [lunarDate, setLunarDate] = useState(cstToday);
  const [lunarHour, setLunarHour] = useState(cstNowHour);
  const [lunarMinute, setLunarMinute] = useState(cstNowMinute);

  // Init natal hour/minute from profile
  useEffect(() => {
    if (profile) {
      setNatalHour(profile.hour);
      setNatalMinute(profile.minute ?? 0);
    }
  }, [profile]);

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

  // Fetch natal chart (use cache when hour/minute match profile)
  const fetchNatal = useCallback(() => {
    if (!profile) return;
    setLoading(true);
    setError('');
    const useCache = natalHour === profile.hour && natalMinute === (profile.minute ?? 0);
    if (useCache) {
      fetchNatalChart(profile, 'astrology')
        .then(d => setNatalData(d as { timeInfo: unknown; chart: AstrologyChart }))
        .catch(e => setError(e instanceof Error ? e.message : '计算失败'))
        .finally(() => setLoading(false));
    } else {
      fetch('/api/astrology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: profile.year, month: profile.month, day: profile.day,
          hour: natalHour, minute: natalMinute, gender: profile.gender,
          longitude: profile.longitude, latitude: profile.latitude, timezone: profile.timezone,
        }),
      })
        .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
        .then(({ ok, data }) => { if (!ok) throw new Error(data.error); setNatalData(data); })
        .catch(e => setError(e instanceof Error ? e.message : '计算失败'))
        .finally(() => setLoading(false));
    }
  }, [profile, natalHour, natalMinute]);

  // Auto-fetch natal on profile load (use profile's hour/minute directly to avoid stale state)
  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    setError('');
    fetchNatalChart(profile, 'astrology')
      .then(d => setNatalData(d as { timeInfo: unknown; chart: AstrologyChart }))
      .catch(e => setError(e instanceof Error ? e.message : '计算失败'))
      .finally(() => setLoading(false));
  }, [profile]);

  // Fetch transit chart
  const fetchTransit = useCallback(() => {
    if (!profile) return;
    setTransitLoading(true);
    setError('');
    const [y, m, d] = transitDate.split('-').map(Number);
    fetch('/api/astrology/transit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: profile.year, month: profile.month, day: profile.day,
        hour: profile.hour, minute: profile.minute,
        longitude: profile.longitude, latitude: profile.latitude, timezone: profile.timezone,
        transitDate: { year: y, month: m, day: d, hour: transitHour, minute: transitMinute },
      }),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => { if (!ok) throw new Error(data.error); setTransitData(data); })
      .catch(e => setError(e instanceof Error ? e.message : '行运计算失败'))
      .finally(() => setTransitLoading(false));
  }, [profile, transitDate, transitHour, transitMinute]);

  // Fetch return chart
  const fetchReturn = useCallback((type: 'solar_return' | 'lunar_return') => {
    if (!profile) return;
    setReturnLoading(true);
    setError('');
    const endpoint = type === 'solar_return' ? '/api/astrology/solar-return' : '/api/astrology/lunar-return';

    let extra: Record<string, unknown>;
    if (type === 'solar_return') {
      const returnYear = Number(solarDate.split('-')[0]);
      extra = { returnYear };
    } else {
      // Construct ISO datetime in CST → UTC
      const [y, m, d] = lunarDate.split('-').map(Number);
      const utc = new Date(Date.UTC(y, m - 1, d, lunarHour - 8, lunarMinute));
      extra = { targetDate: utc.toISOString() };
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: profile.year, month: profile.month, day: profile.day,
        hour: profile.hour, minute: profile.minute,
        longitude: profile.longitude, latitude: profile.latitude, timezone: profile.timezone,
        ...extra,
      }),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => { if (!ok) throw new Error(data.error); setReturnData(data); })
      .catch(e => setError(e instanceof Error ? e.message : '回归盘计算失败'))
      .finally(() => setReturnLoading(false));
  }, [profile, solarDate, lunarDate, lunarHour, lunarMinute]);

  // Fetch progression chart (次限 or 三限)
  const fetchProgression = useCallback((type: 'progression' | 'tertiary') => {
    if (!profile) return;
    const isProg = type === 'progression';
    const setData = isProg ? setProgressionData : setTertiaryData;
    const setLoading = isProg ? setProgressionLoading : setTertiaryLoading;
    const date = isProg ? progDate : tertiaryDate;
    const hour = isProg ? progHour : tertiaryHourVal;
    const minute = isProg ? progMinute : tertiaryMinuteVal;

    setLoading(true);
    setError('');
    const endpoint = isProg ? '/api/astrology/progression' : '/api/astrology/tertiary';
    const [y, m, d] = date.split('-').map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d, hour - 8, minute));

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: profile.year, month: profile.month, day: profile.day,
        hour: profile.hour, minute: profile.minute,
        longitude: profile.longitude, latitude: profile.latitude, timezone: profile.timezone,
        targetDate: utc.toISOString(),
      }),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => { if (!ok) throw new Error(data.error); setData(data); })
      .catch(e => setError(e instanceof Error ? e.message : `${isProg ? '次限' : '三限'}计算失败`))
      .finally(() => setLoading(false));
  }, [profile, progDate, progHour, progMinute, tertiaryDate, tertiaryHourVal, tertiaryMinuteVal]);

  // Auto-fetch when chart type changes
  useEffect(() => {
    if (!profile) return;
    setError('');
    if (chartType === 'transit') fetchTransit();
    if (chartType === 'progression') fetchProgression('progression');
    if (chartType === 'tertiary') fetchProgression('tertiary');
    if (chartType === 'solar_return') fetchReturn('solar_return');
    if (chartType === 'lunar_return') fetchReturn('lunar_return');
  }, [chartType, profile]);

  // Reset data when switching chart type
  useEffect(() => {
    setReturnData(null);
    setTransitData(null);
    setProgressionData(null);
    setTertiaryData(null);
  }, [chartType]);

  // Debounced auto-recalculate on value changes
  useEffect(() => {
    if (!profile || chartType !== 'natal') return;
    const t = setTimeout(fetchNatal, 400);
    return () => clearTimeout(t);
  }, [natalHour, natalMinute]);

  useEffect(() => {
    if (!profile || chartType !== 'transit') return;
    const t = setTimeout(fetchTransit, 400);
    return () => clearTimeout(t);
  }, [transitDate, transitHour, transitMinute]);

  useEffect(() => {
    if (!profile || chartType !== 'solar_return') return;
    const t = setTimeout(() => fetchReturn('solar_return'), 400);
    return () => clearTimeout(t);
    // solarHour/solarMinute intentionally excluded — solar return API only uses year
  }, [solarDate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile || chartType !== 'lunar_return') return;
    const t = setTimeout(() => fetchReturn('lunar_return'), 400);
    return () => clearTimeout(t);
  }, [lunarDate, lunarHour, lunarMinute]);

  useEffect(() => {
    if (!profile || chartType !== 'progression') return;
    const t = setTimeout(() => fetchProgression('progression'), 400);
    return () => clearTimeout(t);
  }, [progDate, progHour, progMinute]);

  useEffect(() => {
    if (!profile || chartType !== 'tertiary') return;
    const t = setTimeout(() => fetchProgression('tertiary'), 400);
    return () => clearTimeout(t);
  }, [tertiaryDate, tertiaryHourVal, tertiaryMinuteVal]);

  /* ─── Ask AI: build chart data & navigate to chat ─── */
  const handleAskAI = () => {
    if (!profile) return;

    const profileInfo = {
      name: profile.name, gender: profile.gender,
      birthDate: `${profile.year}-${profile.month}-${profile.day}`,
      birthTime: `${profile.hour}:${profile.minute ?? 0}`,
      city: profile.city,
    };

    let chartData: Record<string, unknown>;
    let analysisType: string;

    if (chartType === 'natal' && natalData) {
      analysisType = 'natal';
      chartData = { profile: profileInfo, natalChart: natalData.chart };
    } else if (chartType === 'transit' && transitData && natalData) {
      analysisType = 'transit';
      chartData = {
        profile: profileInfo,
        natalChart: natalData.chart,
        transitChart: transitData.transitChart,
        crossAspects: transitData.crossAspects,
        transitTime: new Date(transitData.transitTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      };
    } else if (chartType === 'progression' && progressionData) {
      analysisType = 'progression';
      chartData = {
        profile: profileInfo,
        natalChart: progressionData.natalChart,
        progressedChart: progressionData.chart,
        crossAspects: progressionData.crossAspects,
        progressedDate: progressionData.progressedDate,
        ageYears: progressionData.ageYears,
      };
    } else if (chartType === 'tertiary' && tertiaryData) {
      analysisType = 'tertiary';
      chartData = {
        profile: profileInfo,
        natalChart: tertiaryData.natalChart,
        progressedChart: tertiaryData.chart,
        crossAspects: tertiaryData.crossAspects,
        progressedDate: tertiaryData.progressedDate,
        ageYears: tertiaryData.ageYears,
      };
    } else if (chartType === 'solar_return' && returnData) {
      analysisType = 'solar_return';
      chartData = {
        profile: profileInfo,
        natalChart: returnData.natalChart || natalData?.chart,
        solarReturnChart: returnData.chart,
        returnMoment: returnData.returnMoment,
        returnYear: Number(solarDate.split('-')[0]),
      };
    } else if (chartType === 'lunar_return' && returnData) {
      analysisType = 'lunar_return';
      chartData = {
        profile: profileInfo,
        natalChart: returnData.natalChart || natalData?.chart,
        lunarReturnChart: returnData.chart,
        returnMoment: returnData.returnMoment,
        nextReturn: returnData.nextReturn,
      };
    } else {
      return; // no data yet
    }

    const pending = {
      question: AI_QUESTIONS[chartType],
      analysisType,
      chartData,
    };

    try {
      localStorage.setItem('aura_astrology_ai_pending', JSON.stringify(pending));
    } catch { /* storage full — proceed anyway */ }

    router.push(`/chat?profileId=${profile.id}`);
  };

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

  const isLoading = loading || transitLoading || returnLoading || progressionLoading || tertiaryLoading;
  const currentChart = chartType === 'transit' ? transitData?.transitChart
    : chartType === 'progression' ? progressionData?.chart
    : chartType === 'tertiary' ? tertiaryData?.chart
    : (chartType === 'solar_return' || chartType === 'lunar_return') ? returnData?.chart
    : natalData?.chart;

  const canAskAI = (chartType === 'natal' && !!natalData)
    || (chartType === 'transit' && !!transitData && !!natalData)
    || (chartType === 'progression' && !!progressionData)
    || (chartType === 'tertiary' && !!tertiaryData)
    || ((chartType === 'solar_return' || chartType === 'lunar_return') && !!returnData);

  return (
    <div className="min-h-screen px-4 py-6 pb-24">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <Link href="/chart" className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <span>&larr;</span>
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 500 }}>专业星盘</span>
          </Link>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {profile.name} · {profile.year}.{profile.month}.{profile.day}
          </div>
        </div>

        {/* Chart Type Selector */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {CHART_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setChartType(t.key)}
              className="shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: chartType === t.key ? 'rgba(123,108,184,0.12)' : 'transparent',
                color: chartType === t.key ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                borderBottom: chartType === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ Time Controls (swipeable, auto-recalculate) ═══ */}

        {chartType === 'natal' && (
          <div className="mb-3 flex items-center justify-center gap-0.5">
            <span className="text-[11px] mr-1" style={{ color: 'var(--text-tertiary)' }}>
              {profile.year}.{profile.month}.{profile.day}
            </span>
            <SwipeNum value={natalHour} onChange={setNatalHour} min={0} max={23} pad={2} />
            <span className="text-[11px] -mx-0.5" style={{ color: 'var(--text-quaternary)' }}>:</span>
            <SwipeNum value={natalMinute} onChange={setNatalMinute} min={0} max={59} pad={2} />
          </div>
        )}

        {chartType === 'transit' && (
          <div className="mb-3 flex items-center justify-center gap-0.5">
            <SwipeDate value={transitDate} onChange={setTransitDate} />
            <span className="text-[10px] mx-1 opacity-30" style={{ color: 'var(--text-quaternary)' }}>·</span>
            <SwipeNum value={transitHour} onChange={setTransitHour} min={0} max={23} pad={2} />
            <span className="text-[11px] -mx-0.5" style={{ color: 'var(--text-quaternary)' }}>:</span>
            <SwipeNum value={transitMinute} onChange={setTransitMinute} min={0} max={59} pad={2} />
            <button
              onClick={() => { setTransitDate(cstToday()); setTransitHour(cstNowHour()); setTransitMinute(cstNowMinute()); }}
              className="ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors"
              style={{ color: 'var(--accent-secondary)', background: 'rgba(58,191,182,0.06)' }}
            >此刻</button>
          </div>
        )}

        {chartType === 'progression' && (
          <div className="mb-3 flex items-center justify-center gap-0.5">
            <SwipeDate value={progDate} onChange={setProgDate} />
            <span className="text-[10px] mx-1 opacity-30" style={{ color: 'var(--text-quaternary)' }}>·</span>
            <SwipeNum value={progHour} onChange={setProgHour} min={0} max={23} pad={2} />
            <span className="text-[11px] -mx-0.5" style={{ color: 'var(--text-quaternary)' }}>:</span>
            <SwipeNum value={progMinute} onChange={setProgMinute} min={0} max={59} pad={2} />
            <button
              onClick={() => { setProgDate(cstToday()); setProgHour(cstNowHour()); setProgMinute(cstNowMinute()); }}
              className="ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors"
              style={{ color: 'var(--accent-secondary)', background: 'rgba(58,191,182,0.06)' }}
            >此刻</button>
          </div>
        )}

        {chartType === 'tertiary' && (
          <div className="mb-3 flex items-center justify-center gap-0.5">
            <SwipeDate value={tertiaryDate} onChange={setTertiaryDate} />
            <span className="text-[10px] mx-1 opacity-30" style={{ color: 'var(--text-quaternary)' }}>·</span>
            <SwipeNum value={tertiaryHourVal} onChange={setTertiaryHourVal} min={0} max={23} pad={2} />
            <span className="text-[11px] -mx-0.5" style={{ color: 'var(--text-quaternary)' }}>:</span>
            <SwipeNum value={tertiaryMinuteVal} onChange={setTertiaryMinuteVal} min={0} max={59} pad={2} />
            <button
              onClick={() => { setTertiaryDate(cstToday()); setTertiaryHourVal(cstNowHour()); setTertiaryMinuteVal(cstNowMinute()); }}
              className="ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors"
              style={{ color: 'var(--accent-secondary)', background: 'rgba(58,191,182,0.06)' }}
            >此刻</button>
          </div>
        )}

        {chartType === 'solar_return' && (
          <div className="mb-3 flex items-center justify-center gap-0.5">
            <SwipeDate value={solarDate} onChange={setSolarDate} />
            <span className="text-[10px] mx-1 opacity-30" style={{ color: 'var(--text-quaternary)' }}>·</span>
            <SwipeNum value={solarHour} onChange={setSolarHour} min={0} max={23} pad={2} />
            <span className="text-[11px] -mx-0.5" style={{ color: 'var(--text-quaternary)' }}>:</span>
            <SwipeNum value={solarMinute} onChange={setSolarMinute} min={0} max={59} pad={2} />
            <button
              onClick={() => { setSolarDate(cstToday()); setSolarHour(cstNowHour()); setSolarMinute(cstNowMinute()); }}
              className="ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors"
              style={{ color: 'var(--accent-secondary)', background: 'rgba(58,191,182,0.06)' }}
            >此刻</button>
          </div>
        )}

        {chartType === 'lunar_return' && (
          <div className="mb-3 flex items-center justify-center gap-0.5">
            <SwipeDate value={lunarDate} onChange={setLunarDate} />
            <span className="text-[10px] mx-1 opacity-30" style={{ color: 'var(--text-quaternary)' }}>·</span>
            <SwipeNum value={lunarHour} onChange={setLunarHour} min={0} max={23} pad={2} />
            <span className="text-[11px] -mx-0.5" style={{ color: 'var(--text-quaternary)' }}>:</span>
            <SwipeNum value={lunarMinute} onChange={setLunarMinute} min={0} max={59} pad={2} />
            <button
              onClick={() => { setLunarDate(cstToday()); setLunarHour(cstNowHour()); setLunarMinute(cstNowMinute()); }}
              className="ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors"
              style={{ color: 'var(--accent-secondary)', background: 'rgba(58,191,182,0.06)' }}
            >此刻</button>
          </div>
        )}

        {/* Return moment label */}
        {returnData && (chartType === 'solar_return' || chartType === 'lunar_return') && (
          <div className="mb-3 rounded-lg px-3 py-1.5 text-center text-xs font-medium"
            style={{ background: 'rgba(58,191,182,0.08)', color: 'var(--accent-secondary)', border: '1px solid rgba(58,191,182,0.12)' }}>
            {returnData.typeCn} — {returnData.returnMoment.date} {returnData.returnMoment.time} CST（精度 {returnData.returnMoment.precisionArcsec} 角秒）
          </div>
        )}

        {/* Transit time label */}
        {chartType === 'transit' && transitData && (
          <div className="mb-3 rounded-lg px-3 py-1.5 text-center text-xs font-medium"
            style={{ background: 'rgba(58,191,182,0.08)', color: 'var(--accent-secondary)', border: '1px solid rgba(58,191,182,0.12)' }}>
            行运盘 — {new Date(transitData.transitTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
          </div>
        )}

        {/* Progression date label */}
        {chartType === 'progression' && progressionData && (
          <div className="mb-3 rounded-lg px-3 py-1.5 text-center text-xs font-medium"
            style={{ background: 'rgba(123,108,184,0.08)', color: 'var(--accent-primary)', border: '1px solid rgba(123,108,184,0.12)' }}>
            次限盘 — 推运日期 {new Date(progressionData.progressedDate).toLocaleDateString('zh-CN')}（{progressionData.ageYears} 岁）
          </div>
        )}

        {/* Tertiary date label */}
        {chartType === 'tertiary' && tertiaryData && (
          <div className="mb-3 rounded-lg px-3 py-1.5 text-center text-xs font-medium"
            style={{ background: 'rgba(123,108,184,0.08)', color: 'var(--accent-primary)', border: '1px solid rgba(123,108,184,0.12)' }}>
            三限盘 — 推运日期 {new Date(tertiaryData.progressedDate).toLocaleDateString('zh-CN')}（{tertiaryData.ageYears} 岁）
          </div>
        )}

        {/* ═══ Ask AI Button ═══ */}
        {canAskAI && !isLoading && (
          <button
            onClick={handleAskAI}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all"
            style={{
              background: 'var(--gradient-primary)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(123,108,184,0.25)',
            }}
          >
            <span style={{ fontSize: 14 }}>✦</span>
            <span>问AI：{AI_QUESTIONS[chartType]}</span>
          </button>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
            {returnLoading ? '正在计算回归盘...' : transitLoading ? '正在计算行运盘...' : progressionLoading ? '正在计算次限盘...' : tertiaryLoading ? '正在计算三限盘...' : '计算中...'}
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="text-center py-12" style={{ color: 'var(--error)' }}>{error}</div>
        )}

        {/* Content — all sections inline */}
        {!isLoading && !error && currentChart && (
          <div className="space-y-6">
            {/* Natal: chart → params → aspects */}
            {chartType === 'natal' && natalData && (
              <>
                <NatalChartSVG chart={natalData.chart} />
                <ParamsDisplay chart={natalData.chart} />
                <AspectGrid chart={natalData.chart} />
              </>
            )}

            {/* Transit: overlay chart → cross aspects → transit params */}
            {chartType === 'transit' && transitData && natalData && (
              <>
                <TransitOverlaySVG natalChart={natalData.chart} transitChart={transitData.transitChart} />
                <TransitAspectsList crossAspects={transitData.crossAspects} transitChart={transitData.transitChart} />
                <ParamsDisplay chart={transitData.transitChart} />
              </>
            )}

            {/* Progression / Tertiary: overlay → cross aspects → params */}
            {chartType === 'progression' && progressionData && natalData && (
              <>
                <TransitOverlaySVG natalChart={natalData.chart} transitChart={progressionData.chart} />
                <TransitAspectsList crossAspects={progressionData.crossAspects} transitChart={progressionData.chart} />
                <ParamsDisplay chart={progressionData.chart} />
              </>
            )}

            {chartType === 'tertiary' && tertiaryData && natalData && (
              <>
                <TransitOverlaySVG natalChart={natalData.chart} transitChart={tertiaryData.chart} />
                <TransitAspectsList crossAspects={tertiaryData.crossAspects} transitChart={tertiaryData.chart} />
                <ParamsDisplay chart={tertiaryData.chart} />
              </>
            )}

            {/* Solar/Lunar Return: detail → chart → params → aspects */}
            {(chartType === 'solar_return' || chartType === 'lunar_return') && returnData && (
              <>
                <NatalChartSVG chart={returnData.chart} />
                <ReturnDetailPanel
                  chartType={chartType as 'solar_return' | 'lunar_return'}
                  chart={returnData.chart}
                  returnMoment={returnData.returnMoment}
                  nextReturn={returnData.nextReturn}
                />
                <ParamsDisplay chart={returnData.chart} />
                <AspectGrid chart={returnData.chart} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
