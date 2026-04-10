import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateAstrology } from '@/lib/engines/astrology';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      year, month, day, hour, minute = 0,
      longitude, latitude,
      timezone = 'Asia/Shanghai',
    } = body;

    if (!year || !month || !day || hour === undefined || longitude === undefined || latitude === undefined) {
      return Response.json({ error: '缺少必要参数: year, month, day, hour, longitude, latitude' }, { status: 400 });
    }

    const timeInfo = await standardizeTime(year, month, day, hour, minute, longitude, timezone);
    const chart = calculateAstrology(timeInfo, latitude, longitude);

    return Response.json({
      timeInfo,
      chart,
      meta: {
        engine: 'astronomy-engine',
        houseSystem: 'Equal',
        trueSolarTimeApplied: true,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '计算错误' },
      { status: 500 }
    );
  }
}
