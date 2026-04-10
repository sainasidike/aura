/**
 * 时间标准化引擎
 *
 * 完整管线：钟表时间 → 时区/夏令时 → UTC → 均时差(Swiss Ephemeris) → 经度修正 → 真太阳时 → 时辰判定
 *
 * 精度关键点：
 * 1. 中国大陆 1986-1991 夏令时 (IANA tzdata)
 * 2. 新疆用 Asia/Urumqi (UTC+6)
 * 3. 均时差用 Swiss Ephemeris swe_time_equ()
 * 4. 时辰边界 < 15 分钟预警
 */

import type { TimeStandardization } from '@/types';

// ========== 夏令时精确日期 (IANA tzdata 验证) ==========

interface DSTRange {
  start: { month: number; day: number }; // 开始日 02:00
  end: { month: number; day: number };   // 结束日 02:00
}

const CHINA_DST: Record<number, DSTRange> = {
  1986: { start: { month: 5, day: 4 },  end: { month: 9, day: 14 } },
  1987: { start: { month: 4, day: 12 }, end: { month: 9, day: 13 } },
  1988: { start: { month: 4, day: 17 }, end: { month: 9, day: 11 } },
  1989: { start: { month: 4, day: 16 }, end: { month: 9, day: 17 } },
  1990: { start: { month: 4, day: 15 }, end: { month: 9, day: 16 } },
  1991: { start: { month: 4, day: 14 }, end: { month: 9, day: 15 } },
};

// ========== 时辰定义 ==========

const SHICHEN = [
  { name: '子', start: 23, end: 1 },
  { name: '丑', start: 1,  end: 3 },
  { name: '寅', start: 3,  end: 5 },
  { name: '卯', start: 5,  end: 7 },
  { name: '辰', start: 7,  end: 9 },
  { name: '巳', start: 9,  end: 11 },
  { name: '午', start: 11, end: 13 },
  { name: '未', start: 13, end: 15 },
  { name: '申', start: 15, end: 17 },
  { name: '酉', start: 17, end: 19 },
  { name: '戌', start: 19, end: 21 },
  { name: '亥', start: 21, end: 23 },
] as const;

// ========== 核心函数 ==========

/**
 * 检查中国大陆夏令时
 * 仅 1986-1991 年，且仅 Asia/Shanghai 时区
 */
export function isChinaDST(
  year: number, month: number, day: number, hour: number,
  timezone: string
): boolean {
  if (timezone !== 'Asia/Shanghai') return false;
  const dst = CHINA_DST[year];
  if (!dst) return false;

  // 构建比较用的日期数值 (MMDDH)
  const current = month * 10000 + day * 100 + hour;
  const start = dst.start.month * 10000 + dst.start.day * 100 + 2; // 02:00
  const end = dst.end.month * 10000 + dst.end.day * 100 + 2;

  return current >= start && current < end;
}

/**
 * 获取 UTC 偏移量（小时）
 */
export function getUTCOffset(timezone: string, isDST: boolean): number {
  switch (timezone) {
    case 'Asia/Urumqi':
      return 6;
    case 'Asia/Hong_Kong':
    case 'Asia/Taipei':
    case 'Asia/Macau':
      return 8;
    case 'Asia/Shanghai':
    default:
      return isDST ? 9 : 8;
  }
}

/**
 * 钟表时间 → UTC 小时（十进制）
 */
export function toUTCDecimalHour(
  hour: number, minute: number, utcOffset: number
): number {
  return hour + minute / 60 - utcOffset;
}

/**
 * 使用 Swiss Ephemeris 计算均时差
 * 返回值单位：分钟
 */
export function getEquationOfTime(jd: number): Promise<number> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const swe = require('swisseph');
    swe.swe_time_equ(jd, (result: { timeEquation?: number; error?: string }) => {
      if (result.error) {
        reject(new Error(result.error));
      } else {
        // timeEquation 单位是天，转为分钟
        resolve((result.timeEquation ?? 0) * 24 * 60);
      }
    });
  });
}

/**
 * 计算儒略日
 */
export function julianDay(year: number, month: number, day: number, utcDecimalHour: number): number {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const swe = require('swisseph');
  return swe.swe_julday(year, month, day, utcDecimalHour, swe.SE_GREG_CAL);
}

/**
 * 判定时辰及边界预警
 */
