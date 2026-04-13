import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateAstrology, findLunarReturn } from '@/lib/engines/astrology';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      year, month, day, hour, minute = 0,
      longitude, latitude,
      timezone = 'Asia/Shanghai',
      targetDate,
    } = body;

    if (!year || !month || !day || hour === undefined || longitude === undefined || latitude === undefined) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 计算本命盘，获取出生时月亮经度
    const timeInfo = await standardizeTime(year, month, day, hour, minute, longitude, timezone);
    const natalChart = calculateAstrology(timeInfo, latitude, longitude);
    const natalMoon = natalChart.planets.find(p => p.name === '月亮');
    if (!natalMoon) throw new Error('无法获取本命月亮位置');

    const afterDate = targetDate ? new Date(targetDate) : new Date();
    const result = findLunarReturn(natalMoon.longitude, afterDate, latitude, longitude);

    // 转换 UTC 到 CST (UTC+8)
    const cstDate = new Date(result.date.getTime() + 8 * 3600000);
    const nextCst = result.nextDate ? new Date(result.nextDate.getTime() + 8 * 3600000) : null;

    return Response.json({
      type: 'lunar_return',
      typeCn: '月亮回归盘',
      natalMoonDegree: natalMoon.longitude,
      returnMoment: {
        date: cstDate.toISOString().slice(0, 10),
        time: cstDate.toISOString().slice(11, 16),
        utc: result.date.toISOString(),
        precisionArcsec: result.precision,
      },
      nextReturn: nextCst ? {
        date: nextCst.toISOString().slice(0, 10),
        time: nextCst.toISOString().slice(11, 16),
      } : null,
      chart: result.chart,
      natalChart,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '计算错误' },
      { status: 500 }
    );
  }
}
