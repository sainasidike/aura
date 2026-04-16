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

export function extractChartInsights(data: Record<string, unknown>): string {
  const natal = data.natalChart as ChartData | undefined;
  if (!natal?.planets?.length || !natal?.aspects?.length) return '';

  const planets = natal.planets;
  const aspects = natal.aspects;
  const houses = natal.houses || [];
  const insights: string[] = [];

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

  // T三角：A四分B，B四分C，A对冲C
  const tSquares = findTSquares(planets, aspects);
  for (const ts of tSquares) {
    insights.push(`T三角格局：${ts.apex}（顶点）与${ts.base1}、${ts.base2}形成强张力三角。${ts.apex}所在的第${ts.apexHouse}宫（${HOUSE_MEANING[ts.apexHouse] || ''}）是人生核心压力区，也是最大成长点。这个格局驱动你不断在该领域突破，但也容易感到疲惫。`);
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

  // ═══ 6. 行星尊贵与失势 ═══
  for (const p of planets) {
    if (p.name === '北交点') continue;
    const dom = PLANET_DOMICILE[p.name];
    const exalt = PLANET_EXALT[p.name];
    const det = PLANET_DETRIMENT[p.name];
    const fall = PLANET_FALL[p.name];

    if (dom?.includes(p.sign)) {
      insights.push(`${p.name}入庙（${p.sign}${p.degree}°第${p.house}宫）：${p.name}在自己的领地，能量表达自如。在${HOUSE_MEANING[p.house] || '该领域'}有天然优势和自信。`);
    } else if (exalt === p.sign) {
      insights.push(`${p.name}旺相（${p.sign}${p.degree}°第${p.house}宫）：${p.name}能量被放大，在${HOUSE_MEANING[p.house] || '该领域'}表现突出，但也可能过度膨胀。`);
    } else if (det?.includes(p.sign)) {
      insights.push(`${p.name}落陷（${p.sign}${p.degree}°第${p.house}宫）：${p.name}的能量受限，需要更多努力才能在${HOUSE_MEANING[p.house] || '该领域'}达到满意状态。这不是缺陷，而是需要后天修炼的课题。`);
    } else if (fall === p.sign) {
      insights.push(`${p.name}落弱（${p.sign}${p.degree}°第${p.house}宫）：${p.name}表达不畅，在${HOUSE_MEANING[p.house] || '该领域'}可能感到力不从心，但通过意识觉察可以转化。`);
    }
  }

  // ═══ 7. 逆行行星 ═══
  const retroPlanets = planets.filter(p => p.retrograde && p.name !== '北交点' && PERSONAL_PLANETS.includes(p.name));
  if (retroPlanets.length > 0) {
    for (const rp of retroPlanets) {
      const meaning = RETRO_MEANING[rp.name];
      if (meaning) {
        insights.push(`${rp.name}逆行（${rp.sign}第${rp.house}宫）：${meaning}`);
      }
    }
  }

  // ═══ 8. 7宫主（感情模式）& 10宫主（事业模式）═══
  if (houses.length >= 10) {
    const h7Sign = lonToSign(houses.find(h => h.number === 7)?.longitude ?? 0);
    const h7Ruler = SIGN_RULER[h7Sign];
    const h7RulerPlanet = h7Ruler ? planets.find(p => p.name === h7Ruler) : null;
    if (h7RulerPlanet) {
      insights.push(`7宫（婚姻宫）头${h7Sign}座，宫主星${h7Ruler}落第${h7RulerPlanet.house}宫（${HOUSE_MEANING[h7RulerPlanet.house] || ''}）：感情模式与${HOUSE_MEANING[h7RulerPlanet.house] || '该领域'}深度绑定。${getH7Insight(h7RulerPlanet.house)}`);
    }

    const h10Sign = lonToSign(houses.find(h => h.number === 10)?.longitude ?? 0);
    const h10Ruler = SIGN_RULER[h10Sign];
    const h10RulerPlanet = h10Ruler ? planets.find(p => p.name === h10Ruler) : null;
    if (h10RulerPlanet) {
      insights.push(`10宫（事业宫）头${h10Sign}座，宫主星${h10Ruler}落第${h10RulerPlanet.house}宫（${HOUSE_MEANING[h10RulerPlanet.house] || ''}）：事业发展路径与${HOUSE_MEANING[h10RulerPlanet.house] || '该领域'}联动。${getH10Insight(h10RulerPlanet.house)}`);
    }
  }

  // ═══ 9. 个人行星与外行星的紧密相位 ═══
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

  // 限制洞察数量，保证 token 可控
  const selected = insights.slice(0, 10);
  return `## 命盘核心洞察（基于排盘数据的预分析，已验证准确）\n${selected.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}`;
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
  const pair = [p1, p2].sort().join('+');
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

  const m = meanings[pair];
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
