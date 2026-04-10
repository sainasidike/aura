import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateBazi } from '@/lib/engines/bazi';
import { calculateAstrology } from '@/lib/engines/astrology';
import { streamChat, type ZhipuMessage } from '@/lib/ai/zhipu';

/**
 * 运势 AI 解读 API（流式 SSE）
 * 基于排盘数据，按五个类别输出结构化解读
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) {
    return Response.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      year, month, day, hour, minute = 0,
      gender = '男', longitude, latitude,
      timezone = 'Asia/Shanghai',
      period = 'daily',
      targetDate,
    } = body;

    // 计算命盘
    const timeInfo = await standardizeTime(year, month, day, hour, minute, longitude, timezone);
    const baziChart = calculateBazi(timeInfo, year, month, day, gender);
    const natalChart = calculateAstrology(timeInfo, latitude ?? 39.9, longitude);

    // 行运盘
    const now = targetDate ? new Date(targetDate) : new Date();
    const transitTimeInfo = await standardizeTime(
      now.getFullYear(), now.getMonth() + 1, now.getDate(),
      now.getHours(), now.getMinutes(), longitude, timezone
    );
    const transitChart = calculateAstrology(transitTimeInfo, latitude ?? 39.9, longitude);

    const periodLabels: Record<string, string> = { daily: '今日', weekly: '本周', monthly: '本月', yearly: '今年' };
    const periodLabel = periodLabels[period] || '今日';

    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: `你是一位专业的命理分析师，精通八字和西洋占星。现在需要根据以下排盘数据，为用户生成${periodLabel}运势解读。

## 排盘数据

八字四柱：${baziChart.fourPillars.year.ganZhi} ${baziChart.fourPillars.month.ganZhi} ${baziChart.fourPillars.day.ganZhi} ${baziChart.fourPillars.time.ganZhi}
日主：${baziChart.fourPillars.day.gan}
五行：${baziChart.wuxing.year} ${baziChart.wuxing.month} ${baziChart.wuxing.day} ${baziChart.wuxing.time}

本命太阳：${natalChart.planets[0]?.sign} ${natalChart.planets[0]?.degree}°
本命月亮：${natalChart.planets[1]?.sign} ${natalChart.planets[1]?.degree}°
行运太阳：${transitChart.planets[0]?.sign} ${transitChart.planets[0]?.degree}°
行运月亮：${transitChart.planets[1]?.sign} ${transitChart.planets[1]?.degree}°

## 输出格式要求

请严格按以下格式输出，每个类别用标记分隔：

---LOVE---
（爱情运势解读，100-150字，包含具体建议）

---CAREER---
（事业运势解读，100-150字，包含具体建议）

---HEALTH---
（健康运势解读，100-150字，包含具体建议）

---STUDY---
（学习运势解读，100-150字，包含具体建议）

---SOCIAL---
（人际运势解读，100-150字，包含具体建议）

## 要求
- 每段开头用 📌 标注核心关键词
- 用 💡 标注积极建议
- 用 ⚠️ 标注需注意事项
- 用 - 标注要点列表
- 语气温和积极，避免绝对化判断
- 结合八字和占星双体系`,
      },
      {
        role: 'user',
        content: `请为我生成${periodLabel}运势解读。`,
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
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '解读失败' },
      { status: 500 }
    );
  }
}
