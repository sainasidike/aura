'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getProfileById, getProfiles, type StoredProfile } from '@/lib/storage';
import type { BaziChart, ZiweiChart, AstrologyChart, TimeStandardization, PlanetPosition, HousePosition, Aspect } from '@/types';

type Tab = 'bazi' | 'ziwei' | 'astrology';
type AstroSubTab = 'chart' | 'params' | 'aspects';

export default function ChartPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>加载中...</div>}>
      <ChartContent />
    </Suspense>
  );
}

/* ─── Zodiac & Planet Constants ─── */

const SIGNS_CN = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const SIGN_COLORS = [
  '#e04040', '#5ea050', '#d0a030', '#4090d0', '#e06020', '#5ea050',
  '#d06080', '#904090', '#e04040', '#406060', '#4090d0', '#6080b0',
];
// Element colors: Fire=red, Earth=green, Air=yellow, Water=blue
const SIGN_ELEMENT_COLORS = [
  '#dc4040', '#4a9060', '#c89030', '#4088c8', // Ari Tau Gem Can
  '#dc4040', '#4a9060', '#c89030', '#4088c8', // Leo Vir Lib Sco
  '#dc4040', '#4a9060', '#c89030', '#4088c8', // Sag Cap Aqu Pis
];

const PLANET_SHORT: Record<string, string> = {
  '太阳': '日', '月亮': '月', '水星': '水', '金星': '金', '火星': '火',
  '木星': '木', '土星': '土', '天王星': '天', '海王星': '海', '冥王星': '冥', '北交点': '☊',
};

const PLANET_GLYPHS: Record<string, string> = {
  '太阳': '☉', '月亮': '☽', '水星': '☿', '金星': '♀', '火星': '♂',
  '木星': '♃', '土星': '♄', '天王星': '♅', '海王星': '♆', '冥王星': '♇', '北交点': '☊',
};

const PLANET_COLORS: Record<string, string> = {
  '太阳': '#e0a020', '月亮': '#8090b0', '水星': '#60a060', '金星': '#d06088',
  '火星': '#d04040', '木星': '#8060c0', '土星': '#606060', '天王星': '#40a0d0',
  '海王星': '#6080c0', '冥王星': '#804060', '北交点': '#808080',
};

/* ─── Essential Dignities ─── */

const DOMICILE: Record<string, string[]> = {
  '太阳': ['狮子'], '月亮': ['巨蟹'], '水星': ['双子', '处女'], '金星': ['金牛', '天秤'],
  '火星': ['白羊', '天蝎'], '木星': ['射手', '双鱼'], '土星': ['摩羯', '水瓶'],
  '天王星': ['水瓶'], '海王星': ['双鱼'], '冥王星': ['天蝎'],
};
const EXALTATION: Record<string, string> = {
  '太阳': '白羊', '月亮': '金牛', '水星': '处女', '金星': '双鱼',
  '火星': '摩羯', '木星': '巨蟹', '土星': '天秤',
};
const DETRIMENT: Record<string, string[]> = {
  '太阳': ['水瓶'], '月亮': ['摩羯'], '水星': ['射手', '双鱼'], '金星': ['白羊', '天蝎'],
  '火星': ['金牛', '天秤'], '木星': ['双子', '处女'], '土星': ['巨蟹', '狮子'],
  '天王星': ['狮子'], '海王星': ['处女'], '冥王星': ['金牛'],
};
const FALL: Record<string, string> = {
  '太阳': '天秤', '月亮': '天蝎', '水星': '双鱼', '金星': '处女',
  '火星': '巨蟹', '木星': '摩羯', '土星': '白羊',
};

function getDignity(planet: string, sign: string): string {
  if (DOMICILE[planet]?.includes(sign)) return '庙';
  if (EXALTATION[planet] === sign) return '旺';
  if (DETRIMENT[planet]?.includes(sign)) return '陷';
  if (FALL[planet] === sign) return '落';
  return '';
}

