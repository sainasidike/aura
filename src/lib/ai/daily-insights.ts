/**
 * 日运预分析引擎
 *
 * 在调 AI 之前，用规则从行运数据中提取"今天最重要的天象"，
 * 转成自然语言提示，让 AI 围绕这些提示展开叙事。
 *
 * GLM-4-flash 不擅长从原始数据中判断优先级，
 * 但擅长把已判定的结论写成有画面感的文字。
 */

interface TransitPlanet {
  name: string;
  sign: string;
  degree: number;
  house: number;
  retrograde: boolean;
  longitude: number;
}

interface CrossAspect {
  planet1: string; // 行X
  planet2: string; // 本X
  type: string;    // 合相|六合|四分|三合|对冲
  orb: number;
}

interface NatalPlanet {
  name: string;
  sign: string;
  degree: number;
  house: number;
  longitude: number;
}

// 行星中文简称到全称映射
const SHORT_TO_FULL: Record<string, string> = {
  '日': '太阳', '月': '月亮', '水': '水星', '金': '金星', '火': '火星',
  '木': '木星', '土': '土星', '天': '天王星', '海': '海王星', '冥': '冥王星',
};

// 相位的能量性质
const ASPECT_NATURE: Record<string, 'hard' | 'soft' | 'neutral'> = {
  '合相': 'neutral',
  '六合': 'soft',
  '四分': 'hard',
  '三合': 'soft',
  '对冲': 'hard',
};

// 行星影响力权重（越大越重要）
const PLANET_WEIGHT: Record<string, number> = {
  '太阳': 10, '月亮': 9, '水星': 7, '金星': 7, '火星': 8,
  '木星': 8, '土星': 8, '天王星': 6, '海王星': 5, '冥王星': 5,
};

// 宫位含义
const HOUSE_MEANING: Record<number, string> = {
  1: '自我形象/外在表现', 2: '财务/收入', 3: '沟通/短途出行/兄弟姐妹',
  4: '家庭/居所', 5: '恋爱/娱乐/创作', 6: '工作/健康/日常事务',
  7: '伴侣/合作关系', 8: '共享财务/深层关系/转变', 9: '学习/旅行/哲学',
  10: '事业/社会地位', 11: '朋友圈/社群/理想', 12: '独处/潜意识/隐秘事务',
};

// 行星→维度关联
const PLANET_DIMENSION: Record<string, string[]> = {
  '太阳': ['career', 'health'],
  '月亮': ['love', 'health'],
  '水星': ['study', 'career'],
  '金星': ['love', 'social'],
  '火星': ['career', 'health'],
  '木星': ['career', 'social'],
  '土星': ['career', 'health'],
  '天王星': ['career', 'social'],
  '海王星': ['love', 'study'],
  '冥王星': ['career', 'love'],
};

interface DailyInsight {
  dimension: string; // love/career/health/study/social
  importance: number;
  text: string;
}

/**
 * 从行运数据中提取今日关键天象
 */
