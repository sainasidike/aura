import { NextRequest } from 'next/server';
import { streamChat, type ZhipuMessage } from '@/lib/ai/zhipu';
import { calculateChartFromDate } from '@/lib/engines/astrology';

const SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];
function lonToSign(lon: number) {
  const n = ((lon % 360) + 360) % 360;
  const si = Math.floor(n / 30);
  const deg = Math.floor(n - si * 30);
  const min = Math.floor(((n - si * 30) - deg) * 60);
  return `${SIGNS[si]}${deg}°${min}'`;
}

// 星座 → 守护星映射（传统守护）
const SIGN_RULERS: Record<string, string> = {
  '白羊': '火星', '金牛': '金星', '双子': '水星', '巨蟹': '月亮',
  '狮子': '太阳', '处女': '水星', '天秤': '金星', '天蝎': '冥王星',
  '射手': '木星', '摩羯': '土星', '水瓶': '天王星', '双鱼': '海王星',
};

// 星座元素
const SIGN_ELEMENT: Record<string, string> = {
  '白羊': '火', '金牛': '土', '双子': '风', '巨蟹': '水',
  '狮子': '火', '处女': '土', '天秤': '风', '天蝎': '水',
  '射手': '火', '摩羯': '土', '水瓶': '风', '双鱼': '水',
};

// 星座性质
const SIGN_MODALITY: Record<string, string> = {
  '白羊': '开创', '金牛': '固定', '双子': '变动', '巨蟹': '开创',
  '狮子': '固定', '处女': '变动', '天秤': '开创', '天蝎': '固定',
  '射手': '变动', '摩羯': '开创', '水瓶': '固定', '双鱼': '变动',
};

// 宫位名称
const HOUSE_NAMES: Record<number, string> = {
  1: '命宫', 2: '财帛宫', 3: '兄弟宫', 4: '田宅宫',
  5: '子女宫', 6: '奴仆宫', 7: '夫妻宫', 8: '疾厄宫',
  9: '迁移宫', 10: '官禄宫', 11: '福德宫', 12: '玄秘宫',
};

// 行星庙旺陷落
const PLANET_DIGNITY: Record<string, { domicile: string[]; exaltation: string[]; detriment: string[]; fall: string[] }> = {
  '太阳': { domicile: ['狮子'], exaltation: ['白羊'], detriment: ['水瓶'], fall: ['天秤'] },
  '月亮': { domicile: ['巨蟹'], exaltation: ['金牛'], detriment: ['摩羯'], fall: ['天蝎'] },
  '水星': { domicile: ['双子', '处女'], exaltation: ['处女'], detriment: ['射手', '双鱼'], fall: ['双鱼'] },
  '金星': { domicile: ['金牛', '天秤'], exaltation: ['双鱼'], detriment: ['天蝎', '白羊'], fall: ['处女'] },
  '火星': { domicile: ['白羊', '天蝎'], exaltation: ['摩羯'], detriment: ['天秤', '金牛'], fall: ['巨蟹'] },
  '木星': { domicile: ['射手', '双鱼'], exaltation: ['巨蟹'], detriment: ['双子', '处女'], fall: ['摩羯'] },
  '土星': { domicile: ['摩羯', '水瓶'], exaltation: ['天秤'], detriment: ['巨蟹', '狮子'], fall: ['白羊'] },
};

function getPlanetDignity(name: string, sign: string): string {
  const d = PLANET_DIGNITY[name];
  if (!d) return '';
  if (d.domicile.includes(sign)) return '【入庙】';
  if (d.exaltation.includes(sign)) return '【旺相】';
  if (d.detriment.includes(sign)) return '【陷落】';
  if (d.fall.includes(sign)) return '【落陷】';
  return '';
}

type AstroData = {
  houses?: { number: number; sign: string; degree: number; minute: number; longitude: number }[];
  planets?: { name: string; sign: string; degree: number; minute?: number; house: number; longitude: number; retrograde: boolean }[];
  aspects?: { planet1: string; planet2: string; type: string; orb: number; angle?: number }[];
  ascendant?: number;
  midheaven?: number;
};

