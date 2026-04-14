import { NextRequest } from 'next/server';
import { streamChat, type ZhipuMessage } from '@/lib/ai/zhipu';

const REPORT_LABELS: Record<string, string> = {
  synastry: '合盘配对报告',
  composite: '组合盘报告',
  davison: '时空中点盘报告',
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

    const label = REPORT_LABELS[reportType] || '配对报告';

    const systemPrompt = `你是占星师，基于下方${label}和星盘数据回答追问。引用具体数据（度数、宫位、相位），200-400字，markdown格式。

## 报告
${reportContent}

## 星盘数据
${JSON.stringify(chartData)}

每个回答末尾附：
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