export function extractDailyInsights(
  transitPlanets: TransitPlanet[],
  natalPlanets: NatalPlanet[],
  crossAspects: CrossAspect[],
  natalAscendant: number,
): string {
  const insights: DailyInsight[] = [];

  // ═══ 1. 行运月亮（日运差异化的关键）═══
  const transitMoon = transitPlanets.find(p => p.name === '月亮');
  if (transitMoon) {
    const moonHouse = transitMoon.house;
    const meaning = HOUSE_MEANING[moonHouse] || '';
    insights.push({
      dimension: moonHouse === 5 || moonHouse === 7 ? 'love' : moonHouse === 6 || moonHouse === 10 ? 'career' : 'love',
      importance: 9,
      text: `【今日情绪焦点】行运月亮在${transitMoon.sign}${transitMoon.degree}°过你的第${moonHouse}宫（${meaning}）。今天你的情绪和注意力会被${meaning}相关的事牵动。`,
    });

    // 月亮的行运相位（月亮移动快，当日相位最活跃）
    const moonAspects = crossAspects.filter(a => a.planet1 === '行月').sort((a, b) => a.orb - b.orb).slice(0, 3);
    for (const asp of moonAspects) {
      const natalName = SHORT_TO_FULL[asp.planet2.replace('本', '')] || asp.planet2;
      const nature = ASPECT_NATURE[asp.type];
      const natalP = natalPlanets.find(p => p.name === natalName.replace('本', ''));
      if (nature === 'hard') {
        insights.push({
          dimension: natalP && (natalP.house === 7 || natalP.house === 5) ? 'love' : 'health',
          importance: 7,
          text: `行运月亮${asp.type}本命${natalName}（容许度${asp.orb}°）：今天在${natalName}代表的领域容易情绪波动或遇到小摩擦。${asp.type === '四分' ? '内心烦躁但说不清原因。' : '和某人可能有意见不合。'}`,
        });
      } else if (nature === 'soft') {
        insights.push({
          dimension: natalP && (natalP.house === 7 || natalP.house === 5) ? 'love' : 'social',
          importance: 6,
          text: `行运月亮${asp.type}本命${natalName}（容许度${asp.orb}°）：今天在${natalName}代表的领域感觉顺畅，直觉准确。`,
        });
      }
    }
  }

  // ═══ 2. 紧密行运相位（orb < 2°）— 今天最强的能量 ═══
  const tightAspects = crossAspects
    .filter(a => a.orb <= 2 && a.planet1 !== '行月') // 月亮已单独处理
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 5);

  for (const asp of tightAspects) {
    const transitName = SHORT_TO_FULL[asp.planet1.replace('行', '')] || asp.planet1;
    const natalName = SHORT_TO_FULL[asp.planet2.replace('本', '')] || asp.planet2;
    const nature = ASPECT_NATURE[asp.type];
    const weight = (PLANET_WEIGHT[transitName.replace('行', '')] || 5) + (PLANET_WEIGHT[natalName.replace('本', '')] || 5);

    const dims = PLANET_DIMENSION[transitName.replace('行', '')] || ['career'];
    const meaning = getTightAspectMeaning(transitName, natalName, asp.type, asp.orb);

    if (meaning) {
      insights.push({
        dimension: dims[0],
        importance: weight + (2 - asp.orb),
        text: meaning,
      });
    }
  }

  // ═══ 3. 行运太阳落宫 — 今日精力焦点 ═══
  const transitSun = transitPlanets.find(p => p.name === '太阳');
  if (transitSun) {
    const sunHouse = transitSun.house;
    insights.push({
      dimension: sunHouse === 10 || sunHouse === 6 ? 'career' : sunHouse === 5 || sunHouse === 7 ? 'love' : 'career',
      importance: 5,
      text: `【精力焦点】行运太阳在${transitSun.sign}过你的第${sunHouse}宫（${HOUSE_MEANING[sunHouse] || ''}），今日精力自然倾向投入${HOUSE_MEANING[sunHouse] || '该领域'}。`,
    });
  }

  // ═══ 4. 行运火星（冲突/行动力指标）═══
  const transitMars = transitPlanets.find(p => p.name === '火星');
  if (transitMars) {
    const marsAspects = crossAspects.filter(a => a.planet1 === '行火' && a.orb <= 3);
    for (const asp of marsAspects) {
      const natalName = SHORT_TO_FULL[asp.planet2.replace('本', '')] || asp.planet2;
      if (ASPECT_NATURE[asp.type] === 'hard') {
        insights.push({
          dimension: 'health',
          importance: 8,
          text: `行运火星${asp.type}本命${natalName}（${asp.orb}°）：今天精力旺但容易急躁，${asp.type === '四分' ? '小心和人起冲突或磕碰受伤' : '注意控制脾气，别在冲动下做决定'}。`,
        });
      }
    }
  }

  // ═══ 5. 逆行行星提醒 ═══
  const retroPlanets = transitPlanets.filter(p => p.retrograde && ['水星', '金星', '火星'].includes(p.name));
  for (const rp of retroPlanets) {
    const meaning: Record<string, string> = {
      '水星': '今日沟通容易产生误解，发消息前多检查一遍，签合同/做重要决定建议再等等',
      '金星': '审美判断可能偏差，今天不太适合大额消费或做关于感情的重大决定',
      '火星': '行动力受阻，计划好的事容易被打断，调低今天的预期产出',
    };
    insights.push({
      dimension: rp.name === '水星' ? 'study' : rp.name === '金星' ? 'love' : 'career',
      importance: 6,
      text: `${rp.name}逆行中（${rp.sign}${rp.degree}°第${rp.house}宫）：${meaning[rp.name] || ''}`,
    });
  }

  if (insights.length === 0) return '';

  // 按重要性排序，取前 8 条
  insights.sort((a, b) => b.importance - a.importance);
  const top = insights.slice(0, 8);

  return `## 今日关键天象（预分析，已从排盘数据验证）
${top.map((ins, i) => `${i + 1}. ${ins.text}`).join('\n')}

## 如何使用上述天象
- 上述天象是从行运数据中用占星规则推导的，已验证准确
- 你的任务是围绕这些天象，用生活场景把每个维度写得有画面感
- 每个维度的📌核心判断必须引用至少1条上述天象，并翻译成具体的"今天会发生什么"
- 重要：不同维度引用不同的天象，不要所有维度都说同一件事`;
}

