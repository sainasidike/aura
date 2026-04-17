/**
 * 命盘预分析引擎 — 从排盘数据中提取有占星意义的模式
 *
 * 目的：GLM-4-flash 不擅长占星推理，但擅长叙事。
 * 本模块在 AI 调用前，用规则引擎提取格局、守护关系、行星状态等模式，
 * 转成自然语言洞察，让 AI 基于洞察展开叙事而非从原始数据推导。
 */

interface Planet {
  name: string;
  sign: string;
  degree: number;
  minute?: number;
  house: number;
  longitude: number;
  retrograde: boolean;
}

interface Aspect {
  planet1: string;
  planet2: string;
  type: string; // 合相|六合|四分|三合|对冲
  orb: number;
}

interface House {
  number: number;
  sign: string;
  degree: number;
  minute: number;
  longitude: number;
}

interface ChartData {
  planets?: Planet[];
  houses?: House[];
  aspects?: Aspect[];
  ascendant?: number;
  midheaven?: number;
}

// ─── 星座守护星映射 ───

const SIGN_RULER: Record<string, string> = {
  '白羊': '火星', '金牛': '金星', '双子': '水星', '巨蟹': '月亮',
  '狮子': '太阳', '处女': '水星', '天秤': '金星', '天蝎': '冥王星',
  '射手': '木星', '摩羯': '土星', '水瓶': '天王星', '双鱼': '海王星',
};

// 行星入庙（Domicile）：行星在自己守护的星座
const PLANET_DOMICILE: Record<string, string[]> = {
  '太阳': ['狮子'], '月亮': ['巨蟹'], '水星': ['双子', '处女'],
  '金星': ['金牛', '天秤'], '火星': ['白羊', '天蝎'],
  '木星': ['射手', '双鱼'], '土星': ['摩羯', '水瓶'],
  '天王星': ['水瓶'], '海王星': ['双鱼'], '冥王星': ['天蝎'],
};

// 行星旺相（Exaltation）
const PLANET_EXALT: Record<string, string> = {
  '太阳': '白羊', '月亮': '金牛', '水星': '处女', '金星': '双鱼',
  '火星': '摩羯', '木星': '巨蟹', '土星': '天秤',
};

// 行星落陷（Detriment）：与入庙对宫
const PLANET_DETRIMENT: Record<string, string[]> = {
  '太阳': ['水瓶'], '月亮': ['摩羯'], '水星': ['射手', '双鱼'],
  '金星': ['天蝎', '白羊'], '火星': ['天秤', '金牛'],
  '木星': ['双子', '处女'], '土星': ['巨蟹', '狮子'],
};

// 行星落（Fall）：与旺相对宫
const PLANET_FALL: Record<string, string> = {
  '太阳': '天秤', '月亮': '天蝎', '水星': '双鱼', '金星': '处女',
  '火星': '巨蟹', '木星': '摩羯', '土星': '白羊',
};

const SIGNS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];

function lonToSign(lon: number): string {
  const n = ((lon % 360) + 360) % 360;
  return SIGNS[Math.floor(n / 30)];
}

// 七颗传统行星 + 三王星
const PERSONAL_PLANETS = ['太阳', '月亮', '水星', '金星', '火星'];
const OUTER_PLANETS = ['天王星', '海王星', '冥王星'];

// 宫位含义
const HOUSE_MEANING: Record<number, string> = {
  1: '自我形象与外在表现', 2: '财务与自我价值', 3: '沟通与学习',
  4: '家庭与内在安全感', 5: '恋爱、创造力与子女', 6: '日常工作与健康',
  7: '婚姻与一对一关系', 8: '深层转化、共享资源与性', 9: '高等学习、旅行与信仰',
  10: '事业与社会地位', 11: '社交圈与理想', 12: '潜意识、灵性与隐藏',
};

// ─── 洞察提取 ───

