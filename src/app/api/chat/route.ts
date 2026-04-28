import { NextRequest } from 'next/server';
import { streamChat, buildSystemPrompt, type ZhipuMessage } from '@/lib/ai/zhipu';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return Response.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 });
    }

    const body = await request.json();
    const { messages, chartData, mode, analysisType, questionIntent } = body as {
      messages: ZhipuMessage[];
      chartData?: Record<string, unknown>;
      mode?: string;
      analysisType?: string;
      questionIntent?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: '缺少 messages 参数' }, { status: 400 });
    }

    // 构建完整消息列表
    const fullMessages: ZhipuMessage[] = [];

    // 添加系统 prompt
    if (chartData) {
      try {
        fullMessages.push({
          role: 'system',
          content: buildSystemPrompt(chartData, mode, analysisType, questionIntent),
        });
      } catch (err) {
        console.error('[chat] buildSystemPrompt failed:', err);
        // 降级：至少告诉 AI 不要索要数据
        fullMessages.push({
          role: 'system',
          content: `你是专业西洋占星师。用户的排盘数据已提供但解析出错。请基于你的占星知识回答用户问题。绝对禁止说"请提供出生日期/时间/地点"。语气像一个阅盘无数的好朋友，直接、精准。结尾注明仅供参考和娱乐。`,
        });
      }
    } else {
      // 无排盘数据时也给基础 prompt，防止 AI 乱说
      fullMessages.push({
        role: 'system',
        content: `你是专业西洋占星师。用户还没有创建出生档案，排盘数据暂不可用。请引导用户先去创建出生档案（点击底部导航的"星盘"页面），然后再回来聊天。不要自己编造星盘分析。`,
      });
    }

    // 限制对话历史长度，防止 token 溢出（保留最近 20 条消息）
    const MAX_HISTORY = 20;
    const trimmed = messages.length > MAX_HISTORY ? messages.slice(-MAX_HISTORY) : messages;
    fullMessages.push(...trimmed);

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
