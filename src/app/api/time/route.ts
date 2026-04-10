import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, month, day, hour, minute, longitude, timezone } = body;

    if (!year || !month || !day || hour === undefined || longitude === undefined) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const result = await standardizeTime(
      year, month, day, hour, minute ?? 0,
      longitude, timezone ?? 'Asia/Shanghai'
    );

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '计算错误' },
      { status: 500 }
    );
  }
}