export function determineShichen(trueSolarHour: number, trueSolarMinute: number): {
  shichen: string;
  shichenName: string;
  nearBoundary: boolean;
  boundaryWarning?: string;
} {
  const totalMinutes = trueSolarHour * 60 + trueSolarMinute;

  for (const sc of SHICHEN) {
    let inRange = false;
    let distToBoundary = Infinity;

    if (sc.name === '子') {
      // 子时跨日：23:00-01:00
      if (trueSolarHour >= 23 || trueSolarHour < 1) {
        inRange = true;
        const startMin = 23 * 60;
        const endMin = 25 * 60; // 次日 01:00 = 25*60
        const normMin = trueSolarHour < 1 ? totalMinutes + 24 * 60 : totalMinutes;
        distToBoundary = Math.min(normMin - startMin, endMin - normMin);
      }
    } else {
      if (trueSolarHour >= sc.start && trueSolarHour < sc.end) {
        inRange = true;
        const startMin = sc.start * 60;
        const endMin = sc.end * 60;
        distToBoundary = Math.min(totalMinutes - startMin, endMin - totalMinutes);
      }
    }

    if (inRange) {
      const nearBoundary = distToBoundary < 15;
      return {
        shichen: sc.name,
        shichenName: sc.name + '时',
        nearBoundary,
        boundaryWarning: nearBoundary
          ? `距时辰边界仅 ${Math.round(distToBoundary)} 分钟，真太阳时微小偏差可能导致时辰变化，建议参考两个时辰的结果`
          : undefined,
      };
    }
  }

  // fallback (shouldn't reach)
  return { shichen: '子', shichenName: '子时', nearBoundary: false };
}

// ========== 主函数：完整时间标准化管线 ==========

export async function standardizeTime(
  year: number, month: number, day: number,
  hour: number, minute: number,
  longitude: number, timezone: string
): Promise<TimeStandardization> {
  // Step 1: 夏令时检测
  const isDST = isChinaDST(year, month, day, hour, timezone);
  const utcOffset = getUTCOffset(timezone, isDST);

  // Step 2: 钟表时间 → UTC
  let utcDecimalHour = toUTCDecimalHour(hour, minute, utcOffset);

  // 处理跨日
  let utcYear = year, utcMonth = month, utcDay = day;
  if (utcDecimalHour < 0) {
    utcDecimalHour += 24;
    // 简化处理：日期减1
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() - 1);
    utcYear = d.getUTCFullYear();
    utcMonth = d.getUTCMonth() + 1;
    utcDay = d.getUTCDate();
  } else if (utcDecimalHour >= 24) {
    utcDecimalHour -= 24;
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() + 1);
    utcYear = d.getUTCFullYear();
    utcMonth = d.getUTCMonth() + 1;
    utcDay = d.getUTCDate();
  }

  const utcHour = Math.floor(utcDecimalHour);
  const utcMinute = Math.round((utcDecimalHour - utcHour) * 60);

  // Step 3: 计算儒略日
  const jd = julianDay(utcYear, utcMonth, utcDay, utcDecimalHour);

  // Step 4: Swiss Ephemeris 均时差
  const eotMinutes = await getEquationOfTime(jd);

  // Step 5: 经度修正
  // 标准经线：Asia/Shanghai=120°E, Asia/Urumqi=90°E
  const standardMeridian = timezone === 'Asia/Urumqi' ? 90 : 120;
  const longitudeCorrection = (longitude - standardMeridian) * 4; // 分钟

  // Step 6: 真太阳时
  const totalCorrection = longitudeCorrection + eotMinutes;
  const trueSolarDecimal = hour + minute / 60 + totalCorrection / 60;

  // 处理真太阳时跨日
  let tsHour = Math.floor(trueSolarDecimal);
  let tsMinute = Math.round((trueSolarDecimal - tsHour) * 60);
  if (tsMinute >= 60) { tsHour += 1; tsMinute -= 60; }
  if (tsMinute < 0) { tsHour -= 1; tsMinute += 60; }
  if (tsHour < 0) tsHour += 24;
  if (tsHour >= 24) tsHour -= 24;

  // Step 7: 判定时辰
  const shichenResult = determineShichen(tsHour, tsMinute);

  return {
    utc: { year: utcYear, month: utcMonth, day: utcDay, hour: utcHour, minute: utcMinute },
    isDST,
    utcOffset,
    trueSolarTime: { hour: tsHour, minute: tsMinute },
    longitudeCorrection,
    equationOfTime: eotMinutes,
    totalCorrection,
    ...shichenResult,
  };
}
