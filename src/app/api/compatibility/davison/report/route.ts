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

function formatDavisonDataForAI(
  personA: { name?: string },
  personB: { name?: string },
  davison: AstroChart,
  midpointDate: string,
): string {
  const lines: string[] = [];
  const nameA = personA.name || 'A方';
  const nameB = personB.name || 'B方';

  lines.push(`## 时空中点盘数据（${nameA} & ${nameB}）`);
  lines.push(`时空中点盘取两人出生时间和地点的中点，以此作为真实的出生数据进行排盘。`);
  lines.push(`中点时间: ${midpointDate}`);
  lines.push('');

  if (davison.planets) {
    lines.push('### 时空中点盘行星位置');
    for (const p of davison.planets) {
      const retro = p.retrograde ? ' (逆行)' : '';
      const hName = HOUSE_NAMES[p.house] || '';
      lines.push(`- ${p.name}: ${lonToSign(p.longitude)} ${p.sign}座 第${p.house}宫(${hName})${retro}`);
    }
    lines.push('');
  }

  if (davison.houses) {
    lines.push('### 时空中点盘宫位');
    for (const h of davison.houses) {
      const hName = HOUSE_NAMES[h.number] || '';
      lines.push(`- 第${h.number}宫(${hName}): ${lonToSign(h.longitude)} ${h.sign}座`);
    }
    lines.push('');
  }

  if (davison.aspects && davison.aspects.length > 0) {
    const sorted = [...davison.aspects].sort((a, b) => a.orb - b.orb);
    lines.push('### 时空中点盘相位（按容许度排序）');
    for (const a of sorted) {
      lines.push(`- ${a.planet1} ${a.type} ${a.planet2} (容许度${a.orb}\u00b0)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

const DAVISON_SYSTEM_PROMPT = `你是一位资深占星师，擅长通过时空中点盘（Davison Chart）分析两人关系的先天命运特质。时空中点盘取两人出生时间和地点的精确中点，形成一张真实的星盘，代表这段关系"诞生"的时刻。

## 报告结构（严格按此 4 个板块输出）

### 一、关系的先天特质
- 时空中点盘太阳的星座和宫位 → 这段关系的先天使命和核心能量
- 时空中点盘月亮 → 关系的情感根基和直觉模式
- 上升点 → 关系给外界的第一印象
- 引用具体的时空中点盘数据

### 二、核心课题与成长方向
- 土星的位置和相位 → 关系中必须面对的功课
- 北交点的位置 → 关系的灵魂成长方向
- 木星的位置 → 关系中的恩赐和扩展领域
- 引用具体的相位和容许度

### 三、压力区域与转化潜力
- 火星的位置和相位 → 冲突来源和能量释放方式
- 外行星（天王星/海王星/冥王星）→ 深层转化动力
- 紧张相位 → 需要有意识地处理的议题
- 引用具体的数据

### 四、关系发展建议
- 这段关系最深层的3个命运主题
- 需要有意识觉察的3个盲区
- 基于时空中点盘的关系经营方向

## 输出风格
- 专业、温和、富有灵性深度，使用"命运层面"、"灵魂层面"等措辞
- 每个板块必须引用具体的时空中点盘数据（星座、宫位、相位、度数），不可泛泛而谈
- 使用 markdown 格式，结构清晰
- 时空中点盘的解读侧重"关系的先天模式"和"命运层面的课题"
- 结尾提醒：时空中点盘分析仅供参考，命运赋予的潜力需要双方用心激活`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return Response.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 });
    }

    const body = await request.json();
    const { personA, personB, davison, midpointDate } = body as {
      personA: { name?: string };
      personB: { name?: string };
      davison: AstroChart;
      midpointDate: string;
    };

    if (!davison) {
      return Response.json({ error: '缺少时空中点盘数据' }, { status: 400 });
    }

    const formattedData = formatDavisonDataForAI(personA, personB, davison, midpointDate);

    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: `${DAVISON_SYSTEM_PROMPT}\n\n${formattedData}\n\n**重要提醒**：\n- AI 绝不自行计算或修改排盘数据，只基于上述数据进行解读\n- 分析时必须引用上方提供的具体数据（精确到度数、相位容许度），禁止泛泛而谈\n- 时空中点盘是真实星盘，不是数学中点，解读方式与本命盘一致但视角聚焦于关系`,
      },
      {
        role: 'user',
        content: '请根据我们的时空中点盘数据生成完整的关系命运分析报告。',
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
