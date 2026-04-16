import { NextRequest } from 'next/server';
import { standardizeTime } from '@/lib/time/solar-time';
import { calculateBazi } from '@/lib/engines/bazi';
import { calculateAstrology, findSolarReturn, findLunarReturn, calculateCrossAspects } from '@/lib/engines/astrology';
import { streamChat, type ZhipuMessage } from '@/lib/ai/zhipu';
import { extractDailyInsights } from '@/lib/ai/daily-insights';

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

      analysisPrompt = `基于日返盘深度分析年运。每段必须引用2-3个具体数据（行星 星座 度数 宫位 或相位类型+容许度）。

爱情：日返金星落宫+星座（恋爱风格变化）、日返7宫宫头+宫内行星（伴侣/合作关系）、日返月亮（情感需求方向）、与本命金星/月亮的交叉相位（触发事件），分析感情发展的阶段和关键转折期。
事业：日返MC星座+度数（年度事业方向）、日返10宫行星（职业能量）、日返太阳落宫（核心关注领域）、日返土星（限制与责任）、日返木星（机遇扩张），指出事业突破和瓶颈的时段。
健康：日返ASC星座（身体整体状态）、日返6宫行星（日常健康）、日返火星（精力/炎症倾向）、日返12宫（隐性健康问题），说明需要特别注意的身体部位和调养方向。
学习：日返水星落宫+相位（思维模式）、日返3宫（学习沟通）、日返9宫（高等学习/远行）、日返木星（成长扩展），指出最适合深造或技能提升的领域。
人际：日返11宫（社交圈变化）、日返7宫（一对一关系）、日返木星/金星与本命交叉相位（贵人运），分析社交圈的变化趋势和关键人际事件。

年运要有全年视角，点明上半年和下半年的侧重差异，给出年度关键词。`;

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

      analysisPrompt = `基于月返盘深度分析月运。每段必须引用2-3个具体数据（行星 星座 度数 宫位 或相位类型+容许度）。

爱情：月返月亮落宫+星座（本月情感基调）、月返金星（恋爱/审美倾向）、月返7宫宫头+宫内行星（关系互动模式）、与本命金星/月亮交叉相位（情感触发点），分析本月感情走势的高低起伏。
事业：月返MC星座（本月职业氛围）、月返10宫行星（事业能量集中点）、月返太阳落宫（精力聚焦方向）、月返土星位置（压力来源），指出适合推进重要项目的时间窗口。
健康：月返ASC星座（身体整体状态）、月返6宫（日常作息影响）、月返火星（精力水平/运动倾向）、月返土星与本命交叉相位（疲劳/慢性问题），给出本月具体的养生建议。
学习：月返水星落宫+是否逆行（思维敏锐度）、月返3宫（沟通效率）、月返9宫（学习动力），分析本月最适合学习的方向和方式。
人际：月返11宫行星（社交活跃度）、月返金星/木星（人缘运）、与本命交叉相位（贵人/冲突触发），分析本月社交场合的机遇和需要注意的人际关系。

月运要点明月初、月中、月末的节奏变化，月返ASC决定整体氛围基调。`;

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
        analysisPrompt = `基于行运盘深度分析周运。每段必须引用2-3个具体数据（行星 星座 度数 宫位 或相位类型+容许度）。

爱情：行运金星位置+星座（本周恋爱/审美氛围）、行运月亮过境趋势（情绪节奏）、行运金星/月亮与本命金星/月亮/7宫/5宫的相位（情感触发事件）、行运火星对本命金星的相位（激情或冲突），分析本周感情的高峰日和低谷日。
事业：行运太阳落宫+相位（本周精力聚焦方向）、行运土星/木星与本命MC/10宫的相位（职业压力与机遇）、行运水星位置（沟通与决策效率）、行运火星（执行力和竞争态势），指出适合推进重要工作的具体日子。
健康：行运火星位置+相位（精力水平/受伤风险）、行运土星与本命ASC/6宫的相位（慢性疲劳）、行运月亮过境（情绪波动对身体的影响），给出本周运动/休息的节奏建议。
学习：行运水星位置+是否逆行（思维敏锐度）、行运水星与本命水星/3宫/9宫的相位（学习效率）、行运木星（知识扩展机会），分析本周最高效的学习时段和方式。
人际：行运木星/金星与本命11宫的相位（社交运和贵人运）、行运水星（沟通质量）、行运火星（人际摩擦风险），指出本周社交场合的机会和需要避开的冲突时段。

周运要区分上半周和下半周的节奏差异，侧重慢行星的持续影响叠加快行星的触发节点。`;

      } else {
        // 日运预分析：提取今日关键天象
        let dailyInsightsBlock = '';
        try {
          dailyInsightsBlock = extractDailyInsights(
            transitChart.planets,
            natalChart.planets,
            crossAspects,
            natalChart.ascendant,
          );
        } catch { /* 静默降级 */ }

        analysisPrompt = `基于行运盘分析今日运势。

## 分析框架
1. **行运月亮过宫**（日运差异化的关键）→ 今天月亮在你的第几宫，决定今天情绪重心和最在意的事
2. **紧密行运相位（orb<2°）** → 今天最活跃的能量，直接影响具体事件
3. **行运内行星（水金火）位置** → 今天沟通/感情/行动力的状态
4. **行运外行星的持续相位** → 最近一段时间的背景能量

每个维度关注：
- 爱情：行运月亮/金星与本命金星/月亮/7宫/5宫的相位，今天感情方面具体会发生什么
- 事业：行运太阳/火星/土星与本命太阳/MC/10宫的相位，今天工作中会遇到什么
- 健康：行运火星位置+月亮过境对身体的影响，今天精力状态和需要注意的身体部位
- 学习：行运水星与本命水星/3宫/9宫的相位，今天大脑是清醒还是迟钝，适合做什么
- 人际：行运木星/金星与11宫/7宫的相位，今天社交场合会怎样

${dailyInsightsBlock}

## 解读标准（极重要）
日运必须回答"今天具体会发生什么"，而不是"你可能会有变化"。

禁止的废话（出现即不合格）：
- ❌ "今天可能会有一些变化/挑战/机会"
- ❌ "保持积极/开放/灵活的心态"
- ❌ "注意劳逸结合"
- ❌ "可能会感到一些压力"

合格的日运长这样：
- 爱情✅："今天下午容易因为一句无心的话和伴侣闹别扭，尤其是关于花钱或者计划安排的分歧。先别急着解释，给对方十分钟冷静"
- 事业✅："上午脑子最清醒，把需要动脑的工作安排在午饭前。下午3点后容易走神，适合做不需要太多创造力的机械性工作"
- 健康✅："今天火星能量强，适合做高强度运动（跑步、HIIT），但注意肩颈——低头看手机超过30分钟就起来活动一下"
- 学习✅："水星状态好，背单词、看专业书的效率比平时高。但别同时开两本书，今天适合专注深入一个主题"
- 人际✅："今天有贵人运，如果接到陌生电话或收到老朋友的消息，别忽略——可能带来有用的信息或机会"`;
      }
    }

    const wordCount = period === 'yearly' ? '350-500' : period === 'monthly' ? '250-400' : period === 'weekly' ? '150-250' : '80-150';
    const totalHint = period === 'yearly' ? '总字数2000-2800' : period === 'monthly' ? '总字数1500-2200' : period === 'weekly' ? '总字数900-1400' : '总字数500-800';

    const systemPrompt = `你是专业命理分析师。${analysisPrompt}

## 数据
${baziSection}
${natalSection}
${chartDataSection}

## 输出格式
用5个标记分隔5个维度：---LOVE--- ---CAREER--- ---HEALTH--- ---STUDY--- ---SOCIAL---

每个维度内部严格分为三段，每段单独一行，用标记开头：
📌 核心判断：引用具体排盘数据，分析当前状态和趋势（占该维度${wordCount}字的50%）
💡 积极建议：基于数据给出具体可执行的建议，不要泛泛而谈（占30%）
⚠️ 注意事项：指出需要警惕的问题和应对策略（占20%）

三段之间用空行分隔。${totalHint}。禁止套话（如"劳逸结合""保持好心情"），禁止编造数据，📌段必须引用上方排盘数据中的真实数据作为依据。`;

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