export function extractChartInsights(data: Record<string, unknown>, questionIntent?: string): string {
  const natal = data.natalChart as ChartData | undefined;
  if (!natal?.planets?.length || !natal?.aspects?.length) return '';

  const planets = natal.planets;
  const aspects = natal.aspects;
  const houses = natal.houses || [];
  const insights: string[] = [];
  const intent = questionIntent || 'general';

  // ═══ 1. 命主星分析 ═══
  const ascSign = natal.ascendant != null ? lonToSign(natal.ascendant) : null;
  if (ascSign) {
    const rulerName = SIGN_RULER[ascSign];
    const ruler = rulerName ? planets.find(p => p.name === rulerName) : null;
    if (ruler) {
      const rulerAspects = aspects.filter(a =>
        (a.planet1 === rulerName || a.planet2 === rulerName) && a.orb <= 5
      ).sort((a, b) => a.orb - b.orb);
      const tensionAspects = rulerAspects.filter(a => a.type === '四分' || a.type === '对冲');
      const harmonyAspects = rulerAspects.filter(a => a.type === '三合' || a.type === '六合');

      let rulerInsight = `命主星${rulerName}落${ruler.sign}${ruler.degree}°第${ruler.house}宫（${HOUSE_MEANING[ruler.house] || ''}）`;
      if (ruler.retrograde) rulerInsight += '且逆行，内在驱动力强但外在表达受阻，容易在行动前反复犹豫';
      rulerInsight += '。';

      if (tensionAspects.length > 0) {
        const t = tensionAspects[0];
        const other = t.planet1 === rulerName ? t.planet2 : t.planet1;
        rulerInsight += `命主星与${other}形成${t.type}（${t.orb}°），人生核心课题与${other}代表的领域密切相关。`;
      } else if (harmonyAspects.length > 0) {
        const h = harmonyAspects[0];
        const other = h.planet1 === rulerName ? h.planet2 : h.planet1;
        rulerInsight += `命主星与${other}形成${h.type}（${h.orb}°），天赋能量流动顺畅。`;
      }
      insights.push(rulerInsight);
    }
  }

  // ═══ 2. 日月关系 — 内在 vs 外在的核心矛盾/和谐 ═══
  const sun = planets.find(p => p.name === '太阳');
  const moon = planets.find(p => p.name === '月亮');
  if (sun && moon) {
    const sunMoonAspect = aspects.find(a =>
      (a.planet1 === '太阳' && a.planet2 === '月亮') ||
      (a.planet1 === '月亮' && a.planet2 === '太阳')
    );
    if (sunMoonAspect) {
      if (sunMoonAspect.type === '合相') {
        insights.push(`日月合相（${sunMoonAspect.orb}°）：意志与情感高度统一，目标明确、内心笃定，但容易陷入主观视角，难以客观看待自己。新月出生，开创型人格。`);
      } else if (sunMoonAspect.type === '对冲') {
        insights.push(`日月对冲（${sunMoonAspect.orb}°）：理性追求与情感需求持续拉扯。外在表现的自己和内心真实感受常常矛盾，在关系中容易在"我想要什么"和"我需要什么"之间反复。满月出生，关系型人格。`);
      } else if (sunMoonAspect.type === '四分') {
        insights.push(`日月四分（${sunMoonAspect.orb}°）：内在持续紧张感——想做的事和心里舒服的事经常冲突。这种摩擦是成长的发动机，但也容易焦虑。在人生重要抉择中，"理智选A但心里想选B"的场景会反复出现。`);
      } else if (sunMoonAspect.type === '三合') {
        insights.push(`日月三合（${sunMoonAspect.orb}°）：内外和谐，想做的事和情感需求天然一致。给人"舒服、通透"的感觉，但也可能因为太顺而缺乏危机感，在需要突破的时刻选择了安逸。`);
      }
    }
    // 日月不同元素的张力
    if (!sunMoonAspect || sunMoonAspect.orb > 8) {
      const sunElement = getElement(sun.sign);
      const moonElement = getElement(moon.sign);
      if (sunElement !== moonElement) {
        insights.push(`太阳${sun.sign}（${sunElement}象）与月亮${moon.sign}（${moonElement}象）：外在追求${ELEMENT_DESC[sunElement]}，内心却渴望${ELEMENT_DESC[moonElement]}。这种差异让你在不同场景展现截然不同的面貌。`);
      }
    }
  }

  // ═══ 3. 紧密相位（orb < 2°）— 命盘中最强的能量线 ═══
  const tightAspects = aspects
    .filter(a => a.orb <= 2 && a.planet1 !== '北交点' && a.planet2 !== '北交点')
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 5);

  for (const asp of tightAspects) {
    // 跳过已在日月分析中覆盖的
    if ((asp.planet1 === '太阳' && asp.planet2 === '月亮') || (asp.planet1 === '月亮' && asp.planet2 === '太阳')) continue;

    const p1 = planets.find(p => p.name === asp.planet1);
    const p2 = planets.find(p => p.name === asp.planet2);
    if (!p1 || !p2) continue;

    const meaning = getAspectMeaning(asp.planet1, asp.planet2, asp.type);
    if (meaning) {
      insights.push(`${asp.planet1}（${p1.sign}${p1.degree}°${p1.house}宫）${asp.type}${asp.planet2}（${p2.sign}${p2.degree}°${p2.house}宫），容许度仅${asp.orb}°：${meaning}`);
    }
  }

  // ═══ 4. 格局识别 ═══

  // T三角：A四分B，B四分C，A对冲C — 增强版：输出具体压力模式
  const tSquares = findTSquares(planets, aspects);
  for (const ts of tSquares) {
    insights.push(getTSquareDetail(ts.apex, ts.apexHouse, ts.base1, ts.base2));
  }

  // 大三角
  const grandTrines = findGrandTrines(planets, aspects);
  for (const gt of grandTrines) {
    const elem = getElement(gt.element);
    insights.push(`大三角格局（${elem}象）：${gt.planets.join('、')}形成天赋闭环。在${ELEMENT_TALENT[elem]}方面有过人天赋，但大三角也是"舒适区陷阱"——能量流转太顺，可能缺乏突破动力。`);
  }

  // ═══ 5. 宫位集中（3颗+行星同宫）═══
  const houseCounts: Record<number, string[]> = {};
  for (const p of planets) {
    if (p.name === '北交点') continue;
    if (!houseCounts[p.house]) houseCounts[p.house] = [];
    houseCounts[p.house].push(p.name);
  }
  for (const [h, ps] of Object.entries(houseCounts)) {
    if (ps.length >= 3) {
      const hn = Number(h);
      insights.push(`第${hn}宫（${HOUSE_MEANING[hn] || ''}）聚集${ps.length}颗行星（${ps.join('、')}），大量生命能量集中在此领域。这个宫位的议题是你人生的主旋律，也是你最容易投入精力、产出成果的方向。`);
    }
  }

  // ═══ 6. 行星尊贵与失势 — 增强版：场景化描述 ═══
  for (const p of planets) {
    if (p.name === '北交点') continue;
    const dom = PLANET_DOMICILE[p.name];
    const exalt = PLANET_EXALT[p.name];
    const det = PLANET_DETRIMENT[p.name];
    const fall = PLANET_FALL[p.name];

    if (dom?.includes(p.sign)) {
      const scene = getDignityScene(p.name, 'domicile', p.house);
      insights.push(`${p.name}入庙（${p.sign}${p.degree}°第${p.house}宫）：${scene}。`);
    } else if (exalt === p.sign) {
      const scene = getDignityScene(p.name, 'exalt', p.house);
      insights.push(`${p.name}旺相（${p.sign}${p.degree}°第${p.house}宫）：${scene}。`);
    } else if (det?.includes(p.sign)) {
      const scene = getDignityScene(p.name, 'detriment', p.house);
      insights.push(`${p.name}落陷（${p.sign}${p.degree}°第${p.house}宫）：${scene}。`);
    } else if (fall === p.sign) {
      const scene = getDignityScene(p.name, 'fall', p.house);
      insights.push(`${p.name}落弱（${p.sign}${p.degree}°第${p.house}宫）：${scene}。`);
    }
  }

  // ═══ 7. 逆行行星 — 增强版：结合宫位场景 ═══
  const retroPlanets = planets.filter(p => p.retrograde && p.name !== '北交点' && PERSONAL_PLANETS.includes(p.name));
  if (retroPlanets.length > 0) {
    for (const rp of retroPlanets) {
      const baseMeaning = RETRO_MEANING[rp.name];
      const houseContext = RETRO_HOUSE_CONTEXT[rp.name]?.[rp.house];
      if (baseMeaning) {
        let text = `${rp.name}逆行（${rp.sign}${rp.degree}°第${rp.house}宫）：${baseMeaning}`;
        if (houseContext) {
          text += ` 落在第${rp.house}宫具体表现为：${houseContext}。`;
        } else {
          text += ` 在第${rp.house}宫（${HOUSE_MEANING[rp.house] || ''}），这种逆行特质在${HOUSE_MEANING[rp.house] || '该领域'}体现得最为明显。`;
        }
        insights.push(text);
      }
    }
  }

  // ═══ 8. 宫主星飞布 — 增强版：根据意图选择关键宫位，全12宫支持 ═══
  if (houses.length >= 10) {
    const relevantHouses = getRelevantHousesForIntent(intent);

    for (const hn of relevantHouses) {
      const houseData = houses.find(h => h.number === hn);
      if (!houseData) continue;
      const hSign = lonToSign(houseData.longitude);
      const hRuler = SIGN_RULER[hSign];
      const hRulerPlanet = hRuler ? planets.find(p => p.name === hRuler) : null;
      if (!hRulerPlanet) continue;

      const houseName = HOUSE_MEANING[hn] || '';
      const targetHouseName = HOUSE_MEANING[hRulerPlanet.house] || '';

      // 查找是否有预定义的飞布组合洞察
      const dispKey = `${hn}-${hRulerPlanet.house}`;
      const dispInsight = DISPOSITION_KEY[dispKey];

      if (hn === 7 && intent !== 'career') {
        // 7宫保留原有详细解读
        insights.push(`7宫（${houseName}）头${hSign}座，宫主星${hRuler}落第${hRulerPlanet.house}宫（${targetHouseName}）：感情模式与${targetHouseName}深度绑定。${getH7Insight(hRulerPlanet.house)}`);
      } else if (hn === 10 && intent !== 'love') {
        // 10宫保留原有详细解读
        insights.push(`10宫（${houseName}）头${hSign}座，宫主星${hRuler}落第${hRulerPlanet.house}宫（${targetHouseName}）：事业发展路径与${targetHouseName}联动。${getH10Insight(hRulerPlanet.house)}`);
      } else if (dispInsight) {
        // 有预定义组合
        insights.push(`第${hn}宫（${houseName}）头${hSign}座，宫主星${hRuler}飞入第${hRulerPlanet.house}宫（${targetHouseName}）：${dispInsight}。`);
      } else if (hn !== hRulerPlanet.house) {
        // 通用飞布描述
        insights.push(`第${hn}宫（${houseName}）头${hSign}座，宫主星${hRuler}飞入第${hRulerPlanet.house}宫（${targetHouseName}）：${houseName}的发展与${targetHouseName}密切关联。`);
      }
    }
  }

  // ═══ 9. 南北交点 — 灵魂进化方向 ═══
  const northNode = planets.find(p => p.name === '北交点');
  if (northNode) {
    const nnSign = northNode.sign;
    const nnHouse = northNode.house;
    const snSign = SIGNS[(SIGNS.indexOf(nnSign) + 6) % 12]; // 南交点在对面星座
    const snHouse = nnHouse <= 6 ? nnHouse + 6 : nnHouse - 6;

    const nodeMeaning = NODE_SIGN_MEANING[nnSign];
    const houseMeaning = NODE_HOUSE_MEANING[nnHouse];

    let nodeInsight = `北交点${nnSign}${northNode.degree}°第${nnHouse}宫 / 南交点${snSign}第${snHouse}宫：`;
    if (nodeMeaning) {
      nodeInsight += `灵魂成长方向是${nodeMeaning.north}。${nodeMeaning.south}。`;
    }
    if (houseMeaning) {
      nodeInsight += houseMeaning + '。';
    }

    // 检查是否有行星与北交点形成紧密相位
    const nodeAspects = aspects.filter(a =>
      (a.planet1 === '北交点' || a.planet2 === '北交点') && a.orb <= 5
    ).sort((a, b) => a.orb - b.orb).slice(0, 2);

    for (const na of nodeAspects) {
      const otherPlanet = na.planet1 === '北交点' ? na.planet2 : na.planet1;
      if (na.type === '合相') {
        nodeInsight += `${otherPlanet}合相北交点，这颗星的能量是你灵魂成长的核心推动力。`;
      } else if (na.type === '四分') {
        nodeInsight += `${otherPlanet}四分南北交点轴，构成"跳脱点"——${otherPlanet}代表的能量是打破过去模式的关键。`;
      }
    }

    insights.push(nodeInsight);
  }

  // ═══ 10. 个人行星与外行星的紧密相位 ═══
  const personalOuter = aspects.filter(a => {
    const isPersonal1 = PERSONAL_PLANETS.includes(a.planet1);
    const isOuter2 = OUTER_PLANETS.includes(a.planet2);
    const isPersonal2 = PERSONAL_PLANETS.includes(a.planet2);
    const isOuter1 = OUTER_PLANETS.includes(a.planet1);
    return ((isPersonal1 && isOuter2) || (isPersonal2 && isOuter1)) && a.orb <= 3;
  }).sort((a, b) => a.orb - b.orb).slice(0, 3);

  for (const asp of personalOuter) {
    // 避免重复（已在紧密相位中输出过）
    if (tightAspects.some(t => t.planet1 === asp.planet1 && t.planet2 === asp.planet2)) continue;
    const meaning = getPersonalOuterMeaning(asp.planet1, asp.planet2, asp.type);
    if (meaning) {
      insights.push(`${asp.planet1}${asp.type}${asp.planet2}（${asp.orb}°）：${meaning}`);
    }
  }

  if (insights.length === 0) return '';

  // 按意图重排洞察优先级：把与当前问题最相关的排在前面
  const sorted = sortInsightsByIntent(insights, intent);
  const selected = sorted.slice(0, 12); // 增加到12条以容纳新维度

  // 综合叙事
  const narrative = synthesizeNarrative(selected, planets);

  return `## 命盘核心洞察（基于排盘数据的预分析，已验证准确）\n${selected.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}${narrative}`;
}

