import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateAstrology, calculateCrossAspects } from '@/lib/engines/astrology';
import { calculateBazi } from '@/lib/engines/bazi';
import type { PlanetPosition, Aspect } from '@/types';

interface PersonInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: string;
  longitude: number;
  latitude: number;
  timezone: string;
}

interface CategoryResult {
  score: number;
  aspects: Aspect[];
}

const BENEFICS = ['金星', '木星', '太阳', '月亮'];
const MALEFICS = ['火星', '土星', '冥王星'];

function hasPlanet(aspect: Aspect, name: string): boolean {
  return aspect.planet1.includes(name) || aspect.planet2.includes(name);
}

function hasBothPlanets(aspect: Aspect, nameA: string, nameB: string): boolean {
  return (aspect.planet1.includes(nameA) && aspect.planet2.includes(nameB)) ||
    (aspect.planet1.includes(nameB) && aspect.planet2.includes(nameA));
}

function isBenefic(aspect: Aspect): boolean {
  return BENEFICS.some(b => hasPlanet(aspect, b));
}

function isMalefic(aspect: Aspect): boolean {
  return MALEFICS.some(m => hasPlanet(aspect, m));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function calculateCompatibilityScore(
  crossAtoB: Aspect[],
  crossBtoA: Aspect[],
): {
  overall: number;
  categories: Record<string, CategoryResult>;
} {
  const allCross = [...crossAtoB, ...crossBtoA];
  let totalScore = 50;

  // Score each aspect
  for (const asp of allCross) {
    const isVenusMars = hasBothPlanets(asp, '金', '火');
    const isMoonMoon = hasBothPlanets(asp, '月', '月');
    const isSunMoon = hasBothPlanets(asp, '日', '月');
    const isBeneficAsp = isBenefic(asp);
    const isMaleficAsp = isMalefic(asp);

    switch (asp.type) {
      case '合相':
        if (isVenusMars) totalScore += 8;
        else if (isSunMoon) totalScore += 7;
        else if (isMoonMoon) totalScore += 6;
        else if (isBeneficAsp) totalScore += 8;
        else totalScore += 3;
        break;
      case '三合':
        if (isSunMoon) totalScore += 7;
        else if (isMoonMoon) totalScore += 6;
        else if (isVenusMars) totalScore += 8;
        else totalScore += 6;
        break;
      case '六合':
        if (isSunMoon) totalScore += 5;
        else if (isMoonMoon) totalScore += 4;
        else totalScore += 4;
        break;
      case '四分':
        if (hasPlanet(asp, '火')) totalScore += 2; // attraction tension
        else totalScore -= 3;
        break;
      case '对冲':
        if (isSunMoon) totalScore += 5; // polarity attraction
        else if (isMaleficAsp) totalScore -= 4;
        else totalScore -= 2;
        break;
    }
  }

  totalScore = clamp(Math.round(totalScore), 30, 98);

  // Categorize aspects
  const loveAspects = allCross.filter(a => hasPlanet(a, '金') || hasPlanet(a, '火'));
  const emotionAspects = allCross.filter(a => hasPlanet(a, '月'));
  const commAspects = allCross.filter(a => hasPlanet(a, '水'));
  const longTermAspects = allCross.filter(a => hasPlanet(a, '土') || hasPlanet(a, '冥'));
  const growthAspects = allCross.filter(a => hasPlanet(a, '木') || hasPlanet(a, '☊'));

  function categoryScore(aspects: Aspect[], base: number): number {
    let s = base;
    for (const a of aspects) {
      if (['合相', '三合', '六合'].includes(a.type)) s += 4;
      else if (a.type === '四分') s -= 2;
      else if (a.type === '对冲') s -= 1;
    }
    return clamp(Math.round(s), 30, 98);
  }

  return {
    overall: totalScore,
    categories: {
      love_chemistry: { score: categoryScore(loveAspects, 50), aspects: loveAspects },
      emotional_sync: { score: categoryScore(emotionAspects, 50), aspects: emotionAspects },
      communication: { score: categoryScore(commAspects, 50), aspects: commAspects },
      long_term: { score: categoryScore(longTermAspects, 50), aspects: longTermAspects },
      growth: { score: categoryScore(growthAspects, 50), aspects: growthAspects },
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { personA, personB } = body as { personA: PersonInput; personB: PersonInput };

    if (!personA || !personB) {
      return Response.json({ error: '缺少 personA 或 personB 参数' }, { status: 400 });
    }

    // Standardize time for both persons
    const [timeA, timeB] = await Promise.all([
      standardizeTime(personA.year, personA.month, personA.day, personA.hour, personA.minute, personA.longitude, personA.timezone),
      standardizeTime(personB.year, personB.month, personB.day, personB.hour, personB.minute, personB.longitude, personB.timezone),
    ]);

    // Calculate astrology charts
    const chartA = calculateAstrology(timeA, personA.latitude, personA.longitude);
    const chartB = calculateAstrology(timeB, personB.latitude, personB.longitude);

    // Calculate bazi
    const baziA = calculateBazi(timeA, personA.year, personA.month, personA.day, personA.gender as '男' | '女');
    const baziB = calculateBazi(timeB, personB.year, personB.month, personB.day, personB.gender as '男' | '女');

    // Calculate cross aspects in both directions
    // A's planets as "natal", B's planets as "transit"
    const crossAspectsAtoB = calculateCrossAspects(chartA.planets, chartB.planets);
    // B's planets as "natal", A's planets as "transit"
    const crossAspectsBtoA = calculateCrossAspects(chartB.planets, chartA.planets);

    // Calculate compatibility score
    const { overall, categories } = calculateCompatibilityScore(crossAspectsAtoB, crossAspectsBtoA);

    return Response.json({
      overall,
      categories,
      chartA,
      chartB,
      crossAspectsAtoB,
      crossAspectsBtoA,
      baziA,
      baziB,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '计算失败' },
      { status: 500 }
    );
  }
}
