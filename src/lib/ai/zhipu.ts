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
        max_tokens: 8192,
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

  const CARD_FORMAT = `## 输出格式（严格遵守）
根据用户问题选择3-5个最相关的板块，每个板块用标记分隔。可选板块：
---SUN--- 太阳与自我
---MOON--- 月亮与情感
---RISING--- 上升与外在
---VENUS--- 金星与爱情
---MARS--- 火星与行动力
---JUPITER--- 木星与机遇
---SATURN--- 土星与挑战
---MERCURY--- 水星与思维
---CAREER--- 事业与财运
---LOVE--- 感情与关系
---TRANSIT--- 行运与时机
---HEALTH--- 健康与精力
---SUMMARY--- 综合建议

每个板块格式：
---标记--- 板块标题
📊 数据：引用1-2个具体星盘数据（行星 星座 度数 宫位 或 相位类型+容许度）
🔮 解读：这些数据的占星学含义（80-150字，深入分析，不要泛泛而谈）
💡 建议：基于分析给出的具体可执行建议（30-60字）

## 要求
- 每个板块必须包含📊🔮💡三部分，缺一不可
- 📊部分必须引用上方排盘数据中的真实数据，禁止编造
- 🔮解读要深入具体，说明"为什么"而不只是"是什么"
- 最后一个板块必须是 ---SUMMARY---
- 总字数600-1000字`;

  // 专项分析 — 运势类问题使用对应星盘
  if (analysisType === 'transit') {
    return `你是专业西洋占星师，正在使用**行运盘**分析近期运势。只使用西洋占星学体系，禁止八字、紫微斗数、五行等概念。
当前使用的是行运盘（Transit Chart），分析行运行星与本命的交叉相位。
重点：外行星（木土天海冥）长期影响 + 内行星触发效应，容许度越小影响越强。
📊数据部分请优先引用【行运盘】和【行运×本命相位】的数据。

## 排盘数据
${compressAstrologyOnly(chartData)}

${CARD_FORMAT}

${COMMON_RULES}`;
  }

  if (analysisType === 'solar_return') {
    return `你是专业西洋占星师，正在使用**日返盘（太阳回归盘）**分析年度运势。只使用西洋占星学体系，禁止八字、紫微斗数、五行等概念。
当前使用的是日返盘（Solar Return Chart），解读今年生日到明年生日的年度主题。
重点：日返ASC（年度氛围）、MC（事业方向）、太阳落宫（核心领域）、月亮（情感）、角宫行星、紧密相位。
📊数据部分请优先引用【日返盘】的数据。

## 排盘数据
${compressAstrologyOnly(chartData)}

${CARD_FORMAT}

${COMMON_RULES}`;
  }

  if (analysisType === 'lunar_return') {
    return `你是专业西洋占星师，正在使用**月返盘（月亮回归盘）**分析本月运势。只使用西洋占星学体系，禁止八字、紫微斗数、五行等概念。
当前使用的是月返盘（Lunar Return Chart），解读本月（约27天）运势。
重点：月返ASC（本月氛围）、月亮落宫（情感焦点）、太阳宫位、角宫行星、紧密相位。
📊数据部分请优先引用【月返盘】的数据。

## 排盘数据
${compressAstrologyOnly(chartData)}

${CARD_FORMAT}

${COMMON_RULES}`;
  }

  // 默认：本命盘分析（卡片式分段输出）
  return `你是专业西洋占星师。只使用西洋占星学体系，禁止八字、紫微斗数、五行等概念。
当前使用的是本命盘（Natal Chart）。

## 排盘数据
${compressAstrologyOnly(chartData)}

${CARD_FORMAT}

${COMMON_RULES}`;
}

/** 只提取西洋占星数据（本命盘/行运盘/日返盘/月返盘），不含八字和紫微 */
function compressAstrologyOnly(data: Record<string, unknown>): string {
  const sections: string[] = [];

  const p = data.profile as Record<string, unknown> | undefined;
  if (p) {
    sections.push(`【用户】${p.name || ''} ${p.gender || ''} ${p.birthDate || ''} ${p.birthTime || ''} ${p.city || ''}`);
  }

  const natal = data.natalChart as Record<string, unknown> | undefined;
  if (natal) {
    let nText = '【本命盘】';
    if (natal.planets) nText += '\n' + fmtPlanets(natal.planets as CompactPlanet[]);
    if (natal.ascendant != null) nText += `\nASC ${(natal.ascendant as number).toFixed(1)}° MC ${(natal.midheaven as number).toFixed(1)}°`;
    if (natal.houses) nText += '\n宫头：' + fmtHouses(natal.houses as CompactHouse[]);
    if (natal.aspects) nText += '\n相位：' + fmtAspects(natal.aspects as CompactAspect[]);
    sections.push(nText);
  }

  const transit = data.transitChart as Record<string, unknown> | undefined;
  if (transit) {
    let tText = `【行运盘】${data.transitTime || ''}`;
    if (transit.planets) tText += '\n' + fmtPlanets((transit.planets as CompactPlanet[]).slice(0, 10));
    sections.push(tText);
  }

  const cross = data.crossAspects as CompactAspect[] | undefined;
  if (cross?.length) {
    sections.push('【行运×本命相位】' + fmtAspects(cross, 15));
  }

  const sr = data.solarReturn as Record<string, unknown> | undefined;
  if (sr) {
    const chart = sr.chart as Record<string, unknown>;
    const rm = sr.returnMoment as Record<string, string> | undefined;
    let sText = `【日返盘 ${sr.year || ''}年】`;
    if (rm) sText += ` 回归时刻：${rm.date || ''} ${rm.time || ''}`;
    if (chart?.planets) sText += '\n' + fmtPlanets(chart.planets as CompactPlanet[]);
    if (chart?.ascendant != null) sText += `\nASC ${(chart.ascendant as number).toFixed(1)}° MC ${(chart.midheaven as number).toFixed(1)}°`;
    if (chart?.houses) sText += '\n宫头：' + fmtHouses(chart.houses as CompactHouse[]);
    if (chart?.aspects) sText += '\n相位：' + fmtAspects(chart.aspects as CompactAspect[]);
    sections.push(sText);
  }

  const lr = data.lunarReturn as Record<string, unknown> | undefined;
  if (lr) {
    const chart = lr.chart as Record<string, unknown>;
    const rm = lr.returnMoment as Record<string, string> | undefined;
    const nr = lr.nextReturn as Record<string, string> | undefined;
    let lText = '【月返盘】';
    if (rm) lText += ` 回归时刻：${rm.date || ''} ${rm.time || ''}`;
    if (nr) lText += ` 下次回归：${nr.date || ''} ${nr.time || ''}`;
    if (chart?.planets) lText += '\n' + fmtPlanets(chart.planets as CompactPlanet[]);
    if (chart?.ascendant != null) lText += `\nASC ${(chart.ascendant as number).toFixed(1)}° MC ${(chart.midheaven as number).toFixed(1)}°`;
    if (chart?.houses) lText += '\n宫头：' + fmtHouses(chart.houses as CompactHouse[]);
    if (chart?.aspects) lText += '\n相位：' + fmtAspects(chart.aspects as CompactAspect[]);
    sections.push(lText);
  }

  return sections.join('\n\n');
}
