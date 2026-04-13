import { NextRequest } from 'next/server';
import { streamChat, type ZhipuMessage } from '@/lib/ai/zhipu';

const REPORT_LABELS: Record<string, string> = {
  love: '正缘报告',
  career: '事业报告',
  emotion: '感情报告',
  health: '健康报告',
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return Response.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 });
    }

    const body = await request.json();
    const { messages, reportContent, chartData, reportType } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      reportContent: string;
      chartData: Record<string, unknown>;
      reportType: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: '缺少 messages 参数' }, { status: 400 });
    }

    if (!reportContent) {
      return Response.json({ error: '缺少 reportContent 参数' }, { status: 400 });
    }

    if (!chartData) {
      return Response.json({ error: '缺少 chartData 参数' }, { status: 400 });
    }

    const label = REPORT_LABELS[reportType] || '报告';

    const systemPrompt = `你是一位资深占星师。你刚刚为用户生成了以下${label}。现在用户想针对报告内容进行追问。

## 你生成的报告
${reportContent}

## 用户的星盘原始数据
${JSON.stringify(chartData, null, 2)}

## 回答规则
- 基于上述报告和星盘数据精准回答用户的问题
- 必须引用具体的星盘数据（度数、宫位、相位、容许度）
- 如果用户问到报告中提到的概念，深入解释其占星学含义
- 如果用户问到报告未涉及的方面，也可以基于星盘数据补充分析
- 回答简洁精准，200-400字为宜
- 使用温和专业的语气
- 使用 markdown 格式
- 每个回答末尾附上2-3个推荐追问，格式为：

[推荐追问]
1. 问题一
2. 问题二
3. 问题三`;

    const zhipuMessages: ZhipuMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChat(zhipuMessages, apiKey)) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`),
            );
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          const msg = error instanceof Error ? error.message : '回答失败';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
          );
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
