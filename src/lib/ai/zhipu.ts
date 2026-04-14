/**
 * 智谱 AI (Zhipu) GLM-4 集成
 *
 * 使用 glm-4-flash 模型（免费额度：100万 tokens/天）
 * API 兼容 OpenAI 格式
 */

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

export interface ZhipuMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

function parseZhipuError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body);
    const msg = parsed?.error?.message || parsed?.message;
    if (msg) return msg;
  } catch { /* not JSON */ }
  if (status === 429) return '请求过于频繁，请稍后再试';
  if (status === 401) return 'API 密钥无效，请检查配置';
  return `AI 服务错误 (${status})`;
}

async function fetchZhipu(messages: ZhipuMessage[], apiKey: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(ZHIPU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response;
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('AI 服务请求超时，请稍后重试');
    }
    throw new Error(`AI 服务连接失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * 调用智谱 AI（流式返回，429 自动重试）
 */
export async function* streamChat(
  messages: ZhipuMessage[],
  apiKey: string,
): AsyncGenerator<string> {
  let response: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    response = await fetchZhipu(messages, apiKey);

    if (response.status === 429 && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    const body = response ? await response.text() : '';
    const status = response?.status || 0;
    throw new Error(parseZhipuError(status, body));
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // skip malformed chunks
      }
    }
  }
}

/* ═══════════════════════════════════════ */
/* 数据压缩 — JSON → 紧凑文本，token 量减少 ~70%   */
/* ═══════════════════════════════════════ */

interface CompactPlanet { name: string; sign: string; degree: number; minute: number; house: number; retrograde: boolean }
interface CompactAspect { planet1: string; planet2: string; type: string; orb: number }
interface CompactHouse { number: number; sign: string; degree: number; minute: number }

function fmtPlanets(planets: CompactPlanet[]): string {
  return planets.map(p =>
    `${p.name} ${p.sign}${p.degree}°${String(p.minute).padStart(2, '0')}' ${p.house}宫${p.retrograde ? ' R' : ''}`
  ).join('\n');
}

function fmtHouses(houses: CompactHouse[]): string {
  return houses.map(h => `${h.number}宫 ${h.sign}${h.degree}°${String(h.minute).padStart(2, '0')}'`).join(' | ');
}

function fmtAspects(aspects: CompactAspect[], limit = 12): string {
  return [...aspects].sort((a, b) => a.orb - b.orb).slice(0, limit)
    .map(a => `${a.planet1}${a.type}${a.planet2}(${a.orb}°)`).join(' | ');
}

