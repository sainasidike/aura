/**
 * 本命盘缓存 — 基于出生信息的确定性计算结果缓存到 localStorage
 *
 * 缓存的盘：bazi / astrology / ziwei（出生数据不变则结果不变）
 * 不缓存的盘：transit / solar-return / lunar-return（依赖当前时间）
 */

import type { StoredProfile } from './storage';

type ChartType = 'bazi' | 'astrology' | 'ziwei';

/** 用出生参数生成缓存 key，profile 编辑后自动失效 */
function buildCacheKey(profile: StoredProfile, type: ChartType): string {
  const sig = `${profile.year}.${profile.month}.${profile.day}.${profile.hour}.${profile.minute}.${profile.gender}.${profile.longitude}.${profile.latitude}.${profile.timezone}`;
  return `natal_${type}_${sig}`;
}

/** 构建 POST body（各页面通用） */
function buildBody(profile: StoredProfile) {
  return {
    year: profile.year, month: profile.month, day: profile.day,
    hour: profile.hour, minute: profile.minute, gender: profile.gender,
    longitude: profile.longitude, latitude: profile.latitude, timezone: profile.timezone,
  };
}

const API_MAP: Record<ChartType, string> = {
  bazi: '/api/bazi',
  astrology: '/api/astrology',
  ziwei: '/api/ziwei',
};

/**
 * 获取本命盘数据（优先读缓存）
 * @returns 解析后的 JSON 响应
 */
export async function fetchNatalChart<T = Record<string, unknown>>(
  profile: StoredProfile,
  type: ChartType,
): Promise<T> {
  const key = buildCacheKey(profile, type);

  // 1. 尝试读缓存
  try {
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached) as T;
  } catch { /* ignore */ }

  // 2. 请求 API
  const res = await fetch(API_MAP[type], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildBody(profile)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '计算失败');

  // 3. 写入缓存
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* storage full, skip */ }

  return data as T;
}

/**
 * 批量获取多种本命盘（并行请求，各自独立缓存）
 */
export async function fetchNatalCharts(
  profile: StoredProfile,
  types: ChartType[],
): Promise<Record<ChartType, Record<string, unknown> | null>> {
  const results = await Promise.allSettled(
    types.map(t => fetchNatalChart(profile, t)),
  );
  const out: Record<string, Record<string, unknown> | null> = {};
  types.forEach((t, i) => {
    const r = results[i];
    out[t] = r.status === 'fulfilled' ? r.value as Record<string, unknown> : null;
  });
  return out as Record<ChartType, Record<string, unknown> | null>;
}

/**
 * 清除某个 profile 的所有本命盘缓存
 */
export function clearNatalCache(profile: StoredProfile): void {
  for (const type of ['bazi', 'astrology', 'ziwei'] as ChartType[]) {
    try {
      localStorage.removeItem(buildCacheKey(profile, type));
    } catch { /* ignore */ }
  }
}
