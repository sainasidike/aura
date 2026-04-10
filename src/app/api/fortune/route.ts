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
    const scores = calculateFortuneScores(baziChart, natalChart, transitChart, period);

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

function calculateFortuneScores(
  bazi: ReturnType<typeof calculateBazi>,
  natal: ReturnType<typeof calculateAstrology>,
  transit: ReturnType<typeof calculateAstrology>,
  period: string,
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

  const categories: ScoreResult['categories'] = {};

  for (const [cat, planets] of Object.entries(categoryMap)) {
    const relevant = transitAspects.filter(a =>
      planets.some(p => a.transit.includes(p) || a.natal.includes(p))
    );

    // 基础分 + 相位加减
    let score = 65 + Math.floor(Math.random() * 10); // 基础分 65-75
    for (const a of relevant) {
      if (a.nature === '和谐') score += 5 + Math.floor(Math.random() * 5);
      else if (a.nature === '融合') score += 3 + Math.floor(Math.random() * 5);
      else if (a.nature === '紧张') score -= 5 + Math.floor(Math.random() * 5);
      else if (a.nature === '对立') score -= 3 + Math.floor(Math.random() * 5);
    }

    // 加入八字五行影响
    const dayGan = bazi.fourPillars.day.gan;
    if (cat === 'career' && ['甲', '丙', '戊', '庚', '壬'].includes(dayGan)) score += 3;
    if (cat === 'love' && ['乙', '丁', '己', '辛', '癸'].includes(dayGan)) score += 3;

    // 按周期微调
    if (period === 'weekly') score = Math.round(score * 0.95 + 5);
    if (period === 'monthly') score = Math.round(score * 0.9 + 8);
    if (period === 'yearly') score = Math.round(score * 0.85 + 12);

    score = Math.max(30, Math.min(98, score));

    categories[cat] = {
      score,
      aspects: relevant.slice(0, 4), // 最多4个相位
    };
  }

  const overall = Math.round(
    Object.values(categories).reduce((sum, c) => sum + c.score, 0) / Object.keys(categories).length
  );

  return { overall, categories };
}
