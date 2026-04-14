import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateDavison } from '@/lib/engines/astrology';

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

    // 构造 UTC Date
    const dateA = new Date(Date.UTC(timeA.utc.year, timeA.utc.month - 1, timeA.utc.day, timeA.utc.hour, timeA.utc.minute));
    const dateB = new Date(Date.UTC(timeB.utc.year, timeB.utc.month - 1, timeB.utc.day, timeB.utc.hour, timeB.utc.minute));

    const { chart: davison, midpointDate } = calculateDavison(
      { date: dateA, lat: personA.latitude, lon: personA.longitude },
      { date: dateB, lat: personB.latitude, lon: personB.longitude },
    );

    return Response.json({ davison, midpointDate: midpointDate.toISOString() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '计算失败' }, { status: 500 });
  }
}
