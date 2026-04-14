/**
 * 解析 AI 占星师的分段输出为结构化卡片数据
 *
 * AI 按 ---TAG--- 标题 格式输出，前端解析后渲染为可视化卡片。
 */

export interface ChatSection {
  tag: string;
  title: string;
  icon: string;
  color: string;
  content: string;
}

const SECTION_META: Record<string, { icon: string; color: string }> = {
  SUN:      { icon: '☉', color: '#e8a030' },
  MOON:     { icon: '☽', color: '#8090c0' },
  RISING:   { icon: '↑', color: '#a070c0' },
  VENUS:    { icon: '♀', color: '#d07090' },
  MARS:     { icon: '♂', color: '#c05050' },
  JUPITER:  { icon: '♃', color: '#5090d0' },
  SATURN:   { icon: '♄', color: '#707070' },
  MERCURY:  { icon: '☿', color: '#50b080' },
  CAREER:   { icon: '◆', color: '#4888d0' },
  LOVE:     { icon: '♡', color: '#d07090' },
  TRANSIT:  { icon: '⟳', color: '#8868b0' },
  HEALTH:   { icon: '✦', color: '#40a080' },
  SUMMARY:  { icon: '✧', color: '#7b6cb8' },
};

// Match: ---TAG--- optional title text
const SECTION_RE = /^---([A-Z_]+)---\s*(.*)/;

/**
 * 解析 AI 输出文本为分段卡片数据
 *
 * 如果文本不含任何分段标记，返回 null（表示应回退到普通渲染）。
 */
export function parseChatSections(text: string): ChatSection[] | null {
  const lines = text.split('\n');
  const sections: ChatSection[] = [];
  let current: ChatSection | null = null;

  for (const line of lines) {
    const match = line.match(SECTION_RE);
    if (match) {
      if (current) sections.push(current);
      const tag = match[1];
      const meta = SECTION_META[tag] || { icon: '•', color: '#7b6cb8' };
      current = {
        tag,
        title: match[2].trim() || tag,
        icon: meta.icon,
        color: meta.color,
        content: '',
      };
    } else if (current) {
      current.content += (current.content ? '\n' : '') + line;
    }
    // Lines before the first section marker are ignored
  }
  if (current) sections.push(current);

  // If no sections found, return null to fall back to plain rendering
  if (sections.length === 0) return null;

  // Trim trailing whitespace from each section
  for (const s of sections) {
    s.content = s.content.trim();
  }

  return sections;
}
