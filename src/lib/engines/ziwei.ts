/**
 * 紫微斗数排盘引擎
 *
 * 基于 fortel-ziweidoushu + opencc-js 繁简转换
 * 四化通过 board.getMajorStarDerivative() 获取
 */

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
const { DestinyBoard, DestinyConfigBuilder, DayTimeGround, ConfigType, Gender } = require('fortel-ziweidoushu');
const opencc = require('opencc-js');

import type { ZiweiChart, ZiweiStar, TimeStandardization } from '@/types';

const t2s = opencc.Converter({ from: 'tw', to: 'cn' });

const SIHUA_MAP: Record<string, string> = {
  '祿': '化禄', '權': '化权', '科': '化科', '忌': '化忌',
};

/** 时辰 → 繁体时辰名映射 */
const SHICHEN_MAP: Record<string, string> = {
  '子': '子時', '丑': '丑時', '寅': '寅時', '卯': '卯時',
  '辰': '辰時', '巳': '巳時', '午': '午時', '未': '未時',
  '申': '申時', '酉': '酉時', '戌': '戌時', '亥': '亥時',
};

/**
 * 紫微斗数排盘
 */
export function calculateZiwei(
  timeInfo: TimeStandardization,
  birthYear: number, birthMonth: number, birthDay: number,
  gender: '男' | '女',
): ZiweiChart {
  const shichenTC = SHICHEN_MAP[timeInfo.shichen];
  if (!shichenTC) {
    throw new Error(`无效时辰: ${timeInfo.shichen}`);
  }

  const board = new DestinyBoard(
    DestinyConfigBuilder.withSolar({
      year: birthYear,
      month: birthMonth,
      day: birthDay,
      bornTimeGround: DayTimeGround.getByName(shichenTC),
      configType: ConfigType.SKY,
      gender: gender === '女' ? Gender.F : Gender.M,
    })
  );

  const data = board.toJSON();

  // 构建四化映射：星名(繁体) → 四化类型
  const derivativeMap = new Map<string, string>();
  board.cells.forEach((cell: any) => {
    cell.majorStars.forEach((star: any) => {
      const d = board.getMajorStarDerivative(star);
      if (d) {
        const starName = star.toString();
        const derivType = d.toString(); // 祿/權/科/忌
        derivativeMap.set(starName, derivType);
      }
    });
  });

  // toJSON() 返回的元素是带 toJSON() 方法的对象，需 String() 转换后再 t2s
  const str = (v: any) => t2s(String(v));

  const cells = data.cells.map((cell: any) => {
    const temples = (cell.temples || []).map(str);

    const majorStars: ZiweiStar[] = (cell.majorStars || []).map((star: any) => {
      const starName = String(star);
      const derivType = derivativeMap.get(starName);
      return {
        name: t2s(starName),
        fourInfluence: derivType ? SIHUA_MAP[derivType] || t2s(derivType) : undefined,
      };
    });

    const minorStars: ZiweiStar[] = (cell.minorStars || []).map((star: any) => ({
      name: t2s(String(star)),
    }));

    return {
      ground: t2s(String(cell.ground)),
      temples,
      majorStars,
      minorStars,
      ageRange: cell.ageStart && cell.ageEnd ? `${cell.ageStart}-${cell.ageEnd}` : undefined,
    };
  });

  return {
    destinyMaster: t2s(String(data.destinyMaster || '')),
    bodyMaster: t2s(String(data.bodyMaster || '')),
    element: t2s(String(data.element || '')),
    cells,
  };
}
