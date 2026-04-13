import { NextRequest } from 'next/server';
import { streamChat, type ZhipuMessage } from '@/lib/ai/zhipu';
import { calculateChartFromDate } from '@/lib/engines/astrology';

const SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];
function lonToSign(lon: number) {
  const n = ((lon % 360) + 360) % 360;
  const si = Math.floor(n / 30);
  return `${SIGNS[si]}${Math.floor(n - si * 30)}°`;
}

/**
 * 计算未来 5 年行运木星、土星对第七宫/下降点的相位触发窗口
 */
function calculateFutureTransits(
  descendantLon: number,
  latitude: number,
  longitude: number,
): string {
  const now = new Date();
  const results: string[] = [];

  // 每月采样一次，追踪木星和土星
  for (let m = 0; m < 60; m++) {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() + m, 15));
    const chart = calculateChartFromDate(date, latitude, longitude);
    const jupiter = chart.planets.find(p => p.name === '木星');
    const saturn = chart.planets.find(p => p.name === '土星');
    const venus = chart.planets.find(p => p.name === '金星');
    const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月`;

    for (const [name, planet] of [['木星', jupiter], ['土星', saturn], ['金星', venus]] as const) {
      if (!planet) continue;
      let diff = Math.abs(planet.longitude - descendantLon);
      if (diff > 180) diff = 360 - diff;
      // 合相(0° ±6°)、六合(60° ±4°)、三合(120° ±5°)
      if (diff <= 6) results.push(`${dateStr}: ${name}(${lonToSign(planet.longitude)}) 合相 下降点(${lonToSign(descendantLon)}) 容许度${diff.toFixed(1)}°`);
      else if (Math.abs(diff - 60) <= 4) results.push(`${dateStr}: ${name}(${lonToSign(planet.longitude)}) 六合 下降点 容许度${Math.abs(diff - 60).toFixed(1)}°`);
      else if (Math.abs(diff - 120) <= 5) results.push(`${dateStr}: ${name}(${lonToSign(planet.longitude)}) 三合 下降点 容许度${Math.abs(diff - 120).toFixed(1)}°`);
    }
  }

  // 去重（连续月份的同一相位只保留起止）
  if (results.length === 0) return '未来5年内无显著木星/土星触发第七宫的相位。';
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

  career: `你是一位资深的命理职业分析师，精通西洋占星和八字的事业分析。

请根据用户的星盘数据，撰写一份详细的「事业报告」。分析内容包括：

1. **职业天赋** — MC（中天）星座和第十宫行星揭示的事业方向
2. **工作风格** — 第六宫、水星位置分析的工作习惯
3. **财运格局** — 第二宫（正财）和第八宫（偏财）分析
4. **事业发展周期** — 土星、木星行运对事业的影响
5. **职业建议** — 最适合的行业方向和发展策略

语言专业务实，结构清晰，使用 markdown 格式。结尾提醒命理仅供参考。`,

  emotion: `你是一位资深的命理心理分析师，擅长通过星盘解读内心世界。

请根据用户的星盘数据，撰写一份详细的「感情分析报告」。分析内容包括：

1. **情感特质** — 月亮星座和宫位揭示的内在情感需求
2. **安全感来源** — 第四宫和月亮相位分析
3. **人际关系模式** — 金星、第七宫、第十一宫分析
4. **情绪管理** — 水元素和月亮相位分析情绪特点
5. **成长建议** — 针对情感课题的自我提升方向

语言温暖细腻，结构清晰，使用 markdown 格式。结尾提醒命理仅供参考。`,

  health: `你是一位擅长医学占星的命理健康分析师。

请根据用户的星盘数据，撰写一份「健康趋势报告」。分析内容包括：

1. **体质特征** — 上升星座和第一宫分析先天体质倾向
2. **易感部位** — 各行星落座对应的身体区域关注点
3. **精力节奏** — 火星、太阳位置分析精力和体能模式
4. **心理健康** — 月亮、海王星相位分析心理健康倾向
5. **养生建议** — 基于五行和星盘的生活习惯建议

语言关怀务实，结构清晰，使用 markdown 格式。强调仅供参考，不替代专业医疗诊断。`,
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

    // 为正缘报告计算未来行运触发数据
    let extraContext = '';
    if (type === 'love') {
      try {
        const astro = chartData.astrology as { houses?: { number: number; longitude: number }[]; planets?: { name: string; sign: string; degree: number; house: number; longitude: number; retrograde: boolean }[]; aspects?: { planet1: string; planet2: string; type: string; orb: number }[] };
        const profile = chartData.profile as { longitude?: number; latitude?: number };
        const house7 = astro.houses?.find((h: { number: number }) => h.number === 7);
        if (house7 && profile.latitude && profile.longitude) {
          const transitData = calculateFutureTransits(house7.longitude, profile.latitude, profile.longitude);
          extraContext = `\n\n## 未来5年行运触发第七宫/下降点时间表\n\n下降点（第七宫宫头）位于 ${lonToSign(house7.longitude)}\n\n${transitData}\n\n请根据以上行运数据，挑选3个最有利的相遇时间窗口。`;
        }
      } catch { /* 计算失败不影响报告生成 */ }
    }

    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: `${systemPrompt}\n\n## 用户星盘数据\n\`\`\`json\n${JSON.stringify(chartData, null, 2)}\n\`\`\`${extraContext}\n\nAI 绝不自行计算或修改排盘数据，只基于上述数据进行解读。`,
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
