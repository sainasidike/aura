/**
 * 八字排盘引擎
 *
 * 基于 lunar-javascript + Swiss Ephemeris 节气精算
 * 支持三种子时模式
 */

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
const { Solar } = require('lunar-javascript');

import type { BaziChart, DaYun, TimeStandardization } from '@/types';

export type ZishiMode = 'midnight' | 'zishi23' | 'split';

/**
 * 完整八字排盘
 *
 * @param timeInfo - 时间标准化结果（已包含真太阳时）
 * @param birthYear/Month/Day - 原始公历出生日期
 * @param gender - '男' | '女'
 * @param zishiMode - 子时模式: midnight(默认,00:00换日) | zishi23(23:00换日) | split(分早晚子时)
 */
export function calculateBazi(
  timeInfo: TimeStandardization,
  birthYear: number, birthMonth: number, birthDay: number,
  gender: '男' | '女',
  zishiMode: ZishiMode = 'midnight'
): BaziChart {
  const tsHour = timeInfo.trueSolarTime.hour;
  const tsMinute = timeInfo.trueSolarTime.minute;

  // 根据子时模式调整日期
  let calcYear = birthYear;
  let calcMonth = birthMonth;
  let calcDay = birthDay;

  if (zishiMode === 'zishi23' && tsHour >= 23) {
    // 模式A: 23:00 起用次日日柱
    const d = new Date(birthYear, birthMonth - 1, birthDay);
    d.setDate(d.getDate() + 1);
    calcYear = d.getFullYear();
    calcMonth = d.getMonth() + 1;
    calcDay = d.getDate();
  }
  // midnight 模式: lunar-javascript 默认行为（00:00换日）
  // split 模式: 23:00-00:00用今日，00:00-01:00用明日 — 也是 lunar-javascript 默认行为

  const solar = Solar.fromYmdHms(calcYear, calcMonth, calcDay, tsHour, tsMinute, 0);
  const lunar = solar.getLunar();
  const bazi = lunar.getEightChar();

  // 四柱
  const fourPillars = {
    year: {
      gan: bazi.getYearGan(),
      zhi: bazi.getYearZhi(),
      ganZhi: bazi.getYear(),
    },
    month: {
      gan: bazi.getMonthGan(),
      zhi: bazi.getMonthZhi(),
      ganZhi: bazi.getMonth(),
    },
    day: {
      gan: bazi.getDayGan(),
      zhi: bazi.getDayZhi(),
      ganZhi: bazi.getDay(),
    },
    time: {
      gan: bazi.getTimeGan(),
      zhi: bazi.getTimeZhi(),
      ganZhi: bazi.getTime(),
    },
  };

  // 五行
  const wuxing = {
    year: bazi.getYearWuXing(),
    month: bazi.getMonthWuXing(),
    day: bazi.getDayWuXing(),
    time: bazi.getTimeWuXing(),
  };

  // 纳音
  const nayin = {
    year: bazi.getYearNaYin(),
    month: bazi.getMonthNaYin(),
    day: bazi.getDayNaYin(),
    time: bazi.getTimeNaYin(),
  };

  // 十神
  const shiShen = {
    tianGan: {
      year: bazi.getYearShiShenGan(),
      month: bazi.getMonthShiShenGan(),
      day: '日主',
      time: bazi.getTimeShiShenGan(),
    },
    diZhi: {
      year: formatArray(bazi.getYearShiShenZhi()),
      month: formatArray(bazi.getMonthShiShenZhi()),
      day: formatArray(bazi.getDayShiShenZhi()),
      time: formatArray(bazi.getTimeShiShenZhi()),
    },
  };

  // 地支藏干
  const hideGan = {
    year: toStringArray(bazi.getYearHideGan()),
    month: toStringArray(bazi.getMonthHideGan()),
    day: toStringArray(bazi.getDayHideGan()),
    time: toStringArray(bazi.getTimeHideGan()),
  };

  // 地势（长生十二神）
  const diShi = {
    year: bazi.getYearDiShi(),
    month: bazi.getMonthDiShi(),
    day: bazi.getDayDiShi(),
    time: bazi.getTimeDiShi(),
  };

  // 大运
  const isMale = gender === '男';
  const yun = bazi.getYun(isMale);
  const dayuns = yun.getDaYun();
  const dayunList: DaYun[] = [];
  for (let i = 1; i < dayuns.length; i++) {
    const dy = dayuns[i];
    dayunList.push({
      startAge: dy.getStartAge(),
      ganZhi: dy.getGanZhi(),
      startYear: dy.getStartYear(),
      endYear: dy.getEndYear(),
    });
  }

  return {
    fourPillars,
    wuxing,
    nayin,
    shiShen,
    hideGan,
    diShi,
    mingGong: bazi.getMingGong(),
    shenGong: bazi.getShenGong(),
    taiYuan: bazi.getTaiYuan(),
    shengXiao: lunar.getYearShengXiao(),
    lunarDate: lunar.toString(),
    dayun: dayunList,
  };
}

function toStringArray(arr: any): string[] {
  if (Array.isArray(arr)) return arr.map(String);
  return String(arr).split(',').map((s: string) => s.trim());
}

function formatArray(arr: any): string {
  if (Array.isArray(arr)) return arr.join(',');
  return String(arr);
}
