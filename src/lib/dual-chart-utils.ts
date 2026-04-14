/**
 * Shared utilities for dual-person chart pages (composite, davison, overlay).
 * Provides chart data extraction, score calculation, and display helpers.
 */

import type { AstrologyChart, Aspect } from '@/types';

/* ─── Constants ─── */

const SIGN_GLYPHS: Record<string, string> = {
  '白羊': '♈', '金牛': '♉', '双子': '♊', '巨蟹': '♋', '狮子': '♌', '处女': '♍',
  '天秤': '♎', '天蝎': '♏', '射手': '♐', '摩羯': '♑', '水瓶': '♒', '双鱼': '♓',
};

const PLANET_GLYPHS: Record<string, string> = {
  '太阳': '☉', '月亮': '☽', '水星': '☿', '金星': '♀', '火星': '♂',
  '木星': '♃', '土星': '♄', '天王星': '♅', '海王星': '♆', '冥王星': '♇', '北交点': '☊',
};

const HARMONIOUS = new Set(['三合', '六合', 'trine', 'sextile']);
const TENSE = new Set(['刑', '冲', 'square', 'opposition']);

/* ─── Types ─── */

export interface KeyPlanet {
  name: string;
  glyph: string;
  sign: string;
  signGlyph: string;
  degree: number;
  minute: number;
  retrograde: boolean;
}

export interface ChartSummary {
  keyPlanets: KeyPlanet[];
  totalPlanets: number;
  totalHouses: number;
  totalAspects: number;
  harmoniousCount: number;
  tenseCount: number;
  harmonyScore: number;
}

/* ─── Functions ─── */

/** Extract a display-friendly summary from an AstrologyChart */
export function extractChartSummary(chart: AstrologyChart): ChartSummary {
  const KEY_NAMES = ['太阳', '月亮', '水星', '金星', '火星'];
  const keyPlanets: KeyPlanet[] = [];

  for (const name of KEY_NAMES) {
    const p = chart.planets.find(pl => pl.name === name);
    if (p) {
      keyPlanets.push({
        name: p.name,
        glyph: PLANET_GLYPHS[p.name] || '',
        sign: p.sign,
        signGlyph: SIGN_GLYPHS[p.sign] || '',
        degree: p.degree,
        minute: p.minute,
        retrograde: p.retrograde,
      });
    }
  }

  const { harmonious, tense } = countAspectTypes(chart.aspects);

  return {
    keyPlanets,
    totalPlanets: chart.planets.length,
    totalHouses: chart.houses.length,
    totalAspects: chart.aspects.length,
    harmoniousCount: harmonious,
    tenseCount: tense,
    harmonyScore: calculateHarmonyScore(chart.aspects),
  };
}

/** Count harmonious vs tense aspects */
function countAspectTypes(aspects: Aspect[]): { harmonious: number; tense: number } {
  let harmonious = 0;
  let tense = 0;
  for (const a of aspects) {
    if (HARMONIOUS.has(a.type)) harmonious++;
    else if (TENSE.has(a.type)) tense++;
  }
  return { harmonious, tense };
}

/**
 * Calculate a 0-100 harmony score from aspects.
 * Harmonious aspects add points, tense aspects subtract.
 * Base is 50 (neutral).
 */
export function calculateHarmonyScore(aspects: Aspect[]): number {
  if (aspects.length === 0) return 50;

  let score = 0;
  let count = 0;

  for (const a of aspects) {
    const tightness = Math.max(0, 1 - a.orb / 8);
    if (HARMONIOUS.has(a.type)) {
      score += 1 * tightness;
      count++;
    } else if (TENSE.has(a.type)) {
      score -= 1 * tightness;
      count++;
    } else {
      // Conjunction — context dependent, treat as mildly positive
      if (a.type === '合' || a.type === 'conjunction') {
        score += 0.3 * tightness;
        count++;
      }
    }
  }

  if (count === 0) return 50;

  // Normalize: score ranges from -count to +count, map to 20-80
  const normalized = score / count; // -1 to +1
  return Math.round(50 + normalized * 30); // 20 to 80
}

/** Get the ascendant sign info from a chart */
export function getAscendantInfo(chart: AstrologyChart): { sign: string; signGlyph: string; degree: number } {
  const lon = chart.ascendant;
  const signIdx = Math.floor(lon / 30);
  const signs = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
  const sign = signs[signIdx] || '白羊';
  return {
    sign,
    signGlyph: SIGN_GLYPHS[sign] || '',
    degree: Math.floor(lon % 30),
  };
}

/** Format degree display like "17°12'" */
export function formatDegree(degree: number, minute: number): string {
  return `${degree}°${minute.toString().padStart(2, '0')}'`;
}

/* ─── Report Section Parsing ─── */

export interface ReportSection {
  title: string;
  content: string;
  index: number; // 0-based
}

const SECTION_RE = /^###\s*[一二三四五六七八九十]+[、.．]\s*/;

/**
 * Parse a streaming AI report into sections.
 * Returns { preamble, sections }. During streaming, the last section may be incomplete.
 * Sections are split on `### 一、`, `### 二、`, etc.
 */
export function parseReportSections(report: string): { preamble: string; sections: ReportSection[] } {
  const lines = report.split('\n');
  let preamble = '';
  const sections: ReportSection[] = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    if (SECTION_RE.test(line)) {
      // Save previous section
      if (current) {
        sections.push({
          title: current.title,
          content: current.lines.join('\n').trim(),
          index: sections.length,
        });
      }
      // Start new section
      const title = line.replace(/^###\s*/, '').trim();
      current = { title, lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble += (preamble ? '\n' : '') + line;
    }
  }

  // Push last section
  if (current) {
    sections.push({
      title: current.title,
      content: current.lines.join('\n').trim(),
      index: sections.length,
    });
  }

  return { preamble: preamble.trim(), sections };
}

/** Section icon/color configs per chart type */
export const SECTION_ICONS: Record<string, { icon: string; color: string }[]> = {
  composite: [
    { icon: '☉', color: '#e0a020' }, // 关系核心身份
    { icon: '♀', color: '#d06088' }, // 情感表达与爱的方式
    { icon: '♄', color: '#606060' }, // 阴影与挑战
    { icon: '★', color: '#4a9060' }, // 关系建议
  ],
  davison: [
    { icon: '☉', color: '#e0a020' }, // 关系先天特质
    { icon: '☽', color: '#8090b0' }, // 核心课题与成长
    { icon: '♇', color: '#804060' }, // 压力与转化
    { icon: '★', color: '#4a9060' }, // 发展建议
  ],
  overlay: [
    { icon: '→', color: '#c08050' }, // A对B影响
    { icon: '←', color: '#c08050' }, // B对A影响
    { icon: '⇆', color: '#e0a020' }, // 互动模式
    { icon: '★', color: '#4a9060' }, // 关系建议
  ],
  synastry: [
    { icon: '☉', color: '#e0a020' }, // 核心能量对比
    { icon: '♀', color: '#d06088' }, // 情感连接
    { icon: '☿', color: '#60a060' }, // 沟通相处
    { icon: '♄', color: '#606060' }, // 长期稳定性
  ],
};
