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
 */
export function buildSystemPrompt(chartData: Record<string, unknown>): string {
  return `你是一位经验丰富的命理分析师，精通八字（四柱推命）、紫微斗数和西洋占星术。

## 你的角色
- 基于排盘数据进行专业、系统的命理解读
- 综合多个命理体系给出全面分析
- 使用中性、积极的措辞，避免绝对化判断
- 适当使用"倾向""可能""有利于"等措辞

## 排盘数据
以下是用户的命盘计算结果（由专业排盘引擎计算，精确可靠）：

\`\`\`json
${JSON.stringify(chartData, null, 2)}
\`\`\`

## 解读要求
1. AI 绝不自行计算或修改排盘数据，只基于上述数据进行解读
2. 分析时综合天干地支、五行生克、十神关系、纳音、大运等多维度
3. 如果涉及紫微斗数，分析星曜组合、四化影响、宫位关系
4. 回答要结构清晰，分点论述
5. 结尾提醒：命理分析仅供参考和娱乐，不应作为重大决策的唯一依据

## 语言
使用中文回答，专业术语保留原文。`;
}
