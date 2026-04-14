/**
 * 客户端 localStorage 存储
 * MVP 阶段替代数据库，后续切 Vercel Postgres
 */

export interface StoredProfile {
  id: string;
  name: string;
  gender: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  city: string;
  longitude: number;
  latitude: number;
  timezone: string;
  createdAt: string;
}

const PROFILES_KEY = 'aura_profiles';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getProfiles(): StoredProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PROFILES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addProfile(profile: Omit<StoredProfile, 'id' | 'createdAt'>): StoredProfile {
  const profiles = getProfiles();
  const newProfile: StoredProfile = {
    ...profile,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  profiles.unshift(newProfile);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  return newProfile;
}

export function deleteProfile(id: string): void {
  const profiles = getProfiles().filter(p => p.id !== id);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function getProfileById(id: string): StoredProfile | undefined {
  return getProfiles().find(p => p.id === id);
}

const ACTIVE_PROFILE_KEY = 'aura_active_profile';

/** 获取当前活跃档案 ID（跨页面同步） */
export function getActiveProfileId(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(ACTIVE_PROFILE_KEY); } catch { return null; }
}

/** 设置当前活跃档案 ID（跨页面同步） */
export function setActiveProfileId(id: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(ACTIVE_PROFILE_KEY, id); } catch { /* ignore */ }
}
