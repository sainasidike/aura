import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateTertiaryProgression } from '@/lib/engines/astrology';

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

    // 计算出生 UTC 时间
    const timeInfo = await standardizeTime(year, month, day, hour, minute, longitude, timezone);
    const { utc } = timeInfo;
    const birthUtc = new Date(Date.UTC(utc.year, utc.month - 1, utc.day, utc.hour, utc.minute, 0));

    // 解析目标日期（默认当前时间）
    let target: Date;
    if (targetDate) {
      if (typeof targetDate === 'string') {
        target = new Date(targetDate);
      } else {
        target = new Date(Date.UTC(
          targetDate.year, targetDate.month - 1, targetDate.day,
          (targetDate.hour || 12) - 8, targetDate.minute || 0, 0
        ));
      }
    } else {
      target = new Date();
    }

    const result = calculateTertiaryProgression(birthUtc, target, latitude, longitude);

    // 计算年龄
    const MS_PER_DAY = 86400000;
    const ageYears = (target.getTime() - birthUtc.getTime()) / MS_PER_DAY / 365.25;

    return Response.json({
      type: 'tertiary',
      typeCn: '三限盘',
      progressedDate: result.progressedDate.toISOString(),
      targetDate: target.toISOString().slice(0, 10),
      ageYears: Math.round(ageYears * 100) / 100,
      chart: result.chart,
      natalChart: result.natalChart,
      crossAspects: result.crossAspects,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '计算错误' },
      { status: 500 }
    );
  }
}
