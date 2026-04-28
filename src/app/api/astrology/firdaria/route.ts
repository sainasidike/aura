import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateAstrology } from '@/lib/engines/astrology';
import { calculateFirdaria } from '@/lib/engines/firdaria';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      year, month, day, hour, minute = 0,
      longitude, latitude,
      timezone = 'Asia/Shanghai',
    } = body;

    if (!year || !month || !day || hour === undefined || longitude === undefined || latitude === undefined) {
      return Response.json(
        { error: '缺少必要参数: year, month, day, hour, longitude, latitude' },
        { status: 400 },
      );
    }

    // 1. 时间标准化 → UTC
    const timeInfo = await standardizeTime(year, month, day, hour, minute, longitude, timezone);

    // 2. 计算本命盘
    const chart = calculateAstrology(timeInfo, latitude, longitude);

    // 3. 判断日生/夜生：太阳在 7-12 宫 → 日生，1-6 宫 → 夜生
    const sunPlanet = chart.planets.find(p => p.name === '太阳');
    if (!sunPlanet) {
      return Response.json({ error: '无法获取太阳宫位信息' }, { status: 500 });
    }
    const isDayBirth = sunPlanet.house >= 7 && sunPlanet.house <= 12;

    // 4. 构建出生日期的 Date 对象（使用 UTC 时间）
    const { utc } = timeInfo;
    const birthDate = new Date(Date.UTC(utc.year, utc.month - 1, utc.day, utc.hour, utc.minute, 0));

    // 5. 计算法达
    const firdaria = calculateFirdaria(birthDate, isDayBirth);

    // 6. 返回结果
    return Response.json({
      type: 'firdaria',
      typeCn: '法达星限',
      isDayBirth: firdaria.isDayBirth,
      currentPeriod: firdaria.currentPeriod,
      periods: firdaria.periods,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '法达计算错误' },
      { status: 500 },
    );
  }
}
