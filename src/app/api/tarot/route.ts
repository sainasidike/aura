import { NextRequest } from 'next/server';
import { streamChat, type ZhipuMessage } from '@/lib/ai/zhipu';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return Response.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 });
    }

    const body = await request.json();
    const { question, cards, spread, mode } = body as {
      question: string;
      cards: { name: string; nameEn: string; position: string; positionMeaning: string; isReversed: boolean; upright: string; reversed: string; uprightDesc: string; reversedDesc: string }[];
      spread: { name: string; description: string };
      mode?: 'daily_fortune' | 'full';
    };

    if (!question || !cards || !spread) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 构建牌面信息
    const cardsInfo = cards.map((c, i) => {
      const orientation = c.isReversed ? '逆位' : '正位';
      const desc = c.isReversed ? c.reversedDesc : c.uprightDesc;
      const keywords = c.isReversed ? c.reversed : c.upright;
      return `第${i + 1}张：${c.name}（${c.nameEn}）- ${orientation}\n位置：${c.position}（${c.positionMeaning}）\n关键词：${keywords}\n基本含义：${desc}`;
    }).join('\n\n');

    let systemPrompt: string;

    if (mode === 'daily_fortune') {
      // 今日运势塔罗 — 纯文本输出，流式友好
      systemPrompt = `你是一位温暖且有洞察力的塔罗解读师。

牌面信息：
${cardsInfo}

请为用户解读今日运势指引，要求：
- 全文使用纯文本，禁止使用任何 Markdown 格式（禁止 #、##、**、*、-、数字编号列表等）
- 用自然段落书写，段落之间空一行
- 语气温暖亲切，像朋友聊天一样自然
- 内容结构：先说这张牌的核心寓意（2-3句），再分析对今天各方面的影响（事业、感情、人际、心态），最后给一句简短的今日箴言
- 如果是逆位，要说明逆位带来的特殊提示
- 总字数 200-350 字，简洁有力
- 结尾加一句"仅供参考和娱乐"`;
    } else {
      // 完整塔罗占卜 — 原有格式
      systemPrompt = `你是一位经验丰富且极具洞察力的塔罗牌解读师。你深谙韦特塔罗牌的象征意义，善于将牌面信息与求问者的具体问题结合，给出准确、深入且富有启发性的解读。

你的解读风格：
- 神秘而温暖，既有专业深度又平易近人
- 注重牌面之间的联系和互动
- 结合求问者的具体问题给出有针对性的分析
- 语言优美，带有适度的诗意和象征性
- 最终给出积极正面的指引和建议

当前占卜信息：

求问者的问题：${question}

使用牌阵：${spread.name} — ${spread.description}

抽出的牌面：

${cardsInfo}

解读要求：

请按照以下结构进行详细解读：

1. 开篇总述（2-3句话）：简要概括这次占卜的整体基调和主要信息。

2. 逐牌解读：对每张牌进行详细解读，必须：
   - 说明这张牌在当前位置（${cards.map(c => c.position).join('、')}）的特殊含义
   - 结合求问者的问题「${question}」进行针对性分析
   - 如果是逆位，特别说明逆位的影响
   - 每张牌的解读约100-150字

3. 牌面互动分析（如果有多张牌）：分析牌面之间的关系和呼应，揭示更深层的信息。

4. 综合建议：基于整体牌面，给出具体可行的行动建议。

5. 结语祝福：用温暖正能量的话语结束。

请使用中文回答，保持专业性的同时通俗易懂。每张牌的解读要结合问题深入分析，不要泛泛而谈。全文使用纯文本，禁止 Markdown 格式（禁止 #、##、**、*、编号列表等）。`;
    }

    const messages: ZhipuMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请对我的占卜进行详细解读。我的问题是：${question}` },
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
          const msg = error instanceof Error ? error.message : '解读生成失败';
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
