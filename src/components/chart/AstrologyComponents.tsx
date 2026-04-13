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

/* ═══════════════════════════════════════ */
/* Transit Overlay Chart (双层盘)          */
/* ═══════════════════════════════════════ */

export function TransitOverlaySVG({ natalChart, transitChart }: { natalChart: AstrologyChart; transitChart: AstrologyChart }) {
  const { planets: natalPlanets, houses, aspects: natalAspects, ascendant, midheaven } = natalChart;
  const { planets: transitPlanets } = transitChart;
  const SIZE = 380;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R_OUTER = 170;
  const R_ZODIAC = 150;
  const R_HOUSE_OUTER = 148;
  const R_HOUSE_INNER = 70;
  const R_NATAL = 120;
  const R_TRANSIT = 100;
  const R_HOUSE_NUM = 90;

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
  }, [ascendant]);

  const houseLines = houses.map(h => {
    const angle = toAngle(h.longitude);
    const pOuter = polarToXY(CX, CY, R_HOUSE_OUTER, angle);
    const pInner = polarToXY(CX, CY, R_HOUSE_INNER, angle);
    const isAngular = [1, 4, 7, 10].includes(h.number);
    return { ...h, pOuter, pInner, isAngular };
  });

  const houseNumbers = houses.map((h, idx) => {
    const nextIdx = (idx + 1) % 12;
    const lon1 = h.longitude;
    const lon2 = houses[nextIdx].longitude;
    let midLon = (lon1 + lon2) / 2;
    if (Math.abs(lon2 - lon1) > 180) midLon = normalize(midLon + 180);
    const pos = polarToXY(CX, CY, R_HOUSE_NUM, toAngle(midLon));
    return { number: h.number, ...pos };
  });

  // Natal planets (inner ring)
  const natalPositions = useMemo(() => {
    const sorted = [...natalPlanets].map(p => ({ ...p, chartAngle: toAngle(p.longitude) })).sort((a, b) => a.chartAngle - b.chartAngle);
    for (let pass = 0; pass < 5; pass++) {
      for (let i = 0; i < sorted.length; i++) {
        const next = sorted[(i + 1) % sorted.length];
        let diff = next.chartAngle - sorted[i].chartAngle;
        if (diff < 0) diff += 360;
        if (diff < 8 && diff > 0) {
          sorted[i].chartAngle = normalize(sorted[i].chartAngle - (8 - diff) / 2);
          next.chartAngle = normalize(next.chartAngle + (8 - diff) / 2);
        }
      }
    }
    return sorted.map(p => ({
      ...p,
      pos: polarToXY(CX, CY, R_NATAL, p.chartAngle),
    }));
  }, [natalPlanets, ascendant]);

  // Transit planets (outer ring, between zodiac and houses)
  const transitPositions = useMemo(() => {
    const sorted = [...transitPlanets].map(p => ({ ...p, chartAngle: toAngle(p.longitude) })).sort((a, b) => a.chartAngle - b.chartAngle);
    for (let pass = 0; pass < 5; pass++) {
      for (let i = 0; i < sorted.length; i++) {
        const next = sorted[(i + 1) % sorted.length];
        let diff = next.chartAngle - sorted[i].chartAngle;
        if (diff < 0) diff += 360;
        if (diff < 8 && diff > 0) {
          sorted[i].chartAngle = normalize(sorted[i].chartAngle - (8 - diff) / 2);
          next.chartAngle = normalize(next.chartAngle + (8 - diff) / 2);
        }
      }
    }
    return sorted.map(p => ({
      ...p,
      pos: polarToXY(CX, CY, R_TRANSIT, p.chartAngle),
    }));
  }, [transitPlanets, ascendant]);

  const ascPos = toXY(R_OUTER + 14, ascendant);
  const mcPos = toXY(R_OUTER + 14, midheaven);

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
          {/* Divider ring between natal and transit */}
          <circle cx={CX} cy={CY} r={110} fill="none" stroke="var(--border-subtle)" strokeWidth={0.3} strokeDasharray="2,3" />
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
            <text key={`hnum-${h.number}`} x={h.x} y={h.y} textAnchor="middle" dominantBaseline="central" fontSize={8} fill="var(--text-tertiary)">{h.number}</text>
          ))}
          {/* Natal planets (inner) */}
          {natalPositions.map(p => (
            <g key={`natal-${p.name}`}>
              <text x={p.pos.x} y={p.pos.y} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600} fill={PLANET_COLORS[p.name] || '#888'}>{PLANET_SHORT[p.name] || p.name[0]}</text>
            </g>
          ))}
          {/* Transit planets (outer, green-tinted) */}
          {transitPositions.map(p => (
            <g key={`transit-${p.name}`}>
              <circle cx={polarToXY(CX, CY, R_ZODIAC + 2, toAngle(p.longitude)).x} cy={polarToXY(CX, CY, R_ZODIAC + 2, toAngle(p.longitude)).y} r={2} fill="#3abfb6" />
              <text x={p.pos.x} y={p.pos.y} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill="#3abfb6">{PLANET_SHORT[p.name] || p.name[0]}</text>
            </g>
          ))}
          <text x={ascPos.x} y={ascPos.y} textAnchor="middle" dominantBaseline="central" fontSize={9} fill="var(--accent-primary)" fontWeight={700}>升</text>
          <text x={mcPos.x} y={mcPos.y} textAnchor="middle" dominantBaseline="central" fontSize={9} fill="var(--accent-primary)" fontWeight={700}>中</text>
        </svg>
      </div>
      <div className="flex justify-center gap-3">
        <span className="rounded-full px-2.5 py-1 text-[0.65rem] font-medium" style={{ background: 'rgba(123,108,184,0.08)', color: 'var(--accent-primary)' }}>● 本命</span>
        <span className="rounded-full px-2.5 py-1 text-[0.65rem] font-medium" style={{ background: 'rgba(58,191,182,0.08)', color: '#3abfb6' }}>● 行运</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* Transit Aspects List                    */
