/**
 * 解析 AI 占星师的分段输出为结构化卡片数据
 *
 * AI 按 ---TAG--- 标题 格式输出，前端解析后渲染为可视化卡片。
 * 每个板块包含 📊数据 🔮解读 💡建议 三个子结构。
 */

export interface SectionPart {
  type: 'data' | 'insight' | 'advice' | 'text';
  emoji: string;
  label: string;
  content: string;
}

export interface ChatSection {
  tag: string;
  title: string;
  icon: string;
  color: string;
  content: string;
  /** Structured sub-parts (📊🔮💡) if found */
  parts: SectionPart[];
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
  PATTERN:  { icon: '⚝', color: '#9070b0' },
  SUMMARY:  { icon: '✧', color: '#7b6cb8' },
};

// Match: ---TAG--- optional title text
const SECTION_RE = /^---([A-Z_]+)---\s*(.*)/;

// Match emoji sub-section markers: 📊 数据：... / 🔮 解读：... / 💡 建议：...
const PART_PATTERNS: { re: RegExp; type: SectionPart['type']; emoji: string; label: string }[] = [
  { re: /^📊\s*(?:数据[：:]?\s*)/, type: 'data', emoji: '📊', label: '数据' },
  { re: /^🔮\s*(?:解读[：:]?\s*)/, type: 'insight', emoji: '🔮', label: '解读' },
  { re: /^💡\s*(?:建议[：:]?\s*)/, type: 'advice', emoji: '💡', label: '建议' },
];

/**
 * 将单个 section 的内容解析为结构化子部分（📊🔮💡）
 */
function parseContentParts(content: string): SectionPart[] {
  const lines = content.split('\n');
  const parts: SectionPart[] = [];
  let current: SectionPart | null = null;

  for (const line of lines) {
    let matched = false;
    for (const pat of PART_PATTERNS) {
      if (pat.re.test(line)) {
        if (current) parts.push(current);
        const text = line.replace(pat.re, '').trim();
        current = { type: pat.type, emoji: pat.emoji, label: pat.label, content: text };
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (current) {
        current.content += (current.content ? '\n' : '') + line;
      } else {
        // Text before any emoji marker
        if (line.trim()) {
          parts.push({ type: 'text', emoji: '', label: '', content: line });
        }
      }
    }
  }
  if (current) parts.push(current);

  // Trim all parts
  for (const p of parts) {
    p.content = p.content.trim();
  }

  return parts.filter(p => p.content);
}

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
        parts: [],
      };
    } else if (current) {
      current.content += (current.content ? '\n' : '') + line;
    }
    // Lines before the first section marker are ignored
  }
  if (current) sections.push(current);

  // If no sections found, return null to fall back to plain rendering
  if (sections.length === 0) return null;

  // Trim and parse sub-parts for each section
  for (const s of sections) {
    s.content = s.content.trim();
    s.parts = parseContentParts(s.content);
  }

  return sections;
}
