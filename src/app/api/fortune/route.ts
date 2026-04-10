import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateBazi } from '@/lib/engines/bazi';
import { calculateAstrology } from '@/lib/engines/astrology';

/**
 * 运势评分 API
 * 基于八字大运流年 + 星盘行运相位，计算日/周/月/年运势分数
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      year, month, day, hour, minute = 0,
      gender = '男', longitude, latitude,
      timezone = 'Asia/Shanghai',
      period = 'daily',
      targetDate,
    } = body;

    if (!year || !month || !day || hour === undefined || longitude === undefined) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 计算命盘
    const timeInfo = await standardizeTime(year, month, day, hour, minute, longitude, timezone);
    const baziChart = calculateBazi(timeInfo, year, month, day, gender);

    // 计算当前星盘（行运盘）
    const now = targetDate ? new Date(targetDate) : new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1;
    const nowDay = now.getDate();
    const nowHour = now.getHours();
    const nowMinute = now.getMinutes();

    const transitTimeInfo = await standardizeTime(nowYear, nowMonth, nowDay, nowHour, nowMinute, longitude, timezone);
    const natalChart = calculateAstrology(timeInfo, latitude ?? 39.9, longitude);
    const transitChart = calculateAstrology(transitTimeInfo, latitude ?? 39.9, longitude);

    // 基于八字和星盘计算运势分数
    const dateKey = now.toISOString().slice(0, 10);
    const scores = calculateFortuneScores(baziChart, natalChart, transitChart, period, dateKey);

    return Response.json({
      date: now.toISOString().slice(0, 10),
      period,
      overall_score: scores.overall,
      categories: scores.categories,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '运势计算错误' },
      { status: 500 }
    );
  }
}

interface ScoreResult {
  overall: number;
  categories: Record<string, { score: number; aspects: { transit: string; natal: string; type: string; nature: string; orb: number }[] }>;
}

/** 确定性哈希：同一输入始终返回相同的 0-1 值 */
function deterministicHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return (hash % 1000) / 1000;
}

function calculateFortuneScores(
  bazi: ReturnType<typeof calculateBazi>,
  natal: ReturnType<typeof calculateAstrology>,
  transit: ReturnType<typeof calculateAstrology>,
  period: string,
  dateKey: string,
): ScoreResult {
  // 计算行运相位：transit planets vs natal planets
  const transitAspects: { transit: string; natal: string; type: string; nature: string; orb: number }[] = [];

  const ASPECT_TYPES = [
    { name: '合', angle: 0, orb: 6, nature: '融合' },
    { name: '六合', angle: 60, orb: 4, nature: '和谐' },
    { name: '刑', angle: 90, orb: 5, nature: '紧张' },
    { name: '三合', angle: 120, orb: 5, nature: '和谐' },
    { name: '冲', angle: 180, orb: 6, nature: '对立' },
  ];

  for (const tp of transit.planets) {
    for (const np of natal.planets) {
      let diff = Math.abs(tp.longitude - np.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const asp of ASPECT_TYPES) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          transitAspects.push({
            transit: `行运${tp.name}`,
            natal: `本命${np.name}`,
            type: asp.name,
            nature: asp.nature,
            orb: Math.round(orb * 10) / 10,
          });
          break;
        }
      }
    }
  }

  // 分配相位到运势类别
  const categoryMap: Record<string, string[]> = {
    love: ['金星', '月亮', '火星'],
    career: ['太阳', '土星', '木星', '火星'],
    health: ['火星', '土星', '太阳', '月亮'],
    study: ['水星', '木星', '天王星'],
    social: ['金星', '木星', '月亮', '水星'],
  };

  // 日主信息用于哈希种子
  const dayGan = bazi.fourPillars.day.gan;
  const dayZhi = bazi.fourPillars.day.zhi;

  const categories: ScoreResult['categories'] = {};

  for (const [cat, planets] of Object.entries(categoryMap)) {
    const relevant = transitAspects.filter(a =>
      planets.some(p => a.transit.includes(p) || a.natal.includes(p))
    );

    // 确定性基础分：基于类别+日期+日柱哈希，产生 58-72 的基础分
    const seed = `${cat}:${dateKey}:${dayGan}${dayZhi}:${period}`;
    const baseHash = deterministicHash(seed);
    let score = 58 + Math.floor(baseHash * 15); // 58-72

    // 相位影响：用 orb 的紧密度加权，orb 越小影响越大
    for (const a of relevant) {
      const weight = 1 - (a.orb / 6); // 0-1，越紧密越大
      const impact = Math.round(3 + weight * 4); // 3-7
      if (a.nature === '和谐') score += impact;
      else if (a.nature === '融合') score += Math.round(impact * 0.7);
      else if (a.nature === '紧张') score -= impact;
      else if (a.nature === '对立') score -= Math.round(impact * 0.8);
    }

    // 八字日主五行与类别的亲和度
    const ganWuxing: Record<string, string> = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
    const wx = ganWuxing[dayGan] || '土';
    const wxBonus: Record<string, Record<string, number>> = {
      love:   { '水': 4, '火': 3, '木': 1, '金': -1, '土': 0 },
      career: { '金': 4, '木': 3, '土': 2, '火': 0, '水': -1 },
      health: { '土': 3, '木': 2, '水': 1, '金': 0, '火': -2 },
      study:  { '水': 4, '木': 3, '金': 1, '火': -1, '土': 0 },
      social: { '火': 3, '土': 2, '水': 1, '木': 0, '金': -1 },
    };
    score += wxBonus[cat]?.[wx] ?? 0;

    // 按周期微调（周期越长越趋向均值）
    if (period === 'weekly') score = Math.round(score * 0.95 + 3);
    if (period === 'monthly') score = Math.round(score * 0.9 + 7);
    if (period === 'yearly') score = Math.round(score * 0.85 + 10);

    score = Math.max(30, Math.min(95, score));

    categories[cat] = {
      score,
      aspects: relevant.slice(0, 4),
    };
  }

  const overall = Math.round(
    Object.values(categories).reduce((sum, c) => sum + c.score, 0) / Object.keys(categories).length
  );

  return { overall, categories };
}
