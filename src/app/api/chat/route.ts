import { NextRequest } from 'next/server';
import { streamChat, buildSystemPrompt, type ZhipuMessage } from '@/lib/ai/zhipu';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return Response.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 });
    }

    const body = await request.json();
    const { messages, chartData, mode, analysisType } = body as {
      messages: ZhipuMessage[];
      chartData?: Record<string, unknown>;
      mode?: string;
      analysisType?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: '缺少 messages 参数' }, { status: 400 });
    }

    // 构建完整消息列表
    const fullMessages: ZhipuMessage[] = [];

    // 如果提供了排盘数据，添加系统 prompt
    if (chartData) {
      try {
        fullMessages.push({
          role: 'system',
          content: buildSystemPrompt(chartData, mode, analysisType),
        });
      } catch {
        // buildSystemPrompt 失败时仍继续，只是没有系统提示
      }
    }

    fullMessages.push(...messages);

    // 流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChat(fullMessages, apiKey)) {
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
