/**
 * 法达星限引擎 (Firdaria / Persian Time-Lord System)
 *
 * 波斯/中世纪占星的时间主星系统，把人生按固定年数分配给不同行星管辖。
 * 纯数学计算，不依赖天文引擎。
 *
 * 日生/夜生有不同的行星顺序。
 * 每个大周期内有7个子周期（北交点和南交点除外），按卡尔迪顺序排列。
 * 75年为一个完整循环，之后从头开始。
 */

// ========== 类型定义 ==========

export interface FirdariaPeriod {
  ruler: string;       // 主星名
  startAge: number;    // 开始年龄（精确到小数）
  endAge: number;      // 结束年龄
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  years: number;       // 持续年数
  isCurrent: boolean;  // 当前是否在此周期内
  subPeriods: FirdariaSubPeriod[];
}

export interface FirdariaSubPeriod {
  ruler: string;       // 子周期主星
  coRuler: string;     // 格式："主星/子星"
  startAge: number;
  endAge: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface FirdariaResult {
  isDayBirth: boolean;
  periods: FirdariaPeriod[];
  currentPeriod: { major: string; sub: string } | null;
}

// ========== 常量 ==========

/** 日生行星顺序及年数 */
const DAY_SEQUENCE: { ruler: string; years: number }[] = [
  { ruler: '太阳', years: 10 },
  { ruler: '金星', years: 8 },
  { ruler: '水星', years: 13 },
  { ruler: '月亮', years: 9 },
  { ruler: '土星', years: 11 },
  { ruler: '木星', years: 12 },
  { ruler: '火星', years: 7 },
  { ruler: '北交点', years: 3 },
  { ruler: '南交点', years: 2 },
];

/** 夜生行星顺序及年数 */
const NIGHT_SEQUENCE: { ruler: string; years: number }[] = [
  { ruler: '月亮', years: 9 },
  { ruler: '土星', years: 11 },
  { ruler: '木星', years: 12 },
  { ruler: '火星', years: 7 },
  { ruler: '太阳', years: 10 },
  { ruler: '金星', years: 8 },
  { ruler: '水星', years: 13 },
  { ruler: '北交点', years: 3 },
  { ruler: '南交点', years: 2 },
];

/** 卡尔迪顺序 (Chaldean order)：从最慢到最快，循环 */
const CHALDEAN_ORDER = ['土星', '木星', '火星', '太阳', '金星', '水星', '月亮'];

/** 一个完整循环的年数 */
const CYCLE_YEARS = 75;

// ========== 辅助函数 ==========

/** 将 Date 格式化为 YYYY-MM-DD */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 给出生日期加上精确的年数（支持小数），返回新 Date */
function addYears(baseDate: Date, years: number): Date {
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  return new Date(baseDate.getTime() + years * msPerYear);
}

/** 计算从出生日期到目标日期的精确年龄（小数） */
function getAge(birthDate: Date, targetDate: Date): number {
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  return (targetDate.getTime() - birthDate.getTime()) / msPerYear;
}

/**
 * 获取从某个起始行星开始的卡尔迪顺序7颗行星
 * 起始行星 = 大周期主星，然后按卡尔迪顺序继续
 */
function getChaldeanSubRulers(majorRuler: string): string[] {
  const idx = CHALDEAN_ORDER.indexOf(majorRuler);
  if (idx === -1) return []; // 北交点/南交点不在卡尔迪顺序中
  const result: string[] = [];
  for (let i = 0; i < 7; i++) {
    result.push(CHALDEAN_ORDER[(idx + i) % 7]);
  }
  return result;
}

// ========== 主函数 ==========

/**
 * 计算法达星限
 *
 * @param birthDate  出生日期
 * @param isDayBirth 日生/夜生
 * @param targetDate 目标日期（默认当前时间）
 * @returns FirdariaResult
 */
export function calculateFirdaria(
  birthDate: Date,
  isDayBirth: boolean,
  targetDate?: Date,
): FirdariaResult {
  const now = targetDate || new Date();
  const currentAge = getAge(birthDate, now);
  const sequence = isDayBirth ? DAY_SEQUENCE : NIGHT_SEQUENCE;

  const periods: FirdariaPeriod[] = [];
  let currentPeriod: { major: string; sub: string } | null = null;

  // 计算需要覆盖多少个完整循环（至少覆盖到当前年龄 + 一些额外的）
  // 保险起见，生成到当前年龄所在循环的末尾 + 下一个完整循环
  const cyclesNeeded = Math.floor(currentAge / CYCLE_YEARS) + 2;
  const totalSequenceLength = cyclesNeeded * sequence.length;

  let cumulativeAge = 0;

  for (let i = 0; i < totalSequenceLength; i++) {
    const seqIdx = i % sequence.length;
    const { ruler, years } = sequence[seqIdx];

    const startAge = cumulativeAge;
    const endAge = cumulativeAge + years;
    const startDate = addYears(birthDate, startAge);
    const endDate = addYears(birthDate, endAge);
    const isCurrent = currentAge >= startAge && currentAge < endAge;

    // 子周期
    const subPeriods: FirdariaSubPeriod[] = [];

    if (ruler !== '北交点' && ruler !== '南交点') {
      const subRulers = getChaldeanSubRulers(ruler);
      const subYears = years / 7;

      for (let s = 0; s < 7; s++) {
        const subStartAge = startAge + s * subYears;
        const subEndAge = startAge + (s + 1) * subYears;
        const subStartDate = addYears(birthDate, subStartAge);
        const subEndDate = addYears(birthDate, subEndAge);
        const subIsCurrent = currentAge >= subStartAge && currentAge < subEndAge;

        subPeriods.push({
          ruler: subRulers[s],
          coRuler: `${ruler}/${subRulers[s]}`,
          startAge: Math.round(subStartAge * 1000) / 1000,
          endAge: Math.round(subEndAge * 1000) / 1000,
          startDate: formatDate(subStartDate),
          endDate: formatDate(subEndDate),
          isCurrent: subIsCurrent,
        });

        if (subIsCurrent && isCurrent) {
          currentPeriod = { major: ruler, sub: subRulers[s] };
        }
      }
    } else {
      // 北交点/南交点无子周期，但如果是当前周期，标记主星
      if (isCurrent) {
        currentPeriod = { major: ruler, sub: ruler };
      }
    }

    periods.push({
      ruler,
      startAge: Math.round(startAge * 1000) / 1000,
      endAge: Math.round(endAge * 1000) / 1000,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      years,
      isCurrent,
      subPeriods,
    });

    cumulativeAge = endAge;

    // 如果已经生成了足够的周期（超过当前年龄 + 一个完整循环），停止
    if (cumulativeAge > currentAge + CYCLE_YEARS) break;
  }

  return {
    isDayBirth,
    periods,
    currentPeriod,
  };
}