function compressChartData(data: Record<string, unknown>): string {
  const sections: string[] = [];

  // Profile
  const p = data.profile as Record<string, unknown> | undefined;
  if (p) {
    sections.push(`【用户】${p.name || ''} ${p.gender || ''} ${p.birthDate || ''} ${p.birthTime || ''} ${p.city || ''}`);
  }

  // Bazi
  const bazi = data.bazi as Record<string, unknown> | undefined;
  if (bazi) {
    const fp = bazi.fourPillars as Record<string, Record<string, string>>;
    const wx = bazi.wuxing as Record<string, string>;
    const ss = bazi.shiShen as Record<string, Record<string, string>>;
    let baziText = `【八字】${fp.year.ganZhi} ${fp.month.ganZhi} ${fp.day.ganZhi} ${fp.time.ganZhi}`;
    baziText += `\n日主：${fp.day.gan}（${wx.day}） 五行：${wx.year} ${wx.month} ${wx.day} ${wx.time}`;
    if (ss?.tianGan) baziText += `\n天干十神：${ss.tianGan.year} ${ss.tianGan.month} 日主 ${ss.tianGan.time}`;
    if (bazi.nayin) {
      const ny = bazi.nayin as Record<string, string>;
      baziText += `\n纳音：${ny.year} ${ny.month} ${ny.day} ${ny.time}`;
    }
    if (bazi.mingGong) baziText += `\n命宫：${bazi.mingGong}`;
    if (bazi.shengXiao) baziText += ` 生肖：${bazi.shengXiao}`;
    if (bazi.dayun) {
      const dayun = bazi.dayun as { startAge: number; ganZhi: string; startYear: number; endYear: number }[];
      baziText += `\n大运：${dayun.map(d => `${d.ganZhi}(${d.startYear}-${d.endYear})`).join(' ')}`;
    }
    sections.push(baziText);
  }

  // Ziwei (major stars only)
  const ziwei = data.ziwei as Record<string, unknown> | undefined;
  if (ziwei) {
    let zText = `【紫微】命主：${ziwei.destinyMaster} 身主：${ziwei.bodyMaster} ${ziwei.element}`;
    const cells = ziwei.cells as { ground: string; temples: string[]; majorStars: { name: string; fourInfluence?: string }[]; ageRange?: string }[];
    if (cells) {
      zText += '\n' + cells.map(c => {
        const temples = c.temples.join('/');
        const stars = c.majorStars.map(s => s.name + (s.fourInfluence ? `(${s.fourInfluence})` : '')).join(' ');
        return `${c.ground} [${temples}] ${stars}${c.ageRange ? ` (${c.ageRange})` : ''}`;
      }).join('\n');
    }
    sections.push(zText);
  }

  // Natal chart
  const natal = data.natalChart as Record<string, unknown> | undefined;
  if (natal) {
    let nText = '【本命盘】';
    if (natal.planets) nText += '\n' + fmtPlanets(natal.planets as CompactPlanet[]);
    if (natal.ascendant != null) nText += `\nASC ${(natal.ascendant as number).toFixed(1)}° MC ${(natal.midheaven as number).toFixed(1)}°`;
    if (natal.houses) nText += '\n宫头：' + fmtHouses(natal.houses as CompactHouse[]);
    if (natal.aspects) nText += '\n相位：' + fmtAspects(natal.aspects as CompactAspect[]);
    sections.push(nText);
  }

  // Transit chart
  const transit = data.transitChart as Record<string, unknown> | undefined;
  if (transit) {
    let tText = `【行运盘】${data.transitTime || ''}`;
    if (transit.planets) tText += '\n' + fmtPlanets((transit.planets as CompactPlanet[]).slice(0, 10));
    sections.push(tText);
  }

  // Cross aspects
  const cross = data.crossAspects as CompactAspect[] | undefined;
  if (cross?.length) {
    sections.push('【行运×本命相位】' + fmtAspects(cross, 15));
  }

  // Solar return
  const sr = data.solarReturn as Record<string, unknown> | undefined;
  if (sr) {
    const chart = sr.chart as Record<string, unknown>;
    let sText = `【日返盘 ${sr.year || ''}年】`;
    if (chart?.planets) sText += '\n' + fmtPlanets(chart.planets as CompactPlanet[]);
    if (chart?.ascendant != null) sText += `\nASC ${(chart.ascendant as number).toFixed(1)}° MC ${(chart.midheaven as number).toFixed(1)}°`;
    if (chart?.houses) sText += '\n宫头：' + fmtHouses(chart.houses as CompactHouse[]);
    sections.push(sText);
  }

  // Lunar return
  const lr = data.lunarReturn as Record<string, unknown> | undefined;
  if (lr) {
    const chart = lr.chart as Record<string, unknown>;
    let lText = '【月返盘】';
    if (chart?.planets) lText += '\n' + fmtPlanets(chart.planets as CompactPlanet[]);
    if (chart?.ascendant != null) lText += `\nASC ${(chart.ascendant as number).toFixed(1)}° MC ${(chart.midheaven as number).toFixed(1)}°`;
    if (chart?.houses) lText += '\n宫头：' + fmtHouses(chart.houses as CompactHouse[]);
    sections.push(lText);
  }

  return sections.join('\n\n');
}

/**
 * 构建命理分析的系统 prompt
 */
export function buildSystemPrompt(chartData: Record<string, unknown>, _mode?: string, analysisType?: string): string {
  const analysisInstructions: Record<string, string> = {
    transit: `你是行运盘分析占星师。分析行运行星与本命的交叉相位。
重点：外行星（木土天海冥）长期影响 + 内行星触发效应，容许度越小影响越强。给出2-3个最关键行运相位的建议。`,

    solar_return: `你是日返盘（太阳回归盘）分析占星师，解读今年生日到明年生日的年度主题。
重点：日返ASC（年度氛围）、MC（事业方向）、太阳落宫（核心领域）、月亮（情感）、角宫行星、紧密相位。`,

    lunar_return: `你是月返盘（月亮回归盘）分析占星师，解读本月（约27天）运势。
重点：月返ASC（本月氛围）、月亮落宫（情感焦点）、太阳宫位、角宫行星、紧密相位。`,
  };

  const COMMON_RULES = `## 规则
- 严格基于上述数据回答，禁止编造数据
- 引用具体数据为依据（度数、宫位、天干地支等）
- 措辞中性积极，分点论述
- 结尾注明：仅供参考和娱乐

## 追问
每次回答末尾附3个推荐追问，格式：
[推荐追问]
1. 追问一
2. 追问二
3. 追问三`;

  // 专项分析（从星盘页跳转）
  if (analysisType && analysisInstructions[analysisType]) {
    return `${analysisInstructions[analysisType]}

## 排盘数据
${compressChartData(chartData)}

${COMMON_RULES}`;
  }

  // 默认：综合分析
  return `你是精通西洋占星、八字、紫微斗数的命理师。

## 分析策略
- 运势 → 行运盘交叉相位（容许度小=影响强）
- 年运 → 日返盘 + 大运流年
- 月运 → 月返盘
- 性格 → 本命盘 + 八字日主 + 紫微命宫
- 事业 → 10宫/2宫/6宫 + 八字财星 + 紫微官禄宫
- 感情 → 7宫/金星/月亮 + 八字配偶星 + 紫微夫妻宫
- 综合多体系交叉验证

## 排盘数据
${compressChartData(chartData)}

${COMMON_RULES}`;
}
