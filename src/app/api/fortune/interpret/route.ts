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

function fmtPlanet(p: { name: string; sign: string; degree: number; house: number; retrograde: boolean }): string {
  return `${p.name} ${p.sign}${p.degree}° 第${p.house}宫${p.retrograde ? ' (逆行)' : ''}`;
}

function fmtAspects(aspects: { planet1: string; planet2: string; type: string; orb: number }[], limit = 10): string {
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

    const timeInfo = await standardizeTime(year, month, day, hour, minute, longitude, timezone);
    const baziChart = calculateBazi(timeInfo, year, month, day, gender);
    const natalChart = calculateAstrology(timeInfo, lat, longitude);

    const now = targetDate ? new Date(targetDate) : new Date();

    const periodLabels: Record<string, string> = { daily: '今日', weekly: '本周', monthly: '本月', yearly: '今年' };
    const periodLabel = periodLabels[period] || '今日';

    // 构建命盘基础数据
    const baziSection = `八字四柱：${baziChart.fourPillars.year.ganZhi} ${baziChart.fourPillars.month.ganZhi} ${baziChart.fourPillars.day.ganZhi} ${baziChart.fourPillars.time.ganZhi}
日主：${baziChart.fourPillars.day.gan}（${baziChart.wuxing.day}）
五行分布：${baziChart.wuxing.year} ${baziChart.wuxing.month} ${baziChart.wuxing.day} ${baziChart.wuxing.time}`;

    const natalSection = `本命盘行星：
${natalChart.planets.map(p => fmtPlanet(p)).join('\n')}

本命盘上升点：${lonToSignStr(natalChart.ascendant)}
本命盘中天：${lonToSignStr(natalChart.midheaven)}`;

    // 根据周期类型构建专项数据和 prompt
    let chartDataSection = '';
    let analysisPrompt = '';

    if (period === 'yearly') {
      const natalSun = natalChart.planets.find(p => p.name === '太阳');
      if (!natalSun) throw new Error('无法获取本命太阳位置');
      const sr = findSolarReturn(natalSun.longitude, now.getFullYear(), lat, longitude);
      const crossAspects = calculateCrossAspects(natalChart.planets, sr.chart.planets);

      chartDataSection = `【日返盘（太阳回归盘）— ${now.getFullYear()}年】

日返盘上升点：${lonToSignStr(sr.chart.ascendant)}
日返盘中天（MC）：${lonToSignStr(sr.chart.midheaven)}

日返盘行星落宫：
${sr.chart.planets.map(p => fmtPlanet(p)).join('\n')}

日返盘宫头：
${sr.chart.houses.map(h => `第${h.number}宫: ${h.sign}${h.degree}°`).join('\n')}

日返盘与本命盘交叉相位（按容许度排序）：
${fmtAspects(crossAspects, 15)}`;

      analysisPrompt = `分析日返盘年运。每段首句引用具体数据。
爱情→金星/7宫/月亮落宫+交叉相位 事业→MC/10宫/太阳/土星 健康→ASC/6宫/火星 学习→水星/3宫/9宫/木星 人际→11宫/7宫/木星/金星
年运要点明大方向，结合八字日主。`;

    } else if (period === 'monthly') {
      const natalMoon = natalChart.planets.find(p => p.name === '月亮');
      if (!natalMoon) throw new Error('无法获取本命月亮位置');
      const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      const lr = findLunarReturn(natalMoon.longitude, monthStart, lat, longitude);
      const crossAspects = calculateCrossAspects(natalChart.planets, lr.chart.planets);

      chartDataSection = `【月返盘（月亮回归盘）— ${now.getFullYear()}年${now.getMonth() + 1}月】

月返盘上升点：${lonToSignStr(lr.chart.ascendant)}
月返盘中天（MC）：${lonToSignStr(lr.chart.midheaven)}

月返盘行星落宫：
${lr.chart.planets.map(p => fmtPlanet(p)).join('\n')}

月返盘宫头：
${lr.chart.houses.map(h => `第${h.number}宫: ${h.sign}${h.degree}°`).join('\n')}

月返盘与本命盘交叉相位（按容许度排序）：
${fmtAspects(crossAspects, 15)}`;

      analysisPrompt = `分析月返盘月运。每段首句引用具体数据。
爱情→月亮/金星落宫+7宫+交叉相位 事业→MC/10宫/太阳 健康→ASC/6宫/火星/土星 学习→水星(逆行?)/3宫/9宫 人际→11宫/木星/金星
点明本月情绪主题，月返ASC决定整体氛围。`;

    } else {
      // 日运/周运 → 行运盘
      const transitTimeInfo = await standardizeTime(
        now.getFullYear(), now.getMonth() + 1, now.getDate(),
        now.getHours(), now.getMinutes(), longitude, timezone
      );
      const transitChart = calculateAstrology(transitTimeInfo, lat, longitude);
      const crossAspects = calculateCrossAspects(natalChart.planets, transitChart.planets);

      chartDataSection = `【行运盘 — ${now.toISOString().slice(0, 10)}】

行运行星位置：
${transitChart.planets.slice(0, 10).map(p => fmtPlanet(p)).join('\n')}

行运与本命交叉相位（按容许度排序）：
${fmtAspects(crossAspects, 15)}`;

      if (period === 'weekly') {
        analysisPrompt = `分析行运盘写周运。每段首句引用具体行运相位。
爱情→行运金星/月亮触发本命7宫/5宫/金星/月亮 事业→行运太阳/土星/木星与本命10宫/MC 健康→行运火星/土星与ASC/6宫 学习→行运水星与本命水星/3宫/9宫 人际→行运木星/金星与11宫
侧重慢行星持续影响+快行星触发，指出1-2个关键时间节点。`;

      } else {
        analysisPrompt = `分析行运盘写日运。每段首句引用具体行运相位（容许度越小越优先）。
爱情→行运金星/月亮与本命金星/月亮/7宫/5宫 事业→行运太阳/土星/木星与本命太阳/MC/10宫 健康→行运火星与ASC/6宫+月亮过境 学习→行运水星与本命水星/3宫/9宫 人际→行运木星/金星与11宫
日运要具体到场景和建议。`;
      }
    }

    const systemPrompt = `你是命理分析师。${analysisPrompt}

## 数据
${baziSection}
${natalSection}
${chartDataSection}

## 输出格式
5个标记分隔，每段80-150字，首句引用数据：
---LOVE--- ---CAREER--- ---HEALTH--- ---STUDY--- ---SOCIAL---
标记：📌核心判断 💡积极建议 ⚠️注意事项
禁止套话（如"劳逸结合""保持好心情"），禁止编造数据。`;

    const messages: ZhipuMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请为我生成${periodLabel}运势解读。` },
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
