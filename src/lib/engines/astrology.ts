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
    // 东侧（MC→ASC）用昼半弧 DSA，西侧（MC→IC）用夜半弧 NSA
    const semiArc = direction === 'east' ? DSA : (180 - DSA);

    const targetRA = direction === 'east'
      ? normalize(RAMC + semiArc * fraction)
      : normalize(RAMC - semiArc * fraction);

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
 * Alcabitius (阿卡比特) 宫位制
 * 将上升点的昼半弧和夜半弧各三等分，
 * 再将赤道等分点通过赤经→黄经投影到黄道。
 */
function calculateAlcabitiusHouses(asc: number, mc: number, RAMC: number, epsilon: number, latitude: number): HousePosition[] {
  const eps = epsilon * DEG;
  const ascRad = asc * DEG;

  // 上升点赤经
  const RAAC = normalize(Math.atan2(Math.sin(ascRad) * Math.cos(eps), Math.cos(ascRad)) * RAD);

  // 昼半弧 DSA = 赤道上从 MC 到 ASC 的弧度
  let DSA = RAAC - RAMC;
  if (DSA < 0) DSA += 360;
  if (DSA > 180) {
    // 极端情况，回退等宫制
    return calculateEqualHouses(asc);
  }

  const NSA = 180 - DSA;

  // 赤道三等分
  const ra11 = normalize(RAMC + DSA / 3);
  const ra12 = normalize(RAMC + 2 * DSA / 3);
  const ra2  = normalize(RAAC + NSA / 3);
  const ra3  = normalize(RAAC + 2 * NSA / 3);

  // 赤经 → 黄经（与 MC 相同的投影公式）
  function raToLon(ra: number): number {
    const raRad = ra * DEG;
    return normalize(Math.atan2(Math.sin(raRad), Math.cos(raRad) * Math.cos(eps)) * RAD);
  }

  const cusp11 = raToLon(ra11);
  const cusp12 = raToLon(ra12);
  const cusp2 = raToLon(ra2);
  const cusp3 = raToLon(ra3);

  const ic = normalize(mc + 180);
  const desc = normalize(asc + 180);
  const cusp5 = normalize(cusp11 + 180);
  const cusp6 = normalize(cusp12 + 180);
  const cusp8 = normalize(cusp2 + 180);
  const cusp9 = normalize(cusp3 + 180);

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

  // Alcabitius 阿卡比特宫位制 (高纬度 > 66° 回退等宫制)
  let houses: HousePosition[];
  if (Math.abs(latitude) > 66) {
    houses = calculateEqualHouses(asc);
  } else {
    houses = calculateAlcabitiusHouses(asc, mc, RAMC, epsilon, latitude);
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

/* ═══════════════════════════════════════ */
/* 从 UTC Date 直接计算星盘（行运/回归用）   */
/* ═══════════════════════════════════════ */

export function calculateChartFromDate(
  utcDate: Date,
  latitude: number,
  longitude: number,
): AstrologyChart {
  const time = Astronomy.MakeTime(utcDate);
  const jd = 2451545.0 + (utcDate.getTime() / 86400000 - 10957.5);
  const { RAMC, epsilon } = calculateRAMC(jd, longitude);
  const asc = calculateASC(RAMC, epsilon, latitude);
  const mc = calculateMC(RAMC, epsilon);

  // Alcabitius 阿卡比特宫位制
  let houses: HousePosition[];
  if (Math.abs(latitude) > 66) {
    houses = calculateEqualHouses(asc);
  } else {
    houses = calculateAlcabitiusHouses(asc, mc, RAMC, epsilon, latitude);
  }

  const planets: PlanetPosition[] = [];

  const sunPos = Astronomy.SunPosition(time);
  const sunInfo = lonToSign(sunPos.elon);
  planets.push({
    name: '太阳', longitude: sunPos.elon, latitude: sunPos.elat,
    sign: sunInfo.sign, degree: sunInfo.degree, minute: sunInfo.minute,
    house: getHouseNumber(sunPos.elon, houses), retrograde: false,
  });

  const moonVec = Astronomy.GeoMoon(time);
  const moonEcl = Astronomy.Ecliptic(moonVec);
  const moonInfo = lonToSign(moonEcl.elon);
  planets.push({
    name: '月亮', longitude: moonEcl.elon, latitude: moonEcl.elat,
    sign: moonInfo.sign, degree: moonInfo.degree, minute: moonInfo.minute,
    house: getHouseNumber(moonEcl.elon, houses), retrograde: false,
  });

  const bodies = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  for (const body of bodies) {
    const vec = Astronomy.GeoVector(body, time, true);
    const ecl = Astronomy.Ecliptic(vec);
    const info = lonToSign(ecl.elon);
    const timeBefore = Astronomy.MakeTime(new Date(utcDate.getTime() - 86400000));
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

/* ═══════════════════════════════════════ */
/* 太阳回归盘 (Solar Return)               */
/* ═══════════════════════════════════════ */

export function findSolarReturn(
  natalSunLon: number,
  year: number,
  latitude: number,
  longitude: number,
): { date: Date; chart: AstrologyChart; precision: number } {
  // SearchSunLongitude: 从 startDate 开始搜索太阳到达 targetLon 的精确时刻
  const startDate = new Date(Date.UTC(year, 0, 1));
  const startTime = Astronomy.MakeTime(startDate);
  const result = Astronomy.SearchSunLongitude(natalSunLon, startTime, 366);
  if (!result) throw new Error(`无法找到 ${year} 年的太阳回归时刻`);

  const returnDate = result.date;
  const chart = calculateChartFromDate(returnDate, latitude, longitude);

  // 验证精度
  const sunPos = Astronomy.SunPosition(result);
  const error = Math.abs(normalize(sunPos.elon - natalSunLon));
  const precisionArcsec = Math.min(error, 360 - error) * 3600;

  return { date: returnDate, chart, precision: Math.round(precisionArcsec * 100) / 100 };
}

/* ═══════════════════════════════════════ */
/* 月亮回归盘 (Lunar Return)               */
/* ═══════════════════════════════════════ */

function getMoonLongitude(utcDate: Date): number {
  const time = Astronomy.MakeTime(utcDate);
  const moonVec = Astronomy.GeoMoon(time);
  const moonEcl = Astronomy.Ecliptic(moonVec);
  return moonEcl.elon;
}

function searchMoonCrossing(targetLon: number, startDate: Date, limitDays: number = 30): Date | null {
  const stepMs = 0.04 * 86400000; // ~58 分钟步长（月亮 ~0.5°/小时）
  let prevLon = getMoonLongitude(startDate);

  for (let ms = stepMs; ms < limitDays * 86400000; ms += stepMs) {
    const date = new Date(startDate.getTime() + ms);
    const lon = getMoonLongitude(date);

    // delta = normalize(target - moonLon) = 月亮还需前进多少度到达目标
    // 月亮前进时 delta 递减; 跨过目标时 delta 从接近 0 跳到接近 360
    const prevDelta = normalize(targetLon - prevLon);
    const currDelta = normalize(targetLon - lon);

    // 检测跨越: prevDelta 很小 (接近目标) → currDelta 很大 (刚过目标)
    if (prevDelta < 180 && currDelta > 180) {
      // 二分搜索精确时刻
      let lo = startDate.getTime() + ms - stepMs;
      let hi = startDate.getTime() + ms;
      for (let iter = 0; iter < 50; iter++) {
        const mid = (lo + hi) / 2;
        const midDate = new Date(mid);
        const midLon = getMoonLongitude(midDate);
        const midDelta = normalize(targetLon - midLon);
        if (midDelta < 180) {
          // 还没跨过，向后搜
          lo = mid;
        } else {
          // 已经跨过，向前搜
          hi = mid;
        }
      }
      return new Date((lo + hi) / 2);
    }
    prevLon = lon;
  }
  return null;
}

export function findLunarReturn(
  natalMoonLon: number,
  afterDate: Date,
  latitude: number,
  longitude: number,
): { date: Date; chart: AstrologyChart; nextDate: Date | null; precision: number } {
  const returnDate = searchMoonCrossing(natalMoonLon, afterDate, 30);
  if (!returnDate) throw new Error('无法找到月亮回归时刻');

  const chart = calculateChartFromDate(returnDate, latitude, longitude);

  // 精度验证
  const actualMoonLon = getMoonLongitude(returnDate);
  const error = Math.abs(normalize(actualMoonLon - natalMoonLon));
  const precisionArcsec = Math.min(error, 360 - error) * 3600;

  // 查找下一次月亮回归（约 27.3 天后）
  const nextSearch = new Date(returnDate.getTime() + 25 * 86400000);
  const nextDate = searchMoonCrossing(natalMoonLon, nextSearch, 5);

  return { date: returnDate, chart, nextDate, precision: Math.round(precisionArcsec * 100) / 100 };
}

/* ═══════════════════════════════════════ */
/* 交叉相位（本命 vs 行运）                 */
/* ═══════════════════════════════════════ */

export function calculateCrossAspects(
  natalPlanets: PlanetPosition[],
  transitPlanets: PlanetPosition[],
): Aspect[] {
  const aspects: Aspect[] = [];
  for (const np of natalPlanets) {
    for (const tp of transitPlanets) {
      let diff = Math.abs(np.longitude - tp.longitude);
      if (diff > 180) diff = 360 - diff;
      for (const asp of ASPECT_TYPES) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({
            planet1: `行${PLANET_SHORT_EN[tp.name] || tp.name}`,
            planet2: `本${PLANET_SHORT_EN[np.name] || np.name}`,
            type: asp.name,
            angle: asp.angle,
            orb: Math.round(orb * 100) / 100,
          });
          break;
        }
      }
    }
  }
  return aspects.sort((a, b) => a.orb - b.orb);
}

const PLANET_SHORT_EN: Record<string, string> = {
  '太阳': '日', '月亮': '月', '水星': '水', '金星': '金', '火星': '火',
  '木星': '木', '土星': '土', '天王星': '天', '海王星': '海', '冥王星': '冥', '北交点': '☊',
};

/* ═══════════════════════════════════════ */
/* 组合盘 (Composite Chart)                */
/* ═══════════════════════════════════════ */

/** 短弧中点：正确处理跨 0° 的情况 */
function shortArcMidpoint(lon1: number, lon2: number): number {
  const diff = ((lon2 - lon1 + 540) % 360) - 180;
  return ((lon1 + diff / 2) % 360 + 360) % 360;
}

/**
 * 计算组合盘 (Composite Chart)
 * 两人行星黄经取短弧中点，宫头取中点 (Robert Hand 中点宫位法)
 */
export function calculateComposite(
  chartA: AstrologyChart,
  chartB: AstrologyChart,
): AstrologyChart {
  // 行星中点
  const planets: PlanetPosition[] = [];
  for (let i = 0; i < Math.min(chartA.planets.length, chartB.planets.length); i++) {
    const a = chartA.planets[i];
    const b = chartB.planets[i];
    const midLon = shortArcMidpoint(a.longitude, b.longitude);
    const midLat = (a.latitude + b.latitude) / 2;
    const info = lonToSign(midLon);
    planets.push({
      name: a.name,
      longitude: midLon,
      latitude: midLat,
      sign: info.sign,
      degree: info.degree,
      minute: info.minute,
      house: 1, // 重新分配
      retrograde: false, // 组合盘无逆行
    });
  }

  // ASC / MC 中点
  const ascendant = shortArcMidpoint(chartA.ascendant, chartB.ascendant);
  const midheaven = shortArcMidpoint(chartA.midheaven, chartB.midheaven);

  // 宫头中点 (Robert Hand 中点宫位法)
  const houses: HousePosition[] = [];
  for (let i = 0; i < Math.min(chartA.houses.length, chartB.houses.length); i++) {
    const ha = chartA.houses[i];
    const hb = chartB.houses[i];
    const midLon = shortArcMidpoint(ha.longitude, hb.longitude);
    const info = lonToSign(midLon);
    houses.push({
      number: ha.number,
      sign: info.sign,
      degree: info.degree,
      minute: info.minute,
      longitude: midLon,
    });
  }

  // 重新分配行星宫位
  for (const p of planets) {
    p.house = getHouseNumber(p.longitude, houses);
  }

  // 盘内相位
  const aspects = calculateAspects(planets);

  return { planets, houses, aspects, ascendant, midheaven };
}

/* ═══════════════════════════════════════ */
/* 时空中点盘 (Davison Chart)              */
/* ═══════════════════════════════════════ */

/**
 * 计算 Davison 盘 (时空中点盘)
 * 取两人出生时间戳中点 + 经纬度中点，算一张真实星盘
 */
export function calculateDavison(
  birthA: { date: Date; lat: number; lon: number },
  birthB: { date: Date; lat: number; lon: number },
): { chart: AstrologyChart; midpointDate: Date } {
  const midTime = new Date((birthA.date.getTime() + birthB.date.getTime()) / 2);
  const midLat = (birthA.lat + birthB.lat) / 2;
  const midLon = (birthA.lon + birthB.lon) / 2;
  const chart = calculateChartFromDate(midTime, midLat, midLon);
  return { chart, midpointDate: midTime };
}
