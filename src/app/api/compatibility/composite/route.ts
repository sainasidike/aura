import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateAstrology, calculateComposite } from '@/lib/engines/astrology';

interface PersonInput {
  year: number; month: number; day: number;
  hour: number; minute: number;
  longitude: number; latitude: number; timezone: string;
}

export async function POST(request: NextRequest) {
  try {
    const { personA, personB } = (await request.json()) as { personA: PersonInput; personB: PersonInput };
    if (!personA || !personB) return Response.json({ error: '缺少参数' }, { status: 400 });

    const [timeA, timeB] = await Promise.all([
      standardizeTime(personA.year, personA.month, personA.day, personA.hour, personA.minute, personA.longitude, personA.timezone),
      standardizeTime(personB.year, personB.month, personB.day, personB.hour, personB.minute, personB.longitude, personB.timezone),
    ]);

    const chartA = calculateAstrology(timeA, personA.latitude, personA.longitude);
    const chartB = calculateAstrology(timeB, personB.latitude, personB.longitude);
    const composite = calculateComposite(chartA, chartB);

    return Response.json({ composite, chartA, chartB });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '计算失败' }, { status: 500 });
  }
}
