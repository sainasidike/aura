/**
 * 西洋星盘引擎 — Placidus 宫位制
 *
 * 基于 astronomy-engine (纯 JS, NASA 级精度)
 * 计算行星位置、星座、宫位(Placidus)、相位、北交点
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

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function normalize(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function lonToSign(lon: number): { sign: string; signEn: string; degree: number; minute: number; signIndex: number } {
  const n = normalize(lon);
  const si = Math.floor(n / 30);
  const inSign = n - si * 30;
  return {
    sign: SIGNS[si],
    signEn: SIGN_EN[si],
    degree: Math.floor(inSign),
    minute: Math.floor((inSign % 1) * 60),
    signIndex: si,
  };
}

/**
 * 计算 GMST 和本地恒星时 (RAMC = Local Sidereal Time)
 */
function calculateRAMC(jd: number, longitude: number): { RAMC: number; epsilon: number } {
  const T = (jd - 2451545.0) / 36525.0;
  let GMST = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + T * T * (0.000387933 - T / 38710000);
  GMST = normalize(GMST);
  const RAMC = normalize(GMST + longitude);
  const epsilon = 23.4393 - 0.013 * T;
  return { RAMC, epsilon };
}

/**
 * 计算 MC (中天) — 从 RAMC 转换到黄经
 */
function calculateMC(RAMC: number, epsilon: number): number {
  const ra = RAMC * DEG;
  const eps = epsilon * DEG;
  return normalize(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(eps)) * RAD);
}

/**
 * 计算 ASC (上升点)
 */
function calculateASC(RAMC: number, epsilon: number, latitude: number): number {
  const ra = RAMC * DEG;
  const eps = epsilon * DEG;
  const lat = latitude * DEG;
  const ascRad = Math.atan2(
    Math.cos(ra),
    -(Math.sin(ra) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps)),
  );
  return normalize(ascRad * RAD);
}

/**
 * Placidus 中间宫位迭代算法
 * direction: 'east' (MC→ASC, cusps 11/12) 或 'west' (MC→DSC, cusps 9/8)
 * fraction: 1/3 或 2/3
 */
function placidusCusp(
  direction: 'east' | 'west',
  fraction: number,
  RAMC: number,
  epsilon: number,
  latitude: number,
): number {
  const eps = epsilon * DEG;
  const lat = latitude * DEG;

  let ra = direction === 'east'
    ? normalize(RAMC + fraction * 90)
    : normalize(RAMC - fraction * 90);

  for (let i = 0; i < 50; i++) {
    const raRad = ra * DEG;
    const lon = normalize(Math.atan2(Math.sin(raRad), Math.cos(raRad) * Math.cos(eps)) * RAD);
    const lonRad = lon * DEG;

    const decl = Math.asin(Math.sin(eps) * Math.sin(lonRad));
    const cosSA = -Math.tan(decl) * Math.tan(lat);

    if (Math.abs(cosSA) > 1) return lon; // extreme latitude fallback

    const DSA = Math.acos(Math.max(-1, Math.min(1, cosSA))) * RAD;

    const targetRA = direction === 'east'
      ? normalize(RAMC + DSA * fraction)
      : normalize(RAMC - DSA * fraction);

    let diff = targetRA - ra;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (Math.abs(diff) < 0.0003) break;

    ra = targetRA;
  }

  const raRad = ra * DEG;
  return normalize(Math.atan2(Math.sin(raRad), Math.cos(raRad) * Math.cos(eps)) * RAD);
}

/**
 * Placidus 12 宫位
 * 从 MC 向东 (ASC方向) 计算 cusp 11, 12
 * 从 MC 向西 (DSC方向) 计算 cusp 9, 8
 * 对面宫位 = 原始 + 180°
 */
function calculatePlacidusHouses(asc: number, mc: number, RAMC: number, epsilon: number, latitude: number): HousePosition[] {
  // East of MC → ASC
  const cusp11 = placidusCusp('east', 1 / 3, RAMC, epsilon, latitude);
  const cusp12 = placidusCusp('east', 2 / 3, RAMC, epsilon, latitude);

  // West of MC → DSC
  const cusp9 = placidusCusp('west', 1 / 3, RAMC, epsilon, latitude);
  const cusp8 = placidusCusp('west', 2 / 3, RAMC, epsilon, latitude);

  // Opposite cusps
  const ic = normalize(mc + 180);
  const desc = normalize(asc + 180);
  const cusp2 = normalize(cusp8 + 180);
  const cusp3 = normalize(cusp9 + 180);
  const cusp5 = normalize(cusp11 + 180);
  const cusp6 = normalize(cusp12 + 180);

  const cusps = [asc, cusp2, cusp3, ic, cusp5, cusp6, desc, cusp8, cusp9, mc, cusp11, cusp12];

  return cusps.map((lon, i) => {
    const info = lonToSign(lon);
    return {
      number: i + 1,
      sign: info.sign,
      degree: info.degree,
      minute: info.minute,
      longitude: lon,
    };
  });
}

