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

type ProfileData = { name?: string; gender?: string; birthDate?: string; birthTime?: string; city?: string; longitude?: number; latitude?: number };

/**
 * 将星盘数据格式化为结构化文本，让 AI 能精准引用具体数据
 */
function formatChartDataForAI(chartData: Record<string, unknown>): string {
  const astro = chartData.astrology as AstroData | undefined;
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
  love: `你是一位资深西洋占星师，精通通过本命盘深度分析情感与婚姻。请根据用户提供的本命盘信息，生成一份极其详尽的「正缘报告」。只使用西洋占星学体系。

## 报告定义
"正缘"指与用户有深刻宿缘、最可能走向稳定婚姻或长期伴侣关系的对象。

## 总字数要求：2500-3500 字

## 报告结构（严格按以下板块输出，每个板块用 ---SECTION_标记--- 标题 分隔）

---SECTION_PARTNER--- 正缘的星座画像
深度分析正缘可能具备的星座特质：
- **下降点（DSC）星座** → 正缘的核心性格基调。引用具体下降点度数和星座，详细解释该星座特质如何在伴侣身上体现（至少150字）
- **第七宫宫头星座 & 宫主星落座** → 宫主星落在哪个宫位和星座，揭示伴侣可能出现在哪个生活领域、具有什么样的社会角色
- **第七宫内行星**（如有）→ 每颗落入七宫的行星如何影响伴侣的特质（如太阳在七宫=伴侣有领导力，月亮在七宫=伴侣情感细腻）
- **金星星座+宫位** → 你被什么样的人吸引、你的审美偏好、爱情中的价值标准
- **月亮节点（南北交点）与第七宫的关系** → 如果北交点在七宫或相关星座，说明伴侣关系是灵魂成长方向
- 引用所有相关度数和宫位，不可省略数据

---SECTION_APPEARANCE--- 正缘的外在特征与职业倾向
- **下降点星座 → 外貌气质推断**：详细描述体型倾向、面部特征、穿着风格、整体气场（至少100字）
- **第七宫宫主星的星座 & 宫位** → 进一步细化外貌特征和社会形象
- **金星星座** → 对方的审美品味、艺术倾向
- **职业领域推断**：结合第七宫宫头星座的元素属性（火=创业/运动/军警、土=金融/建筑/农业、风=传媒/教育/法律、水=医疗/艺术/心理），以及宫主星落入的宫位（如落10宫=对方事业心强，落3宫=从事传播/写作）
- 引用具体数据

---SECTION_LOVE_STYLE--- 你的恋爱风格与吸引力
- **金星星座+宫位+相位** → 你表达爱的方式、被爱的需求、在关系中的角色（给予者/接受者/共创者）。逐一分析金星的每个主要相位如何影响恋爱风格
- **第五宫宫头星座+宫内行星** → 恋爱初期的表现、浪漫风格、约会偏好、追求方式
- **火星星座+宫位** → 性吸引力模式、在感情中的主动性、对激情的态度
- **月亮星座** → 你在亲密关系中的情感需求、安全感来源
- 引用金星、火星、月亮的具体度数和相位

---SECTION_TIMING--- 相遇时机 & 关键时间窗口
**重要**：我会在星盘数据后附上「未来5年行运触发第七宫/下降点的时间表」。
- 从行运数据中挑选 **4-5 个最可能的相遇/关系推进时间段**（精确到年月区间，如2027年3月-8月）
- 每个时间窗口详细分析（每个至少80字）：
  - 触发行星是什么、形成什么相位、容许度多少
  - 木星触发 → 通过什么渠道（社交扩展、旅行、学习）；土星触发 → 通过什么方式（责任场合、工作引荐、长辈介绍）；天王星触发 → 意外相遇（网络、突发事件、非常规场合）；海王星触发 → 灵性连接（艺术活动、灵修、梦境般的偶遇）；金星触发 → 自然吸引（社交场合、约会、朋友聚会）
  - 该时段适合采取什么行动
- 标注哪个时间窗口能量最强（容许度最小+涉及外行星）

---SECTION_STRENGTHS--- 关系中的天赋优势
逐一分析本命盘中有利于亲密关系的配置：
- **金星的和谐相位**（三合、六合）→ 每个和谐相位带来的关系优势，引用具体相位和容许度
- **月亮的和谐相位** → 情感滋养能力
- **第七宫的吉星（木星、金星落入）** → 婚姻运势加持
- **日月调和（太阳与月亮的相位）** → 对伴侣关系的影响
- 每条优势都附上具体相位数据和容许度

---SECTION_CHALLENGES--- 关系中的挑战与功课
逐一分析本命盘中需要注意的配置：
- **金星/月亮与土星的紧张相位** → 情感压抑、责任过重、延迟满足
- **金星/月亮与冥王星的紧张相位** → 控制欲、嫉妒、深层不安全感
- **金星/月亮与天王星的紧张相位** → 对自由的渴望、难以承诺
- **金星/月亮与海王星的紧张相位** → 理想化、逃避、界限模糊
- **第十二宫行星** → 隐藏的情感模式、无意识的自我破坏
- 每条挑战都说明：具体表现是什么、根源在哪里、如何觉察和转化
- 引用具体的相位数据

---SECTION_ADVICE--- 个性化成长建议
- **自我成长方向**（3-4条）：根据星盘中紧张相位暗示的课题，给出针对性的内在成长建议（如学会表达脆弱、放下完美主义、建立健康边界等），每条说明对应的星盘依据
- **创造相遇的行动指南**（3-4条）：基于第七宫宫头星座的元素属性和宫主星落宫，建议参加什么类型的活动、在什么场景中更容易遇到正缘
- **关系经营要点**（2-3条）：进入关系后需要特别注意的课题
- 结尾提醒：占星分析仅供参考和自我认知，最终的缘分需要在现实中用心经营。

## 输出风格
- 专业、温和、鼓励性语气，使用"可能"、"倾向"、"建议关注"等措辞
- 每个板块必须引用具体的星盘数据（星座、宫位、相位、度数），禁止泛泛而谈
- 使用 markdown 格式，结构清晰，适度使用加粗和列表`,

  career: `你是一位资深西洋占星师，精通通过本命盘分析职业天赋与事业发展。请根据用户的星盘数据，生成一份极其详尽的「事业报告」。只使用西洋占星学体系。

## 总字数要求：2500-3500 字

## 报告结构（严格按以下板块输出，每个板块用 ---SECTION_标记--- 标题 分隔）

---SECTION_VOCATION--- 天职方向与公众形象
- **MC（中天）星座+度数** → 你在社会中的角色定位、最适合的职业形象、事业追求的终极方向。详细解释该星座在MC上如何体现（至少150字）
- **MC 宫主星落座和宫位** → 事业成功的关键路径在哪个生活领域展开（如宫主星落3宫=通过写作/传播成功，落9宫=通过教育/海外发展）
- **第十宫内行星**（如有）→ 逐颗分析每颗行星对事业的影响：太阳=领导力、月亮=公众情感连接、火星=竞争力/开拓、土星=权威/长期积累、木星=扩张/好运
- **太阳星座+宫位** → 核心生命力在哪个领域发光、领导风格、成就感来源
- 引用所有相关度数和位置

---SECTION_SKILLS--- 工作风格与核心能力
- **水星星座+宫位+相位** → 思维模式（分析型/直觉型/创意型/实务型）、沟通风格、学习方式、适合的智力工作类型。逐一分析水星的主要相位
- **火星星座+宫位+相位** → 执行力模式、竞争风格、精力管理方式、团队合作 vs 独立工作的偏好
- **第六宫宫头星座+宫内行星** → 日常工作习惯、对同事和下属的态度、工作环境偏好
- **土星星座+宫位** → 你需要长期磨练的专业能力、容易遇到的职业瓶颈、最终可以建立权威的领域
- 引用具体数据

---SECTION_WEALTH--- 财运格局深度分析
- **第二宫（正财）**：宫头星座+宫主星落宫+宫内行星 → 赚钱方式、对金钱的态度、收入来源的性质（稳定薪资/自由职业/技术变现）
- **第八宫（偏财）**：宫头星座+宫主星落宫+宫内行星 → 投资能力、合作收益、他人资源运用能力、被动收入潜力
- **金星星座+宫位** → 物质价值观、消费偏好、通过什么方式吸引财富
- **木星星座+宫位** → 财务扩展方向、幸运领域、最容易获得机遇的方式
- **第二宫/第八宫的行星相位** → 财运的助力和阻碍（如木星三合二宫主=财运亨通，土星刑克八宫主=投资需谨慎）
- 引用所有相关数据

---SECTION_LEADERSHIP--- 领导力与人际协作
- **太阳与其他行星的主要相位** → 权威感、自信度、领导天赋（太阳三合木星=天生领袖、太阳刑土星=权威感需要时间建立）
- **第十一宫宫头+宫内行星** → 团队合作模式、在组织中的角色、人脉资源类型
- **第七宫** → 商业合伙的模式、适合什么样的合作伙伴
- 引用具体相位和数据

---SECTION_CAREER_TIMING--- 事业关键时间窗口
**重要**：我会在星盘数据后附上「未来5年行运触发MC(中天)的时间表」。
- 从行运数据中挑选 **4-5 个最重要的事业节点**（精确到年月区间）
- 每个时间窗口详细分析（每个至少80字）：
  - 触发行星、相位类型、容许度
  - 木星触发MC → 扩张期（升职、创业、进入新领域）；土星触发MC → 奠基期（承担重任、建立权威、考验期）；冥王星触发MC → 深层转型（行业/角色彻底转变）
  - 该时段最适合做什么决策
- 标注能量最强的窗口

---SECTION_INDUSTRIES--- 行业方向推荐
结合MC星座、太阳、水星、火星的综合分析：
- 列出 **5-6 个最适合的行业/职业方向**
- 每个方向说明：为什么适合（对应哪个星盘配置）、在该行业中最适合什么角色、发展路径建议
- 指出最需要避免的职业类型及原因

---SECTION_CAREER_ADVICE--- 职业发展策略
- **短期策略**（1-2年）：根据当前行运，现在最应该做什么
- **中期策略**（3-5年）：根据即将到来的重要行运，如何布局
- **长期愿景**：MC和太阳揭示的终极职业图景
- **需要突破的瓶颈**：土星紧张相位暗示的限制及突破方法
- 结尾提醒：占星分析仅供参考，职业选择还需结合个人兴趣和现实条件。

## 输出风格
- 专业务实的语气，使用"倾向"、"适合"、"建议关注"等措辞
- 每个板块必须引用具体的星盘数据（星座、宫位、相位、度数），禁止泛泛而谈
- 使用 markdown 格式，结构清晰`,

  emotion: `你是一位资深西洋占星师，擅长通过本命盘深度解读情感世界与内在心理。请根据用户的星盘数据，生成一份极其详尽的「感情报告」。只使用西洋占星学体系。

## 总字数要求：2500-3500 字

## 报告结构（严格按以下板块输出，每个板块用 ---SECTION_标记--- 标题 分隔）

---SECTION_EMOTIONAL_CORE--- 情感内核与安全感
- **月亮星座+宫位+度数** → 你最深层的情感需求、什么让你感到安心、情绪波动的模式。详细描述该星座月亮的情感特质（至少150字）
- **月亮与其他行星的每个主要相位** → 逐一分析：月亮合/刑/冲太阳=自我认同与情感的关系、月亮与金星=爱与被爱的能力、月亮与土星=情感压抑/成熟、月亮与冥王星=情感强度/控制、月亮与海王星=梦幻/逃避
- **第四宫宫头星座+宫内行星+宫主星落宫** → 原生家庭的影响、对"家"的理解、童年情感印记如何影响成年后的亲密关系
- 引用所有相关度数和相位

---SECTION_LOVE_PATTERN--- 爱的方式与亲密关系模式
- **金星星座+宫位+度数** → 你的爱情语言、被什么样的人吸引、在关系中展现出的特质。详细描述（至少120字）
- **金星与其他行星的主要相位** → 逐一分析每个相位如何影响恋爱模式
- **第七宫宫头星座+宫主星+宫内行星** → 你对伴侣的期待和投射、容易被什么样的人吸引（可能是自己未发展的部分）
- **第五宫宫头+宫内行星** → 恋爱初期的行为模式、浪漫表达方式、对快乐和创造力的态度
- **第八宫宫头+宫内行星** → 深层亲密的态度——是渴望灵魂融合还是保持距离？对信任、脆弱、性的态度
- 引用所有数据

---SECTION_ATTACHMENT--- 依恋模式与防御机制
- **月亮+金星+土星的三角关系** → 分析这三颗星之间的相位如何塑造你的依恋类型（安全型/焦虑型/回避型/混乱型）
- **第十二宫宫头星座+宫内行星** → 隐藏的情感模式、无意识的自我破坏行为、灵魂深处不愿面对的部分
- **冥王星的宫位和相位** → 控制与被控制的模式、嫉妒/占有的来源
- **土星的宫位和相位** → 情感中的恐惧和限制、害怕什么、在哪里设置了过高的壁垒
- 每个分析点都引用具体数据

---SECTION_KARMIC--- 灵魂功课与前世模式
- **南交点星座+宫位** → 过去生命/过去经历中的情感惯性，你容易反复陷入的旧模式
- **北交点星座+宫位** → 灵魂渴望成长的方向，在感情中需要发展的新品质
- **南北交点与金星/月亮的相位**（如有）→ 情感领域与灵魂功课的直接连接
- **第十二宫与第七宫的关联** → 无意识投射如何影响你的伴侣选择
- 具体说明旧模式的表现和新方向的实践方式

---SECTION_EMOTION_TIMING--- 情感发展关键时期
**重要**：我会在星盘数据后附上「未来5年行运触发本命月亮的时间表」。
- 从行运数据中挑选 **4-5 个重要的情感节点**（精确到年月区间）
- 每个时期详细分析（每个至少80字）：
  - 触发行星、相位类型、容许度
  - 木星触发月亮 → 情感扩展/新恋情/内心愉悦；土星触发月亮 → 情感考验/关系成熟/面对现实；冥王星触发月亮 → 深层情感转化/关系重生或结束；金星触发月亮 → 短暂甜蜜期/社交活跃
  - 该时段的情感主题和建议行动
- 标注最重要的窗口

---SECTION_HEALING--- 自我疗愈与情感成长路径
- **针对紧张相位的疗愈建议**（3-4条）：每条对应一个具体的紧张相位，说明该相位的表现、根源、转化方法
- **发展北交点品质的建议**（2-3条）：如何在感情中实践灵魂成长方向
- **日常情感滋养方式**：根据月亮元素属性（火=创造性表达/运动宣泄、土=触觉体验/自然接触、风=社交倾诉/书写表达、水=独处冥想/艺术创作），推荐具体的自我关怀方式
- **关系中的实践建议**：如何在亲密关系中打破旧模式、建立新的互动方式
- 结尾提醒：占星分析是自我认知的工具，情感成长需要在生活中持续实践。

## 输出风格
- 温暖细腻的语气，使用"倾向"、"可能"、"建议探索"等措辞，传递理解和接纳
- 每个板块必须引用具体的星盘数据（星座、宫位、相位、度数），禁止泛泛而谈
- 使用 markdown 格式，结构清晰`,

  health: `你是一位擅长医学占星的资深西洋占星师。请根据用户的星盘数据，生成一份极其详尽的「健康趋势报告」。只使用西洋占星学体系。

## 星座-身体部位对应
白羊=头部/面部/大脑、金牛=喉咙/颈部/甲状腺、双子=手臂/肺部/神经系统、巨蟹=胃部/胸部/乳腺、狮子=心脏/脊椎/血液循环、处女=肠道/消化系统/胰腺、天秤=肾脏/腰部/内分泌、天蝎=生殖系统/泌尿系统/排泄、射手=肝脏/臀部/大腿、摩羯=骨骼/关节/皮肤/牙齿、水瓶=小腿/踝关节/循环系统、双鱼=足部/淋巴系统/免疫

## 总字数要求：2500-3500 字

## 报告结构（严格按以下板块输出，每个板块用 ---SECTION_标记--- 标题 分隔）

---SECTION_CONSTITUTION--- 先天体质全息画像
- **上升星座+度数** → 身体类型（骨架大小、代谢倾向、外在体态）、先天体质的强弱项。详细描述（至少150字）
- **第一宫内行星**（逐颗分析）→ 太阳=生命力旺盛、火星=精力充沛但易受伤、土星=需要注意骨骼/慢性问题、木星=体态丰满/肝脏、海王星=免疫力敏感
- **太阳星座+宫位** → 核心生命力来源、在哪个生活领域最消耗精力、需要在哪里补充能量
- **月亮星座+宫位** → 情绪对身体的影响模式、压力如何在身体上体现
- 引用所有相关度数

---SECTION_BODY_MAP--- 身体易感区域详细地图
- **太阳所落星座** → 对应身体区域（参照上方对应表），该区域的能量特点
- **月亮所落星座** → 对应身体区域，情绪波动时最先反应的部位
- **上升星座** → 对应身体区域，外在体质最直接的表现
- **第六宫宫头星座+宫主星落宫+宫内行星** → 慢性健康倾向、日常保健习惯、适合什么样的医疗保健方式。逐颗分析六宫内行星
- **土星星座+宫位+相位** → 长期需要关注的身体部位（土星=限制/慢性/退化），土星的紧张相位与哪个身体系统相关
- **火星星座+宫位+相位** → 容易发炎/受伤/过热的区域，火星紧张相位的具体风险
- **海王星宫位+相位** → 免疫系统、过敏体质、药物敏感性
- 综合所有数据画出完整的身体风险地图，标注高/中/低风险区域

---SECTION_ENERGY--- 精力模式与运动处方
- **火星星座+宫位+相位** → 精力类型的完整分析：爆发力 vs 持久力、最佳运动时间、精力高峰和低谷的规律
- **太阳-火星相位** → 体能上限、运动天赋、竞技能力
- **月亮-火星相位** → 情绪对体能的影响、运动中的情绪释放方式
- **元素分布** → 火象行星多=需要高强度运动、土象多=需要力量型运动、风象多=需要灵活社交型运动、水象多=需要水中/冥想型运动
- **个性化运动处方**（5-6种推荐）：每种运动说明为什么适合（对应哪个星盘配置）、建议频率和强度
- 引用火星和太阳的具体数据

---SECTION_MENTAL_HEALTH--- 心理健康与压力模式
- **月亮+土星相位** → 压力模式、抑郁倾向、情绪压抑方式
- **月亮+海王星相位** → 情绪界限、逃避倾向、成瘾风险
- **月亮+冥王星相位** → 情绪强度、情绪创伤、转化能力
- **第十二宫配置** → 潜意识中的焦虑来源、需要独处的模式
- **水星相位** → 思维模式对心理健康的影响（过度思虑、焦虑倾向等）
- 每个分析点都引用数据，并给出具体的心理保健建议

---SECTION_HEALTH_TIMING--- 健康敏感时段
**重要**：我会在星盘数据后附上「未来5年行运触发上升点(ASC)的时间表」。
- 从行运数据中挑选 **4-5 个需要特别关注健康的时段**（精确到年月区间）
- 每个时段详细分析（每个至少80字）：
  - 触发行星、相位类型、容许度
  - 土星触发ASC → 身体负担加重、慢性问题浮现、需要严格自律
  - 火星触发ASC → 受伤/发炎/手术风险、精力过度消耗
  - 海王星触发ASC → 免疫力下降、过敏、需要注意药物反应
  - 具体防护建议（体检项目、饮食调整、运动强度调整、心理减压等）
- 标注风险最高的时段

---SECTION_WELLNESS--- 个性化养生方案
- **饮食建议**：根据上升和月亮的元素属性+第六宫配置，给出详细的饮食原则（不少于4条，每条说明星盘依据）
- **作息建议**：根据太阳宫位和月亮状态，分析最佳作息节奏、睡眠质量影响因素
- **季节性调养**：结合太阳和上升元素，给出四季各自的养生侧重点
- **身体区域养护重点**：根据前面分析出的易感区域，给出针对性的日常养护方法
- **情绪-身体联动建议**：根据月亮相位，说明情绪失衡时身体会如何反应、如何通过身体调理改善情绪
- 结尾提醒：医学占星仅供参考和自我认知，不替代专业医疗诊断，如有健康问题请及时就医。

## 输出风格
- 关怀务实的语气，使用"倾向"、"建议关注"、"可能需要"等措辞
- 每个板块必须引用具体的星盘数据（星座、宫位、相位、度数），禁止泛泛而谈
- 使用 markdown 格式，结构清晰`,
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
          // 正缘报告：追踪木星/土星/金星/天王星/海王星触发下降点(7宫宫头)
          const house7 = astro.houses?.find((h: { number: number }) => h.number === 7);
          if (house7) {
            const transitData = calculateTargetTransits({ targetLon: house7.longitude, targetName: '下降点', trackPlanets: ['木星', '土星', '金星', '天王星', '海王星'], latitude: profile.latitude, longitude: profile.longitude });
            extraContext = `\n\n## 未来5年行运触发第七宫/下降点时间表\n\n下降点（第七宫宫头）位于 ${lonToSign(house7.longitude)}\n\n${transitData}\n\n请根据以上行运数据，挑选4-5个最有利的相遇/关系推进时间窗口。`;
          }
        } else if (type === 'career') {
          // 事业报告：追踪木星/土星/冥王星/天王星触发MC(中天/10宫宫头)
          const house10 = astro.houses?.find((h: { number: number }) => h.number === 10);
          const mcLon = house10?.longitude ?? astro.midheaven;
          if (mcLon !== undefined) {
            const transitData = calculateTargetTransits({ targetLon: mcLon, targetName: 'MC(中天)', trackPlanets: ['木星', '土星', '冥王星', '天王星'], latitude: profile.latitude, longitude: profile.longitude });
            extraContext = `\n\n## 未来5年行运触发MC(中天)时间表\n\nMC（中天/第十宫宫头）位于 ${lonToSign(mcLon)}\n\n${transitData}\n\n请根据以上行运数据，挑选4-5个最重要的事业节点。`;
          }
        } else if (type === 'emotion') {
          // 感情报告：追踪土星/木星/金星/冥王星触发本命月亮
          const natalMoon = astro.planets?.find((p: { name: string }) => p.name === '月亮');
          if (natalMoon) {
            const transitData = calculateTargetTransits({ targetLon: natalMoon.longitude, targetName: '本命月亮', trackPlanets: ['土星', '木星', '金星', '冥王星'], latitude: profile.latitude, longitude: profile.longitude });
            extraContext = `\n\n## 未来5年行运触发本命月亮时间表\n\n本命月亮位于 ${lonToSign(natalMoon.longitude)}\n\n${transitData}\n\n请根据以上行运数据，挑选4-5个重要的情感节点。`;
          }
        } else if (type === 'health') {
          // 健康报告：追踪土星/火星/海王星/冥王星触发上升点(ASC)
          const house1 = astro.houses?.find((h: { number: number }) => h.number === 1);
          const ascLon = house1?.longitude ?? astro.ascendant;
          if (ascLon !== undefined) {
            const transitData = calculateTargetTransits({ targetLon: ascLon, targetName: '上升点(ASC)', trackPlanets: ['土星', '火星', '海王星', '冥王星'], latitude: profile.latitude, longitude: profile.longitude });
            extraContext = `\n\n## 未来5年行运触发上升点(ASC)时间表\n\n上升点（ASC）位于 ${lonToSign(ascLon)}\n\n${transitData}\n\n请根据以上行运数据，挑选4-5个需要特别关注健康的时段。`;
          }
        }
      }
    } catch { /* 计算失败不影响报告生成 */ }

    // 将星盘数据格式化为结构化文本
    const formattedData = formatChartDataForAI(chartData);

    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: `${systemPrompt}\n\n${formattedData}${extraContext}\n\n**重要提醒**：\n- AI 绝不自行计算或修改排盘数据，只基于上述数据进行解读\n- 分析时必须引用上方提供的具体数据（精确到度数、宫位、相位容许度），禁止泛泛而谈\n- 注意行星的庙旺陷落状态，这影响行星能量的发挥\n- 注意宫主星的落宫位置，这揭示该宫事务在哪个领域展开\n- 注意和谐相位与紧张相位的对比，两者构成人生的助力与课题\n- 只使用西洋占星学体系进行分析，不涉及八字、紫微斗数等东方命理`,
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
