import { NextRequest } from 'next/server';
import { streamChat, type ZhipuMessage } from '@/lib/ai/zhipu';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return Response.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 });
    }

    const body = await request.json();
    const { messages, readingContent, cardsData, question: originalQuestion } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      readingContent: string;
      cardsData: Array<{ name: string; position: string; isReversed: boolean }>;
      question: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: '缺少 messages 参数' }, { status: 400 });
    }

    if (!readingContent) {
      return Response.json({ error: '缺少 readingContent 参数' }, { status: 400 });
    }

    const cardsDesc = cardsData
      ?.map(c => `${c.position}：${c.name}（${c.isReversed ? '逆位' : '正位'}）`)
      .join('、') || '';

    const systemPrompt = `你是一位经验丰富的塔罗牌解读师。你刚刚为用户完成了一次塔罗占卜解读，现在用户想针对解读内容进行追问。

## 占卜问题
${originalQuestion}

## 牌面
${cardsDesc}

## 你的解读
${readingContent}

## 回答规则
- 基于上述解读和牌面信息精准回答用户的追问
- 必须引用具体的牌面（牌名、正/逆位、位置）
- 如果用户问到解读中提到的概念，深入解释其塔罗学含义
- 如果用户问到解读未涉及的方面，也可以基于牌面补充分析
- 回答简洁精准，200-400字为宜
- 使用温暖而神秘的语气
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
