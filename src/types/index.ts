// ========== 基础类型 ==========

export interface BirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: '男' | '女';
  city: string;
  longitude: number;
  latitude: number;
  timezone: string; // IANA timezone string, e.g. 'Asia/Shanghai'
}

// ========== 时间标准化 ==========

export interface TimeStandardization {
  utc: { year: number; month: number; day: number; hour: number; minute: number };
  isDST: boolean;
  utcOffset: number;
  trueSolarTime: { hour: number; minute: number };
  longitudeCorrection: number; // minutes
  equationOfTime: number; // minutes
  totalCorrection: number; // minutes
  shichen: string; // 子丑寅卯辰巳午未申酉戌亥
  shichenName: string; // 子时、丑时...
  nearBoundary: boolean; // 距时辰边界 < 15 分钟
  boundaryWarning?: string;
}

// ========== 八字 ==========

export interface BaziChart {
  fourPillars: {
    year: { gan: string; zhi: string; ganZhi: string };
    month: { gan: string; zhi: string; ganZhi: string };
    day: { gan: string; zhi: string; ganZhi: string };
    time: { gan: string; zhi: string; ganZhi: string };
  };
  wuxing: { year: string; month: string; day: string; time: string };
  nayin: { year: string; month: string; day: string; time: string };
  shiShen: {
    tianGan: { year: string; month: string; day: string; time: string };
    diZhi: { year: string; month: string; day: string; time: string };
  };
  hideGan: { year: string[]; month: string[]; day: string[]; time: string[] };
  diShi: { year: string; month: string; day: string; time: string };
  mingGong: string;
  shenGong: string;
  taiYuan: string;
  shengXiao: string;
  lunarDate: string;
  dayun: DaYun[];
}

export interface DaYun {
  startAge: number;
  ganZhi: string;
  startYear: number;
  endYear: number;
}

// ========== 紫微斗数 ==========

export interface ZiweiChart {
  destinyMaster: string;
  bodyMaster: string;
  element: string; // 五行局
  cells: ZiweiCell[];
}

export interface ZiweiCell {
  ground: string; // 地支
  temples: string[]; // 宫位名
  majorStars: ZiweiStar[];
  minorStars: ZiweiStar[];
  ageRange?: string;
}

export interface ZiweiStar {
  name: string;
  fourInfluence?: string; // 化禄/化权/化科/化忌
}

// ========== 西洋星盘 ==========

export interface AstrologyChart {
  planets: PlanetPosition[];
  houses: HousePosition[];
  aspects: Aspect[];
  ascendant: number;
  midheaven: number;
}

export interface PlanetPosition {
  name: string;
  longitude: number;
  latitude: number;
  sign: string;
  degree: number;
  minute: number;
  house: number;
  retrograde: boolean;
}

export interface HousePosition {
  number: number;
  sign: string;
  degree: number;
  minute: number;
  longitude: number;
}

export interface Aspect {
  planet1: string;
  planet2: string;
  type: string;
  angle: number;
  orb: number;
}

// ========== AI 对话 ==========

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ========== 城市数据 ==========

export interface CityData {
  name: string;
  province: string;
  longitude: number;
  latitude: number;
  timezone: string;
}
