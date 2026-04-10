'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { AstrologyChart, Aspect } from '@/types';

/* ─── Zodiac & Planet Constants ─── */

const SIGNS_CN = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const SIGN_ELEMENT_COLORS = [
  '#dc4040', '#4a9060', '#c89030', '#4088c8',
  '#dc4040', '#4a9060', '#c89030', '#4088c8',
  '#dc4040', '#4a9060', '#c89030', '#4088c8',
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

/* ─── Dignities ─── */

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

const SIGN_RULER: Record<string, string> = {
  '白羊': '火星', '金牛': '金星', '双子': '水星', '巨蟹': '月亮',
  '狮子': '太阳', '处女': '水星', '天秤': '金星', '天蝎': '冥王星',
  '射手': '木星', '摩羯': '土星', '水瓶': '天王星', '双鱼': '海王星',
};

/* ─── Math ─── */

function normalize(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function lonToChartAngle(lon: number, asc: number): number {
  return normalize(180 + lon - asc);
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

/* ═══════════════════════════════════════ */
/* SVG Natal Chart Wheel                  */
/* ═══════════════════════════════════════ */

export function NatalChartSVG({ chart }: { chart: AstrologyChart }) {
  const { planets, houses, aspects, ascendant, midheaven } = chart;
  const SIZE = 380;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R_OUTER = 170;
  const R_ZODIAC = 150;
  const R_HOUSE_OUTER = 148;
  const R_HOUSE_INNER = 60;
  const R_PLANET = 124;
  const R_DEGREE = 138;
  const R_HOUSE_NUM = 105;
  const R_ASPECT = 55;

  const toAngle = (lon: number) => lonToChartAngle(lon, ascendant);
  const toXY = (r: number, lon: number) => polarToXY(CX, CY, r, toAngle(lon));

  const signSegments = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const startLon = i * 30;
      const endLon = (i + 1) * 30;
      const midLon = startLon + 15;
      const startAngle = toAngle(startLon);
      const endAngle = toAngle(endLon);
      const p1 = polarToXY(CX, CY, R_OUTER, startAngle);
      const p2 = polarToXY(CX, CY, R_OUTER, endAngle);
      const p3 = polarToXY(CX, CY, R_ZODIAC, endAngle);
      const p4 = polarToXY(CX, CY, R_ZODIAC, startAngle);
      const path = `M ${p1.x} ${p1.y} A ${R_OUTER} ${R_OUTER} 0 0 0 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${R_ZODIAC} ${R_ZODIAC} 0 0 1 ${p4.x} ${p4.y} Z`;
      const glyphPos = polarToXY(CX, CY, (R_OUTER + R_ZODIAC) / 2, toAngle(midLon));
      return { i, path, glyphPos, color: SIGN_ELEMENT_COLORS[i], glyph: SIGN_GLYPHS[i] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ascendant]);

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

  const houseNumbers = useMemo(() => {
    return houses.map((h, idx) => {
      const nextIdx = (idx + 1) % 12;
      const lon1 = h.longitude;
      const lon2 = houses[nextIdx].longitude;
      let midLon = (lon1 + lon2) / 2;
      if (Math.abs(lon2 - lon1) > 180) midLon = normalize(midLon + 180);
      const pos = polarToXY(CX, CY, R_HOUSE_NUM, toAngle(midLon));
      return { number: h.number, ...pos };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [houses, ascendant]);

  const planetPositions = useMemo(() => {
    const sorted = [...planets].map(p => ({ ...p, chartAngle: toAngle(p.longitude) })).sort((a, b) => a.chartAngle - b.chartAngle);
    const MIN_ANGLE = 8;
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

  const aspectLines = useMemo(() => {
    return aspects.map((a) => {
      const p1 = planets.find(p => p.name === a.planet1);
      const p2 = planets.find(p => p.name === a.planet2);
      if (!p1 || !p2) return null;
      const pos1 = polarToXY(CX, CY, R_ASPECT, toAngle(p1.longitude));
      const pos2 = polarToXY(CX, CY, R_ASPECT, toAngle(p2.longitude));
      const color = a.type === '合相' ? '#8070b0' : a.type === '六合' || a.type === '三合' ? '#4090d0' : a.type === '四分' || a.type === '对冲' ? '#d04050' : '#999';
      const dashed = a.type === '六合' || a.type === '三合';
      return { ...a, pos1, pos2, color, dashed };
    }).filter(Boolean) as (Aspect & { pos1: { x: number; y: number }; pos2: { x: number; y: number }; color: string; dashed: boolean })[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspects, planets, ascendant]);

  const ascPos = toXY(R_OUTER + 14, ascendant);
  const mcPos = toXY(R_OUTER + 14, midheaven);
  const sunPlanet = planets.find(p => p.name === '太阳');
  const moonPlanet = planets.find(p => p.name === '月亮');
  const ascSignIndex = Math.floor(normalize(ascendant) / 30);

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ maxWidth: '100%', height: 'auto' }}>
          <circle cx={CX} cy={CY} r={R_OUTER + 2} fill="var(--bg-surface)" />
          {signSegments.map(s => (
            <g key={s.i}>
              <path d={s.path} fill={s.color} opacity={0.12} stroke={s.color} strokeWidth={0.5} strokeOpacity={0.3} />
              <text x={s.glyphPos.x} y={s.glyphPos.y} textAnchor="middle" dominantBaseline="central" fontSize={13} fill={s.color} fontWeight={600}>{s.glyph}</text>
            </g>
          ))}
          <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke="var(--border-default)" strokeWidth={0.5} />
          <circle cx={CX} cy={CY} r={R_ZODIAC} fill="none" stroke="var(--border-default)" strokeWidth={0.5} />
          <circle cx={CX} cy={CY} r={R_HOUSE_INNER} fill="var(--bg-base)" stroke="var(--border-subtle)" strokeWidth={0.5} />
          {Array.from({ length: 12 }, (_, i) => {
            const angle = toAngle(i * 30);
            const sp1 = polarToXY(CX, CY, R_OUTER, angle);
            const sp2 = polarToXY(CX, CY, R_ZODIAC, angle);
            return <line key={`sign-${i}`} x1={sp1.x} y1={sp1.y} x2={sp2.x} y2={sp2.y} stroke="var(--border-default)" strokeWidth={0.5} />;
          })}
          {houseLines.map(h => (
            <line key={`house-${h.number}`} x1={h.pOuter.x} y1={h.pOuter.y} x2={h.pInner.x} y2={h.pInner.y}
              stroke={h.isAngular ? 'var(--text-secondary)' : 'var(--border-default)'}
              strokeWidth={h.isAngular ? 1.2 : 0.5} strokeDasharray={h.isAngular ? undefined : '3,3'} />
          ))}
          {houseNumbers.map(h => (
            <text key={`hnum-${h.number}`} x={h.x} y={h.y} textAnchor="middle" dominantBaseline="central" fontSize={9} fill="var(--text-tertiary)">{h.number}</text>
          ))}
          {aspectLines.map((a, i) => (
            <line key={`asp-${i}`} x1={a.pos1.x} y1={a.pos1.y} x2={a.pos2.x} y2={a.pos2.y}
              stroke={a.color} strokeWidth={0.8} opacity={0.6} strokeDasharray={a.dashed ? '3,2' : undefined} />
          ))}
          {planetPositions.map(p => (
            <g key={p.name}>
              <circle cx={polarToXY(CX, CY, R_ZODIAC + 2, toAngle(p.longitude)).x} cy={polarToXY(CX, CY, R_ZODIAC + 2, toAngle(p.longitude)).y} r={2} fill={PLANET_COLORS[p.name] || '#888'} />
              <text x={p.pos.x} y={p.pos.y} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600} fill={PLANET_COLORS[p.name] || '#888'}>{PLANET_SHORT[p.name] || p.name[0]}</text>
              <text x={p.degPos.x} y={p.degPos.y} textAnchor="middle" dominantBaseline="central" fontSize={7} fill="var(--text-tertiary)">{p.degree}°</text>
            </g>
          ))}
          <text x={ascPos.x} y={ascPos.y} textAnchor="middle" dominantBaseline="central" fontSize={9} fill="var(--accent-primary)" fontWeight={700}>升</text>
          <text x={mcPos.x} y={mcPos.y} textAnchor="middle" dominantBaseline="central" fontSize={9} fill="var(--accent-primary)" fontWeight={700}>中</text>
        </svg>
      </div>
      <div className="flex justify-center gap-3">
        {sunPlanet && <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--accent-warm-dim)', color: 'var(--accent-warm)' }}>☉ {sunPlanet.sign}座</span>}
        {moonPlanet && <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)' }}>☽ {moonPlanet.sign}座</span>}
        <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'var(--accent-secondary-dim)', color: 'var(--accent-secondary)' }}>↑ {SIGNS_CN[ascSignIndex]}座</span>
      </div>
      <Link href="/chat" className="mx-auto flex max-w-sm items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>什么时候适合做重大决定？</span>
        <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>问AI →</span>
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* Params Display                         */
/* ═══════════════════════════════════════ */

export function ParamsDisplay({ chart }: { chart: AstrologyChart }) {
  const { planets, houses } = chart;

  function getRulerHouse(sign: string): { ruler: string; house: number } {
    const ruler = SIGN_RULER[sign];
    if (!ruler) return { ruler: '-', house: 0 };
    const p = planets.find(pl => pl.name === ruler);
    return { ruler, house: p?.house || 0 };
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>行星位置</div>
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
                  <td className="px-3 py-2"><span className="flex items-center gap-1.5"><span style={{ color: PLANET_COLORS[p.name] || '#888' }}>{PLANET_GLYPHS[p.name] || '·'}</span><span className="text-xs" style={{ color: 'var(--text-primary)' }}>{p.name}</span></span></td>
                  <td className="px-3 py-2"><span className="flex items-center gap-1"><span style={{ color: signIdx >= 0 ? SIGN_ELEMENT_COLORS[signIdx] : '#888' }}>{signIdx >= 0 ? SIGN_GLYPHS[signIdx] : ''}</span><span className="text-xs" style={{ color: 'var(--text-primary)' }}>{p.sign}</span></span></td>
                  <td className="px-3 py-2 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>{p.degree}°{String(p.minute).padStart(2, '0')}&apos;</td>
                  <td className="px-3 py-2 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>{p.house}</td>
                  <td className="px-3 py-2 text-center text-xs">{p.retrograde && <span style={{ color: 'var(--error)' }}>R</span>}</td>
                  <td className="px-3 py-2 text-center text-xs">{dignity && <span className="rounded px-1 py-0.5" style={{ background: dignity === '庙' || dignity === '旺' ? 'rgba(58,191,182,0.1)' : 'rgba(192,80,96,0.1)', color: dignity === '庙' || dignity === '旺' ? 'var(--accent-secondary)' : 'var(--error)', fontSize: '0.65rem' }}>{dignity}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>宫位表</div>
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
                    {h.number === 1 && <span className="ml-1" style={{ color: 'var(--accent-primary)', fontSize: '0.65rem' }}>ASC</span>}
                    {h.number === 10 && <span className="ml-1" style={{ color: 'var(--accent-primary)', fontSize: '0.65rem' }}>MC</span>}
                    {h.number === 7 && <span className="ml-1" style={{ color: 'var(--accent-primary)', fontSize: '0.65rem' }}>DSC</span>}
                    {h.number === 4 && <span className="ml-1" style={{ color: 'var(--accent-primary)', fontSize: '0.65rem' }}>IC</span>}
                  </td>
                  <td className="px-3 py-2"><span className="flex items-center gap-1"><span style={{ color: signIdx >= 0 ? SIGN_ELEMENT_COLORS[signIdx] : '#888' }}>{signIdx >= 0 ? SIGN_GLYPHS[signIdx] : ''}</span><span className="text-xs" style={{ color: 'var(--text-primary)' }}>{h.sign}</span></span></td>
                  <td className="px-3 py-2 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>{h.degree}°{String(h.minute).padStart(2, '0')}&apos;</td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{PLANET_GLYPHS[ruler] || ''} {ruler}</td>
                  <td className="px-3 py-2 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>{rulerHouse > 0 ? `${rulerHouse}宫` : '-'}</td>
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
/* Aspect Grid                            */
/* ═══════════════════════════════════════ */

export function AspectGrid({ chart }: { chart: AstrologyChart }) {
  const { planets, aspects } = chart;
  const ASPECT_COLORS: Record<string, string> = { '合相': '#8060b0', '六合': '#40a060', '四分': '#d04040', '三合': '#4080d0', '对冲': '#d08030' };
  const ASPECT_SHORT: Record<string, string> = { '合相': '合', '六合': '六', '四分': '刑', '三合': '拱', '对冲': '冲' };

  const aspectMap = new Map<string, Aspect>();
  for (const a of aspects) {
    aspectMap.set(`${a.planet1}-${a.planet2}`, a);
    aspectMap.set(`${a.planet2}-${a.planet1}`, a);
  }
  const CELL = 32;

  return (
    <div className="rounded-xl p-4 overflow-x-auto" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
      <div className="mb-3 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>相位矩阵</div>
      <div style={{ minWidth: planets.length * CELL + CELL }}>
        <table className="border-collapse" style={{ margin: '0 auto' }}>
          <tbody>
            {planets.map((pRow, rowIdx) => (
              <tr key={pRow.name}>
                <td className="text-center" style={{ width: CELL, height: CELL, fontSize: 10, color: PLANET_COLORS[pRow.name] || '#888', fontWeight: 600 }}>{PLANET_SHORT[pRow.name] || pRow.name[0]}</td>
                {planets.slice(0, rowIdx).map((pCol) => {
                  const asp = aspectMap.get(`${pRow.name}-${pCol.name}`);
                  return (
                    <td key={pCol.name} className="text-center" style={{ width: CELL, height: CELL, border: '1px solid var(--border-subtle)', background: asp ? `${ASPECT_COLORS[asp.type]}15` : 'transparent' }}>
                      {asp && <span style={{ fontSize: 10, fontWeight: 600, color: ASPECT_COLORS[asp.type] || '#888' }}>{ASPECT_SHORT[asp.type] || asp.type[0]}</span>}
                    </td>
                  );
                })}
                <td className="text-center" style={{ width: CELL, height: CELL, background: 'var(--bg-hover)', fontSize: 10, fontWeight: 600, color: PLANET_COLORS[pRow.name] || '#888' }}>{PLANET_GLYPHS[pRow.name] || pRow.name[0]}</td>
                {Array.from({ length: planets.length - rowIdx - 1 }, (_, k) => <td key={`empty-${k}`} style={{ width: CELL, height: CELL }} />)}
              </tr>
            ))}
            <tr>
              <td />
              {planets.map((p) => <td key={p.name} className="text-center" style={{ width: CELL, height: CELL, fontSize: 10, color: PLANET_COLORS[p.name] || '#888', fontWeight: 600 }}>{PLANET_SHORT[p.name] || p.name[0]}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {Object.entries(ASPECT_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color, opacity: 0.7 }} />
            <span style={{ color: 'var(--text-tertiary)' }}>{ASPECT_SHORT[type]} {type}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
