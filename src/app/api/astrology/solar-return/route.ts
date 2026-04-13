import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateAstrology, findSolarReturn } from '@/lib/engines/astrology';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      year, month, day, hour, minute = 0,
      longitude, latitude,
      timezone = 'Asia/Shanghai',
      returnYear,
    } = body;

    if (!year || !month || !day || hour === undefined || longitude === undefined || latitude === undefined) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 计算本命盘，获取出生时太阳经度
    const timeInfo = await standardizeTime(year, month, day, hour, minute, longitude, timezone);
    const natalChart = calculateAstrology(timeInfo, latitude, longitude);
    const natalSun = natalChart.planets.find(p => p.name === '太阳');
    if (!natalSun) throw new Error('无法获取本命太阳位置');

    const targetYear = returnYear || new Date().getFullYear();
    const result = findSolarReturn(natalSun.longitude, targetYear, latitude, longitude);

    // 转换 UTC 到 CST (UTC+8)
    const cstDate = new Date(result.date.getTime() + 8 * 3600000);

    return Response.json({
      type: 'solar_return',
      typeCn: '太阳回归盘',
      natalSunDegree: natalSun.longitude,
      year: targetYear,
      returnMoment: {
        date: cstDate.toISOString().slice(0, 10),
        time: cstDate.toISOString().slice(11, 16),
        utc: result.date.toISOString(),
        precisionArcsec: result.precision,
      },
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