/**
 * 等宫制 (高纬度备用)
 */
function calculateEqualHouses(asc: number): HousePosition[] {
  return Array.from({ length: 12 }, (_, i) => {
    const lon = normalize(asc + i * 30);
    const info = lonToSign(lon);
    return { number: i + 1, sign: info.sign, degree: info.degree, minute: info.minute, longitude: lon };
  });
}

/**
 * 平均北交点 (Mean North Node)
 */
function calculateMeanNode(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
  return normalize(omega);
}

/**
 * 判断行星落入哪个宫位
 * Placidus 宫位不按黄经递增排列，需要按黄经排序后查找扇区
 */
function getHouseNumber(planetLon: number, houses: HousePosition[]): number {
  const sorted = houses
    .map(h => ({ number: h.number, longitude: h.longitude }))
    .sort((a, b) => a.longitude - b.longitude);

  const pLon = normalize(planetLon);

  for (let i = 0; i < 12; i++) {
    const cur = sorted[i];
    const next = sorted[(i + 1) % 12];

    if (next.longitude > cur.longitude) {
      if (pLon >= cur.longitude && pLon < next.longitude) return cur.number;
    } else {
      if (pLon >= cur.longitude || pLon < next.longitude) return cur.number;
    }
  }
  return houses[0].number;
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
 * 完整星盘计算 — Placidus 宫位制
 */
export function calculateAstrology(
  timeInfo: TimeStandardization,
  latitude: number,
  longitude: number,
): AstrologyChart {
  const { utc } = timeInfo;
  const date = new Date(Date.UTC(utc.year, utc.month - 1, utc.day, utc.hour, utc.minute, 0));
  const time = Astronomy.MakeTime(date);

  const jd = 2451545.0 + (date.getTime() / 86400000 - 10957.5);

  const { RAMC, epsilon } = calculateRAMC(jd, longitude);

  const asc = calculateASC(RAMC, epsilon, latitude);
  const mc = calculateMC(RAMC, epsilon);

  // Placidus (fallback to Equal House above 66° latitude)
  let houses: HousePosition[];
  if (Math.abs(latitude) > 66) {
    houses = calculateEqualHouses(asc);
  } else {
    houses = calculatePlacidusHouses(asc, mc, RAMC, epsilon, latitude);
  }

  const planets: PlanetPosition[] = [];

  // Sun
  const sunPos = Astronomy.SunPosition(time);
  const sunInfo = lonToSign(sunPos.elon);
  planets.push({
    name: '太阳', longitude: sunPos.elon, latitude: sunPos.elat,
    sign: sunInfo.sign, degree: sunInfo.degree, minute: sunInfo.minute,
    house: getHouseNumber(sunPos.elon, houses), retrograde: false,
  });

  // Moon
  const moonVec = Astronomy.GeoMoon(time);
  const moonEcl = Astronomy.Ecliptic(moonVec);
  const moonInfo = lonToSign(moonEcl.elon);
  planets.push({
    name: '月亮', longitude: moonEcl.elon, latitude: moonEcl.elat,
    sign: moonInfo.sign, degree: moonInfo.degree, minute: moonInfo.minute,
    house: getHouseNumber(moonEcl.elon, houses), retrograde: false,
  });

  // Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
  const bodies = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  for (const body of bodies) {
    const vec = Astronomy.GeoVector(body, time, true);
    const ecl = Astronomy.Ecliptic(vec);
    const info = lonToSign(ecl.elon);

    const timeBefore = Astronomy.MakeTime(new Date(date.getTime() - 86400000));
    const vecBefore = Astronomy.GeoVector(body, timeBefore, true);
    const eclBefore = Astronomy.Ecliptic(vecBefore);
    let lonDiff = ecl.elon - eclBefore.elon;
    if (lonDiff > 180) lonDiff -= 360;
    if (lonDiff < -180) lonDiff += 360;

    planets.push({
      name: PLANET_NAMES[body] || body,
      longitude: ecl.elon, latitude: ecl.elat,
      sign: info.sign, degree: info.degree, minute: info.minute,
      house: getHouseNumber(ecl.elon, houses), retrograde: lonDiff < 0,
    });
  }

  // North Node (Mean)
  const nodeLon = calculateMeanNode(jd);
  const nodeInfo = lonToSign(nodeLon);
  planets.push({
    name: '北交点', longitude: nodeLon, latitude: 0,
    sign: nodeInfo.sign, degree: nodeInfo.degree, minute: nodeInfo.minute,
    house: getHouseNumber(nodeLon, houses), retrograde: true,
  });

  const aspects = calculateAspects(planets);

  return { planets, houses, aspects, ascendant: asc, midheaven: mc };
}
