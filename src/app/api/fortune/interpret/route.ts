import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateBazi } from '@/lib/engines/bazi';
import { calculateAstrology, findSolarReturn, findLunarReturn, calculateCrossAspects } from '@/lib/engines/astrology';
import { streamChat, type ZhipuMessage } from '@/lib/ai/zhipu';

const SIGNS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
function lonToSignStr(lon: number): string {
  const n = ((lon % 360) + 360) % 360;
  const si = Math.floor(n / 30);
  return `${SIGNS[si]}${Math.floor(n - si * 30)}°`;
}

/** 格式化行星位置为简洁字符串 */
function fmtPlanet(p: { name: string; sign: string; degree: number; house: number; retrograde: boolean }): string {
  return `${p.name} ${p.sign}${p.degree}° 第${p.house}宫${p.retrograde ? ' (逆行)' : ''}`;
}

/** 格式化相位列表 */
function fmtAspects(aspects: { planet1: string; planet2: string; type: string; orb: number }[], limit = 8): string {
  return aspects.slice(0, limit).map(a => `${a.planet1} ${a.type} ${a.planet2} (容许度${a.orb}°)`).join('\n');
}

/**
 * 运势 AI 解读 API（流式 SSE）
 * 日运/周运 → 行运盘；月运 → 月返盘；年运 → 日返盘
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

    const lat = latitude ?? 39.9;

    // 计算命盘
    const timeInfo = await standardizeTime(year, month, day, hour, minute, longitude, timezone);
    const baziChart = calculateBazi(timeInfo, year, month, day, gender);
    const natalChart = calculateAstrology(timeInfo, lat, longitude);

    const now = targetDate ? new Date(targetDate) : new Date();

    const periodLabels: Record<string, string> = { daily: '今日', weekly: '本周', monthly: '本月', yearly: '今年' };
    const periodLabel = periodLabels[period] || '今日';

    // 根据周期计算对应盘的数据
    let chartSection = '';

    if (period === 'yearly') {
      // 年运 → 日返盘
      const natalSun = natalChart.planets.find(p => p.name === '太阳');
      if (!natalSun) throw new Error('无法获取本命太阳位置');
      const sr = findSolarReturn(natalSun.longitude, now.getFullYear(), lat, longitude);
      const crossAspects = calculateCrossAspects(natalChart.planets, sr.chart.planets);
      chartSection = `## 日返盘（太阳回归盘）— ${now.getFullYear()}年

日返盘是太阳回到出生时精确度数的时刻起的星盘，反映该年度整体主题。

日返上升点：${sr.chart.houses[0] ? `${lonToSignStr(sr.chart.ascendant)}` : '未知'}
日返中天：${lonToSignStr(sr.chart.midheaven)}

日返盘行星落宫：
${sr.chart.planets.map(p => fmtPlanet(p)).join('\n')}

日返盘与本命盘交叉相位：
${fmtAspects(crossAspects, 10)}

解读侧重：太阳回归带来的年度主题，关注日返盘行星落入本命宫位的意义，以及交叉相位揭示的年度趋势。`;
    } else if (period === 'monthly') {
      // 月运 → 月返盘
      const natalMoon = natalChart.planets.find(p => p.name === '月亮');
      if (!natalMoon) throw new Error('无法获取本命月亮位置');
      const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      const lr = findLunarReturn(natalMoon.longitude, monthStart, lat, longitude);
      const crossAspects = calculateCrossAspects(natalChart.planets, lr.chart.planets);
      chartSection = `## 月返盘（月亮回归盘）— ${now.getFullYear()}年${now.getMonth() + 1}月

月返盘是月亮回到出生时精确度数的时刻起的星盘，反映该月情绪与生活主题。

月返上升点：${lonToSignStr(lr.chart.ascendant)}
月返中天：${lonToSignStr(lr.chart.midheaven)}

月返盘行星落宫：
${lr.chart.planets.map(p => fmtPlanet(p)).join('\n')}

月返盘与本命盘交叉相位：
${fmtAspects(crossAspects, 10)}

解读侧重：月亮回归带来的当月主题，关注月返盘行星落入本命宫位的意义，月返上升点揭示的情绪基调。`;
    } else {
      // 日运/周运 → 行运盘
      const transitTimeInfo = await standardizeTime(
        now.getFullYear(), now.getMonth() + 1, now.getDate(),
        now.getHours(), now.getMinutes(), longitude, timezone
      );
      const transitChart = calculateAstrology(transitTimeInfo, lat, longitude);
      const crossAspects = calculateCrossAspects(natalChart.planets, transitChart.planets);
      chartSection = `## 行运盘 — ${now.toISOString().slice(0, 10)}

行运盘反映当前天空行星对本命盘的实时影响。

行运行星位置：
${transitChart.planets.slice(0, 10).map(p => fmtPlanet(p)).join('\n')}

行运与本命交叉相位：
${fmtAspects(crossAspects, 10)}

解读侧重：${period === 'weekly' ? '未来一周主要过境趋势，关注慢行星（木土天海冥）的持续相位' : '当天行星过境对本命盘的即时影响，关注月亮和快行星的精确相位'}。`;
    }

    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: `你是一位专业的命理分析师，精通八字和西洋占星。现在需要根据以下排盘数据，为用户生成${periodLabel}运势解读。

## 八字数据

四柱：${baziChart.fourPillars.year.ganZhi} ${baziChart.fourPillars.month.ganZhi} ${baziChart.fourPillars.day.ganZhi} ${baziChart.fourPillars.time.ganZhi}
日主：${baziChart.fourPillars.day.gan}
五行：${baziChart.wuxing.year} ${baziChart.wuxing.month} ${baziChart.wuxing.day} ${baziChart.wuxing.time}

## 本命盘

本命行星落宫：
${natalChart.planets.map(p => fmtPlanet(p)).join('\n')}

${chartSection}

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
- 必须引用具体的相位和落宫数据来支撑解读，不能泛泛而谈
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
