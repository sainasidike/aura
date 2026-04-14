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

type Planet = { name: string; sign: string; degree: number; minute?: number; house: number; longitude: number; retrograde: boolean };
type House = { number: number; sign: string; degree: number; minute: number; longitude: number };
type Aspect = { planet1: string; planet2: string; type: string; orb: number };
type AstroChart = { planets?: Planet[]; houses?: House[]; aspects?: Aspect[]; ascendant?: number; midheaven?: number };

const HOUSE_NAMES: Record<number, string> = {
  1: '命宫', 2: '财帛宫', 3: '兄弟宫', 4: '田宅宫',
  5: '子女宫', 6: '奴仆宫', 7: '夫妻宫', 8: '疾厄宫',
  9: '迁移宫', 10: '官禄宫', 11: '福德宫', 12: '玄秘宫',
};

function formatCompositeDataForAI(
  personA: { name?: string },
  personB: { name?: string },
  composite: AstroChart,
  chartA: AstroChart,
  chartB: AstroChart,
): string {
  const lines: string[] = [];
  const nameA = personA.name || 'A方';
  const nameB = personB.name || 'B方';

  lines.push(`## 组合盘数据（${nameA} & ${nameB}）`);
  lines.push('组合盘取两人行星位置的短弧中点，反映关系本身的能量特质。');
  lines.push('');

  if (composite.planets) {
    lines.push('### 组合盘行星位置');
    for (const p of composite.planets) {
      const hName = HOUSE_NAMES[p.house] || '';
      lines.push(`- ${p.name}: ${lonToSign(p.longitude)} ${p.sign}座 第${p.house}宫(${hName})`);
    }
    lines.push('');
  }

  if (composite.houses) {
    lines.push('### 组合盘宫位');
    for (const h of composite.houses) {
      const hName = HOUSE_NAMES[h.number] || '';
      lines.push(`- 第${h.number}宫(${hName}): ${lonToSign(h.longitude)} ${h.sign}座`);
    }
    lines.push('');
  }

  if (composite.aspects && composite.aspects.length > 0) {
    const sorted = [...composite.aspects].sort((a, b) => a.orb - b.orb);
    lines.push('### 组合盘内部相位（按容许度排序）');
    for (const a of sorted) {
      lines.push(`- ${a.planet1} ${a.type} ${a.planet2} (容许度${a.orb}\u00b0)`);
    }
    lines.push('');
  }

  // 简要列出双方太阳/月亮/上升作参考
  const keyPlanets = ['太阳', '月亮', '金星', '火星'];
  for (const [label, chart] of [['A方', chartA], ['B方', chartB]] as const) {
    if (chart.planets) {
      lines.push(`### ${label}关键行星（参考）`);
      for (const p of chart.planets.filter(p => keyPlanets.includes(p.name))) {
        lines.push(`- ${p.name}: ${lonToSign(p.longitude)} ${p.sign}座`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

const COMPOSITE_SYSTEM_PROMPT = `你是一位资深占星师，擅长通过组合盘（Composite Chart）分析两人关系的整体能量。组合盘是取两人行星位置的中点构成的虚拟星盘，代表"关系本身"作为一个独立实体的特质。

## 报告结构（严格按此 4 个板块输出）

### 一、关系核心身份
- 组合盘太阳的星座和宫位 → 这段关系的核心主题和目标
- 组合盘上升点 → 外界如何看待这段关系
- 组合盘月亮 → 关系的情感基调和安全感来源
- 引用具体的组合盘数据说明

### 二、情感表达与爱的方式
- 组合盘金星的星座和宫位 → 关系中表达爱的方式
- 组合盘火星 → 关系的动力和冲突模式
- 金星/火星与其他行星的相位 → 爱与激情的互动
- 引用具体的相位和容许度

### 三、阴影与挑战
- 组合盘土星 → 关系中的限制、责任和需要面对的课题
- 组合盘冥王星/天王星/海王星 → 深层权力动态、变革和幻觉
- 紧张相位（四分、对冲）→ 关系的成长痛点
- 引用具体的数据

### 四、关系建议
- 这段关系最突出的3个能量优势
- 需要警惕的3个潜在课题
- 基于组合盘特质的个性化经营建议

## 输出风格
- 专业、温和、鼓励性语气，避免绝对化断言
- 每个板块必须引用具体的组合盘数据（星座、宫位、相位、度数），不可泛泛而谈
- 使用 markdown 格式，结构清晰
- 使用"这段关系"、"你们之间"等措辞
- 结尾提醒：组合盘分析仅供参考，关系需要双方共同经营`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return Response.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 });
    }

    const body = await request.json();
    const { personA, personB, composite, chartA, chartB } = body as {
      personA: { name?: string };
      personB: { name?: string };
      composite: AstroChart;
      chartA: AstroChart;
      chartB: AstroChart;
    };

    if (!composite) {
      return Response.json({ error: '缺少组合盘数据' }, { status: 400 });
    }

    const formattedData = formatCompositeDataForAI(personA, personB, composite, chartA, chartB);

    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: `${COMPOSITE_SYSTEM_PROMPT}\n\n${formattedData}\n\n**重要提醒**：\n- AI 绝不自行计算或修改排盘数据，只基于上述数据进行解读\n- 分析时必须引用上方提供的具体数据（精确到度数、相位容许度），禁止泛泛而谈\n- 组合盘反映的是"关系本身"的特质，不是某一方的特质`,
      },
      {
        role: 'user',
        content: '请根据我们的组合盘数据生成完整的关系能量分析报告。',
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
      { status: 500 },
    );
  }
}
