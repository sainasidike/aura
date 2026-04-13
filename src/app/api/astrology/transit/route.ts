import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateAstrology, calculateChartFromDate, calculateCrossAspects } from '@/lib/engines/astrology';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      year, month, day, hour, minute = 0,
      longitude, latitude,
      timezone = 'Asia/Shanghai',
      transitDate, // optional: ISO string or { year, month, day, hour, minute }
    } = body;

    if (!year || !month || !day || hour === undefined || longitude === undefined || latitude === undefined) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 计算本命盘
    const timeInfo = await standardizeTime(year, month, day, hour, minute, longitude, timezone);
    const natalChart = calculateAstrology(timeInfo, latitude, longitude);

    // 计算行运盘（支持自定义时间）
    let transitTime: Date;
    if (transitDate) {
      if (typeof transitDate === 'string') {
        transitTime = new Date(transitDate);
      } else {
        // { year, month, day, hour, minute } — 按 CST (UTC+8) 解析
        transitTime = new Date(Date.UTC(
          transitDate.year, transitDate.month - 1, transitDate.day,
          (transitDate.hour || 0) - 8, transitDate.minute || 0, 0
        ));
      }
    } else {
      transitTime = new Date();
    }
    const transitChart = calculateChartFromDate(transitTime, latitude, longitude);

    // 计算交叉相位（行运 vs 本命）
    const crossAspects = calculateCrossAspects(natalChart.planets, transitChart.planets);

    return Response.json({
      natalChart,
      transitChart,
      crossAspects,
      transitTime: transitTime.toISOString(),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '计算错误' },
      { status: 500 }
    );
  }
}