/* ─── House Rulers (Modern) ─── */

const SIGN_RULER: Record<string, string> = {
  '白羊': '火星', '金牛': '金星', '双子': '水星', '巨蟹': '月亮',
  '狮子': '太阳', '处女': '水星', '天秤': '金星', '天蝎': '冥王星',
  '射手': '木星', '摩羯': '土星', '水瓶': '天王星', '双鱼': '海王星',
};

/* ─── Math Helpers ─── */

function normalize(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Convert ecliptic longitude to chart angle (ASC = left/180°, counterclockwise) */
function lonToChartAngle(lon: number, asc: number): number {
  return normalize(180 + lon - asc);
}

/** Convert chart math angle (degrees, counterclockwise from right) to SVG coordinates */
function polarToXY(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

/* ─────────────────────────────────────── */
/* Main Content */
/* ─────────────────────────────────────── */

function ChartContent() {
  const searchParams = useSearchParams();
  const paramProfileId = searchParams.get('profileId');

  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [tab, setTab] = useState<Tab>('astrology');
  const [astroSubTab, setAstroSubTab] = useState<AstroSubTab>('chart');
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
          longitude: profile.longitude, latitude: profile.latitude,
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
          <Link href="/profile" className="rounded-lg px-4 py-2 text-sm" style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}>
            前往档案管理
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 pb-24">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <Link href="/fortune" className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <span>&larr;</span>
            <span>☉</span>
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 500 }}>专业星盘</span>
          </Link>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {profile.name} · {profile.year}.{profile.month}.{profile.day}
          </div>
        </div>

        {/* System Tabs: 八字 / 紫微 / 星盘 */}
        <div className="mb-4 flex gap-2">
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

        {/* Astrology Sub-tabs */}
        {tab === 'astrology' && (
          <div className="mb-4 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {([['chart', '星盘图表'], ['params', '常用参数'], ['aspects', '相位表']] as [AstroSubTab, string][]).map(([st, label]) => (
              <button
                key={st}
                onClick={() => setAstroSubTab(st)}
                className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition"
                style={astroSubTab === st
                  ? { background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }
                  : { background: 'var(--bg-surface)', color: 'var(--text-tertiary)', border: '1px solid transparent' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {loading && <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>计算中...</div>}
        {error && <div className="text-center py-12" style={{ color: 'var(--error)' }}>{error}</div>}

        {/* Bazi */}
        {tab === 'bazi' && baziData && !loading && <BaziDisplay data={baziData} />}

        {/* Ziwei */}
        {tab === 'ziwei' && ziweiData && !loading && <ZiweiDisplay data={ziweiData} />}

        {/* Astrology */}
        {tab === 'astrology' && astroData && !loading && (
          <>
            {astroSubTab === 'chart' && <NatalChartSVG chart={astroData.chart} />}
            {astroSubTab === 'params' && <ParamsDisplay chart={astroData.chart} />}
            {astroSubTab === 'aspects' && <AspectGrid chart={astroData.chart} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* SVG Natal Chart Wheel                  */
/* ═══════════════════════════════════════ */

function NatalChartSVG({ chart }: { chart: AstrologyChart }) {
  const { planets, houses, aspects, ascendant, midheaven } = chart;
  const SIZE = 380;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R_OUTER = 170;      // outer zodiac ring
  const R_ZODIAC = 150;     // inner edge of zodiac ring
  const R_HOUSE_OUTER = 148; // house cusp line start
  const R_HOUSE_INNER = 60;  // house cusp line end (center area)
  const R_PLANET = 124;      // planet label radius
  const R_DEGREE = 138;      // degree text radius
  const R_HOUSE_NUM = 105;   // house number radius
  const R_ASPECT = 55;       // aspect line circle

  /** Ecliptic longitude → chart angle (math angle, counterclockwise, 0=right) */
  const toAngle = (lon: number) => lonToChartAngle(lon, ascendant);
  const toXY = (r: number, lon: number) => polarToXY(CX, CY, r, toAngle(lon));

  // Zodiac sign segments (each 30°)
  const signSegments = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const startLon = i * 30;
      const endLon = (i + 1) * 30;
      const midLon = startLon + 15;
      const startAngle = toAngle(startLon);
      const endAngle = toAngle(endLon);

      // Arc path for sign segment
      const p1 = polarToXY(CX, CY, R_OUTER, startAngle);
      const p2 = polarToXY(CX, CY, R_OUTER, endAngle);
      const p3 = polarToXY(CX, CY, R_ZODIAC, endAngle);
      const p4 = polarToXY(CX, CY, R_ZODIAC, startAngle);

      // For SVG arc: since we go counterclockwise and arc is 30°, sweep is 0 (short arc)
      // But SVG arcs go clockwise, so we need to handle the direction
      const largeArc = 0;
      const sweepOuter = 0; // counterclockwise in SVG = sweep-flag 0
      const sweepInner = 1;

      const path = `M ${p1.x} ${p1.y} A ${R_OUTER} ${R_OUTER} 0 ${largeArc} ${sweepOuter} ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${R_ZODIAC} ${R_ZODIAC} 0 ${largeArc} ${sweepInner} ${p4.x} ${p4.y} Z`;

      const glyphPos = polarToXY(CX, CY, (R_OUTER + R_ZODIAC) / 2, toAngle(midLon));

      return { i, path, glyphPos, color: SIGN_ELEMENT_COLORS[i], glyph: SIGN_GLYPHS[i] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ascendant]);

  // House cusp lines
  const houseLines = useMemo(() => {
    return houses.map((h) => {
      const angle = toAngle(h.longitude);
      const pOuter = polarToXY(CX, CY, R_HOUSE_OUTER, angle);
      const pInner = polarToXY(CX, CY, R_HOUSE_INNER, angle);
      const isAngular = h.number === 1 || h.number === 4 || h.number === 7 || h.number === 10;
      return { ...h, pOuter, pInner, isAngular, angle };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houses, ascendant]);

  // House numbers positioned in the middle of each house sector
  const houseNumbers = useMemo(() => {
    return houses.map((h, idx) => {
      const nextIdx = (idx + 1) % 12;
      const lon1 = h.longitude;
      const lon2 = houses[nextIdx].longitude;
      let midLon = (lon1 + lon2) / 2;
      if (Math.abs(lon2 - lon1) > 180) {
        midLon = normalize(midLon + 180);
      }
      const pos = polarToXY(CX, CY, R_HOUSE_NUM, toAngle(midLon));
      return { number: h.number, ...pos };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houses, ascendant]);

  // Planet positions with collision avoidance
  const planetPositions = useMemo(() => {
    const sorted = [...planets].map(p => ({
      ...p,
      chartAngle: toAngle(p.longitude),
    })).sort((a, b) => a.chartAngle - b.chartAngle);

    // Simple collision avoidance: push apart planets that are too close
    const MIN_ANGLE = 8; // minimum degrees apart on chart
    for (let pass = 0; pass < 5; pass++) {
      for (let i = 0; i < sorted.length; i++) {
        const next = sorted[(i + 1) % sorted.length];
        let diff = next.chartAngle - sorted[i].chartAngle;
        if (diff < 0) diff += 360;
        if (diff < MIN_ANGLE && diff > 0) {
          const push = (MIN_ANGLE - diff) / 2;
          sorted[i].chartAngle = normalize(sorted[i].chartAngle - push);
          next.chartAngle = normalize(next.chartAngle + push);
        }
      }
    }

    return sorted.map(p => {
      const pos = polarToXY(CX, CY, R_PLANET, p.chartAngle);
      const degPos = polarToXY(CX, CY, R_DEGREE, p.chartAngle);
      return { ...p, pos, degPos };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planets, ascendant]);

  // Aspect lines
  const aspectLines = useMemo(() => {
    return aspects.map((a) => {
      const p1 = planets.find(p => p.name === a.planet1);
      const p2 = planets.find(p => p.name === a.planet2);
      if (!p1 || !p2) return null;
      const pos1 = polarToXY(CX, CY, R_ASPECT, toAngle(p1.longitude));
      const pos2 = polarToXY(CX, CY, R_ASPECT, toAngle(p2.longitude));
      const color = a.type === '合相' ? '#8070b0' :
                    a.type === '六合' || a.type === '三合' ? '#4090d0' :
                    a.type === '四分' || a.type === '对冲' ? '#d04050' : '#999';
      const dashed = a.type === '六合' || a.type === '三合';
      return { ...a, pos1, pos2, color, dashed };
    }).filter(Boolean) as (Aspect & { pos1: { x: number; y: number }; pos2: { x: number; y: number }; color: string; dashed: boolean })[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspects, planets, ascendant]);

  // ASC / MC markers
  const ascPos = toXY(R_OUTER + 14, ascendant);
  const mcPos = toXY(R_OUTER + 14, midheaven);

  // Bottom summary tags
  const sunPlanet = planets.find(p => p.name === '太阳');
  const moonPlanet = planets.find(p => p.name === '月亮');
  const ascSignIndex = Math.floor(normalize(ascendant) / 30);

  return (
    <div className="space-y-4">
      {/* SVG Chart */}
      <div className="flex justify-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ maxWidth: '100%', height: 'auto' }}>
          {/* Background */}
          <circle cx={CX} cy={CY} r={R_OUTER + 2} fill="var(--bg-surface)" />

          {/* Zodiac ring segments */}
          {signSegments.map(s => (
            <g key={s.i}>
              <path d={s.path} fill={s.color} opacity={0.12} stroke={s.color} strokeWidth={0.5} strokeOpacity={0.3} />
              <text x={s.glyphPos.x} y={s.glyphPos.y} textAnchor="middle" dominantBaseline="central"
                fontSize={13} fill={s.color} fontWeight={600}>{s.glyph}</text>
            </g>
          ))}

          {/* Zodiac ring borders */}
          <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke="var(--border-default)" strokeWidth={0.5} />
          <circle cx={CX} cy={CY} r={R_ZODIAC} fill="none" stroke="var(--border-default)" strokeWidth={0.5} />

          {/* Inner circle for aspects */}
          <circle cx={CX} cy={CY} r={R_HOUSE_INNER} fill="var(--bg-base)" stroke="var(--border-subtle)" strokeWidth={0.5} />

          {/* Sign division lines on zodiac ring */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = toAngle(i * 30);
            const p1 = polarToXY(CX, CY, R_OUTER, angle);
            const p2 = polarToXY(CX, CY, R_ZODIAC, angle);
            return <line key={`sign-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--border-default)" strokeWidth={0.5} />;
          })}

          {/* House cusp lines */}
          {houseLines.map(h => (
            <line key={`house-${h.number}`}
              x1={h.pOuter.x} y1={h.pOuter.y} x2={h.pInner.x} y2={h.pInner.y}
              stroke={h.isAngular ? 'var(--text-secondary)' : 'var(--border-default)'}
              strokeWidth={h.isAngular ? 1.2 : 0.5}
              strokeDasharray={h.isAngular ? undefined : '3,3'}
            />
          ))}

          {/* House numbers */}
          {houseNumbers.map(h => (
            <text key={`hnum-${h.number}`} x={h.x} y={h.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={9} fill="var(--text-tertiary)" fontWeight={400}>
              {h.number}
            </text>
          ))}

          {/* Aspect lines */}
          {aspectLines.map((a, i) => (
            <line key={`asp-${i}`}
              x1={a.pos1.x} y1={a.pos1.y} x2={a.pos2.x} y2={a.pos2.y}
              stroke={a.color} strokeWidth={0.8} opacity={0.6}
              strokeDasharray={a.dashed ? '3,2' : undefined}
            />
          ))}

          {/* Planet labels */}
          {planetPositions.map(p => (
            <g key={p.name}>
              {/* Planet dot on zodiac ring */}
              <circle cx={polarToXY(CX, CY, R_ZODIAC + 2, toAngle(p.longitude)).x}
                cy={polarToXY(CX, CY, R_ZODIAC + 2, toAngle(p.longitude)).y}
                r={2} fill={PLANET_COLORS[p.name] || '#888'} />
              {/* Planet short name */}
              <text x={p.pos.x} y={p.pos.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={11} fontWeight={600}
                fill={PLANET_COLORS[p.name] || '#888'}>
                {PLANET_SHORT[p.name] || p.name[0]}
              </text>
              {/* Degree label */}
              <text x={p.degPos.x} y={p.degPos.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={7} fill="var(--text-tertiary)">
                {p.degree}°
              </text>
            </g>
          ))}

          {/* ASC marker */}
          <text x={ascPos.x} y={ascPos.y} textAnchor="middle" dominantBaseline="central"
            fontSize={9} fill="var(--accent-primary)" fontWeight={700}>
            升
          </text>

          {/* MC marker */}
          <text x={mcPos.x} y={mcPos.y} textAnchor="middle" dominantBaseline="central"
            fontSize={9} fill="var(--accent-primary)" fontWeight={700}>
            中
          </text>
        </svg>
      </div>

      {/* Bottom summary tags */}
      <div className="flex justify-center gap-3">
        {sunPlanet && (
          <span className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ background: 'var(--accent-warm-dim)', color: 'var(--accent-warm)' }}>
            ☉ {sunPlanet.sign}座
          </span>
        )}
        {moonPlanet && (
          <span className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)' }}>
            ☽ {moonPlanet.sign}座
          </span>
        )}
        <span className="rounded-full px-3 py-1 text-xs font-medium"
          style={{ background: 'var(--accent-secondary-dim)', color: 'var(--accent-secondary)' }}>
          ↑ {SIGNS_CN[ascSignIndex]}座
        </span>
      </div>

      {/* AI Question Prompt */}
      <Link href="/chat"
        className="mx-auto flex max-w-sm items-center justify-between rounded-xl px-4 py-3"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>什么时候适合做重大决定？</span>
        <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>问AI →</span>
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* Params Display (常用参数)               */
/* ═══════════════════════════════════════ */

function ParamsDisplay({ chart }: { chart: AstrologyChart }) {
  const { planets, houses } = chart;

  // Find which house a ruler planet is in
  function getRulerHouse(sign: string): { ruler: string; house: number } {
    const ruler = SIGN_RULER[sign];
    if (!ruler) return { ruler: '-', house: 0 };
    const p = planets.find(pl => pl.name === ruler);
    return { ruler, house: p?.house || 0 };
  }

  return (
    <div className="space-y-6">
      {/* Planet Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
          行星位置
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
              <th className="px-3 py-2 text-left font-medium text-xs">行星</th>
              <th className="px-3 py-2 text-left font-medium text-xs">星座</th>
              <th className="px-3 py-2 text-center font-medium text-xs">度数</th>
              <th className="px-3 py-2 text-center font-medium text-xs">宫</th>
              <th className="px-3 py-2 text-center font-medium text-xs">逆</th>
              <th className="px-3 py-2 text-center font-medium text-xs">庙旺</th>
            </tr>
          </thead>
          <tbody>
            {planets.map((p, i) => {
              const signIdx = SIGNS_CN.indexOf(p.sign);
              const dignity = getDignity(p.name, p.sign);
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <span style={{ color: PLANET_COLORS[p.name] || '#888' }}>{PLANET_GLYPHS[p.name] || '·'}</span>
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1">
                      <span style={{ color: signIdx >= 0 ? SIGN_ELEMENT_COLORS[signIdx] : '#888' }}>
                        {signIdx >= 0 ? SIGN_GLYPHS[signIdx] : ''}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{p.sign}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {p.degree}°{String(p.minute).padStart(2, '0')}&apos;
                  </td>
                  <td className="px-3 py-2 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {p.house}
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    {p.retrograde && <span style={{ color: 'var(--error)' }}>R</span>}
                  </td>
                  <td className="px-3 py-2 text-center text-xs">
                    {dignity && (
                      <span className="rounded px-1 py-0.5" style={{
                        background: dignity === '庙' || dignity === '旺' ? 'rgba(58,191,182,0.1)' : 'rgba(192,80,96,0.1)',
                        color: dignity === '庙' || dignity === '旺' ? 'var(--accent-secondary)' : 'var(--error)',
                        fontSize: '0.65rem',
                      }}>
                        {dignity}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* House Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
          宫位表
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}>
              <th className="px-3 py-2 text-left font-medium text-xs">宫位</th>
              <th className="px-3 py-2 text-left font-medium text-xs">星座</th>
              <th className="px-3 py-2 text-center font-medium text-xs">度数</th>
              <th className="px-3 py-2 text-left font-medium text-xs">宫主星</th>
              <th className="px-3 py-2 text-center font-medium text-xs">飞入</th>
            </tr>
          </thead>
          <tbody>
            {houses.map((h, i) => {
              const signIdx = SIGNS_CN.indexOf(h.sign);
              const { ruler, house: rulerHouse } = getRulerHouse(h.sign);
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>
                    第{h.number}宫
                    {h.number === 1 && <span className="ml-1 text-xs" style={{ color: 'var(--accent-primary)' }}>ASC</span>}
                    {h.number === 10 && <span className="ml-1 text-xs" style={{ color: 'var(--accent-primary)' }}>MC</span>}
                    {h.number === 7 && <span className="ml-1 text-xs" style={{ color: 'var(--accent-primary)' }}>DSC</span>}
                    {h.number === 4 && <span className="ml-1 text-xs" style={{ color: 'var(--accent-primary)' }}>IC</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1">
                      <span style={{ color: signIdx >= 0 ? SIGN_ELEMENT_COLORS[signIdx] : '#888' }}>
                        {signIdx >= 0 ? SIGN_GLYPHS[signIdx] : ''}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{h.sign}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {h.degree}°{String(h.minute).padStart(2, '0')}&apos;
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {PLANET_GLYPHS[ruler] || ''} {ruler}
                  </td>
                  <td className="px-3 py-2 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {rulerHouse > 0 ? `${rulerHouse}宫` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* Aspect Grid (相位表)                    */
/* ═══════════════════════════════════════ */

function AspectGrid({ chart }: { chart: AstrologyChart }) {
  const { planets, aspects } = chart;

  const ASPECT_COLORS: Record<string, string> = {
    '合相': '#8060b0',
    '六合': '#40a060',
    '四分': '#d04040',
    '三合': '#4080d0',
    '对冲': '#d08030',
  };

  const ASPECT_SHORT: Record<string, string> = {
    '合相': '合', '六合': '六', '四分': '刑', '三合': '拱', '对冲': '冲',
  };

  // Build aspect lookup map
  const aspectMap = new Map<string, Aspect>();
  for (const a of aspects) {
    aspectMap.set(`${a.planet1}-${a.planet2}`, a);
    aspectMap.set(`${a.planet2}-${a.planet1}`, a);
  }

  const CELL = 32;

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 overflow-x-auto" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="mb-3 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>相位矩阵</div>
        <div style={{ minWidth: planets.length * CELL + CELL }}>
          {/* Lower-triangular matrix */}
          <table className="border-collapse" style={{ margin: '0 auto' }}>
            <tbody>
              {planets.map((pRow, rowIdx) => (
                <tr key={pRow.name}>
                  {/* Row header (left) */}
                  <td className="text-center" style={{ width: CELL, height: CELL, fontSize: 10, color: PLANET_COLORS[pRow.name] || '#888', fontWeight: 600 }}>
                    {PLANET_SHORT[pRow.name] || pRow.name[0]}
                  </td>
                  {/* Cells for columns 0..rowIdx-1 */}
                  {planets.slice(0, rowIdx).map((pCol) => {
                    const asp = aspectMap.get(`${pRow.name}-${pCol.name}`);
                    return (
                      <td key={pCol.name} className="text-center" style={{
                        width: CELL, height: CELL,
                        border: '1px solid var(--border-subtle)',
                        background: asp ? `${ASPECT_COLORS[asp.type]}15` : 'transparent',
                      }}>
                        {asp && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: ASPECT_COLORS[asp.type] || '#888' }}>
                            {ASPECT_SHORT[asp.type] || asp.type[0]}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {/* Diagonal cell (planet header) */}
                  <td className="text-center" style={{
                    width: CELL, height: CELL,
                    background: 'var(--bg-hover)',
                    fontSize: 10, fontWeight: 600,
                    color: PLANET_COLORS[pRow.name] || '#888',
                  }}>
                    {PLANET_GLYPHS[pRow.name] || pRow.name[0]}
                  </td>
                  {/* Empty cells after diagonal */}
                  {Array.from({ length: planets.length - rowIdx - 1 }, (_, k) => (
                    <td key={`empty-${k}`} style={{ width: CELL, height: CELL }} />
                  ))}
                </tr>
              ))}
              {/* Bottom header row */}
              <tr>
                <td />
                {planets.map((p) => (
                  <td key={p.name} className="text-center" style={{ width: CELL, height: CELL, fontSize: 10, color: PLANET_COLORS[p.name] || '#888', fontWeight: 600 }}>
                    {PLANET_SHORT[p.name] || p.name[0]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {Object.entries(ASPECT_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1 text-xs">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color, opacity: 0.7 }} />
              <span style={{ color: 'var(--text-tertiary)' }}>{ASPECT_SHORT[type]} {type}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* Bazi Display (八字)                     */
/* ═══════════════════════════════════════ */

function BaziDisplay({ data }: { data: { timeInfo: TimeStandardization; chart: BaziChart } }) {
  const { timeInfo, chart } = data;
  const p = chart.fourPillars;

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4 text-sm" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
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
              <td className="p-1 text-right">十神</td>
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
              <td className="p-1 text-right">藏干</td>
              <td className="p-1">{chart.hideGan.year.join(' ')}</td>
              <td className="p-1">{chart.hideGan.month.join(' ')}</td>
              <td className="p-1">{chart.hideGan.day.join(' ')}</td>
              <td className="p-1">{chart.hideGan.time.join(' ')}</td>
            </tr>
            <tr className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <td className="p-1 text-right">纳音</td>
              <td className="p-1">{chart.nayin.year}</td>
              <td className="p-1">{chart.nayin.month}</td>
              <td className="p-1">{chart.nayin.day}</td>
              <td className="p-1">{chart.nayin.time}</td>
            </tr>
          </tbody>
        </table>
      </div>

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

/* ═══════════════════════════════════════ */
/* Ziwei Display (紫微)                    */
/* ═══════════════════════════════════════ */

function ZiweiDisplay({ data }: { data: { timeInfo: TimeStandardization; chart: ZiweiChart } }) {
  const { timeInfo, chart } = data;

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4 text-sm" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {chart.cells.map((cell, i) => (
          <div key={i} className="rounded-xl p-3"
            style={cell.temples.some(t => t.includes('命宫'))
              ? { border: '1px solid var(--accent-warm-dim)', background: 'rgba(184,150,62,0.05)' }
              : { border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }
            }>
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
                    <span key={j} className="rounded px-1.5 py-0.5 text-sm font-medium"
                      style={s.fourInfluence
                        ? { background: 'var(--accent-primary-dim)', color: 'var(--text-primary)' }
                        : { color: 'var(--text-primary)' }
                      }>
                      {s.name}
                      {s.fourInfluence && <span className="ml-0.5 text-xs" style={{ color: 'var(--accent-warm)' }}>{s.fourInfluence}</span>}
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