type BaziData = {
  fourPillars?: { year: { gan: string; zhi: string; ganZhi: string }; month: { gan: string; zhi: string; ganZhi: string }; day: { gan: string; zhi: string; ganZhi: string }; time: { gan: string; zhi: string; ganZhi: string } };
  wuxing?: { year: string; month: string; day: string; time: string };
  nayin?: { year: string; month: string; day: string; time: string };
  shiShen?: { tianGan: { year: string; month: string; day: string; time: string }; diZhi: { year: string; month: string; day: string; time: string } };
  hideGan?: { year: string[]; month: string[]; day: string[]; time: string[] };
  diShi?: { year: string; month: string; day: string; time: string };
  mingGong?: string;
  shenGong?: string;
  taiYuan?: string;
  shengXiao?: string;
  lunarDate?: string;
  dayun?: { startAge: number; ganZhi: string; startYear: number; endYear: number }[];
};

type ProfileData = { name?: string; gender?: string; birthDate?: string; birthTime?: string; city?: string; longitude?: number; latitude?: number };

/**
 * 将星盘数据格式化为结构化文本，让 AI 能精准引用具体数据
 */
function formatChartDataForAI(chartData: Record<string, unknown>): string {
  const astro = chartData.astrology as AstroData | undefined;
  const bazi = chartData.bazi as BaziData | undefined;
  const profile = chartData.profile as ProfileData | undefined;

  const lines: string[] = [];

  // 用户信息
  if (profile) {
    lines.push('## 用户基本信息');
    if (profile.name) lines.push(`姓名: ${profile.name}`);
    if (profile.gender) lines.push(`性别: ${profile.gender}`);
    if (profile.birthDate) lines.push(`出生日期: ${profile.birthDate}`);
    if (profile.birthTime) lines.push(`出生时间: ${profile.birthTime}`);
    if (profile.city) lines.push(`出生地: ${profile.city}`);
    lines.push('');
  }

  // 西洋占星
  if (astro) {
    lines.push('## 西洋占星本命盘');
    lines.push('');

    // 四轴
    if (astro.houses && astro.houses.length >= 10) {
      const h1 = astro.houses.find(h => h.number === 1);
      const h4 = astro.houses.find(h => h.number === 4);
      const h7 = astro.houses.find(h => h.number === 7);
      const h10 = astro.houses.find(h => h.number === 10);
      lines.push('### 四轴');
      if (h1) lines.push(`- 上升点(ASC): ${lonToSign(h1.longitude)} — ${h1.sign}座 — 元素:${SIGN_ELEMENT[h1.sign] || '?'} 性质:${SIGN_MODALITY[h1.sign] || '?'} — 守护星:${SIGN_RULERS[h1.sign] || '?'}`);
      if (h7) lines.push(`- 下降点(DSC): ${lonToSign(h7.longitude)} — ${h7.sign}座`);
      if (h10) lines.push(`- 中天(MC): ${lonToSign(h10.longitude)} — ${h10.sign}座 — 守护星:${SIGN_RULERS[h10.sign] || '?'}`);
      if (h4) lines.push(`- 天底(IC): ${lonToSign(h4.longitude)} — ${h4.sign}座`);
      lines.push('');
    }

    // 行星位置
    if (astro.planets && astro.planets.length > 0) {
      lines.push('### 行星位置');
      for (const p of astro.planets) {
        const dignity = getPlanetDignity(p.name, p.sign);
        const retro = p.retrograde ? ' (逆行)' : '';
        const hName = HOUSE_NAMES[p.house] || '';
        lines.push(`- ${p.name}: ${lonToSign(p.longitude)} ${p.sign}座 第${p.house}宫(${hName})${retro}${dignity ? ' ' + dignity : ''}`);
      }
      lines.push('');

      // 行星元素分布
      const elementCount: Record<string, number> = { '火': 0, '土': 0, '风': 0, '水': 0 };
      const modalityCount: Record<string, number> = { '开创': 0, '固定': 0, '变动': 0 };
      for (const p of astro.planets) {
        if (p.name === '北交点') continue;
        const el = SIGN_ELEMENT[p.sign];
        const mod = SIGN_MODALITY[p.sign];
        if (el) elementCount[el]++;
        if (mod) modalityCount[mod]++;
      }
      lines.push('### 元素与性质分布');
      lines.push(`- 元素: 火${elementCount['火']} 土${elementCount['土']} 风${elementCount['风']} 水${elementCount['水']}`);
      lines.push(`- 性质: 开创${modalityCount['开创']} 固定${modalityCount['固定']} 变动${modalityCount['变动']}`);
      lines.push('');
    }

    // 十二宫位 + 宫主星
    if (astro.houses && astro.houses.length === 12) {
      lines.push('### 十二宫位（宫头星座 & 宫主星）');
      for (const h of astro.houses.sort((a, b) => a.number - b.number)) {
        const ruler = SIGN_RULERS[h.sign] || '?';
        const hName = HOUSE_NAMES[h.number] || '';
        // 找到宫主星落在哪个宫
        const rulerPlanet = astro.planets?.find(p => p.name === ruler);
        const rulerInfo = rulerPlanet ? `→ 宫主星${ruler}落第${rulerPlanet.house}宫(${rulerPlanet.sign}座)` : '';
        lines.push(`- 第${h.number}宫(${hName}): ${h.sign}座 ${lonToSign(h.longitude)} ${rulerInfo}`);
      }
      lines.push('');
    }

    // 宫内行星分布
    if (astro.planets && astro.houses) {
      lines.push('### 各宫内行星');
      for (let i = 1; i <= 12; i++) {
        const inHouse = astro.planets.filter(p => p.house === i);
        if (inHouse.length > 0) {
          lines.push(`- 第${i}宫(${HOUSE_NAMES[i]}): ${inHouse.map(p => p.name).join('、')}`);
        }
      }
      const emptyHouses = Array.from({ length: 12 }, (_, i) => i + 1).filter(i => !astro.planets!.some(p => p.house === i));
      if (emptyHouses.length > 0) {
        lines.push(`- 空宫: ${emptyHouses.map(i => `第${i}宫`).join('、')}`);
      }
      lines.push('');
    }

    // 本命相位（按容许度排序，标注和谐/紧张）
    if (astro.aspects && astro.aspects.length > 0) {
      const sorted = [...astro.aspects].sort((a, b) => a.orb - b.orb);
      const harmonious = ['合相', '六合', '三合'];
      lines.push('### 本命相位（按容许度排序）');
      lines.push('');
      lines.push('**和谐相位:**');
      const harmAsp = sorted.filter(a => harmonious.includes(a.type));
      if (harmAsp.length > 0) {
        for (const a of harmAsp) {
          lines.push(`- ${a.planet1} ${a.type} ${a.planet2} (容许度${a.orb}°)`);
        }
      } else {
        lines.push('- 无');
      }
      lines.push('');
      lines.push('**紧张相位:**');
      const tenseAsp = sorted.filter(a => !harmonious.includes(a.type));
      if (tenseAsp.length > 0) {
        for (const a of tenseAsp) {
          lines.push(`- ${a.planet1} ${a.type} ${a.planet2} (容许度${a.orb}°)`);
        }
      } else {
        lines.push('- 无');
      }
      lines.push('');
    }
  }

  // 八字数据
  if (bazi) {
    lines.push('## 八字命盘');
    lines.push('');

    if (bazi.fourPillars) {
      const fp = bazi.fourPillars;
      lines.push('### 四柱');
      lines.push(`|  | 年柱 | 月柱 | 日柱 | 时柱 |`);
      lines.push(`|---|---|---|---|---|`);
      lines.push(`| 干支 | ${fp.year.ganZhi} | ${fp.month.ganZhi} | ${fp.day.ganZhi} | ${fp.time.ganZhi} |`);
      if (bazi.wuxing) lines.push(`| 五行 | ${bazi.wuxing.year} | ${bazi.wuxing.month} | ${bazi.wuxing.day} | ${bazi.wuxing.time} |`);
      if (bazi.nayin) lines.push(`| 纳音 | ${bazi.nayin.year} | ${bazi.nayin.month} | ${bazi.nayin.day} | ${bazi.nayin.time} |`);
      if (bazi.shiShen?.tianGan) lines.push(`| 十神(天干) | ${bazi.shiShen.tianGan.year} | ${bazi.shiShen.tianGan.month} | ${bazi.shiShen.tianGan.day} | ${bazi.shiShen.tianGan.time} |`);
      if (bazi.shiShen?.diZhi) lines.push(`| 十神(地支) | ${bazi.shiShen.diZhi.year} | ${bazi.shiShen.diZhi.month} | ${bazi.shiShen.diZhi.day} | ${bazi.shiShen.diZhi.time} |`);
      if (bazi.hideGan) lines.push(`| 藏干 | ${bazi.hideGan.year.join('/')} | ${bazi.hideGan.month.join('/')} | ${bazi.hideGan.day.join('/')} | ${bazi.hideGan.time.join('/')} |`);
      if (bazi.diShi) lines.push(`| 十二长生 | ${bazi.diShi.year} | ${bazi.diShi.month} | ${bazi.diShi.day} | ${bazi.diShi.time} |`);
      lines.push('');

      lines.push(`日主: ${fp.day.gan}`);
    }

    if (bazi.mingGong) lines.push(`命宫: ${bazi.mingGong}`);
    if (bazi.shenGong) lines.push(`身宫: ${bazi.shenGong}`);
    if (bazi.taiYuan) lines.push(`胎元: ${bazi.taiYuan}`);
    if (bazi.shengXiao) lines.push(`生肖: ${bazi.shengXiao}`);
    if (bazi.lunarDate) lines.push(`农历: ${bazi.lunarDate}`);
    lines.push('');

    // 大运
    if (bazi.dayun && bazi.dayun.length > 0) {
      lines.push('### 大运');
      for (const dy of bazi.dayun) {
        lines.push(`- ${dy.startAge}岁起(${dy.startYear}-${dy.endYear}年): ${dy.ganZhi}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * 通用行运触发计算：未来 N 年内指定行星对目标点的相位
 */
function calculateTargetTransits(opts: {
  targetLon: number;
  targetName: string;
  trackPlanets: string[];
  latitude: number;
  longitude: number;
  years?: number;
}): string {
  const { targetLon, targetName, trackPlanets, latitude, longitude, years = 5 } = opts;
  const now = new Date();
  const results: string[] = [];
  const months = years * 12;

  for (let m = 0; m < months; m++) {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() + m, 15));
    const chart = calculateChartFromDate(date, latitude, longitude);
    const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月`;

    for (const trackName of trackPlanets) {
      const planet = chart.planets.find(p => p.name === trackName);
      if (!planet) continue;
      let diff = Math.abs(planet.longitude - targetLon);
      if (diff > 180) diff = 360 - diff;

      if (diff <= 6) results.push(`${dateStr}: ${trackName}(${lonToSign(planet.longitude)}) 合相 ${targetName}(${lonToSign(targetLon)}) 容许度${diff.toFixed(1)}°`);
      else if (Math.abs(diff - 60) <= 4) results.push(`${dateStr}: ${trackName}(${lonToSign(planet.longitude)}) 六合 ${targetName} 容许度${Math.abs(diff - 60).toFixed(1)}°`);
      else if (Math.abs(diff - 90) <= 5) results.push(`${dateStr}: ${trackName}(${lonToSign(planet.longitude)}) 刑克 ${targetName} 容许度${Math.abs(diff - 90).toFixed(1)}°`);
      else if (Math.abs(diff - 120) <= 5) results.push(`${dateStr}: ${trackName}(${lonToSign(planet.longitude)}) 三合 ${targetName} 容许度${Math.abs(diff - 120).toFixed(1)}°`);
      else if (Math.abs(diff - 180) <= 6) results.push(`${dateStr}: ${trackName}(${lonToSign(planet.longitude)}) 对冲 ${targetName} 容许度${Math.abs(diff - 180).toFixed(1)}°`);
    }
  }

  if (results.length === 0) return `未来${years}年内无显著行运触发${targetName}的相位。`;
  return results.join('\n');
}

const REPORT_PROMPTS: Record<string, string> = {
  love: `你是一位资深占星师，擅长通过本命盘分析情感与婚姻。请根据用户提供的本命盘信息，生成一份详细的「正缘报告」。

## 报告定义
"正缘"指与用户有深刻宿缘、最可能走向稳定婚姻或长期伴侣关系的对象。报告需从占星学角度分析：正缘的性格特征、相遇的时机、关系中可能出现的议题，以及给用户的建议。

## 报告结构（严格按此 5 个板块输出）

### 一、正缘的基础画像
- 正缘的**太阳星座**（主导性格）、**月亮星座**（情感需求）、**上升星座**（外在气质）——根据用户第七宫宫头星座、下降点星座及金星落座来推断。
- 例如：下降双鱼座 → 正缘倾向具有双鱼座特质（浪漫、敏感、艺术气质）。
- 说明推断的占星依据（引用具体的宫头星座、金星位置、第七宫内行星等数据）。

### 二、正缘的外在特征与职业倾向
- 结合下降星座和第七宫宫主星、金星落座，推断可能的外貌气质、穿着风格、给人的第一印象。
- 结合第七宫和金星分析适合的职业领域（如艺术、医疗、教育、技术、金融等）。

### 三、如何相遇 & 关键时间窗口
- **重要**：我会在星盘数据后附上「未来5年行运触发第七宫/下降点的时间表」，请根据这份数据，挑选出**3个最可能的相遇时间段**（精确到年月区间，例如2027年3月-8月）。
- 优先选择木星或土星合相/三合下降点的时段，其次是六合。
- 描述每个时间窗口中典型的相遇场景（工作场合、朋友介绍、旅行、学习进修、线上社群等），结合行运行星的特质说明原因。

### 四、关系中的优势与挑战
- **优势**：根据用户本命盘中金星、月亮、第七宫的和谐相位，分析双方能量互补的方面。
- **挑战**：根据土星、冥王星与金星/月亮的紧张相位，分析可能出现的冲突领域（责任压力、信任问题、疏离感等）。
- 每条都要引用具体的相位数据。

### 五、给用户的具体建议
- 针对自身需要成长的部分（如学会表达脆弱、放下过度理想化、建立安全感）。
- 主动创造相遇机会的行动指南（参加什么类型的活动、调整社交圈的方向）。
- 在感情中需要特别注意的课题。

## 输出风格
- 专业、温和、鼓励性语气，使用"可能"、"倾向"、"建议关注"等措辞，避免绝对化断言。
- 每个板块的分析必须引用具体的星盘数据（星座、宫位、相位、度数），不可泛泛而谈或编造数据。
- 使用 markdown 格式，结构清晰。
- 结尾提醒：占星分析仅供参考和自我认知，最终的缘分需要在现实中用心经营。`,

  career: `你是一位资深占星师，精通通过本命盘分析职业天赋与事业发展。请根据用户的星盘数据，生成一份详细的「事业报告」。

## 报告定义
事业报告通过分析中天(MC)、第十宫、太阳、土星等关键指标，揭示用户的职业天赋、财运格局和事业发展节奏，并基于真实行运数据指出关键的事业转折期。

## 报告结构（严格按此 5 个板块输出）

### 一、核心职业天赋与方向
- **MC（中天）星座** → 适合的职业领域、公众形象、事业追求的方向
- **第十宫内行星**（如有）→ 事业如何具体展现
- **太阳星座+宫位** → 人生目标、领导风格、在哪个生活领域追求成就
- 引用具体的MC度数、10宫行星、太阳数据，说明推断依据。

### 二、工作风格与能力优势
- **第六宫宫头星座+宫内行星** → 日常工作方式、对待工作的态度
- **水星星座+宫位** → 思维方式、沟通风格、适合的智力工作类型
- **火星星座+宫位** → 行动力模式、竞争风格、执行力特点
- 引用具体的水星、火星位置数据。

### 三、财运格局
- **第二宫（正财）宫头+宫内行星** → 赚钱方式、对金钱的态度
- **第八宫（偏财）宫头+宫内行星** → 投资收益、合作分成、遗产
- **金星** → 物质价值观；**木星** → 财务扩展潜力
- 引用具体的2宫、8宫、金星、木星数据。

### 四、事业关键时间窗口
- **重要**：我会在星盘数据后附上「未来5年行运触发MC(中天)的时间表」，请根据这份数据，挑选出**3个最重要的事业转折/上升期**（精确到年月区间）。
- 优先选择木星合相/三合MC的时段（机遇扩展期），以及土星合相MC的时段（责任加重/权威确立期）。
- 每个时间窗口说明适合做什么：跳槽、创业、升职谈判、技能深造、转型等。

### 五、职业发展策略建议
- 结合MC和太阳，列出最适合的 **3-5 个行业方向**，说明原因。
- 指出需要突破的瓶颈（土星紧张相位暗示的限制）。
- 可执行的行动指南（短期和长期）。

## 输出风格
- 专业务实的语气，使用"倾向"、"适合"、"建议关注"等措辞，避免绝对化断言。
- 每个板块的分析必须引用具体的星盘数据（星座、宫位、相位、度数），不可泛泛而谈或编造数据。
- 使用 markdown 格式，结构清晰。
- 结尾提醒：占星分析仅供参考，职业选择还需结合个人兴趣和现实条件。`,

  emotion: `你是一位资深占星师，擅长通过本命盘深度解读情感世界与内在心理。请根据用户的星盘数据，生成一份详细的「感情报告」。

## 报告定义
感情报告从月亮、金星、第4/7/8/12宫等关键指标出发，揭示用户的情感内核、依恋模式、潜意识中的情感伤痛，并基于真实行运数据指出情感成长的关键时期。

## 报告结构（严格按此 5 个板块输出）

### 一、情感内核与安全感来源
- **月亮星座+宫位** → 核心情感需求、什么让你感到安心
- **第四宫宫头+宫内行星** → 对"家"和归属感的理解、原生家庭的影响
- **月亮与其他行星的主要相位** → 情绪的表达模式（和谐相位=流畅表达；紧张相位=压抑或爆发）
- 引用具体的月亮度数、宫位和相位数据。

### 二、爱的方式与亲密关系模式
- **金星星座+宫位** → 如何表达爱、渴望被怎样对待
- **第七宫宫头+宫内行星** → 对伴侣的期待和投射
- **第八宫情况** → 深层情感连接的方式、对亲密和信任的态度
- 引用金星和7/8宫的具体数据。

### 三、内在伤痛与潜意识模式
- **第十二宫宫头+宫内行星** → 隐藏的情感模式、自我逃避的领域
- **土星/冥王星与月亮/金星的紧张相位**（如有）→ 情感创伤来源和防御机制
- **南交点星座+宫位** → 前世/过去的情感惯性，容易重复的旧模式
- 引用具体的相位和度数数据。

### 四、情感发展关键时期
- **重要**：我会在星盘数据后附上「未来5年行运触发本命月亮的时间表」，请根据这份数据，挑选出**3个重要的情感转折期**（精确到年月区间）。
- 土星触发月亮 → 情感考验/成熟期；木星触发月亮 → 情感扩展/愉悦期。
- 每个时期说明情感主题：深化关系、疗愈旧伤、开放心扉、直面恐惧等。

### 五、情感成长路径与建议
- **北交点星座+宫位** → 灵魂渴望成长的方向
- 针对星盘中具体紧张相位暗示的情感课题，给出个性化建议。
- 可执行的自我疗愈方法（独处反思、创造性表达、身体觉察等）。

## 输出风格
- 温暖细腻的语气，使用"倾向"、"可能"、"建议探索"等措辞，传递理解和接纳。
- 每个板块的分析必须引用具体的星盘数据（星座、宫位、相位、度数），不可泛泛而谈或编造数据。
- 使用 markdown 格式，结构清晰。
- 结尾提醒：占星分析是自我认知的工具，情感成长需要在生活中持续实践。`,

  health: `你是一位擅长医学占星的资深命理健康分析师。请根据用户的星盘数据，生成一份详细的「健康趋势报告」。

## 报告定义
健康报告通过分析上升星座(ASC)、第一宫、第六宫、太阳、月亮、火星、土星等关键指标，揭示用户的先天体质特征、身体易感区域、精力节奏模式，并基于真实行运数据指出健康敏感时段。

## 星座-身体部位对应参考
白羊=头部/面部、金牛=喉咙/颈部、双子=手臂/肺部、巨蟹=胃部/胸部、狮子=心脏/脊椎、处女=肠道/消化系统、天秤=肾脏/腰部、天蝎=生殖/泌尿系统、射手=肝脏/臀部、摩羯=骨骼/关节/皮肤、水瓶=小腿/循环系统、双鱼=足部/淋巴系统

## 报告结构（严格按此 5 个板块输出）

### 一、先天体质画像
- **上升星座** → 身体类型、外在特征、先天体质倾向
- **第一宫内行星**（如有）→ 对身体活力的加持或消耗
- **太阳星座+宫位** → 核心生命力来源、哪个生活领域消耗最多精力
- 引用具体的ASC度数、1宫行星和太阳数据，说明推断依据。

### 二、身体易感区域地图
- 根据**太阳、月亮、上升**所落星座 → 对应的身体区域（参照上方星座-身体对应表）
- **第六宫宫头星座+宫内行星** → 健康习惯和慢性风险倾向
- **土星落座星座** → 长期需要关注的身体部位（土星代表限制和慢性议题）
- **火星落座星座** → 容易发炎或受伤的区域
- 引用具体的6宫、土星、火星位置数据。

### 三、精力节奏与运动建议
- **火星星座+宫位** → 精力模式（火象=爆发型、土象=持久型、风象=灵活型、水象=波动型）
- **太阳与火星的相位**（如有）→ 体能上限和运动天赋
- 推荐适合的运动类型：
  - 火象（白羊/狮子/射手）→ HIIT、竞技运动、拳击
  - 土象（金牛/处女/摩羯）→ 力量训练、瑜伽、登山
  - 风象（双子/天秤/水瓶）→ 舞蹈、球类运动、骑行
  - 水象（巨蟹/天蝎/双鱼）→ 游泳、冥想、太极
- 引用火星和太阳的具体数据。

### 四、健康敏感时段
- **重要**：我会在星盘数据后附上「未来5年行运触发上升点(ASC)的时间表」，请根据这份数据，挑选出**3个需要特别注意健康的时段**（精确到年月区间）。
- 土星触发ASC → 身体负担加重、慢性问题浮现、需要严格自律养生
- 火星触发ASC → 容易受伤、发炎、精力过度消耗、需注意安全
- 每个时段给出具体的注意事项（减少运动强度/注意饮食/防止意外/定期体检等）。

### 五、个性化养生方案
- **饮食建议**：结合上升和月亮的元素属性（火=清热降火、土=健脾养胃、风=润肺安神、水=补肾利湿）
- **作息建议**：结合太阳宫位分析最佳作息节奏
- **心理健康**：月亮+海王星相位（如有）→ 情绪健康建议；月亮+土星相位 → 压力管理
- **季节性调养**：结合太阳和上升的元素属性，给出四季养生侧重点

## 输出风格
- 关怀务实的语气，使用"倾向"、"建议关注"、"可能需要"等措辞，避免绝对化断言。
- 每个板块的分析必须引用具体的星盘数据（星座、宫位、相位、度数），不可泛泛而谈或编造数据。
- 使用 markdown 格式，结构清晰。
- 结尾提醒：医学占星仅供参考和自我认知，不替代专业医疗诊断，如有健康问题请及时就医。`,
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return Response.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 });
    }

    const body = await request.json();
    const { type, chartData } = body as { type: string; chartData: Record<string, unknown> };

    if (!type || !chartData) {
      return Response.json({ error: '缺少 type 或 chartData 参数' }, { status: 400 });
    }

    const systemPrompt = REPORT_PROMPTS[type];
    if (!systemPrompt) {
      return Response.json({ error: `未知报告类型: ${type}` }, { status: 400 });
    }

    // 为各类报告计算未来行运触发数据
    let extraContext = '';
    try {
      const astro = chartData.astrology as AstroData;
      const profile = chartData.profile as ProfileData;

      if (profile.latitude && profile.longitude) {
        if (type === 'love') {
          // 正缘报告：追踪木星/土星/金星触发下降点(7宫宫头)
          const house7 = astro.houses?.find((h: { number: number }) => h.number === 7);
          if (house7) {
            const transitData = calculateTargetTransits({ targetLon: house7.longitude, targetName: '下降点', trackPlanets: ['木星', '土星', '金星'], latitude: profile.latitude, longitude: profile.longitude });
            extraContext = `\n\n## 未来5年行运触发第七宫/下降点时间表\n\n下降点（第七宫宫头）位于 ${lonToSign(house7.longitude)}\n\n${transitData}\n\n请根据以上行运数据，挑选3个最有利的相遇时间窗口。`;
          }
        } else if (type === 'career') {
          // 事业报告：追踪木星/土星触发MC(中天/10宫宫头)
          const house10 = astro.houses?.find((h: { number: number }) => h.number === 10);
          const mcLon = house10?.longitude ?? astro.midheaven;
          if (mcLon !== undefined) {
            const transitData = calculateTargetTransits({ targetLon: mcLon, targetName: 'MC(中天)', trackPlanets: ['木星', '土星'], latitude: profile.latitude, longitude: profile.longitude });
            extraContext = `\n\n## 未来5年行运触发MC(中天)时间表\n\nMC（中天/第十宫宫头）位于 ${lonToSign(mcLon)}\n\n${transitData}\n\n请根据以上行运数据，挑选3个最重要的事业转折/上升期。`;
          }
        } else if (type === 'emotion') {
          // 感情报告：追踪土星/木星触发本命月亮
          const natalMoon = astro.planets?.find((p: { name: string }) => p.name === '月亮');
          if (natalMoon) {
            const transitData = calculateTargetTransits({ targetLon: natalMoon.longitude, targetName: '本命月亮', trackPlanets: ['土星', '木星'], latitude: profile.latitude, longitude: profile.longitude });
            extraContext = `\n\n## 未来5年行运触发本命月亮时间表\n\n本命月亮位于 ${lonToSign(natalMoon.longitude)}\n\n${transitData}\n\n请根据以上行运数据，挑选3个重要的情感转折期。`;
          }
        } else if (type === 'health') {
          // 健康报告：追踪土星/火星触发上升点(ASC)
          const house1 = astro.houses?.find((h: { number: number }) => h.number === 1);
          const ascLon = house1?.longitude ?? astro.ascendant;
          if (ascLon !== undefined) {
            const transitData = calculateTargetTransits({ targetLon: ascLon, targetName: '上升点(ASC)', trackPlanets: ['土星', '火星'], latitude: profile.latitude, longitude: profile.longitude });
            extraContext = `\n\n## 未来5年行运触发上升点(ASC)时间表\n\n上升点（ASC）位于 ${lonToSign(ascLon)}\n\n${transitData}\n\n请根据以上行运数据，挑选3个需要特别注意健康的时段。`;
          }
        }
      }
    } catch { /* 计算失败不影响报告生成 */ }

    // 将星盘数据格式化为结构化文本
    const formattedData = formatChartDataForAI(chartData);

    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: `${systemPrompt}\n\n${formattedData}${extraContext}\n\n**重要提醒**：\n- AI 绝不自行计算或修改排盘数据，只基于上述数据进行解读\n- 分析时必须引用上方提供的具体数据（精确到度数、宫位、相位容许度），禁止泛泛而谈\n- 注意行星的庙旺陷落状态，这影响行星能量的发挥\n- 注意宫主星的落宫位置，这揭示该宫事务在哪个领域展开\n- 注意和谐相位与紧张相位的对比，两者构成人生的助力与课题\n- 结合八字十神和大运信息做辅助判断`,
      },
      {
        role: 'user',
        content: '请根据我的星盘数据生成完整报告。',
      },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChat(messages, apiKey)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          const msg = error instanceof Error ? error.message : '生成失败';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '请求失败' },
      { status: 500 }
    );
  }
}