/* ═══════════════════════════════════════ */

const ASPECT_TYPE_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  '合相': { color: '#8060b0', bg: 'rgba(128,96,176,0.1)', label: '合' },
  '六合': { color: '#40a060', bg: 'rgba(64,160,96,0.1)', label: '六合' },
  '四分': { color: '#d04040', bg: 'rgba(208,64,64,0.1)', label: '刑' },
  '三合': { color: '#4080d0', bg: 'rgba(64,128,208,0.1)', label: '拱' },
  '对冲': { color: '#d08030', bg: 'rgba(208,128,48,0.1)', label: '冲' },
};

export function TransitAspectsList({ crossAspects, transitChart }: {
  crossAspects: { planet1: string; planet2: string; type: string; angle: number; orb: number }[];
  transitChart: AstrologyChart;
}) {
  const moonPlanet = transitChart.planets.find(p => p.name === '月亮');

  return (
    <div className="space-y-4">
      {moonPlanet && (
        <div className="rounded-lg px-3 py-1.5 text-xs font-medium text-center"
          style={{ background: 'rgba(123,108,184,0.06)', color: 'var(--accent-primary)', border: '1px solid rgba(123,108,184,0.12)' }}>
          今日月亮在{moonPlanet.sign}座
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
          行运相位（行运行星 → 本命行星）· {crossAspects.length} 个
        </div>
        {crossAspects.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>暂无紧密行运相位</div>
        ) : (
          crossAspects.map((a, i) => {
            const info = ASPECT_TYPE_COLORS[a.type] || ASPECT_TYPE_COLORS['合相'];
            return (
              <div key={`${a.planet1}-${a.planet2}-${i}`}
                className="flex items-center gap-2 px-4 py-2.5 text-sm"
                style={{
                  background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)',
                  borderBottom: i < crossAspects.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                <span className="w-12 shrink-0 text-xs font-medium" style={{ color: '#3abfb6' }}>{a.planet1}</span>
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-bold"
                  style={{ background: info.bg, color: info.color }}>
                  {info.label}
                </span>
                <span className="flex-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{a.planet2}</span>
                <span className="shrink-0 font-mono text-[0.65rem]" style={{ color: 'var(--text-tertiary)' }}>
                  {a.orb.toFixed(1)}°
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* Return Detail Panel (日返/月返详细)      */
/* ═══════════════════════════════════════ */

const ANGULAR_HOUSES = [1, 4, 7, 10];
const HOUSE_DOMAIN: Record<number, string> = {
  1: '自我/外在形象', 2: '财务/价值', 3: '沟通/学习', 4: '家庭/根基',
  5: '创造/恋爱', 6: '健康/日常', 7: '伴侣/合作', 8: '深层转化',
  9: '远行/信仰', 10: '事业/社会', 11: '社群/愿景', 12: '灵性/隐退',
};
const DIGNITY_LABELS: Record<string, { text: string; good: boolean }> = {
  '庙': { text: '庙', good: true }, '旺': { text: '旺', good: true },
  '陷': { text: '陷', good: false }, '落': { text: '落', good: false },
};
const PLANET_ORDER = ['太阳', '月亮', '水星', '金星', '火星', '木星', '土星', '天王星', '海王星', '冥王星'];

export function ReturnDetailPanel({ chartType, chart, returnMoment, nextReturn }: {
  chartType: 'solar_return' | 'lunar_return';
  chart: AstrologyChart;
  returnMoment: { date: string; time: string; precisionArcsec: number };
  nextReturn?: { date: string; time: string } | null;
}) {
  const isSolar = chartType === 'solar_return';
  const titleIcon = isSolar ? '☉' : '☽';
  const titleText = isSolar ? '太阳回归盘分析' : '月亮回归盘分析';
  const periodText = isSolar ? '年度' : '本月';

  const ascSignIndex = Math.floor(normalize(chart.ascendant) / 30);
  const ascSign = SIGNS_CN[ascSignIndex] + '座';
  const mcSignIndex = Math.floor(normalize(chart.midheaven) / 30);
  const mcSign = SIGNS_CN[mcSignIndex] + '座';

  const ascRulerName = SIGN_RULER[SIGNS_CN[ascSignIndex]];
  const ascRuler = ascRulerName ? chart.planets.find(p => p.name === ascRulerName) : null;

  const sunP = chart.planets.find(p => p.name === '太阳');
  const moonP = chart.planets.find(p => p.name === '月亮');

  const angularPlanets = chart.planets.filter(p => ANGULAR_HOUSES.includes(p.house) && p.name !== '北交点');

  const tightAspects = [...chart.aspects]
    .filter(a => a.orb < 3)
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 8);

  const retrogrades = chart.planets.filter(p => p.retrograde && p.name !== '北交点');

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="rounded-2xl p-4" style={{
        background: isSolar ? 'linear-gradient(135deg, rgba(184,150,62,0.08), rgba(123,108,184,0.06))' : 'linear-gradient(135deg, rgba(123,108,184,0.08), rgba(58,191,182,0.06))',
        border: `1px solid ${isSolar ? 'rgba(184,150,62,0.15)' : 'rgba(123,108,184,0.15)'}`,
      }}>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">{titleIcon}</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{titleText}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>回归时刻</span>
            <div className="mt-0.5 font-medium" style={{ color: 'var(--text-primary)' }}>
              {returnMoment.date} {returnMoment.time}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>上升星座</span>
            <div className="mt-0.5 font-medium" style={{ color: 'var(--accent-primary)' }}>{ascSign}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)' }}>中天星座</span>
            <div className="mt-0.5 font-medium" style={{ color: 'var(--text-primary)' }}>{mcSign}</div>
          </div>
          {ascRuler && (
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>{periodText}命主星</span>
              <div className="mt-0.5 font-medium" style={{ color: 'var(--accent-secondary)' }}>
                {ascRuler.name} {ascRuler.sign}座 {ascRuler.house}宫
              </div>
            </div>
          )}
          {isSolar && sunP && (
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>太阳落宫</span>
              <div className="mt-0.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                第{sunP.house}宫 — {HOUSE_DOMAIN[sunP.house] || ''}
              </div>
            </div>
          )}
          {moonP && (
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>月亮位置</span>
              <div className="mt-0.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                {moonP.sign}座 {moonP.house}宫
              </div>
            </div>
          )}
        </div>
        {nextReturn && !isSolar && (
          <div className="mt-3 border-t pt-2" style={{ borderColor: 'rgba(123,108,184,0.12)' }}>
            <span className="text-[0.65rem]" style={{ color: 'var(--text-tertiary)' }}>
              下次月返：{nextReturn.date} {nextReturn.time}
            </span>
          </div>
        )}
      </div>

      {/* Angular Planets */}
      {angularPlanets.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <h4 className="mb-3 text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>角宫行星（关键影响力）</h4>
          <div className="space-y-2">
            {angularPlanets.map(p => (
              <div key={p.name} className="flex items-center gap-2 text-sm">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: p.house === 1 ? 'rgba(123,108,184,0.12)' : p.house === 10 ? 'rgba(184,150,62,0.12)' : p.house === 7 ? 'rgba(184,108,160,0.12)' : 'rgba(58,191,182,0.12)',
                    color: PLANET_COLORS[p.name] || '#888',
                  }}>
                  {PLANET_SHORT[p.name] || p.name[0]}
                </span>
                <div className="flex-1">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                  <span className="ml-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {p.sign}座 {p.degree}° · 第{p.house}宫
                  </span>
                  {p.retrograde && <span className="ml-1 text-[0.6rem] font-bold" style={{ color: 'var(--error)' }}>逆</span>}
                </div>
                <span className="text-[0.65rem]" style={{ color: 'var(--text-tertiary)' }}>
                  {HOUSE_DOMAIN[p.house]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tight Aspects */}
      {tightAspects.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          <div className="px-4 py-2.5 text-xs font-semibold"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
            紧密相位（容许度 &lt; 3°）
          </div>
          {tightAspects.map((asp, i) => {
            const info = ASPECT_TYPE_COLORS[asp.type] || ASPECT_TYPE_COLORS['合相'];
            return (
              <div key={`${asp.planet1}-${asp.planet2}-${asp.type}`}
                className="flex items-center gap-2 px-4 py-2.5 text-sm"
                style={{
                  background: i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)',
                  borderBottom: i < tightAspects.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                <span className="w-14 shrink-0 font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{asp.planet1}</span>
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-bold" style={{ background: info.bg, color: info.color }}>
                  {info.label}
                </span>
                <span className="flex-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{asp.planet2}</span>
                <span className="shrink-0 font-mono text-[0.65rem]" style={{ color: 'var(--text-tertiary)' }}>{asp.orb.toFixed(1)}°</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Retrograde & Dignity Tags */}
      {(retrogrades.length > 0 || chart.planets.some(p => getDignity(p.name, p.sign) !== '')) && (
        <div className="flex flex-wrap gap-2">
          {retrogrades.map(p => (
            <span key={p.name} className="rounded-full px-2.5 py-1 text-[0.65rem] font-medium"
              style={{ background: 'rgba(232,93,93,0.08)', color: 'var(--error)', border: '1px solid rgba(232,93,93,0.15)' }}>
              {PLANET_SHORT[p.name]} 逆行
            </span>
          ))}
          {chart.planets.filter(p => getDignity(p.name, p.sign) !== '').map(p => {
            const d = getDignity(p.name, p.sign);
            const info = DIGNITY_LABELS[d];
            if (!info) return null;
            return (
              <span key={p.name} className="rounded-full px-2.5 py-1 text-[0.65rem] font-medium"
                style={{
                  background: info.good ? 'rgba(45,168,158,0.08)' : 'rgba(232,169,62,0.08)',
                  color: info.good ? 'var(--accent-secondary)' : '#c89030',
                  border: `1px solid ${info.good ? 'rgba(45,168,158,0.15)' : 'rgba(232,169,62,0.15)'}`,
                }}>
                {PLANET_SHORT[p.name]} {info.text}
              </span>
            );
          })}
        </div>
      )}

      {/* Planet Distribution */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <h4 className="mb-3 text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>行星分布</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {PLANET_ORDER.map(name => {
            const p = chart.planets.find(pl => pl.name === name);
            if (!p) return null;
            return (
              <div key={name} className="flex items-center gap-1.5 text-xs">
                <span className="w-5 shrink-0 font-semibold" style={{ color: PLANET_COLORS[name] || '#888' }}>{PLANET_SHORT[name]}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{p.sign}座</span>
                <span className="font-mono text-[0.6rem]" style={{ color: 'var(--text-tertiary)' }}>{p.degree}°</span>
                <span className="text-[0.6rem]" style={{ color: 'var(--text-tertiary)' }}>{p.house}宫</span>
                {p.retrograde && <span className="text-[0.55rem] font-bold" style={{ color: 'var(--error)' }}>逆</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
