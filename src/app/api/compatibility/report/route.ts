import { NextRequest } from 'next/server';
import { streamChat, type ZhipuMessage } from '@/lib/ai/zhipu';

const SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];
function lonToSign(lon: number) {
  const n = ((lon % 360) + 360) % 360;
  const si = Math.floor(n / 30);
  const deg = Math.floor(n - si * 30);
  const min = Math.floor(((n - si * 30) - deg) * 60);
  return `${SIGNS[si]}${deg}\u00b0${min}'`;
}

const SIGN_ELEMENT: Record<string, string> = {
  '白羊': '火', '金牛': '土', '双子': '风', '巨蟹': '水',
  '狮子': '火', '处女': '土', '天秤': '风', '天蝎': '水',
  '射手': '火', '摩羯': '土', '水瓶': '风', '双鱼': '水',
};

const HOUSE_NAMES: Record<number, string> = {
  1: '命宫', 2: '财帛宫', 3: '兄弟宫', 4: '田宅宫',
  5: '子女宫', 6: '奴仆宫', 7: '夫妻宫', 8: '疾厄宫',
  9: '迁移宫', 10: '官禄宫', 11: '福德宫', 12: '玄秘宫',
};

type AstroData = {
  houses?: { number: number; sign: string; degree: number; minute: number; longitude: number }[];
  planets?: { name: string; sign: string; degree: number; minute?: number; house: number; longitude: number; retrograde: boolean }[];
  aspects?: { planet1: string; planet2: string; type: string; orb: number; angle?: number }[];
  ascendant?: number;
  midheaven?: number;
};

type BaziData = {
  fourPillars?: { year: { ganZhi: string }; month: { ganZhi: string }; day: { gan: string; ganZhi: string }; time: { ganZhi: string } };
  wuxing?: { year: string; month: string; day: string; time: string };
  shengXiao?: string;
};

type CrossAspect = { planet1: string; planet2: string; type: string; orb: number };

interface PersonProfile {
  name?: string;
  gender?: string;
  year?: number;
  month?: number;
  day?: number;
}

interface CompatibilityData {
  overall: number;
  categories: Record<string, { score: number; aspects: CrossAspect[] }>;
  chartA: AstroData;
  chartB: AstroData;
  crossAspectsAtoB: CrossAspect[];
  crossAspectsBtoA: CrossAspect[];
  baziA: BaziData;
  baziB: BaziData;
}

