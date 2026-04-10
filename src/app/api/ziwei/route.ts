import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateZiwei } from '@/lib/engines/ziwei';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      year, month, day, hour, minute = 0,
      gender = '男',
      longitude, timezone = 'Asia/Shanghai',
    } = body;

    if (!year || !month || !day || hour === undefined || longitude === undefined) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const timeInfo = await standardizeTime(year, month, day, hour, minute, longitude, timezone);
    const chart = calculateZiwei(timeInfo, year, month, day, gender);

    return Response.json({
      timeInfo,
      chart,
      meta: {
        engine: 'fortel-ziweidoushu',
        version: '1.3.4',
        sihuaVersion: 'fortel-default',
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
