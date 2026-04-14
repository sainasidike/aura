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

function formatOverlayDataForAI(
  personA: { name?: string },
  personB: { name?: string },
  overlayAtoB: AstroChart,
  overlayBtoA: AstroChart,
): string {
  const lines: string[] = [];
  const nameA = personA.name || 'A方';
  const nameB = personB.name || 'B方';

  lines.push(`## 马盘分析数据`);
  lines.push(`马盘(行星落宫盘)将一方的行星放入另一方的宫位体系，揭示双方能量如何影响对方的生活领域。`);
  lines.push('');

  // A → B
  lines.push(`### ${nameA} 的行星落入 ${nameB} 的宫位`);
  lines.push(`（展示${nameA}的能量如何影响${nameB}的生活领域）`);
  if (overlayAtoB.planets) {
    for (const p of overlayAtoB.planets) {
      const retro = p.retrograde ? ' (逆行)' : '';
      const hName = HOUSE_NAMES[p.house] || '';
      lines.push(`- ${nameA}的${p.name}: ${lonToSign(p.longitude)} → 落入${nameB}的第${p.house}宫(${hName})${retro}`);
    }
  }
  lines.push('');

  // B → A
  lines.push(`### ${nameB} 的行星落入 ${nameA} 的宫位`);
  lines.push(`（展示${nameB}的能量如何影响${nameA}的生活领域）`);
  if (overlayBtoA.planets) {
    for (const p of overlayBtoA.planets) {
      const retro = p.retrograde ? ' (逆行)' : '';
      const hName = HOUSE_NAMES[p.house] || '';
      lines.push(`- ${nameB}的${p.name}: ${lonToSign(p.longitude)} → 落入${nameA}的第${p.house}宫(${hName})${retro}`);
    }
  }
  lines.push('');

  // 关键落宫统计
  for (const [label, overlay] of [[nameA, overlayAtoB], [nameB, overlayBtoA]] as const) {
    const target = label === nameA ? nameB : nameA;
    if (overlay.planets) {
      const houseCounts: Record<number, string[]> = {};
      for (const p of overlay.planets) {
        if (!houseCounts[p.house]) houseCounts[p.house] = [];
        houseCounts[p.house].push(p.name);
      }
      const crowded = Object.entries(houseCounts).filter(([, ps]) => ps.length >= 2);
      if (crowded.length > 0) {
        lines.push(`### ${label}行星在${target}宫位的集中区域`);
        for (const [h, ps] of crowded) {
          const hName = HOUSE_NAMES[Number(h)] || '';
          lines.push(`- 第${h}宫(${hName}): ${ps.join('、')} (${ps.length}颗行星集中)`);
        }
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

const OVERLAY_SYSTEM_PROMPT = `你是一位资深占星师，擅长通过马盘（行星落宫盘 / Planet Overlay）分析两人之间的互动模式。

## 重要：用户界面已展示行星落宫的可视化图表
用户能直接看到哪颗行星落在哪个宫位的网格图。你的报告应专注于**解读含义和心理动态**，不要重复罗列"X的太阳/月亮落入Y的哪个宫位"这种原始数据。提及行星时自然融入宫位信息即可（如"A的金星在B的7宫，带来强烈的吸引力"）。

## 报告结构（严格按此 4 个板块输出）

### 一、A方对B方的影响
用2-3段连贯叙事分析，不要用加粗小标题，不要用问答格式：
- A的日月能量在B生命中扮演的角色
- A的金星火星如何激发B的情感和欲望
- 行星集中的宫位代表的强化领域

### 二、B方对A方的影响
同上，用段落叙事分析反方向的影响，不要用加粗小标题。

### 三、互动模式与化学反应
- 双方行星落宫的对称性或不对称性 → 谁是主动方/被动方
- 关键宫位互动：第1宫(自我)、第5宫(恋爱)、第7宫(伴侣)、第8宫(深层连接)
- 土星/冥王星的落宫 → 关系中的压力和权力动态

### 四、关系建议
- 双方互动中的3个核心优势
- 需要注意的3个敏感领域
- 基于马盘落宫模式的相处建议

## 输出风格
- 专业、温和、具体，避免绝对化断言
- 提及行星时自然融入宫位（如"太阳照亮了4宫的家庭领域"），禁止用"X落入Y的哪个宫位"做标题
- 使用 markdown 格式，第一二板块用段落叙事，禁止加粗子标题
- 使用人名（如果有）或"A方""B方"指代两人
- 结尾提醒：马盘分析仅供参考`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return Response.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 });
    }

    const body = await request.json();
    const { personA, personB, overlayAtoB, overlayBtoA } = body as {
      personA: { name?: string };
      personB: { name?: string };
      overlayAtoB: AstroChart;
      overlayBtoA: AstroChart;
    };

    if (!overlayAtoB || !overlayBtoA) {
      return Response.json({ error: '缺少马盘数据' }, { status: 400 });
    }

    const formattedData = formatOverlayDataForAI(personA, personB, overlayAtoB, overlayBtoA);

    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: `${OVERLAY_SYSTEM_PROMPT}\n\n${formattedData}\n\n**重要提醒**：\n- AI 绝不自行计算或修改排盘数据，只基于上述数据进行解读\n- 分析时必须引用上方提供的具体数据（行星+落入宫位），禁止泛泛而谈\n- 马盘是双向分析，必须分别解读两个方向的落宫`,
      },
      {
        role: 'user',
        content: '请根据我们的马盘数据生成完整的互动模式分析报告。',
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