/** 紧密行运相位的场景化解读 */
function getTightAspectMeaning(transit: string, natal: string, type: string, orb: number): string {
  const t = transit.replace('行', '');
  const n = natal.replace('本', '');
  const isHard = type === '四分' || type === '对冲';

  // 行运金星相位 → 感情/审美/金钱
  if (t === '金星' || n === '金星') {
    if (isHard) {
      return `行运${transit}${type}本命${natal}（${orb}°）：今天在审美、感情或花钱方面容易踩坑——可能买到不满意的东西、和伴侣因为小事拌嘴、或对自己的外貌格外挑剔。`;
    }
    return `行运${transit}${type}本命${natal}（${orb}°）：今天人缘好、审美在线，适合约会、购物或做需要展示个人魅力的事。`;
  }

  // 行运水星相位 → 沟通/学习/出行
  if (t === '水星' || n === '水星') {
    if (isHard) {
      return `行运${transit}${type}本命${natal}（${orb}°）：今天沟通效率低，说话容易被误解或遗漏重要信息。发邮件、签文件前务必多看一遍。`;
    }
    return `行运${transit}${type}本命${natal}（${orb}°）：今天思路清晰，表达能力强，适合谈判、写方案、考试或做重要的沟通。`;
  }

  // 行运木星相位 → 机遇/扩张
  if (t === '木星' || n === '木星') {
    if (isHard) {
      return `行运${transit}${type}本命${natal}（${orb}°）：今天容易过度乐观或承诺太多，注意别一口气答应太多事，量力而行。`;
    }
    return `行运${transit}${type}本命${natal}（${orb}°）：今天运气好，容易遇到贵人或好消息。如果有想推进的事，今天行动成功率高。`;
  }

  // 行运土星相位 → 压力/责任
  if (t === '土星' || n === '土星') {
    if (isHard) {
      return `行运${transit}${type}本命${natal}（${orb}°）：今天感觉压力大、事情推进慢，可能遇到领导/权威的审视。别急，按部就班完成手头的事就好。`;
    }
    return `行运${transit}${type}本命${natal}（${orb}°）：今天适合处理需要耐心和专注的工作，做长期规划或整理文件/财务的好时机。`;
  }

  // 行运太阳相位 → 自我/精力
  if (t === '太阳') {
    if (isHard) {
      return `行运${transit}${type}本命${natal}（${orb}°）：今天可能感到自我认同受挑战，别人的评价容易影响你的心情。核心是做好自己的事，不必在意外界声音。`;
    }
    return `行运${transit}${type}本命${natal}（${orb}°）：今天精力充沛，自信心强，适合做需要表现自我的事——汇报、面试、社交。`;
  }

  // 通用
  if (isHard) {
    return `行运${transit}${type}本命${natal}（${orb}°，紧密相位）：这个相位今天非常活跃，在相关领域可能有摩擦或需要做出调整。`;
  }
  return `行运${transit}${type}本命${natal}（${orb}°，紧密相位）：这个相位今天带来顺畅的能量流动，相关领域容易有好的进展。`;
}