/**
 * 结构化洞察：按卡片主题分组
 * 让 AI 的任务从"自己分析"变成"改写已有洞察"
 */
export interface GroupedInsights {
  sun: string[];    // 太阳/自我/核心人格
  moon: string[];   // 月亮/情感/内在需求
  rising: string[]; // 上升/外在/命主星
  love: string[];   // 感情/7宫/金星
  career: string[]; // 事业/10宫/土星
  health: string[]; // 健康/6宫/火星
  summary: string[]; // 综合/格局/叙事
}

export function extractGroupedInsights(data: Record<string, unknown>, questionIntent?: string): GroupedInsights {
  const result: GroupedInsights = { sun: [], moon: [], rising: [], love: [], career: [], health: [], summary: [] };

  const natal = data.natalChart as ChartData | undefined;
  if (!natal?.planets?.length || !natal?.aspects?.length) return result;

  const planets = natal.planets;
  const aspects = natal.aspects;
  const houses = natal.houses || [];
  const intent = questionIntent || 'general';

  const sun = planets.find(p => p.name === '太阳');
  const moon = planets.find(p => p.name === '月亮');
  const ascSign = natal.ascendant != null ? lonToSign(natal.ascendant) : null;

  // ── 太阳维度 ──
  if (sun) {
    // 基础：星座+宫位组合解读（最重要！）
    const sunBase = getSunSignHouse(sun.sign, sun.house, sun.degree);
    if (sunBase) result.sun.push(sunBase);

    // 尊贵状态
    const dignity = getDignityStatus(sun);
    if (dignity) result.sun.push(dignity);

    // 太阳的紧密相位
    const sunAspects = aspects.filter(a =>
      (a.planet1 === '太阳' || a.planet2 === '太阳') && a.orb <= 3
      && a.planet1 !== '月亮' && a.planet2 !== '月亮'
    ).sort((a, b) => a.orb - b.orb).slice(0, 2);
    for (const sa of sunAspects) {
      const other = sa.planet1 === '太阳' ? sa.planet2 : sa.planet1;
      const meaning = getAspectMeaning('太阳', other, sa.type);
      if (meaning) result.sun.push(`太阳${sa.type}${other}（${sa.orb}°）：${meaning}`);
    }
  }

  // ── 月亮维度 ──
  if (moon) {
    // 基础：星座+宫位组合解读
    const moonBase = getMoonSignHouse(moon.sign, moon.house);
    if (moonBase) result.moon.push(moonBase);

    // 尊贵状态
    const dignity = getDignityStatus(moon);
    if (dignity) result.moon.push(dignity);

    // 日月关系
    if (sun) {
      const sunMoonAspect = aspects.find(a =>
        (a.planet1 === '太阳' && a.planet2 === '月亮') || (a.planet1 === '月亮' && a.planet2 === '太阳')
      );
      if (sunMoonAspect) {
        const meanings: Record<string, string> = {
          '合相': `日月合相（${sunMoonAspect.orb}°）：意志与情感高度统一，目标明确、内心笃定，但容易陷入主观视角。新月出生，开创型人格。`,
          '对冲': `日月对冲（${sunMoonAspect.orb}°）：理性追求与情感需求持续拉扯。外在的自己和内心的真实感受常常矛盾。满月出生，关系型人格。`,
          '四分': `日月四分（${sunMoonAspect.orb}°）：想做的事和心里舒服的事经常冲突。这种摩擦是成长的发动机，但也容易焦虑。"理智选A但心里想选B"的场景会反复出现。`,
          '三合': `日月三合（${sunMoonAspect.orb}°）：内外和谐，想做的事和情感需求天然一致。给人"通透舒服"的感觉，但可能因为太顺而缺少突破动力。`,
        };
        const m = meanings[sunMoonAspect.type];
        if (m) result.moon.push(m);
      }
    }

    // 月亮的紧密相位
    const moonAspects = aspects.filter(a =>
      (a.planet1 === '月亮' || a.planet2 === '月亮') && a.orb <= 3
      && a.planet1 !== '太阳' && a.planet2 !== '太阳'
    ).sort((a, b) => a.orb - b.orb).slice(0, 2);
    for (const ma of moonAspects) {
      const other = ma.planet1 === '月亮' ? ma.planet2 : ma.planet1;
      const meaning = getAspectMeaning('月亮', other, ma.type);
      if (meaning) result.moon.push(`月亮${ma.type}${other}（${ma.orb}°）：${meaning}`);
    }
  }

  // ── 上升/命主星维度 ──
  if (ascSign) {
    // 基础：上升星座外在形象
    const ascDesc = getAscSignDesc(ascSign);
    if (ascDesc) result.rising.push(`上升${ascSign}座：${ascDesc}`);

    // 命主星落宫
    const rulerName = SIGN_RULER[ascSign];
    const ruler = rulerName ? planets.find(p => p.name === rulerName) : null;
    if (ruler) {
      let text = `命主星${rulerName}落${ruler.sign}${ruler.degree}°第${ruler.house}宫（${HOUSE_MEANING[ruler.house] || ''}）`;
      if (ruler.retrograde) text += '且逆行——人生节奏偏慢热，但后劲足';
      const tensionAsp = aspects.filter(a =>
        (a.planet1 === rulerName || a.planet2 === rulerName) && (a.type === '四分' || a.type === '对冲') && a.orb <= 5
      ).sort((a, b) => a.orb - b.orb)[0];
      if (tensionAsp) {
        const other = tensionAsp.planet1 === rulerName ? tensionAsp.planet2 : tensionAsp.planet1;
        text += `。与${other}${tensionAsp.type}（${tensionAsp.orb}°），人生核心课题与${other}相关领域密切绑定`;
      }
      result.rising.push(text);
    }
  }

  // ── 感情维度 ──
  const venus = planets.find(p => p.name === '金星');
  if (venus) {
    const dignity = getDignityStatus(venus);
    if (dignity) result.love.push(dignity);
  }
  if (houses.length >= 10) {
    const h7Data = houses.find(h => h.number === 7);
    if (h7Data) {
      const h7Sign = lonToSign(h7Data.longitude);
      const h7Ruler = SIGN_RULER[h7Sign];
      const h7Planet = h7Ruler ? planets.find(p => p.name === h7Ruler) : null;
      if (h7Planet) {
        result.love.push(`7宫头${h7Sign}座，宫主星${h7Ruler}落第${h7Planet.house}宫（${HOUSE_MEANING[h7Planet.house] || ''}）：${getH7Insight(h7Planet.house)}`);
      }
    }
  }
  // 金星的相位
  const venusAspects = aspects.filter(a =>
    (a.planet1 === '金星' || a.planet2 === '金星') && a.orb <= 3
  ).sort((a, b) => a.orb - b.orb).slice(0, 2);
  for (const va of venusAspects) {
    const other = va.planet1 === '金星' ? va.planet2 : va.planet1;
    const meaning = getAspectMeaning('金星', other, va.type);
    if (meaning) result.love.push(`金星${va.type}${other}（${va.orb}°）：${meaning}`);
  }

  // ── 事业维度 ──
  if (houses.length >= 10) {
    const h10Data = houses.find(h => h.number === 10);
    if (h10Data) {
      const h10Sign = lonToSign(h10Data.longitude);
      const h10Ruler = SIGN_RULER[h10Sign];
      const h10Planet = h10Ruler ? planets.find(p => p.name === h10Ruler) : null;
      if (h10Planet) {
        result.career.push(`10宫头${h10Sign}座，宫主星${h10Ruler}落第${h10Planet.house}宫（${HOUSE_MEANING[h10Planet.house] || ''}）：${getH10Insight(h10Planet.house)}`);
      }
    }
  }
  const saturn = planets.find(p => p.name === '土星');
  if (saturn) {
    const dignity = getDignityStatus(saturn);
    if (dignity) result.career.push(dignity);
  }

  // ── 格局 → summary ──
  const tSquares = findTSquares(planets, aspects);
  for (const ts of tSquares) {
    result.summary.push(getTSquareDetail(ts.apex, ts.apexHouse, ts.base1, ts.base2));
  }
  const grandTrines = findGrandTrines(planets, aspects);
  for (const gt of grandTrines) {
    const elem = getElement(gt.element);
    result.summary.push(`大三角格局（${elem}象）：${gt.planets.join('、')}形成天赋闭环。在${ELEMENT_TALENT[elem]}方面有过人天赋。`);
  }

  // 南北交点 → summary
  const northNode = planets.find(p => p.name === '北交点');
  if (northNode) {
    const nnSign = northNode.sign;
    const nodeMeaning = NODE_SIGN_MEANING[nnSign];
    const houseMeaning = NODE_HOUSE_MEANING[northNode.house];
    let nodeText = `北交点${nnSign}第${northNode.house}宫：`;
    if (nodeMeaning) nodeText += `灵魂成长方向是${nodeMeaning.north}。`;
    if (houseMeaning) nodeText += houseMeaning;
    result.summary.push(nodeText);
  }

  // 综合叙事
  const allInsights = [...result.sun, ...result.moon, ...result.rising, ...result.love, ...result.career, ...result.summary];
  const narrative = synthesizeNarrative(allInsights, planets);
  if (narrative) result.summary.push(narrative.replace(/\n## 人生主题综合\n/, ''));

  return result;
}

/** 获取行星尊贵状态描述 */
function getDignityStatus(p: Planet): string {
  const dom = PLANET_DOMICILE[p.name];
  const exalt = PLANET_EXALT[p.name];
  const det = PLANET_DETRIMENT[p.name];
  const fall = PLANET_FALL[p.name];

  if (dom?.includes(p.sign)) return `${p.name}入庙（${p.sign}${p.degree}°第${p.house}宫）：${getDignityScene(p.name, 'domicile', p.house)}`;
  if (exalt === p.sign) return `${p.name}旺相（${p.sign}${p.degree}°第${p.house}宫）：${getDignityScene(p.name, 'exalt', p.house)}`;
  if (det?.includes(p.sign)) return `${p.name}落陷（${p.sign}${p.degree}°第${p.house}宫）：${getDignityScene(p.name, 'detriment', p.house)}`;
  if (fall === p.sign) return `${p.name}落弱（${p.sign}${p.degree}°第${p.house}宫）：${getDignityScene(p.name, 'fall', p.house)}`;
  return '';
}

/** 根据问题意图对洞察排序，相关的排前面 */
function sortInsightsByIntent(insights: string[], intent: string): string[] {
  // 每个意图对应的高优先关键词
  const INTENT_KEYWORDS: Record<string, RegExp> = {
    love: /金星|7宫|婚姻|感情|伴侣|5宫|恋爱|月亮|情感|桃花/,
    career: /10宫|事业|木星|土星|6宫|2宫|财|工作|职业|MC/,
    personality: /命主星|太阳|月亮|上升|日月|性格|水星|思维|元素/,
    timing: /行运|过宫|触发|木星|土星|窗口/,
    yearly: /日返|年度|太阳/,
    monthly: /月返|月亮|本月/,
  };

  const pattern = INTENT_KEYWORDS[intent];
  if (!pattern) return insights;

  const high: string[] = [];
  const normal: string[] = [];
  for (const ins of insights) {
    if (pattern.test(ins)) high.push(ins);
    else normal.push(ins);
  }
  return [...high, ...normal];
}

// ─── 辅助函数 ───

const ELEMENT_MAP: Record<string, string> = {
  '白羊': '火', '狮子': '火', '射手': '火',
  '金牛': '土', '处女': '土', '摩羯': '土',
  '双子': '风', '天秤': '风', '水瓶': '风',
  '巨蟹': '水', '天蝎': '水', '双鱼': '水',
};

const ELEMENT_DESC: Record<string, string> = {
  '火': '行动、激情、自我表达',
  '土': '稳定、务实、物质安全感',
  '风': '思考、交流、人际连接',
  '水': '情感、直觉、深层连接',
};

const ELEMENT_TALENT: Record<string, string> = {
  '火': '领导力、开创事业、激励他人',
  '土': '财务管理、执行落地、建立稳固的成果',
  '风': '沟通表达、社交网络、知识传播',
  '水': '情感洞察、艺术创作、疗愈他人',
};

function getElement(sign: string): string {
  return ELEMENT_MAP[sign] || '火';
}

const RETRO_MEANING: Record<string, string> = {
  '水星': '思维方式独特，擅长深度思考和反刍，但表达和沟通容易出现"想的和说的不一样"的错位。在签合同、做决策时需要比别人多留缓冲时间。',
  '金星': '对爱情和审美有非主流的品味，不容易被大众审美打动。感情中可能偏好旧情或晚熟型恋爱模式，真正的感情往往在重新审视后才能看清。',
  '火星': '行动力内敛，爆发力强但启动慢。不擅长正面冲突，但压抑的怒气可能以被动攻击方式释放。运动习惯不稳定，适合需要爆发力而非持久力的项目。',
};

function getAspectMeaning(p1: string, p2: string, type: string): string {
  const pairA = [p1, p2].sort().join('+');
  const pairB = `${p1}+${p2}`;
  const isHard = type === '四分' || type === '对冲';

  const meanings: Record<string, Record<string, string>> = {
    '太阳+金星': {
      hard: '自我价值感和审美/感情需求有冲突，容易在"做自己"和"被人喜欢"之间纠结。',
      soft: '天生具有魅力和审美品味，自我表达和社交能力协调一致，容易获得好感。',
    },
    '太阳+火星': {
      hard: '野心与行动力之间有摩擦，容易冲动或与权威冲突。但这种张力也是巨大的驱动力。',
      soft: '意志力与行动力协调，决定了就能执行，领导力和竞争力都很强。',
    },
    '太阳+土星': {
      hard: '从小就感受到来自权威（父亲/社会）的压力，自我认同建立得慢但一旦建立就极为坚固。中年后大器晚成。',
      soft: '自律和目标感强，能在结构中找到自我，适合需要长期坚持的事业。',
    },
    '太阳+冥王星': {
      hard: '人生中会经历深刻的自我转化，可能遭遇权力斗争或控制议题。重生能力极强，每次低谷后都能蜕变。',
      soft: '洞察力极强，能看穿事物本质。天生具有心理影响力，适合需要深度的工作。',
    },
    '月亮+金星': {
      hard: '情感需求和审美/社交需求不同步——内心想要亲密但表现得疏离，或反之。在关系中容易"嘴上说不要，心里很想要"。',
      soft: '情感表达和审美高度和谐，给人温暖优雅的感觉。在关系中能自然地给予和接收爱。',
    },
    '月亮+土星': {
      hard: '情感表达受限，可能从小在情感上需要"坚强"或"忍耐"。内心深处有不安全感，但外在表现稳重可靠。学会接纳脆弱是人生课题。',
      soft: '情感成熟稳定，能在混乱中保持冷静。适合需要情感稳定性的角色（管理者、咨询师）。',
    },
    '月亮+冥王星': {
      hard: '情感极其强烈深沉，有全有或全无的倾向。可能经历过情感上的重大冲击（早年家庭变故），这让你拥有超乎常人的情感洞察力和韧性。',
      soft: '直觉敏锐到近乎通灵，能感知他人未说出口的情绪。适合心理学、侦查、深度研究等需要穿透表象的工作。',
    },
    '金星+火星': {
      hard: '欲望和审美之间有张力——想要的和适合的往往不同。感情中容易被"不该爱的人"吸引，激情强烈但关系容易有冲突。',
      soft: '魅力和行动力结合，在追求喜欢的事物时既有品味又有执行力。感情中主动且有吸引力。',
    },
    '金星+土星': {
      hard: '对感情和物质有深层不安全感，可能早期在爱或金钱上有匮乏体验。但这也塑造了极强的品味和对品质的鉴别力。感情晚熟但一旦稳定就极持久。',
      soft: '对关系有务实态度，懂得长期经营。审美品味经得起时间考验，适合做需要耐心和品质的事。',
    },
    '金星+冥王星': {
      hard: '感情中有极端的占有欲和嫉妒倾向，爱得深沉到可怕。关系中容易经历极致的甜蜜和痛苦。需要学会在亲密中保持边界。',
      soft: '对爱情有深刻理解，能建立深层灵魂连接。审美独特且具穿透力，适合从事与转化、疗愈相关的美学工作。',
    },
    '火星+土星': {
      hard: '行动力受到压制——想冲但总有东西拉住你。容易感到"被卡住"的沮丧。但一旦找到正确方向，执行力将非常惊人。',
      soft: '行动有章法，能做长期而艰苦的事。极强的纪律性和忍耐力，适合竞技体育、军事、手术等需要精准控制力量的领域。',
    },
    '水星+天王星': {
      hard: '思维跳跃性极强，脑子转得快但容易分心。可能说话太直或观点太前卫让人难以接受。',
      soft: '天赋型创新思维，能看到别人看不到的模式和连接。适合科技、编程、创新领域。',
    },
    '水星+海王星': {
      hard: '想象力丰富但容易迷糊——记错时间、搞混细节是常事。沟通中容易被误解或自己理解偏差。',
      soft: '语言有诗意和画面感，适合写作、音乐、影视等需要想象力的表达。直觉强于逻辑。',
    },
  };

  const m = meanings[pairA] || meanings[pairB];
  if (!m) return '';
  return isHard ? m.hard : m.soft;
}

function getPersonalOuterMeaning(p1: string, p2: string, type: string): string {
  const personal = PERSONAL_PLANETS.includes(p1) ? p1 : p2;
  const outer = OUTER_PLANETS.includes(p1) ? p1 : p2;
  const isHard = type === '四分' || type === '对冲';

  const key = `${personal}-${outer}`;
  const meanings: Record<string, string> = {
    '太阳-天王星': isHard ? '个性独立到叛逆，不愿走常规路线。人生中可能有突然的身份转变。' : '独特的自我认同，创新精神强，适合引领变革。',
    '太阳-海王星': isHard ? '自我边界模糊，容易理想化自己或被他人投射。需要找到真实的自我而非扮演角色。' : '极富同理心和艺术天赋，能感知到超越物质的维度。',
    '月亮-天王星': isHard ? '情绪变化突然且不可预测，对情感自由的需求极强。亲密关系中需要大量独处空间。' : '情感直觉敏锐，能快速感知变化。对非传统生活方式有天然亲和力。',
    '月亮-海王星': isHard ? '情感如海绵般吸收周围能量，容易被他人情绪影响。需要学会分辨"这是我的感受还是别人的"。' : '极度敏感细腻，有艺术和灵性天赋。梦境丰富，直觉准确。',
    '金星-天王星': isHard ? '感情模式非主流——突然爱上或突然冷淡，拒绝被束缚。可能经历闪恋闪分。' : '审美超前，感情观开放自由，吸引独特的人和关系形式。',
    '金星-海王星': isHard ? '容易在感情中理想化对方，"爱上想象中的人"。失望后才看清真实，但这也给了你非凡的浪漫和创造力。' : '极致浪漫主义者，有将情感转化为艺术的天赋。',
    '金星-冥王星': isHard ? '爱情对你来说不是小事——要么不爱，要么爱到骨子里。关系中有深层的权力和控制议题。' : '能建立深刻的灵魂连接，对爱的理解超越表面。',
    '火星-天王星': isHard ? '行为模式不可预测，容易冲动或突然改变方向。需要找到释放这股爆炸性能量的出口。' : '行动力和创新结合，擅长在危机中做出快速反应。',
    '火星-海王星': isHard ? '行动力被理想主义稀释——想做很多但容易分散精力。需要学会聚焦。' : '将激情投入理想，适合公益、艺术、灵性等需要奉献的领域。',
    '火星-冥王星': isHard ? '意志力极端强大但也极端固执，一旦决定就绝不回头。需要注意控制欲和破坏性冲动。' : '执行力和深层驱动力结合，面对困难时有超乎常人的毅力。适合需要突破极限的工作。',
  };

  return meanings[key] || '';
}

// ─── 格局检测 ───

interface TSquare {
  apex: string;
  apexHouse: number;
  base1: string;
  base2: string;
}

function findTSquares(planets: Planet[], aspects: Aspect[]): TSquare[] {
  const results: TSquare[] = [];
  const squares = aspects.filter(a => a.type === '四分' && a.orb <= 6);
  const oppositions = aspects.filter(a => a.type === '对冲' && a.orb <= 7);

  for (const opp of oppositions) {
    for (const sq1 of squares) {
      // sq1 connects one end of opposition to a third planet
      let apex: string | null = null;
      let base1: string | null = null;
      let base2: string | null = null;

      if (sq1.planet1 === opp.planet1 || sq1.planet2 === opp.planet1) {
        const thirdFromSq1 = sq1.planet1 === opp.planet1 ? sq1.planet2 : sq1.planet1;
        // Check if third planet also squares the other end of opposition
        const sq2 = squares.find(s =>
          (s.planet1 === thirdFromSq1 && s.planet2 === opp.planet2) ||
          (s.planet2 === thirdFromSq1 && s.planet1 === opp.planet2)
        );
        if (sq2) {
          apex = thirdFromSq1;
          base1 = opp.planet1;
          base2 = opp.planet2;
        }
      }

      if (apex && base1 && base2) {
        // Avoid duplicates
        if (!results.some(r => r.apex === apex)) {
          const apexPlanet = planets.find(p => p.name === apex);
          results.push({ apex, apexHouse: apexPlanet?.house || 0, base1, base2 });
        }
      }
    }
  }
  return results.slice(0, 2);
}

interface GrandTrine {
  planets: string[];
  element: string;
}

function findGrandTrines(planets: Planet[], aspects: Aspect[]): GrandTrine[] {
  const results: GrandTrine[] = [];
  const trines = aspects.filter(a => a.type === '三合' && a.orb <= 6);

  const planetNames = planets.map(p => p.name);
  for (let i = 0; i < planetNames.length; i++) {
    for (let j = i + 1; j < planetNames.length; j++) {
      for (let k = j + 1; k < planetNames.length; k++) {
        const a = planetNames[i], b = planetNames[j], c = planetNames[k];
        const ab = trines.some(t => (t.planet1 === a && t.planet2 === b) || (t.planet1 === b && t.planet2 === a));
        const bc = trines.some(t => (t.planet1 === b && t.planet2 === c) || (t.planet1 === c && t.planet2 === b));
        const ac = trines.some(t => (t.planet1 === a && t.planet2 === c) || (t.planet1 === c && t.planet2 === a));
        if (ab && bc && ac) {
          const pa = planets.find(p => p.name === a);
          results.push({ planets: [a, b, c], element: pa?.sign || '' });
        }
      }
    }
  }
  return results.slice(0, 2);
}

// ─── 宫主星落宫洞察 ───

function getH7Insight(house: number): string {
  const m: Record<number, string> = {
    1: '可能通过自我形象和个人魅力吸引伴侣，感情中自我意识强。',
    2: '可能通过经济合作或共同理财建立感情，对伴侣的经济能力有要求。',
    3: '容易在日常社交、学习场景中遇到伴侣，沟通质量决定关系质量。',
    4: '家庭背景对感情影响极大，可能经介绍认识伴侣或与青梅竹马在一起。',
    5: '恋爱运好，容易在娱乐、创作场景中遇到对象。感情充满浪漫和激情。',
    6: '容易在工作场合认识伴侣，感情中有服务和照顾的倾向。',
    7: '非常重视伴侣关系，婚姻在人生中占极重要地位。',
    8: '感情深刻而复杂，可能涉及共同财务或深层心理纠缠。',
    9: '可能遇到外国人或在旅途/学业中认识伴侣，价值观契合比物质更重要。',
    10: '感情与事业交织，可能通过工作认识伴侣，或伴侣对事业有重要影响。',
    11: '可能从朋友发展为恋人，社交圈对感情影响很大。',
    12: '感情中有隐秘性，可能经历暗恋或不公开的关系阶段。情感直觉非常敏锐。',
  };
  return m[house] || '';
}

function getH10Insight(house: number): string {
  const m: Record<number, string> = {
    1: '事业与个人品牌强绑定，适合需要展现个人魅力的职业。',
    2: '事业驱动力来自经济回报，适合金融、投资等直接创造财富的领域。',
    3: '事业与沟通、写作、教学相关，适合媒体、教育、销售等行业。',
    4: '事业可能与家族产业有关，或在家办公/房地产领域发展。',
    5: '事业与创意、娱乐、教育相关，适合需要创造力和自我表达的职业。',
    6: '事业以服务为导向，适合医疗、健康、技术服务等需要专业技能的领域。',
    7: '事业发展依赖合作伙伴关系，适合咨询、律师、合伙创业等。',
    8: '事业可能涉及资源整合、风险投资或心理/医疗等深层领域。',
    9: '事业与国际、学术、法律或哲学相关，适合跨文化工作或高等教育。',
    10: '极强的事业心，天生适合管理和领导岗位。',
    11: '事业成功依赖人脉和社群，适合互联网、公益、团队型创业。',
    12: '事业可能与幕后工作相关——研究、灵性、医疗、艺术等需要独处的领域。',
  };
  return m[house] || '';
}

// ─── 增强模块：逆行 + 宫位组合 ───

const RETRO_HOUSE_CONTEXT: Record<string, Record<number, string>> = {
  '水星': {
    1: '自我表达常常"话到嘴边又咽回去"，第一印象可能显得沉默或内敛',
    3: '写的比说的好，适合文字工作但口头沟通容易出状况',
    6: '工作中容易因沟通失误返工，但非常适合需要反复核查的工作',
    7: '与伴侣的沟通模式需要反复磨合，容易误解对方的意思',
    9: '学习方式独特，可能需要反复研读才能理解，但一旦理解就非常深刻',
    10: '职场表达容易被误读，但深度思考的能力是隐藏优势',
  },
  '金星': {
    1: '对自身外貌和魅力缺乏自信，实际上别人眼中的你比你以为的有吸引力',
    2: '花钱容易后悔，但品味经过时间沉淀后会越来越好',
    5: '恋爱中表达爱意的方式含蓄，不擅长浪漫但感情深沉',
    7: '对伴侣的标准反复调整，可能在前任和新欢之间犹豫',
    8: '深层亲密关系中有不安全感，但一旦信任就全情投入',
    12: '审美和感情生活有隐秘的一面，内心的喜好不轻易示人',
  },
  '火星': {
    1: '行动启动慢但一旦启动就势不可挡，容易让人觉得"突然爆发"',
    3: '说话容易"不经过脑子"然后后悔，学会三思后言是课题',
    6: '工作节奏忽快忽慢，适合有deadline驱动的工作模式',
    7: '在关系中压抑攻击性，但可能以被动攻击方式释放',
    10: '事业上有野心但不轻易展露，容易在关键时刻犹豫错失机会',
    12: '愤怒和欲望被压入潜意识，需要找到健康的出口（运动、创作）',
  },
};

// ─── 增强模块：南北交点 ───

const NODE_SIGN_MEANING: Record<string, { north: string; south: string }> = {
  '白羊': { north: '学习独立和果断行动', south: '过去习惯合作和妥协，但需要学会为自己站出来' },
  '金牛': { north: '建立物质安全感和稳定价值观', south: '习惯在危机和变动中生存，需要学会安定下来' },
  '双子': { north: '发展沟通和多元学习能力', south: '有坚定信念但视野可能狭窄，需要保持开放心态' },
  '巨蟹': { north: '建立情感连接和安全感', south: '过度专注事业和社会地位，需要学会照顾内心' },
  '狮子': { north: '勇敢表达自我和创造力', south: '习惯隐没在群体中，需要敢于站到聚光灯下' },
  '处女': { north: '培养实际技能和服务精神', south: '容易沉浸在梦想中，需要脚踏实地' },
  '天秤': { north: '学习建立和谐的伴侣关系', south: '过于独立，需要学会平等合作和妥协' },
  '天蝎': { north: '拥抱深层转化和亲密关系', south: '追求稳定安逸，需要敢于面对人生的深水区' },
  '射手': { north: '追寻信仰、远方和人生意义', south: '困在信息收集中，需要看到大图景' },
  '摩羯': { north: '建立事业结构和承担社会责任', south: '依赖家庭和情感安全感，需要在社会中独立立足' },
  '水瓶': { north: '服务集体和突破传统框架', south: '习惯成为焦点，需要学会为群体贡献' },
  '双鱼': { north: '发展灵性、同理心和无条件的爱', south: '追求完美和秩序，需要学会放手和信任' },
};

const NODE_HOUSE_MEANING: Record<number, string> = {
  1: '灵魂成长方向指向自我独立——学会不依赖他人的认可来定义自己',
  2: '灵魂课题在于建立自己的价值体系和经济独立',
  3: '灵魂成长通过日常沟通、写作、学习来实现',
  4: '灵魂渴望建立情感根基和内在安全感',
  5: '灵魂成长方向是勇敢创造和表达自我，包括恋爱和生育',
  6: '灵魂需要通过日常工作和服务找到人生意义',
  7: '灵魂成长的核心课题是学会在关系中合作与平衡',
  8: '灵魂需要经历深层转化，通过放手旧的来获得新生',
  9: '灵魂渴望通过更高的学习、旅行或信仰找到人生方向',
  10: '灵魂成长指向事业成就和社会责任的承担',
  11: '灵魂需要走进更大的社群，为集体理想贡献力量',
  12: '灵魂成长方向是灵性觉醒和超越物质世界的局限',
};

// ─── 增强模块：T三角具体压力模式 ───

function getTSquareDetail(apex: string, apexHouse: number, base1: string, base2: string): string {
  const pressureType: Record<string, string> = {
    '太阳': '自我认同受到持续挑战，容易在"我是谁"和"别人怎么看我"之间拉扯',
    '月亮': '情绪是最大的战场——内心的不安全感驱动你不断寻找安慰，但越寻找越焦虑',
    '水星': '思维永远在高速运转，想法很多但容易分散，可能有焦虑性思维或决策困难',
    '金星': '在感情和审美方面永远不满足，容易在"想要的"和"适合的"之间反复',
    '火星': '行动力被双向拉扯——想冲但总被拦，被拦又更想冲。容易急躁或以攻击性方式释放压力',
    '木星': '野心和能力之间有落差，容易过度承诺或膨胀，需要学会量力而行',
    '土星': '人生中有一个持续的"卡点"——某个领域总是进展缓慢，但这也是你最终成就最大的地方',
    '天王星': '生活中总有突变和打断，刚稳定下来又被推翻。但你因此培养了超强的适应能力',
    '海王星': '理想与现实的落差是核心痛点，容易被幻觉欺骗或逃避现实，但创造力也来自这种张力',
    '冥王星': '人生中反复经历"死亡与重生"，某些领域会被彻底摧毁再重建。痛苦但也因此拥有超乎常人的深度',
  };

  const detail = pressureType[apex] || '该行星代表的领域承受持续压力';
  const houseArea = HOUSE_MEANING[apexHouse] || '';

  return `T三角格局：${apex}（顶点，第${apexHouse}宫）与${base1}、${base2}形成强张力三角。${detail}。这股压力集中在第${apexHouse}宫（${houseArea}）——这里是你人生最大的挑战，也是突破后收获最大的地方。${base1}和${base2}的对冲是压力源头，${apex}是你被迫面对和解决问题的出口。`;
}

// ─── 增强模块：行星尊贵场景化 ───

function getDignityScene(planet: string, status: 'domicile' | 'exalt' | 'detriment' | 'fall', house: number): string {
  const houseArea = HOUSE_MEANING[house] || '该领域';

  const scenes: Record<string, Record<string, string>> = {
    '太阳': {
      domicile: '自信而耀眼，像回到了自己的王国。在人群中自然成为焦点，领导力和创造力浑然天成',
      exalt: '意志力和生命力被放大，精力充沛、行动果断，但也可能过于强势或独断',
      detriment: '自我意识受群体压力制约，可能为了"合群"压抑真实想法。需要在保持个性和融入集体之间找平衡',
      fall: '自信心容易受外界评价影响，做决定时总在权衡利弊而犹豫。但这也让你比别人更懂得倾听',
    },
    '月亮': {
      domicile: '情感表达自然流畅，直觉准确，共情能力强。在家庭和亲密关系中如鱼得水',
      exalt: '情感需求与物质安全感结合良好，内心踏实稳定，但可能过于依赖舒适区',
      detriment: '情感表达被"应该坚强"的信念压制，不容易示弱但内心渴望被照顾。表达脆弱是重要课题',
      fall: '情绪容易被深层恐惧和猜疑所困，对亲密关系既渴望又恐惧。但拥有惊人的情感洞察力',
    },
    '水星': {
      domicile: '思维敏捷、表达能力强，学什么都快，沟通能力是天赋',
      exalt: '逻辑分析和细节处理能力极强，适合需要精确思维的工作',
      detriment: '思维容易发散或被直觉带偏，注意力难以长时间集中在细节上。但想象力和大局观是独特优势',
      fall: '逻辑思维被情感和直觉影响，需要刻意训练。但天生的同理心让你擅长理解他人',
    },
    '金星': {
      domicile: '审美品味好、社交魅力强、感情中懂得给予和接收爱。物质运和桃花运都不错',
      exalt: '对美和爱有超越世俗的理解，浪漫感十足，艺术天赋高。但容易理想化感情',
      detriment: '感情中容易走极端——要么全身心投入要么彻底切割。需要在激情和理性之间找平衡',
      fall: '对自己的吸引力缺乏信心，审美偏好可能过于自我批判。但这种挑剔也能发展出极高的品味',
    },
    '火星': {
      domicile: '行动力强、决断果敢、竞争力十足。天生的战士，适合需要冲劲的领域',
      exalt: '行动力与战略思维结合，执行力强且有耐心等待最佳时机',
      detriment: '行动力被犹豫不决拖慢，可能在该出手时错失良机。但学会了在行动前三思',
      fall: '攻击性和行动力被情感左右，可能因为"不好意思"而不敢争取',
    },
    '木星': {
      domicile: '信念坚定、格局大、运气好。在扩张和成长方面有天然优势',
      exalt: '善良和同理心被放大，适合教育、医疗、公益等助人行业',
      detriment: '视野可能过于关注细节而忽略全局，或信念不够坚定容易动摇',
      fall: '乐观精神受限，容易悲观或过度谨慎。但这也让你更务实',
    },
    '土星': {
      domicile: '自律、有耐心、能承担责任。在需要长期坚持的事业中有绝对优势',
      exalt: '公正感强，懂得在规则中找到最优解。适合管理、法律、外交',
      detriment: '责任感与情感需求冲突，可能因为"必须坚强"而压抑自己',
      fall: '纪律性受冲动影响，可能在需要耐心的时刻选择了捷径',
    },
  };

  const planetScene = scenes[planet];
  if (planetScene?.[status]) {
    return `${planetScene[status]}。落在第${house}宫，在${houseArea}领域表现尤为明显`;
  }

  const generic: Record<string, string> = {
    domicile: `${planet}回到守护星座，在${houseArea}领域能量充分表达，是天赋所在`,
    exalt: `${planet}能量被放大，在${houseArea}领域表现突出，但需警惕过度`,
    detriment: `${planet}能量受阻，在${houseArea}领域需要更多努力来发挥`,
    fall: `${planet}表达不畅，在${houseArea}领域可能力不从心，但可通过觉察转化`,
  };
  return generic[status] || '';
}

// ─── 增强模块：宫主星飞布关键组合 ───

const DISPOSITION_KEY: Record<string, string> = {
  '1-5': '自我认同在创意、恋爱和自我表达中实现——你需要舞台',
  '1-7': '自我认同与伴侣关系深度绑定，通过关系认识自己',
  '1-8': '人生必经深层转化，可能多次"重生"，在危机中找到真正的自己',
  '1-10': '事业成就是自我价值的核心证明，对社会地位有强烈追求',
  '1-12': '内在世界极其丰富，需要大量独处和灵性探索来找到自我',
  '2-5': '财运与创意、投机或娱乐行业相关，可能通过爱好赚钱',
  '2-7': '财运与伴侣或合伙人密切相关，婚后财务状况可能有较大变化',
  '2-8': '可能通过共享资源、投资、保险或继承获得财富积累',
  '2-10': '事业是主要收入来源，职位越高财运越好',
  '2-11': '朋友圈和社交网络带来财务机会，适合互联网或社群变现',
  '5-3': '通过日常社交、网络或短途出行遇到恋爱对象，沟通是恋爱核心',
  '5-7': '恋爱很容易走向婚姻，遇到的人多是认真的类型',
  '5-9': '跨文化恋爱或在旅行/学习中遇到对象的可能性高',
  '5-11': '从朋友发展为恋人的概率高，社交圈是桃花主要来源',
  '5-12': '可能经历暗恋或秘密恋情，感情中有隐藏的一面',
  '4-10': '家庭和事业之间需要持续平衡，两者是跷跷板关系',
  '4-12': '原生家庭中有未解的情感议题，心理成长和疗愈是重要功课',
  '6-8': '日常健康与心理深层状态联动，身心连接紧密',
  '6-12': '日常工作可能与服务、疗愈或幕后相关',
  '8-2': '深层转化通过财务变化触发，可能经历财务大起大落',
  '9-3': '高等智慧与日常沟通结合，适合做知识传播者或教育者',
  '11-5': '在创意社群中找到归属，社交与创造互相滋养',
  '12-1': '潜意识和灵性需求影响自我认同，可能有"不属于这个世界"的感觉',
};

function getRelevantHousesForIntent(intent: string): number[] {
  const map: Record<string, number[]> = {
    love: [1, 5, 7, 8],
    career: [2, 6, 10, 11],
    health: [1, 6, 8, 12],
    personality: [1, 4, 5, 9, 12],
    timing: [1, 7, 10],
    general: [1, 2, 4, 5, 7, 10],
  };
  return map[intent] || map.general;
}

// ─── 综合叙事 ───

function synthesizeNarrative(insights: string[], planets: Planet[]): string {
  const themes: string[] = [];

  const relCount = insights.filter(i => /7宫|伴侣|婚姻|感情|恋爱|桃花/.test(i)).length;
  if (relCount >= 3) themes.push('关系与情感是你人生的核心议题');

  const careerCount = insights.filter(i => /10宫|事业|职业|社会地位/.test(i)).length;
  if (careerCount >= 3) themes.push('事业成就和社会认可是你的深层驱动力');

  const tensionCount = insights.filter(i => /四分|对冲|T三角|压力|冲突|拉扯/.test(i)).length;
  if (tensionCount >= 4) themes.push('命盘张力相位多，人生充满推动力但也需要学会管理压力和焦虑');
  else if (tensionCount <= 1) themes.push('命盘以和谐相位为主，天赋流动顺畅但需要主动制造突破点');

  const spiritCount = insights.filter(i => /12宫|海王星|冥王星|潜意识|灵性|转化|重生/.test(i)).length;
  if (spiritCount >= 2) themes.push('你有较强的灵性倾向和深层心理觉察力');

  const retroCount = insights.filter(i => /逆行/.test(i)).length;
  if (retroCount >= 2) themes.push('多颗行星逆行意味着你的成长模式是"向内求"，通过反思和回顾获得智慧');

  if (insights.some(i => /5宫.*创|创意|创造|艺术/.test(i))) themes.push('创造力和自我表达是你人生的重要出口');

  if (themes.length === 0) return '';
  const selected = themes.slice(0, 3);
  return `\n## 人生主题综合\n${selected.join('；')}。这些主题互相交织，构成你独特的人生蓝图——了解它们是为了更有意识地活出自己的潜能。`;
}

// ═══════════════════════════════════════════════
// 星座+宫位组合解读引擎
// ═══════════════════════════════════════════════

/** 星座核心特质（场景化描述） */
const SIGN_TRAIT: Record<string, string> = {
  '白羊': '冲劲十足、做事先干再说，耐心不足但行动力爆表',
  '金牛': '追求稳定和舒适，对物质和感官享受有执念，一旦决定就很难改变',
  '双子': '脑子转得快、兴趣广泛，但容易三分钟热度，同时能聊十个话题',
  '巨蟹': '外表温和但内心极其敏感，习惯照顾别人来感受自己的价值，记仇但不说',
  '狮子': '天生需要被关注和认可，有领导气场但自尊心也特别强',
  '处女': '细节控，对自己和别人都高标准严要求，嘴上挑剔心里操心',
  '天秤': '在乎和谐与公平，决策时容易纠结犹豫，社交能力强但回避冲突',
  '天蝎': '表面平静内心波涛汹涌，不信任表面的东西，凡事都要看穿本质',
  '射手': '向往自由和远方，讨厌被束缚，乐观但有时盲目自信',
  '摩羯': '务实、有野心、能吃苦，但给自己的压力太大，不擅长表达感情',
  '水瓶': '独立思考、不走寻常路，重视个人空间，有时让人觉得疏离',
  '双鱼': '共情能力极强，容易被他人情绪影响，想象力丰富但边界感弱',
};

/** 宫位场景化含义（用于组合） */
const HOUSE_SCENE: Record<number, string> = {
  1: '体现在你给别人的第一印象和日常行为习惯上——你无意识中就在展现这些特质',
  2: '体现在你对金钱和物质的态度上——赚钱方式、消费习惯、安全感来源',
  3: '体现在你日常的说话方式、学习习惯和与兄弟姐妹/邻居的互动中',
  4: '体现在你的家庭生活和内心深处——你对"家"的定义和童年的影响都打上了这个烙印',
  5: '体现在你的恋爱方式、创作灵感和对娱乐的偏好上——你怎么"玩"就有这个味道',
  6: '体现在你每天的工作节奏和健康管理上——你处理日常事务的风格就是这样',
  7: '体现在你选择伴侣和合作伙伴的标准上——你在关系中扮演的角色受此影响',
  8: '体现在你面对危机和深层亲密关系时——涉及共同财务、信任和控制的议题',
  9: '体现在你的信仰、高等学习和对远方的向往中——你的世界观由此塑造',
  10: '体现在你的事业野心和公众形象上——别人在职场上看到的你就是这样',
  11: '体现在你的社交圈和理想追求中——你在朋友中的角色和对未来社会的期待',
  12: '体现在你的独处时光和潜意识中——这些特质你自己可能都没完全意识到',
};

/** 生成太阳星座+宫位的组合解读 */
export function getSunSignHouse(sign: string, house: number, degree: number): string {
  const signTrait = SIGN_TRAIT[sign] || '';
  const houseScene = HOUSE_SCENE[house] || '';
  if (!signTrait || !houseScene) return '';

  // 特殊组合覆盖（高频命盘给更精准的描述）
  const SPECIAL: Record<string, string> = {
    '白羊-1': '你是行走的行动力——想到就做，不喜欢等待和犹豫。别人还在分析利弊，你已经冲出去试了。缺点是容易虎头蛇尾，或者在急躁中得罪人自己还没发觉',
    '金牛-2': '天生懂得积累财富，消费有品味但不铺张。你的安全感直接和银行卡余额挂钩——余额充足时你是最温和的人，缺钱时焦虑感会吞噬一切',
    '巨蟹-4': '家是你的能量充电站，无论外面多累，回家就能恢复。你对家人的记忆力惊人——谁在什么时候说过什么伤人的话，你记得清清楚楚',
    '巨蟹-7': '你的自我认同围绕亲密关系展开——通过照顾伴侣和被需要来确认自己的价值。工作中你是那个默默承担、替大家操心的人。但小心"过度付出然后委屈"的循环',
    '狮子-5': '你天生就是舞台中心——创作、表演、恋爱对你来说都是表达自我的方式。你的热情能感染整个房间，但也需要持续的掌声来维持动力',
    '狮子-10': '事业对你来说不只是赚钱，更是证明自己的舞台。你有天生的领导气场，但也特别怕在公众面前丢脸——所以你在重要场合前会反复准备',
    '处女-6': '工作中你是最靠谱的那个人——细节、流程、deadline，没有什么能逃过你的眼睛。但你也是最容易因为"别人做得不够好"而焦虑的人',
    '天秤-7': '你的人生剧本围绕"关系"展开——你通过和别人的互动来认识自己。单独做决定让你不安，你需要一个可以商量的人。审美品味极好，但选择恐惧症也是真的',
    '天蝎-8': '你看人看到骨头里——表面的寒暄和客套你一秒看穿。你对深层关系（亲密/共同财务/信任）有极强的掌控需求，因为你知道这些才是真正的"命门"',
    '天蝎-11': '在朋友圈里你是那个话不多但什么都看在眼里的人。你不信任表面的友善，只有确认对方是"自己人"后才卸下防备，但一旦认定就极度忠诚',
    '射手-9': '你是天生的冒险家和哲学家——对远方有执念，对未知充满好奇。你受不了一成不变的日子，定期需要一次旅行或者一个新领域来给生活"充电"',
    '摩羯-10': '你是天生的事业型人格——目标明确、计划清晰、一步一个脚印。你的人生时间线比别人晚但更扎实，30岁之后才开始真正起飞',
    '水瓶-11': '你在群体中总是那个"不一样"的人——你的想法超前，有时候周围人跟不上你的思路。你需要一个和你一样"怪"的社交圈才能感到舒适',
    '双鱼-12': '你和"看不见的世界"有天然连接——直觉、梦境、艺术灵感、对他人痛苦的共鸣。你需要定期独处来清理吸收到的外界情绪',
  };

  const key = `${sign}-${house}`;
  if (SPECIAL[key]) return SPECIAL[key];

  // 度数解读（0-3度=刚进入，27-29度=即将离开）
  let degreeNote = '';
  if (degree >= 28) degreeNote = '。太阳在该星座末尾度数，说明你已经充分经历了这个星座的课题，同时隐约感受到下一个星座的能量在敲门';
  else if (degree <= 2) degreeNote = '。太阳在该星座初始度数，这个星座的特质对你来说是"正在学习中"的状态，表达得比较青涩';

  return `太阳${sign}的核心特质：${signTrait}。落在第${house}宫，${houseScene}${degreeNote}`;
}

/** 生成月亮星座+宫位的组合解读 */
export function getMoonSignHouse(sign: string, house: number): string {
  const MOON_SIGN: Record<string, string> = {
    '白羊': '情绪来得快去得也快，生气了当场就爆但五分钟后就忘了。你需要即时的情感回应——等太久你就烦了',
    '金牛': '情绪稳定是你的默认状态，但一旦安全感被触动就会变得固执甚至暴躁。你用食物、拥抱、舒适的环境来安抚自己',
    '双子': '你的情绪通过说话来消化——不开心了想找人聊，一边聊一边想明白了。最怕的是"闷在心里不让说"',
    '巨蟹': '情感记忆力惊人，十年前谁伤过你的话你还记得。你照顾别人是本能，但也容易用"付出"来绑架关系',
    '狮子': '需要被看见、被欣赏、被特别对待。最让你受伤的不是批评，而是被忽视。你表达爱的方式是大方且高调的',
    '处女': '你用"帮忙做事"来表达关心，不太擅长说甜言蜜语。焦虑的时候会开始疯狂整理房间或者列计划',
    '天秤': '你需要有人陪才安心，独处太久会开始胡思乱想。冲突让你极度不舒服，你宁可委屈自己也不愿意吵架',
    '天蝎': '情感浓度极高——爱就爱到骨子里，恨也恨得彻底。你的直觉是你最厉害的武器，但猜疑心也是你最大的敌人',
    '射手': '需要精神上的自由空间——被管太紧你就想跑。你用乐观来处理负面情绪，但有时候是在逃避而不是在消化',
    '摩羯': '从小就学会了"自己扛"，不轻易在人前流泪。你的情感表达方式是"默默为你做事"而不是"我爱你"三个字',
    '水瓶': '需要智识层面的理解而不只是情感安慰——"你的感受我懂"不如"让我帮你分析为什么会这样"管用',
    '双鱼': '你是情绪海绵体——别人开心你跟着开心，别人难过你比他还难过。需要学会区分"这是我的感受还是别人的"',
  };

  const moonTrait = MOON_SIGN[sign] || '';
  const houseScene = HOUSE_SCENE[house] || '';
  if (!moonTrait) return '';
  return `月亮${sign}的情感模式：${moonTrait} 落在第${house}宫，${houseScene}`;
}

/** 上升星座场景化解读 */
export function getAscSignDesc(sign: string): string {
  const ASC_DESC: Record<string, string> = {
    '白羊': '给人的第一印象是精力充沛、直接爽快。你走路快、说话快、做决定也快。别人觉得你很有冲劲，但可能不知道你内心其实也会犹豫',
    '金牛': '给人沉稳、可靠、不急不躁的感觉。你说话慢条斯理，穿着讲究品质，整个人散发着"我不着急"的气场',
    '双子': '看起来好相处、有趣、反应快。你在社交场合是最活跃的那个人，能跟任何人搭上话，但真正交心的朋友可能不多',
    '巨蟹': '给人温暖、亲切、好接近的感觉。你的表情和情绪很容易被人读出来，藏不住心事',
    '狮子': '走进一个房间，存在感就在那里。你的举止有一种天然的气场和自信，别人会不自觉地注意到你',
    '处女': '给人干净、整洁、条理分明的印象。你说话有逻辑，做事有章法，但别人可能觉得你"太较真"',
    '天秤': '外在形象优雅、有品味、好看。你天生知道怎么让别人觉得舒服，社交场合游刃有余',
    '天蝎': '眼神锐利，给人一种"不好惹"或者"很有深度"的感觉。你不太愿意在陌生人面前展露真实的自己',
    '射手': '看起来乐观、随意、不拘小节。你给人的感觉是"好说话"，但其实底线很清楚',
    '摩羯': '给人成熟、稳重、有距离感的第一印象。你看起来比实际年龄大（但老了以后反而显年轻），别人会觉得你靠谱但不太好接近',
    '水瓶': '给人独特、有想法、不随波逐流的印象。你的穿着或言行总有一些与众不同的地方，有时候让人摸不透',
    '双鱼': '眼神柔和，给人温柔、敏感、有艺术气质的感觉。你很容易让人对你产生保护欲',
  };
  return ASC_DESC[sign] || '';
}
