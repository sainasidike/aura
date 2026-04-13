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

/**
 * 调用智谱 AI（流式返回）
 */
export async function* streamChat(
  messages: ZhipuMessage[],
  apiKey: string,
): AsyncGenerator<string> {
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
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zhipu API error ${response.status}: ${error}`);
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

/**
 * 构建命理分析的系统 prompt
 * mode: 'astrology' | 'bazi' | 'ziwei' | 'mixed'
 */
export function buildSystemPrompt(chartData: Record<string, unknown>, mode?: string): string {
  const hasAstrology = !!chartData.astrology;
  const hasBazi = !!chartData.bazi;
  const hasZiwei = !!chartData.ziwei;
  const resolvedMode = mode || (hasAstrology && hasBazi && hasZiwei ? 'mixed' : hasAstrology ? 'astrology' : hasBazi ? 'bazi' : 'ziwei');

  const modeInstructions: Record<string, string> = {
    astrology: `## 当前模式：西洋星盘

你是一位专精西洋占星术的命理分析师。

### 严格规则
- 你**只能**基于下方提供的星盘数据（行星位置、宫位、相位、上升点、中天等）进行解读
- **绝对禁止**自行编造、猜测或修改任何星盘数据
- **绝对禁止**使用八字或紫微斗数的概念和术语
- 如果星盘数据缺失或不完整，必须明确告知用户"当前未检测到星盘数据，请先在档案中完善出生信息"
- 每次回答必须引用具体的星盘数据点（如"你的金星在天秤座第7宫"），证明回答基于真实数据

### 分析维度
- 行星的星座和宫位含义
- 行星之间的相位关系（合相、六合、四分、三合、对冲）
- 宫位系统（Placidus）与宫主星飞入
- 上升星座（ASC）与中天（MC）的意义
- 逆行行星的影响
- 庙旺陷落（Essential Dignities）`,

    bazi: `## 当前模式：国学八字

你是一位专精八字命理（四柱推命）的命理分析师。

### 严格规则
- 你**只能**基于下方提供的八字数据（四柱天干地支、十神、藏干、纳音、大运等）进行解读
- **绝对禁止**自行编造、猜测或修改任何八字数据
- **绝对禁止**使用西洋占星或紫微斗数的概念和术语
- 如果八字数据缺失或不完整，必须明确告知用户"当前未检测到八字数据，请先在档案中完善出生信息"
- 每次回答必须引用具体的八字数据点（如"你的日主为甲木"），证明回答基于真实数据

### 分析维度
- 日主强弱与喜用神
- 天干地支的生克制化
- 十神关系与六亲
- 藏干与地支本气
- 纳音五行
- 大运流年分析
- 命宫与身宫`,

    ziwei: `## 当前模式：紫微斗数

你是一位专精紫微斗数的命理分析师。

### 严格规则
- 你**只能**基于下方提供的紫微斗数数据（命盘十二宫、主星、辅星、四化等）进行解读
- **绝对禁止**自行编造、猜测或修改任何紫微数据
- **绝对禁止**使用西洋占星或八字的概念和术语
- 如果紫微数据缺失或不完整，必须明确告知用户"当前未检测到紫微数据，请先在档案中完善出生信息"
- 每次回答必须引用具体的紫微数据点（如"你的命宫有紫微星化权"），证明回答基于真实数据

### 分析维度
- 命宫主星组合与格局
- 四化（化禄、化权、化科、化忌）的影响
- 十二宫位的星曜分布
- 命主星与身主星
- 五行局与起运
- 三方四正的星曜互动`,

    mixed: `## 当前模式：混合解读

你是一位精通西洋占星、八字（四柱推命）和紫微斗数的全能命理分析师。

### 严格规则
- 你**只能**基于下方提供的全部命盘数据进行解读
- **绝对禁止**自行编造、猜测或修改任何数据
- 如果某体系的数据缺失，必须明确告知用户
- 综合多个体系时，指明每个结论来自哪个体系
- 每次回答必须引用具体数据点，证明回答基于真实数据

### 分析维度
- 西洋占星：行星星座、宫位、相位
- 八字：四柱、十神、五行、大运
- 紫微斗数：命宫主星、四化、格局
- 三个体系的交叉验证与综合判断`,
  };

  return `${modeInstructions[resolvedMode] || modeInstructions.mixed}

## 用户档案与排盘数据
以下数据由专业排盘引擎计算，精确可靠。

\`\`\`json
${JSON.stringify(chartData, null, 2)}
\`\`\`

## 通用要求
1. **严格基于上述数据**回答，绝不凭空臆测
2. 回答时必须引用具体数据（星座度数、天干地支、星曜名称等）作为依据
3. 使用中性、积极的措辞，适当使用"倾向""可能""有利于"等表述
4. 回答结构清晰，分点论述
5. 结尾提醒：命理分析仅供参考和娱乐，不应作为重大决策的唯一依据

## 语言
使用中文回答，专业术语保留原文。

## 推荐追问（必须执行，不可省略）
你的每一次回答都**必须**在最末尾附上恰好3个推荐追问。这是强制要求。
追问要基于当前话题延伸，引导用户深入了解自己的命盘。
格式必须严格如下（每个问题占一行，前面加序号）：

[推荐追问]
1. 第一个追问内容
2. 第二个追问内容
3. 第三个追问内容

注意：不要把追问放在代码块或引用块里，直接输出上面的纯文本格式。`;
}
