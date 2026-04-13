/**
 * 塔罗牌阵定义与自动匹配
 */

export interface SpreadPosition {
  name: string;       // 位置名称，如 "过去"、"现在"
  meaning: string;    // 该位置代表的含义
}

export interface TarotSpread {
  id: string;
  name: string;
  description: string;
  positions: SpreadPosition[];
  cardCount: number;
}

// ─── 所有牌阵 ───

export const SPREADS: Record<string, TarotSpread> = {
  single: {
    id: 'single',
    name: '单牌占卜',
    description: '快速直接的指引，适合简单问题',
    positions: [
      { name: '指引', meaning: '当前情况的核心答案' },
    ],
    cardCount: 1,
  },
  threeCard: {
    id: 'threeCard',
    name: '三张牌阵',
    description: '经典的过去-现在-未来阵，全面审视一个问题',
    positions: [
      { name: '过去', meaning: '影响当前的过往因素' },
      { name: '现在', meaning: '目前的处境与状态' },
      { name: '未来', meaning: '事情的发展趋势' },
    ],
    cardCount: 3,
  },
  loversCross: {
    id: 'loversCross',
    name: '恋人十字牌阵',
    description: '专为感情关系设计的牌阵',
    positions: [
      { name: '你的感受', meaning: '你在这段关系中的真实感受' },
      { name: '对方的感受', meaning: '对方在这段关系中的态度' },
      { name: '关系发展', meaning: '这段关系的未来走向' },
    ],
    cardCount: 3,
  },
  threeCardAction: {
    id: 'threeCardAction',
    name: '状态行动牌阵',
    description: '适合需要行动指引的问题',
    positions: [
      { name: '现状', meaning: '你当前面临的状态' },
      { name: '行动', meaning: '你应该采取的行动' },
      { name: '结果', meaning: '行动后的可能结果' },
    ],
    cardCount: 3,
  },
  threeCardHealth: {
    id: 'threeCardHealth',
    name: '身心灵牌阵',
    description: '从身体、心理、灵性三个维度分析',
    positions: [
      { name: '身体', meaning: '身体层面的状况与建议' },
      { name: '心理', meaning: '心理和情绪的状态' },
      { name: '建议', meaning: '整体的改善方向' },
    ],
    cardCount: 3,
  },
  fourElements: {
    id: 'fourElements',
    name: '四元素牌阵',
    description: '从火水风地四个维度全面分析',
    positions: [
      { name: '火·行动', meaning: '行动力与动力方向' },
      { name: '水·情感', meaning: '情感与直觉的影响' },
      { name: '风·思维', meaning: '思维与沟通的状态' },
      { name: '地·物质', meaning: '物质与现实层面' },
    ],
    cardCount: 4,
  },
  hexagram: {
    id: 'hexagram',
    name: '六芒星牌阵',
    description: '深度分析事业与重大决策',
    positions: [
      { name: '过去影响', meaning: '过去对当下的影响' },
      { name: '现在状况', meaning: '目前面临的核心问题' },
      { name: '隐藏因素', meaning: '你可能忽视的隐藏因素' },
      { name: '建议行动', meaning: '最佳行动方向' },
      { name: '环境影响', meaning: '周围环境和他人的影响' },
      { name: '最终结果', meaning: '事情的最终走向' },
    ],
    cardCount: 6,
  },
};

// ─── 关键词匹配规则 ───

interface MatchRule {
  keywords: string[];
  spreads: string[];   // 对应的 SPREADS key，按优先级排序
}

const MATCH_RULES: MatchRule[] = [
  {
    keywords: ['感情', '爱情', '恋爱', '恋人', '伴侣', '对象', '暧昧', '表白', '分手', '复合', '婚姻', '正缘', '桃花', '喜欢', '另一半'],
    spreads: ['loversCross', 'threeCard'],
  },
  {
    keywords: ['事业', '工作', '升职', '跳槽', '创业', '职业', '面试', '入职', '晋升', '项目', '合作', '老板', '同事'],
    spreads: ['hexagram', 'fourElements'],
  },
  {
    keywords: ['财运', '财富', '金钱', '投资', '理财', '收入', '薪资', '赚钱', '股票', '基金'],
    spreads: ['fourElements', 'hexagram'],
  },
  {
    keywords: ['学业', '考试', '成绩', '学习', '升学', '论文', '考研', '考公', '毕业', '留学'],
    spreads: ['threeCardAction', 'threeCard'],
  },
  {
    keywords: ['健康', '身体', '疾病', '生病', '手术', '恢复', '养生', '锻炼', '减肥'],
    spreads: ['threeCardHealth', 'single'],
  },
];

/**
 * 根据用户问题自动匹配最合适的牌阵
 */
export function matchSpread(question: string): TarotSpread {
  for (const rule of MATCH_RULES) {
    if (rule.keywords.some(kw => question.includes(kw))) {
      return SPREADS[rule.spreads[0]];
    }
  }
  // 默认三张牌阵
  return SPREADS.threeCard;
}

/**
 * 获取所有可用牌阵列表
 */
export function getAllSpreads(): TarotSpread[] {
  return Object.values(SPREADS);
}
