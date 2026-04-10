import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateBazi, type ZishiMode } from '@/lib/engines/bazi';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      year, month, day, hour, minute = 0,
      gender = '男',
      longitude, timezone = 'Asia/Shanghai',
      zishiMode = 'midnight',
    } = body;

    if (!year || !month || !day || hour === undefined || longitude === undefined) {
      return Response.json({ error: '缺少必要参数: year, month, day, hour, longitude' }, { status: 400 });
    }

    // Step 1: 时间标准化
    const timeInfo = await standardizeTime(year, month, day, hour, minute, longitude, timezone);

    // Step 2: 八字排盘
    const chart = calculateBazi(timeInfo, year, month, day, gender, zishiMode as ZishiMode);

    return Response.json({
      timeInfo,
      chart,
      meta: {
        engine: 'lunar-javascript',
        version: '1.7.7',
        zishiMode,
        trueSolarTimeApplied: true,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '排盘计算错误' },
      { status: 500 }
    );
  }
}
