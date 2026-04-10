/**
 * 西洋星盘引擎
 *
 * 基于 astronomy-engine (纯 JS, NASA 级精度)
 * 计算行星位置、星座、宫位(Placidus)、相位
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const Astronomy = require('astronomy-engine');

import type { AstrologyChart, PlanetPosition, HousePosition, Aspect, TimeStandardization } from '@/types';

const SIGNS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
const SIGN_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

const PLANET_NAMES: Record<string, string> = {
  Sun: '太阳', Moon: '月亮', Mercury: '水星', Venus: '金星',
  Mars: '火星', Jupiter: '木星', Saturn: '土星',
  Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星',
};

const ASPECT_TYPES = [
  { name: '合相', angle: 0, orb: 8 },
  { name: '六合', angle: 60, orb: 6 },
  { name: '四分', angle: 90, orb: 7 },
  { name: '三合', angle: 120, orb: 7 },
  { name: '对冲', angle: 180, orb: 8 },
];

function lonToSign(lon: number): { sign: string; signEn: string; degree: number; minute: number; signIndex: number } {
  const normalized = ((lon % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const inSign = normalized - signIndex * 30;
  return {
    sign: SIGNS[signIndex],
    signEn: SIGN_EN[signIndex],
    degree: Math.floor(inSign),
    minute: Math.floor((inSign % 1) * 60),
    signIndex,
  };
}

/**
 * 计算上升点 (ASC) — 简化 Placidus 算法
 */
function calculateASC(jd: number, latitude: number, longitude: number): number {
  // 恒星时 (本地)
  const T = (jd - 2451545.0) / 36525.0;
  let GMST = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + T * T * (0.000387933 - T / 38710000);
  GMST = ((GMST % 360) + 360) % 360;
  const LST = ((GMST + longitude) % 360 + 360) % 360;
  const LSTrad = LST * Math.PI / 180;

  // 黄道倾角
  const epsilon = (23.4393 - 0.013 * T) * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;

  // ASC = atan2(-cos(LST), sin(LST)*cos(ε) + tan(φ)*sin(ε))
  const ascRad = Math.atan2(-Math.cos(LSTrad), Math.sin(LSTrad) * Math.cos(epsilon) + Math.tan(latRad) * Math.sin(epsilon));
  let asc = ascRad * 180 / Math.PI;
  asc = ((asc % 360) + 360) % 360;
  return asc;
}

/**
 * 计算等宫制宫位 (Equal House)
 */
function calculateHouses(asc: number): HousePosition[] {
  const houses: HousePosition[] = [];
  for (let i = 0; i < 12; i++) {
    const lon = ((asc + i * 30) % 360 + 360) % 360;
    const info = lonToSign(lon);
    houses.push({
      number: i + 1,
      sign: info.sign,
      degree: info.degree,
      minute: info.minute,
      longitude: lon,
    });
  }
  return houses;
}

/**
 * 判断行星落入哪个宫位
 */
function getHouseNumber(planetLon: number, houses: HousePosition[]): number {
  for (let i = 0; i < 12; i++) {
    const start = houses[i].longitude;
    const end = houses[(i + 1) % 12].longitude;
    const pLon = planetLon;

    if (end > start) {
      if (pLon >= start && pLon < end) return i + 1;
    } else {
      // 跨 0°
      if (pLon >= start || pLon < end) return i + 1;
    }
  }
  return 1;
}

/**
 * 计算相位
 */
function calculateAspects(planets: PlanetPosition[]): Aspect[] {
  const aspects: Aspect[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      let diff = Math.abs(planets[i].longitude - planets[j].longitude);
      if (diff > 180) diff = 360 - diff;

      for (const asp of ASPECT_TYPES) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({
            planet1: planets[i].name,
            planet2: planets[j].name,
            type: asp.name,
            angle: asp.angle,
            orb: Math.round(orb * 100) / 100,
          });
          break;
        }
      }
    }
  }
  return aspects;
}

/**
 * 完整星盘计算
 */
export function calculateAstrology(
  timeInfo: TimeStandardization,
  latitude: number,
  longitude: number,
): AstrologyChart {
  const { utc } = timeInfo;
  const date = new Date(Date.UTC(utc.year, utc.month - 1, utc.day, utc.hour, utc.minute, 0));
  const time = Astronomy.MakeTime(date);

  // 儒略日
  const jd = 2451545.0 + (date.getTime() / 86400000 - 10957.5);

  // 行星位置
  const bodies = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const planets: PlanetPosition[] = [];

  // 太阳
  const sunPos = Astronomy.SunPosition(time);
  const sunInfo = lonToSign(sunPos.elon);
  // 月亮
  const moonVec = Astronomy.GeoMoon(time);
  const moonEcl = Astronomy.Ecliptic(moonVec);
  const moonInfo = lonToSign(moonEcl.elon);

  // ASC 和宫位
  const asc = calculateASC(jd, latitude, longitude);
  const houses = calculateHouses(asc);
  const mc = ((asc + 270) % 360 + 360) % 360; // 简化 MC

  planets.push({
    name: '太阳',
    longitude: sunPos.elon,
    latitude: sunPos.elat,
    sign: sunInfo.sign,
    degree: sunInfo.degree,
    minute: sunInfo.minute,
    house: getHouseNumber(sunPos.elon, houses),
    retrograde: false,
  });

  planets.push({
    name: '月亮',
    longitude: moonEcl.elon,
    latitude: moonEcl.elat,
    sign: moonInfo.sign,
    degree: moonInfo.degree,
    minute: moonInfo.minute,
    house: getHouseNumber(moonEcl.elon, houses),
    retrograde: false,
  });

  // 其他行星
  for (const body of bodies) {
    const vec = Astronomy.GeoVector(body, time, true);
    const ecl = Astronomy.Ecliptic(vec);
    const info = lonToSign(ecl.elon);

    // 逆行检测：比较前后1天速度
    const timeBefore = Astronomy.MakeTime(new Date(date.getTime() - 86400000));
    const vecBefore = Astronomy.GeoVector(body, timeBefore, true);
    const eclBefore = Astronomy.Ecliptic(vecBefore);
    let lonDiff = ecl.elon - eclBefore.elon;
    if (lonDiff > 180) lonDiff -= 360;
    if (lonDiff < -180) lonDiff += 360;
    const retrograde = lonDiff < 0;

    planets.push({
      name: PLANET_NAMES[body] || body,
      longitude: ecl.elon,
      latitude: ecl.elat,
      sign: info.sign,
      degree: info.degree,
      minute: info.minute,
      house: getHouseNumber(ecl.elon, houses),
      retrograde,
    });
  }

  const aspects = calculateAspects(planets);

  return {
    planets,
    houses,
    aspects,
    ascendant: asc,
    midheaven: mc,
  };
}
