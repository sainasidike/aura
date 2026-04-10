/**
 * 时间标准化引擎（纯 JS 版，无原生依赖）
 *
 * 完整管线：钟表时间 → 时区/夏令时 → UTC → 均时差 → 经度修正 → 真太阳时 → 时辰判定
 *
 * 均时差和儒略日使用天文算法纯 JS 实现（精度 ~1秒，满足时辰判定需求）
 */

import type { TimeStandardization } from '@/types';

// ========== 夏令时精确日期 (IANA tzdata 验证) ==========

interface DSTRange {
  start: { month: number; day: number };
  end: { month: number; day: number };
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

// ========== 纯 JS 天文算法 ==========

/**
 * 计算儒略日 (Julian Day)
 * 算法来源：Meeus "Astronomical Algorithms" 第7章
 */
export function julianDay(year: number, month: number, day: number, utcDecimalHour: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + utcDecimalHour / 24 + B - 1524.5;
}

/**
 * 计算均时差 (Equation of Time)
 * 纯 JS 实现，精度 ~1秒
 * 算法来源：Meeus "Astronomical Algorithms" 第28章简化版
 * 返回值：分钟
 */
export function getEquationOfTime(jd: number): number {
  // 儒略世纪数 (T)
  const T = (jd - 2451545.0) / 36525.0;

  // 太阳几何平黄经 (度)
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;

  // 太阳平近点角 (度)
  const M = (357.52911 + T * (35999.05029 - T * 0.0001537)) % 360;
  const Mrad = M * Math.PI / 180;

  // 黄道倾角 (度)
  const epsilon = 23.439291 - T * 0.013004;
  const epsilonRad = epsilon * Math.PI / 180;

  // 离心率
  const e = 0.016708634 - T * (0.000042037 + T * 0.0000001267);

  // 太阳中心方程
  const C = (1.914602 - T * (0.004817 + T * 0.000014)) * Math.sin(Mrad)
    + (0.019993 - T * 0.000101) * Math.sin(2 * Mrad)
    + 0.000289 * Math.sin(3 * Mrad);

  // 太阳真黄经
  const sunLon = L0 + C;
  const sunLonRad = sunLon * Math.PI / 180;

  // 均时差计算
  const y2 = Math.tan(epsilonRad / 2);
  const y2sq = y2 * y2;
  const L0rad = L0 * Math.PI / 180;

  const eot = y2sq * Math.sin(2 * L0rad)
    - 2 * e * Math.sin(Mrad)
    + 4 * e * y2sq * Math.sin(Mrad) * Math.cos(2 * L0rad)
    - 0.5 * y2sq * y2sq * Math.sin(4 * L0rad)
    - 1.25 * e * e * Math.sin(2 * Mrad);

  // 弧度 → 分钟 (1弧度 = 229.18分钟)
  void sunLonRad; // used in full algorithm, simplified here
  return eot * 229.18;
}

// ========== 核心函数 ==========

export function isChinaDST(
  year: number, month: number, day: number, hour: number,
  timezone: string
): boolean {
  if (timezone !== 'Asia/Shanghai') return false;
  const dst = CHINA_DST[year];
  if (!dst) return false;

  const current = month * 10000 + day * 100 + hour;
  const start = dst.start.month * 10000 + dst.start.day * 100 + 2;
  const end = dst.end.month * 10000 + dst.end.day * 100 + 2;

  return current >= start && current < end;
}

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

export function toUTCDecimalHour(
  hour: number, minute: number, utcOffset: number
): number {
  return hour + minute / 60 - utcOffset;
}

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
      if (trueSolarHour >= 23 || trueSolarHour < 1) {
        inRange = true;
        const startMin = 23 * 60;
        const endMin = 25 * 60;
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

  return { shichen: '子', shichenName: '子时', nearBoundary: false };
}

// ========== 主函数 ==========

export async function standardizeTime(
  year: number, month: number, day: number,
  hour: number, minute: number,
  longitude: number, timezone: string
): Promise<TimeStandardization> {
  const isDST = isChinaDST(year, month, day, hour, timezone);
  const utcOffset = getUTCOffset(timezone, isDST);

  let utcDecimalHour = toUTCDecimalHour(hour, minute, utcOffset);

  let utcYear = year, utcMonth = month, utcDay = day;
  if (utcDecimalHour < 0) {
    utcDecimalHour += 24;
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

  const jd = julianDay(utcYear, utcMonth, utcDay, utcDecimalHour);
  const eotMinutes = getEquationOfTime(jd);

  const standardMeridian = timezone === 'Asia/Urumqi' ? 90 : 120;
  const longitudeCorrection = (longitude - standardMeridian) * 4;

  const totalCorrection = longitudeCorrection + eotMinutes;
  const trueSolarDecimal = hour + minute / 60 + totalCorrection / 60;

  let tsHour = Math.floor(trueSolarDecimal);
  let tsMinute = Math.round((trueSolarDecimal - tsHour) * 60);
  if (tsMinute >= 60) { tsHour += 1; tsMinute -= 60; }
  if (tsMinute < 0) { tsHour -= 1; tsMinute += 60; }
  if (tsHour < 0) tsHour += 24;
  if (tsHour >= 24) tsHour -= 24;

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