function formatCompatibilityDataForAI(
  personA: PersonProfile,
  personB: PersonProfile,
  data: CompatibilityData,
): string {
  const lines: string[] = [];

  // Person A info
  lines.push('## A方基本信息');
  if (personA.name) lines.push(`姓名: ${personA.name}`);
  if (personA.gender) lines.push(`性别: ${personA.gender}`);
  if (personA.year && personA.month && personA.day) lines.push(`出生日期: ${personA.year}-${personA.month}-${personA.day}`);
  lines.push('');

  // Person B info
  lines.push('## B方基本信息');
  if (personB.name) lines.push(`姓名: ${personB.name}`);
  if (personB.gender) lines.push(`性别: ${personB.gender}`);
  if (personB.year && personB.month && personB.day) lines.push(`出生日期: ${personB.year}-${personB.month}-${personB.day}`);
  lines.push('');

  // Compatibility scores
  lines.push('## 配对得分');
  lines.push(`综合得分: ${data.overall}/100`);
  const categoryNames: Record<string, string> = {
    love_chemistry: '恋爱火花',
    emotional_sync: '情感共鸣',
    communication: '沟通默契',
    long_term: '长期稳定',
    growth: '共同成长',
  };
  for (const [key, label] of Object.entries(categoryNames)) {
    const cat = data.categories[key];
    if (cat) lines.push(`${label}: ${cat.score}/100`);
  }
  lines.push('');

  // Chart A - planets
  const astroA = data.chartA;
  if (astroA?.planets) {
    lines.push('## A方星盘行星位置');
    for (const p of astroA.planets) {
      const retro = p.retrograde ? ' (逆行)' : '';
      const hName = HOUSE_NAMES[p.house] || '';
      lines.push(`- ${p.name}: ${lonToSign(p.longitude)} ${p.sign}座 第${p.house}宫(${hName})${retro}`);
    }
    // Element distribution
    const elCount: Record<string, number> = { '火': 0, '土': 0, '风': 0, '水': 0 };
    for (const p of astroA.planets) {
      if (p.name === '北交点') continue;
      const el = SIGN_ELEMENT[p.sign];
      if (el) elCount[el]++;
    }
    lines.push(`元素分布: 火${elCount['火']} 土${elCount['土']} 风${elCount['风']} 水${elCount['水']}`);
    // ASC/MC
    if (astroA.houses) {
      const h1A = astroA.houses.find(h => h.number === 1);
      const h10A = astroA.houses.find(h => h.number === 10);
      if (h1A) lines.push(`上升点: ${lonToSign(h1A.longitude)} ${h1A.sign}座`);
      if (h10A) lines.push(`中天: ${lonToSign(h10A.longitude)} ${h10A.sign}座`);
    }
    lines.push('');
  }

  // Chart B - planets
  const astroB = data.chartB;
  if (astroB?.planets) {
    lines.push('## B方星盘行星位置');
    for (const p of astroB.planets) {
      const retro = p.retrograde ? ' (逆行)' : '';
      const hName = HOUSE_NAMES[p.house] || '';
      lines.push(`- ${p.name}: ${lonToSign(p.longitude)} ${p.sign}座 第${p.house}宫(${hName})${retro}`);
    }
    const elCount: Record<string, number> = { '火': 0, '土': 0, '风': 0, '水': 0 };
    for (const p of astroB.planets) {
      if (p.name === '北交点') continue;
      const el = SIGN_ELEMENT[p.sign];
      if (el) elCount[el]++;
    }
    lines.push(`元素分布: 火${elCount['火']} 土${elCount['土']} 风${elCount['风']} 水${elCount['水']}`);
    if (astroB.houses) {
      const h1B = astroB.houses.find(h => h.number === 1);
      const h10B = astroB.houses.find(h => h.number === 10);
      if (h1B) lines.push(`上升点: ${lonToSign(h1B.longitude)} ${h1B.sign}座`);
      if (h10B) lines.push(`中天: ${lonToSign(h10B.longitude)} ${h10B.sign}座`);
    }
    lines.push('');
  }

  // Cross aspects A->B
  if (data.crossAspectsAtoB.length > 0) {
    const sorted = [...data.crossAspectsAtoB].sort((a, b) => a.orb - b.orb);
    lines.push('## A方行星 → B方行星 交叉相位（按容许度排序）');
    for (const a of sorted) {
      lines.push(`- ${a.planet1} ${a.type} ${a.planet2} (容许度${a.orb}\u00b0)`);
    }
    lines.push('');
  }

  // Cross aspects B->A
  if (data.crossAspectsBtoA.length > 0) {
    const sorted = [...data.crossAspectsBtoA].sort((a, b) => a.orb - b.orb);
    lines.push('## B方行星 → A方行星 交叉相位（按容许度排序）');
    for (const a of sorted) {
      lines.push(`- ${a.planet1} ${a.type} ${a.planet2} (容许度${a.orb}\u00b0)`);
    }
    lines.push('');
  }

  // Bazi comparison
  const baziA = data.baziA;
  const baziB = data.baziB;
  if (baziA?.fourPillars && baziB?.fourPillars) {
    lines.push('## 八字对比');
    lines.push(`A方四柱: ${baziA.fourPillars.year.ganZhi} ${baziA.fourPillars.month.ganZhi} ${baziA.fourPillars.day.ganZhi} ${baziA.fourPillars.time.ganZhi}`);
    lines.push(`A方日主: ${baziA.fourPillars.day.gan}`);
    if (baziA.shengXiao) lines.push(`A方生肖: ${baziA.shengXiao}`);
    lines.push(`B方四柱: ${baziB.fourPillars.year.ganZhi} ${baziB.fourPillars.month.ganZhi} ${baziB.fourPillars.day.ganZhi} ${baziB.fourPillars.time.ganZhi}`);
    lines.push(`B方日主: ${baziB.fourPillars.day.gan}`);
    if (baziB.shengXiao) lines.push(`B方生肖: ${baziB.shengXiao}`);
    if (baziA.wuxing && baziB.wuxing) {
      lines.push(`A方五行: ${baziA.wuxing.year} ${baziA.wuxing.month} ${baziA.wuxing.day} ${baziA.wuxing.time}`);
      lines.push(`B方五行: ${baziB.wuxing.year} ${baziB.wuxing.month} ${baziB.wuxing.day} ${baziB.wuxing.time}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

const COMPATIBILITY_SYSTEM_PROMPT = `你是一位资深占星师和命理分析师，擅长通过双人星盘交叉相位分析两人的配对关系。请根据提供的两人星盘数据和交叉相位，生成一份详细的「配对报告」。

## 报告结构（严格按此 5 个板块输出）

### 一、双方核心能量对比
- A 的太阳/月亮/上升 vs B 的太阳/月亮/上升
- 元素分布对比（火/土/风/水），分析互补性或冲突性
- 引用具体的星盘数据说明

### 二、情感连接与吸引力
- A 的金星与 B 行星的交叉相位 → 谁主动表达爱
- B 的金星与 A 行星的交叉相位 → 谁主动回应
- 月亮之间的相位 → 情绪共鸣度
- 金星-火星交叉相位 → 化学反应和吸引力
- 引用具体的交叉相位和容许度

### 三、沟通与日常相处
- 水星交叉相位 → 思维方式的契合度，日常交流是否顺畅
- 火星交叉相位 → 冲突模式，争吵的导火索和化解方式
- 引用具体的交叉相位数据

### 四、长期稳定性
- 土星交叉相位 → 责任感与承诺意识
- 冥王星/天王星交叉相位 → 深层的权力动态和变革议题
- 北交点互动 → 两人在灵魂层面的成长方向是否一致
- 八字日主配合分析 → 五行互补性
- 引用具体的数据

### 五、关系建议
- 最大的3个优势（具体说明来自哪些相位）
- 需要注意的3个课题（具体说明来自哪些相位）
- 相处建议（基于双方星盘特质的个性化建议）

## 输出风格
- 专业、温和、鼓励性语气，使用"可能"、"倾向"、"建议关注"等措辞，避免绝对化断言
- 每个板块的分析必须引用具体的星盘数据（星座、宫位、相位、度数），不可泛泛而谈或编造数据
- 使用 markdown 格式，结构清晰
- 配对分析用"A方"和"B方"指代两人（如果有名字则使用名字）
- 结尾提醒：占星配对分析仅供参考和自我认知，真正的感情需要双方在现实中用心经营`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return Response.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 });
    }

    const body = await request.json();
    const { personA, personB, compatibilityData } = body as {
      personA: PersonProfile;
      personB: PersonProfile;
      compatibilityData: CompatibilityData;
    };

    if (!personA || !personB || !compatibilityData) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const formattedData = formatCompatibilityDataForAI(personA, personB, compatibilityData);

    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: `${COMPATIBILITY_SYSTEM_PROMPT}\n\n${formattedData}\n\n**重要提醒**：\n- AI 绝不自行计算或修改排盘数据，只基于上述数据进行解读\n- 分析时必须引用上方提供的具体数据（精确到度数、相位容许度），禁止泛泛而谈\n- 注意交叉相位的容许度，越小影响越强\n- 注意和谐相位（合相、三合、六合）与紧张相位（四分、对冲）的平衡\n- 结合八字信息做辅助判断`,
      },
      {
        role: 'user',
        content: '请根据我们两人的星盘数据生成完整的配对分析报告。',
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
