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

      analysisPrompt = `你正在分析日返盘（太阳回归盘），这反映用户从今年生日到明年生日的年度运势主题。

## 分析框架（必须遵循）

每个类别的解读必须按以下逻辑推导：

1. **爱情** → 重点看日返盘金星落宫和星座 + 第7宫宫头和宫内行星 + 月亮落宫（情感需求）+ 与本命金星/月亮的交叉相位
2. **事业** → 重点看日返盘MC星座 + 第10宫宫内行星 + 太阳落宫（核心能量）+ 土星落宫（责任/压力）+ 与本命MC/太阳的交叉相位
3. **健康** → 重点看日返盘上升星座（体质）+ 第6宫宫头和宫内行星 + 火星落宫（精力）+ 与本命上升/火星的交叉相位
4. **学习** → 重点看日返盘水星落宫和星座 + 第3宫/第9宫状况 + 木星落宫（成长机遇）+ 与本命水星的交叉相位
5. **人际** → 重点看日返盘第11宫/第7宫状况 + 木星/金星落宫 + 与本命木星的交叉相位

## 写作要求
- 每段第一句必须引用日返盘的具体数据作为判断起点（如"日返盘金星落入第5宫天秤座，三合本命月亮，容许度2.1°"）
- 年运解读要点明年度主题和大方向，不要写成日运那样琐碎
- 结合八字日主五行特质综合判断`;

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

      analysisPrompt = `你正在分析月返盘（月亮回归盘），这反映用户本月（约27天周期）的情绪基调和生活节奏。

## 分析框架（必须遵循）

每个类别的解读必须按以下逻辑推导：

1. **爱情** → 重点看月返盘月亮落宫（本月情感焦点）+ 金星落宫 + 第7宫状况 + 与本命金星/月亮的交叉相位
2. **事业** → 重点看月返盘MC星座 + 第10宫宫内行星 + 太阳落宫 + 与本命MC/太阳的交叉相位
3. **健康** → 重点看月返盘上升星座 + 第6宫 + 火星/土星落宫 + 与本命火星的交叉相位
4. **学习** → 重点看月返盘水星落宫和状态（是否逆行）+ 第3宫/第9宫 + 与本命水星的交叉相位
5. **人际** → 重点看月返盘第11宫 + 木星/金星落宫 + 月亮与其他行星的相位

## 写作要求
- 每段第一句必须引用月返盘的具体数据（如"月返盘月亮落入第4宫巨蟹座，六合本命金星，容许度1.8°"）
- 月运解读要点明本月的情绪主题和关键时段
- 月返盘上升星座决定了本月整体氛围，务必在分析中体现`;

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
        analysisPrompt = `你正在分析行运盘对本命盘的影响，撰写本周运势。

## 分析框架（必须遵循）

每个类别的解读必须按以下逻辑推导：

1. **爱情** → 找出行运金星/月亮与本命盘形成的相位，尤其关注触发本命7宫/5宫/金星/月亮的行运
2. **事业** → 找出行运太阳/土星/木星与本命10宫/MC/太阳的相位，关注行运土星带来的压力或行运木星带来的机遇
3. **健康** → 找出行运火星/土星与本命上升/1宫/6宫的相位，火星相位影响精力，土星相位影响慢性问题
4. **学习** → 找出行运水星与本命水星/3宫/9宫的相位，水星逆行时特别注意沟通和学习效率
5. **人际** → 找出行运木星/金星与本命11宫/木星的相位，关注社交扩展或收缩信号

## 写作要求
- 每段第一句必须引用一个具体的行运相位（如"行运木星在双子座三合本命太阳，容许度1.5°"）
- 周运侧重慢行星（木土天海冥）的持续影响 + 快行星的触发时机
- 指出本周最关键的1-2个时间节点`;

      } else {
        analysisPrompt = `你正在分析行运盘对本命盘的影响，撰写今日运势。

## 分析框架（必须遵循）

每个类别的解读必须按以下逻辑推导：

1. **爱情** → 找出行运金星/月亮与本命金星/月亮/7宫/5宫行星的相位，容许度越小影响越直接
2. **事业** → 找出行运太阳/土星/木星与本命太阳/MC/10宫行星的相位
3. **健康** → 找出行运火星与本命火星/上升/6宫的相位，以及行运月亮过境影响的身体节奏
4. **学习** → 找出行运水星与本命水星/3宫/9宫的相位，水星状态（顺行/逆行）影响沟通效率
5. **人际** → 找出行运木星/金星与本命木星/11宫的相位

## 写作要求
- 每段第一句必须引用一个具体的行运相位（如"行运金星刑本命土星，容许度0.8°"）
- 日运要具体到当天可能发生的场景和应对建议
- 优先分析容许度最小的相位，它们的影响最直接`;
      }
    }

    const systemPrompt = `你是一位精通八字和西洋占星的命理分析师。${analysisPrompt}

## 用户命盘数据

${baziSection}

${natalSection}

${chartDataSection}

## 输出格式（严格遵循）

按以下5个标记分隔输出，每个类别80-150字：

---LOVE---
（爱情运势：第一句引用具体相位数据，然后给出精准判断和建议）

---CAREER---
（事业运势：第一句引用具体相位数据，然后给出精准判断和建议）

---HEALTH---
（健康运势：第一句引用具体相位数据，然后给出精准判断和建议）

---STUDY---
（学习运势：第一句引用具体相位数据，然后给出精准判断和建议）

---SOCIAL---
（人际运势：第一句引用具体相位数据，然后给出精准判断和建议）

## 格式标记
- 用 📌 标注每段的核心判断（每段仅用一次，放在开头）
- 用 💡 标注积极建议
- 用 ⚠️ 标注需注意事项
- 用 - 标注要点列表

## 禁止事项
- 禁止出现"注意劳逸结合""保持好心情""多与人交流"等没有星盘数据支撑的套话
- 禁止编造数据中不存在的相位或行星位置
- 每个判断必须能在上方数据中找到对应的相位或落宫作为依据`;

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
