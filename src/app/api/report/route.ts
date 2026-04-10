import { NextRequest } from 'next/server';
import { streamChat, type ZhipuMessage } from '@/lib/ai/zhipu';

const REPORT_PROMPTS: Record<string, string> = {
  love: `你是一位资深的命理情感分析师，精通西洋占星、八字合婚和紫微斗数的感情宫位分析。

请根据用户的星盘数据，撰写一份详细的「正缘报告」。分析内容包括：

1. **感情模式分析** — 金星、月亮的星座和宫位揭示的恋爱风格
2. **理想伴侣画像** — 第七宫（婚姻宫）宫头星座及宫内行星暗示的伴侣特质
3. **桃花运势** — 金星相位、第五宫情况分析近期感情机遇
4. **正缘时间窗口** — 基于行运推测感情高峰期
5. **感情建议** — 针对个人星盘特点的具体建议

语言温和积极，结构清晰，使用 markdown 格式。结尾提醒命理仅供参考。`,

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

    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: `${systemPrompt}\n\n## 用户星盘数据\n\`\`\`json\n${JSON.stringify(chartData, null, 2)}\n\`\`\`\n\nAI 绝不自行计算或修改排盘数据，只基于上述数据进行解读。`,
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
