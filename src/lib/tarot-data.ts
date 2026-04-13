/**
 * 完整 78 张塔罗牌数据库
 * 22 张大阿卡纳 + 56 张小阿卡纳
 */

export interface TarotCard {
  id: number;           // 1-78
  name: string;         // 中文名
  nameEn: string;       // 英文名
  arcana: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles';
  upright: string;      // 正位关键词
  reversed: string;     // 逆位关键词
  uprightDesc: string;  // 正位详细含义
  reversedDesc: string; // 逆位详细含义
  element?: string;     // 对应元素
  emoji: string;        // 代表符号
}

// ═══════════════════════════════════════
//  大阿卡纳 (Major Arcana) 0-21
// ═══════════════════════════════════════

const MAJOR_ARCANA: TarotCard[] = [
  {
    id: 1, name: '愚者', nameEn: 'The Fool', arcana: 'major',
    upright: '新开始、冒险、纯真、自由', reversed: '鲁莽、犹豫、冒险失败',
    uprightDesc: '愚者正位代表一段崭新旅程的开始。你充满热情与勇气，愿意迈出未知的一步。这张牌鼓励你相信直觉，拥抱可能性，不要被恐惧束缚。',
    reversedDesc: '愚者逆位暗示你可能过于鲁莽或缺乏计划。也可能表示你内心渴望改变却犹豫不决，被恐惧和不安阻碍了脚步。',
    element: '风', emoji: '🃏',
  },
  {
    id: 2, name: '魔术师', nameEn: 'The Magician', arcana: 'major',
    upright: '意志力、创造力、技能、自信', reversed: '欺骗、操控、才华浪费',
    uprightDesc: '魔术师正位表示你拥有实现目标所需的一切资源和能力。现在是将想法付诸行动的最佳时机，你的创造力和沟通能力处于巅峰状态。',
    reversedDesc: '魔术师逆位可能暗示你的才华未被充分利用，或者有人在利用手段欺骗你。也可能意味着你缺乏自信，无法发挥真正的潜力。',
    element: '风', emoji: '🎩',
  },
  {
    id: 3, name: '女祭司', nameEn: 'The High Priestess', arcana: 'major',
    upright: '直觉、潜意识、智慧、神秘', reversed: '忽视直觉、表面化、秘密',
    uprightDesc: '女祭司正位提醒你倾听内心的声音。此刻需要安静反思而非急于行动，你的直觉会引导你找到答案。隐藏的知识即将浮现。',
    reversedDesc: '女祭司逆位表示你可能忽视了自己的直觉，过于依赖外在的建议。也可能有隐藏的信息你尚未察觉，需要更深入地探索内心。',
    element: '水', emoji: '🌙',
  },
  {
    id: 4, name: '女皇', nameEn: 'The Empress', arcana: 'major',
    upright: '丰饶、母性、自然、滋养', reversed: '依赖、空虚、创意枯竭',
    uprightDesc: '女皇正位象征丰饶与创造力的绽放。无论是感情、事业还是创作，都将迎来丰收。她鼓励你连接自然，享受生活的美好与富足。',
    reversedDesc: '女皇逆位可能意味着你过度依赖他人，或者忽略了自我照顾。创造力可能暂时枯竭，需要重新找回与自然和内心的连接。',
    element: '地', emoji: '👑',
  },
  {
    id: 5, name: '皇帝', nameEn: 'The Emperor', arcana: 'major',
    upright: '权威、结构、稳定、领导力', reversed: '专制、僵化、控制欲',
    uprightDesc: '皇帝正位代表秩序、稳定和强大的领导力。现在适合建立结构、制定计划，通过纪律和坚持来实现目标。你有能力掌控局面。',
    reversedDesc: '皇帝逆位警示控制欲过强或过于僵化。你可能在某个领域过度控制，或者感到无力掌控局面。需要学会灵活变通。',
    element: '火', emoji: '🏛️',
  },
  {
    id: 6, name: '教皇', nameEn: 'The Hierophant', arcana: 'major',
    upright: '传统、信仰、指导、教育', reversed: '叛逆、打破常规、教条',
    uprightDesc: '教皇正位暗示你可能需要遵循传统的方式或寻求导师的指引。这是学习和接受教育的好时机，也代表着精神层面的成长。',
    reversedDesc: '教皇逆位可能表示你需要挑战传统观念，走出自己的路。也可能意味着你正在质疑既有的信仰体系或权威人物。',
    element: '地', emoji: '⛪',
  },
  {
    id: 7, name: '恋人', nameEn: 'The Lovers', arcana: 'major',
    upright: '爱情、选择、和谐、价值观', reversed: '不和谐、失衡、错误选择',
    uprightDesc: '恋人正位不仅代表浪漫的爱情，更象征重要的人生抉择。你需要跟随内心做出选择，追求真正与你价值观一致的道路。',
    reversedDesc: '恋人逆位暗示关系中存在不和谐或价值观冲突。你可能面临一个困难的选择，或者正在经历与伴侣/合作伙伴之间的摩擦。',
    element: '风', emoji: '💕',
  },
  {
    id: 8, name: '战车', nameEn: 'The Chariot', arcana: 'major',
    upright: '决心、胜利、意志力、前进', reversed: '失控、挫败、方向迷失',
    uprightDesc: '战车正位代表凭借坚强意志力取得胜利。你有能力克服障碍，掌控前进的方向。保持专注和决心，成功在望。',
    reversedDesc: '战车逆位表示你可能失去了对局面的控制，或者前进的方向不明确。内心的冲突和外在的阻力让你感到迷茫和受挫。',
    element: '水', emoji: '⚔️',
  },
  {
    id: 9, name: '力量', nameEn: 'Strength', arcana: 'major',
    upright: '勇气、内在力量、耐心、自律', reversed: '软弱、自我怀疑、失去控制',
    uprightDesc: '力量正位代表真正的力量来自内心。面对困难时，你需要的不是蛮力，而是耐心、温柔和坚定的内在力量。你有能力驾驭自己的情绪。',
    reversedDesc: '力量逆位暗示你可能正在经历自我怀疑或缺乏自信。你可能感到精疲力尽，难以控制自己的情绪或冲动。',
    element: '火', emoji: '🦁',
  },
  {
    id: 10, name: '隐士', nameEn: 'The Hermit', arcana: 'major',
    upright: '内省、独处、智慧、寻求真理', reversed: '孤僻、逃避、拒绝帮助',
    uprightDesc: '隐士正位建议你暂时远离喧嚣，进行深度的内在探索。独处和反思会帮你找到答案。这是一段精神成长和自我发现的时期。',
    reversedDesc: '隐士逆位可能意味着过度封闭自己或逃避社交。你可能害怕面对真实的自己，或者独处时间过长已影响到正常生活。',
    element: '地', emoji: '🏔️',
  },
  {
    id: 11, name: '命运之轮', nameEn: 'Wheel of Fortune', arcana: 'major',
    upright: '转折、命运、机遇、好运', reversed: '逆境、抗拒改变、坏运',
    uprightDesc: '命运之轮正位预示着命运的转折点即将到来。生活中的变化虽然不可预测，但总体趋势是积极的。抓住即将到来的机遇。',
    reversedDesc: '命运之轮逆位可能意味着你正经历一段不顺利的时期。但请记住，轮子总会转动，逆境是暂时的，保持信心才是关键。',
    element: '火', emoji: '🎡',
  },
  {
    id: 12, name: '正义', nameEn: 'Justice', arcana: 'major',
    upright: '公正、真相、因果、平衡', reversed: '不公、偏见、逃避责任',
    uprightDesc: '正义正位代表因果法则的运作。你之前的努力将得到公正的回报。面对决定时，保持客观和理性，依据事实和良知行事。',
    reversedDesc: '正义逆位暗示你可能正面临不公正的对待，或者自己在逃避应承担的责任。也可能意味着一个决定的结果不如预期。',
    element: '风', emoji: '⚖️',
  },
  {
    id: 13, name: '倒吊人', nameEn: 'The Hanged Man', arcana: 'major',
    upright: '牺牲、等待、新视角、放手', reversed: '拖延、固执、无谓牺牲',
    uprightDesc: '倒吊人正位建议你暂停脚步，从不同的角度审视问题。有时候放手和等待比强行推进更有智慧。这段暂停期会带来全新的领悟。',
    reversedDesc: '倒吊人逆位可能表示你在不必要地拖延或固守无意义的牺牲。是时候结束等待状态，做出决定向前迈进了。',
    element: '水', emoji: '🔮',
  },
  {
    id: 14, name: '死神', nameEn: 'Death', arcana: 'major',
    upright: '结束、转变、重生、蜕变', reversed: '抗拒改变、停滞、恐惧',
    uprightDesc: '死神正位并不代表实际的死亡，而是象征深刻的转变和重生。旧的事物必须结束，才能为新的开始腾出空间。拥抱这个蜕变过程。',
    reversedDesc: '死神逆位表示你正在抗拒必要的改变。你可能紧抓着过去不放，害怕未知的未来。但停滞不前只会延长痛苦。',
    element: '水', emoji: '🦋',
  },
  {
    id: 15, name: '节制', nameEn: 'Temperance', arcana: 'major',
    upright: '平衡、调和、耐心、治愈', reversed: '失衡、极端、缺乏耐心',
    uprightDesc: '节制正位代表和谐与平衡的力量。在各种对立面之间找到中间道路。这是一段治愈和恢复的时期，保持耐心和节制会带来最好的结果。',
    reversedDesc: '节制逆位暗示你的生活失去了平衡，可能过度沉溺于某一方面而忽略了其他。需要重新调整生活节奏和优先级。',
    element: '火', emoji: '☯️',
  },
  {
    id: 16, name: '恶魔', nameEn: 'The Devil', arcana: 'major',
    upright: '束缚、诱惑、执着、物质', reversed: '解脱、觉醒、突破束缚',
    uprightDesc: '恶魔正位揭示你可能被某种执着或诱惑所束缚。无论是物质欲望、不健康的关系还是坏习惯，你需要认清这些枷锁其实是可以打破的。',
    reversedDesc: '恶魔逆位是一个积极的信号，意味着你正在从束缚中解脱出来。你开始觉醒，意识到自己的力量，能够打破不健康的模式。',
    element: '地', emoji: '🔗',
  },
  {
    id: 17, name: '塔', nameEn: 'The Tower', arcana: 'major',
    upright: '突变、破坏、觉醒、真相', reversed: '逃避灾难、延迟改变',
    uprightDesc: '塔正位预示着突如其来的剧变，建立在虚假基础上的事物将会崩塌。虽然过程痛苦，但这种摧毁是必要的，为真正稳固的重建扫清道路。',
    reversedDesc: '塔逆位可能意味着你侥幸躲过了一场危机，或者改变正以较缓和的方式发生。也可能表示你在竭力维持已不可持续的状态。',
    element: '火', emoji: '⚡',
  },
  {
    id: 18, name: '星星', nameEn: 'The Star', arcana: 'major',
    upright: '希望、灵感、平静、祝福', reversed: '失去信心、失望、绝望',
    uprightDesc: '星星正位带来希望和治愈的光芒。经历了风暴之后，平静和美好正在回归。相信自己，保持积极乐观，宇宙正在眷顾你。',
    reversedDesc: '星星逆位暗示你可能暂时失去了希望和方向。内心的焦虑和对未来的不确定让你感到灰心。但请记住，黑暗之后必有黎明。',
    element: '风', emoji: '⭐',
  },
  {
    id: 19, name: '月亮', nameEn: 'The Moon', arcana: 'major',
    upright: '幻觉、恐惧、潜意识、迷惑', reversed: '走出迷雾、直面恐惧',
    uprightDesc: '月亮正位提醒你事情并非表面看到的那样。直觉很强但也容易被恐惧和幻觉所迷惑。需要仔细分辨真相与幻影，不要被情绪左右判断。',
    reversedDesc: '月亮逆位意味着迷雾正在散去，你开始看清真相。曾经的恐惧和困惑正在消退，直觉变得更加清晰和可靠。',
    element: '水', emoji: '🌕',
  },
  {
    id: 20, name: '太阳', nameEn: 'The Sun', arcana: 'major',
    upright: '快乐、成功、活力、光明', reversed: '暂时阴霾、延迟满足',
    uprightDesc: '太阳正位是塔罗牌中最积极的牌之一。它代表纯粹的快乐、成功和满足。一切都在向好的方向发展，你的努力终将得到丰厚的回报。',
    reversedDesc: '太阳逆位仍然是一张积极的牌，只是暗示快乐可能被暂时遮蔽。成功会来临，只是可能需要多一点时间和耐心。',
    element: '火', emoji: '☀️',
  },
  {
    id: 21, name: '审判', nameEn: 'Judgement', arcana: 'major',
    upright: '觉醒、重生、召唤、反思', reversed: '自我怀疑、拒绝醒悟',
    uprightDesc: '审判正位代表内在的觉醒和重要的人生评估。是时候诚实地回顾过去，原谅自己和他人，以全新的姿态迎接生命的下一个篇章。',
    reversedDesc: '审判逆位暗示你可能在逃避对自己的深刻审视，或者害怕做出重大的人生改变。自我怀疑阻碍了你的成长和蜕变。',
    element: '火', emoji: '📯',
  },
  {
    id: 22, name: '世界', nameEn: 'The World', arcana: 'major',
    upright: '完成、圆满、成就、旅程终点', reversed: '未完成、缺少收尾、延迟',
    uprightDesc: '世界正位代表一个重要人生阶段的圆满完成。你的努力和成长得到了回报，一切和谐地汇聚在一起。新的更大的循环即将开始。',
    reversedDesc: '世界逆位暗示你的某个目标尚未完全实现，或者在收尾阶段遇到了阻碍。不要急于跳到下一个阶段，先完成手头的事情。',
    element: '地', emoji: '🌍',
  },
];

// ═══════════════════════════════════════
//  小阿卡纳 (Minor Arcana)
// ═══════════════════════════════════════

type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';

interface SuitInfo {
  suit: Suit;
  suitName: string;
  element: string;
  emoji: string;
}

const SUITS: SuitInfo[] = [
  { suit: 'wands', suitName: '权杖', element: '火', emoji: '🔥' },
  { suit: 'cups', suitName: '圣杯', element: '水', emoji: '🏆' },
  { suit: 'swords', suitName: '宝剑', element: '风', emoji: '🗡️' },
  { suit: 'pentacles', suitName: '星币', element: '地', emoji: '💰' },
];

interface MinorCardTemplate {
  rank: string;
  upright: string;
  reversed: string;
  uprightDesc: (suit: string) => string;
  reversedDesc: (suit: string) => string;
}

const RANK_TEMPLATES: MinorCardTemplate[] = [
  {
    rank: 'Ace', upright: '新机遇、潜能、起点', reversed: '延迟、错失、能量阻塞',
    uprightDesc: (s) => `${s}王牌正位代表${s === '权杖' ? '热情与创意' : s === '圣杯' ? '情感与直觉' : s === '宝剑' ? '智慧与清晰' : '物质与财富'}领域的新起点。一个充满潜力的种子已经种下，需要你用心培育。`,
    reversedDesc: (s) => `${s}王牌逆位暗示在${s === '权杖' ? '行动' : s === '圣杯' ? '情感' : s === '宝剑' ? '思维' : '物质'}方面的新开始遇到了阻碍或延迟。能量被堵塞，需要找到释放的出口。`,
  },
  {
    rank: 'Two', upright: '平衡、选择、合作', reversed: '失衡、犹豫、冲突',
    uprightDesc: (s) => `${s}二正位代表在${s === '权杖' ? '计划与远见' : s === '圣杯' ? '情感连接与伙伴关系' : s === '宝剑' ? '僵局与难以抉择' : '灵活应对与多方平衡'}中寻找平衡点。需要做出选择或建立合作。`,
    reversedDesc: (s) => `${s}二逆位表示在${s === '权杖' ? '规划' : s === '圣杯' ? '关系' : s === '宝剑' ? '决策' : '财务'}方面的平衡被打破。你可能面临选择困难或与他人的分歧。`,
  },
  {
    rank: 'Three', upright: '成长、团队、创造', reversed: '挫折、孤立、过度扩张',
    uprightDesc: (s) => `${s}三正位象征在${s === '权杖' ? '事业的扩展与远景' : s === '圣杯' ? '友情、庆祝与欢聚' : s === '宝剑' ? '心痛与悲伤中的成长' : '技艺的精进与认可'}领域的初步成果。合作与创造力带来增长。`,
    reversedDesc: (s) => `${s}三逆位暗示${s === '权杖' ? '计划遇到延误' : s === '圣杯' ? '社交圈中的摩擦' : s === '宝剑' ? '从伤痛中恢复' : '质量不达标或返工'}。可能需要调整策略或独自面对困境。`,
  },
  {
    rank: 'Four', upright: '稳定、休息、反思', reversed: '不安、停滞、紧张',
    uprightDesc: (s) => `${s}四正位代表${s === '权杖' ? '庆祝与成就的喜悦' : s === '圣杯' ? '情感倦怠与自我审视' : s === '宝剑' ? '休息与恢复能量' : '安全感与物质保障'}。是时候暂停下来巩固现有的成果。`,
    reversedDesc: (s) => `${s}四逆位表示${s === '权杖' ? '缺乏稳定感' : s === '圣杯' ? '重新发现生活热情' : s === '宝剑' ? '被迫行动或焦虑' : '过度吝啬或不安全感'}。稳定的表象下暗藏隐忧。`,
  },
  {
    rank: 'Five', upright: '冲突、挑战、竞争', reversed: '和解、妥协、学习',
    uprightDesc: (s) => `${s}五正位代表${s === '权杖' ? '竞争与意见冲突' : s === '圣杯' ? '失落与遗憾' : s === '宝剑' ? '冲突中的胜利代价' : '困难与物质损失'}。挑战虽然痛苦，但也是成长的催化剂。`,
    reversedDesc: (s) => `${s}五逆位暗示${s === '权杖' ? '冲突的化解' : s === '圣杯' ? '从失落中走出' : s === '宝剑' ? '从争斗中退出' : '困境出现转机'}。最困难的时期正在过去，学会从挫折中汲取教训。`,
  },
  {
    rank: 'Six', upright: '和谐、慷慨、旅程', reversed: '不平等、自私、停滞',
    uprightDesc: (s) => `${s}六正位象征${s === '权杖' ? '成功的认可与胜利' : s === '圣杯' ? '美好的回忆与童真' : s === '宝剑' ? '离开困境走向新生' : '慷慨与慈善'}。生活中的和谐与给予带来内心的满足。`,
    reversedDesc: (s) => `${s}六逆位表示${s === '权杖' ? '认可延迟或自负' : s === '圣杯' ? '沉溺于过去' : s === '宝剑' ? '旅程受阻或无法离开' : '债务或不公平交易'}。需要审视自己在给予和接受间的平衡。`,
  },
  {
    rank: 'Seven', upright: '挑战、坚持、策略', reversed: '放弃、欺骗、失败',
    uprightDesc: (s) => `${s}七正位代表${s === '权杖' ? '捍卫自己的立场' : s === '圣杯' ? '幻想与多重选择' : s === '宝剑' ? '策略与智取' : '等待播种后的收获'}。面对挑战需要坚持和智慧。`,
    reversedDesc: (s) => `${s}七逆位暗示${s === '权杖' ? '感到不堪重负' : s === '圣杯' ? '从幻想回到现实' : s === '宝剑' ? '计划败露或被揭穿' : '投资失误或缺乏耐心'}。坚持变得困难，可能需要重新评估策略。`,
  },
  {
    rank: 'Eight', upright: '行动、速度、变化', reversed: '停滞、阻碍、挣扎',
    uprightDesc: (s) => `${s}八正位表示${s === '权杖' ? '快速的进展与行动' : s === '圣杯' ? '离开不再满足的事物' : s === '宝剑' ? '自我限制与困境' : '专注修炼与精进技能'}。事情正在快速推进或需要快速适应。`,
    reversedDesc: (s) => `${s}八逆位表示${s === '权杖' ? '进展受阻或混乱' : s === '圣杯' ? '犹豫是否要放弃' : s === '宝剑' ? '突破自我限制的曙光' : '缺乏专注或动力不足'}。前进的步伐被拖慢，需要排除障碍。`,
  },
  {
    rank: 'Nine', upright: '接近完成、满足、成熟', reversed: '缺失、不满、过度',
    uprightDesc: (s) => `${s}九正位代表${s === '权杖' ? '坚韧不拔与最后的考验' : s === '圣杯' ? '愿望成真与心灵满足' : s === '宝剑' ? '焦虑与噩梦般的忧虑' : '物质丰盈与独立自主'}。距离目标只有一步之遥。`,
    reversedDesc: (s) => `${s}九逆位暗示${s === '权杖' ? '疲惫但不愿放弃' : s === '圣杯' ? '幸福中的小缺憾' : s === '宝剑' ? '走出焦虑与恢复' : '过度依赖物质安全感'}。接近成功但仍有未完成的课题。`,
  },
  {
    rank: 'Ten', upright: '完成、圆满、结果', reversed: '不完整、负担、崩溃',
    uprightDesc: (s) => `${s}十正位代表${s === '权杖' ? '承担重大责任与负荷' : s === '圣杯' ? '家庭幸福与情感圆满' : s === '宝剑' ? '终结与触底反弹' : '家族财富与长远安稳'}。一个完整的周期即将结束。`,
    reversedDesc: (s) => `${s}十逆位表示${s === '权杖' ? '不堪重负需要释放' : s === '圣杯' ? '家庭或关系的裂痕' : s === '宝剑' ? '最坏的时刻已过去' : '财务的不稳定或纷争'}。事情可能未能如期圆满收场。`,
  },
  {
    rank: 'Page', upright: '信使、好奇、学习', reversed: '不成熟、缺乏方向',
    uprightDesc: (s) => `${s}侍从正位代表${s === '权杖' ? '激情满满的新冒险' : s === '圣杯' ? '温柔的情感萌芽' : s === '宝剑' ? '好奇心驱动的探索' : '学习新技能的机会'}。像一个充满好奇的学生，用新鲜的眼光看待世界。`,
    reversedDesc: (s) => `${s}侍从逆位暗示${s === '权杖' ? '缺乏方向的热情' : s === '圣杯' ? '情感上的不成熟' : s === '宝剑' ? '八卦或言语冲突' : '错过学习或成长的机会'}。热情虽在但缺乏实际行动力。`,
  },
  {
    rank: 'Knight', upright: '行动、追求、勇往直前', reversed: '冲动、不稳定、过度',
    uprightDesc: (s) => `${s}骑士正位代表${s === '权杖' ? '充满激情的冒险行动' : s === '圣杯' ? '浪漫追求与情感表白' : s === '宝剑' ? '果断行动与直言不讳' : '务实地推进目标'}。带着坚定的决心和勇气向前冲。`,
    reversedDesc: (s) => `${s}骑士逆位表示${s === '权杖' ? '冲动鲁莽或半途而废' : s === '圣杯' ? '过度理想化或情绪化' : s === '宝剑' ? '口无遮拦或冷漠无情' : '过于保守或效率低下'}。行动力过强或不足，需要找到平衡点。`,
  },
  {
    rank: 'Queen', upright: '成熟、关怀、掌控', reversed: '情绪化、依赖、苛刻',
    uprightDesc: (s) => `${s}王后正位代表${s === '权杖' ? '自信独立与魅力四射' : s === '圣杯' ? '深沉的共情力与直觉' : s === '宝剑' ? '清晰的判断与独立思考' : '务实的管理与富足生活'}。以优雅和智慧掌控自己的领域。`,
    reversedDesc: (s) => `${s}王后逆位暗示${s === '权杖' ? '霸道或缺乏自信' : s === '圣杯' ? '情绪不稳或过度敏感' : s === '宝剑' ? '冷酷无情或过度批判' : '不善理财或不切实际'}。内在品质的失衡需要调整。`,
  },
  {
    rank: 'King', upright: '权威、领导、成就', reversed: '暴政、软弱、控制欲',
    uprightDesc: (s) => `${s}国王正位代表${s === '权杖' ? '远见卓识的领导者' : s === '圣杯' ? '情感成熟与慷慨仁慈' : s === '宝剑' ? '理性权威与公正决策' : '财务成功与慷慨分享'}。在自己的领域达到了精通与掌控的境界。`,
    reversedDesc: (s) => `${s}国王逆位表示${s === '权杖' ? '独断专行或缺乏远见' : s === '圣杯' ? '情绪操控或逃避责任' : s === '宝剑' ? '滥用权力或思维偏执' : '贪婪或财务管理不善'}。权力或能力被误用或不足。`,
  },
];

const RANK_CN: Record<string, string> = {
  Ace: '王牌', Two: '二', Three: '三', Four: '四', Five: '五',
  Six: '六', Seven: '七', Eight: '八', Nine: '九', Ten: '十',
  Page: '侍从', Knight: '骑士', Queen: '王后', King: '国王',
};

function generateMinorArcana(): TarotCard[] {
  const cards: TarotCard[] = [];
  let id = 23; // start after major arcana

  for (const suitInfo of SUITS) {
    for (const template of RANK_TEMPLATES) {
      cards.push({
        id: id++,
        name: `${suitInfo.suitName}${RANK_CN[template.rank]}`,
        nameEn: `${template.rank} of ${suitInfo.suit.charAt(0).toUpperCase() + suitInfo.suit.slice(1)}`,
        arcana: 'minor',
        suit: suitInfo.suit,
        upright: template.upright,
        reversed: template.reversed,
        uprightDesc: template.uprightDesc(suitInfo.suitName),
        reversedDesc: template.reversedDesc(suitInfo.suitName),
        element: suitInfo.element,
        emoji: suitInfo.emoji,
      });
    }
  }

  return cards;
}

/** All 78 tarot cards */
export const ALL_CARDS: TarotCard[] = [...MAJOR_ARCANA, ...generateMinorArcana()];

/** Get card by id (1-78) */
export function getCardById(id: number): TarotCard | undefined {
  return ALL_CARDS.find(c => c.id === id);
}

/** Draw random cards (no duplicates) */
export function drawRandomCards(count: number): TarotCard[] {
  const shuffled = [...ALL_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** Map numbers to cards (1-78, wraps around) */
export function numberToCard(num: number): TarotCard {
  const idx = ((num - 1) % 78 + 78) % 78;
  return ALL_CARDS[idx];
}

/* ─── Card image URLs (Rider-Waite-Smith, public domain 1909) ─── */

const MAJOR_IMG: Record<number, string> = {
  1: 'RWS_Tarot_00_Fool.jpg',
  2: 'RWS_Tarot_01_Magician.jpg',
  3: 'RWS_Tarot_02_High_Priestess.jpg',
  4: 'RWS_Tarot_03_Empress.jpg',
  5: 'RWS_Tarot_04_Emperor.jpg',
  6: 'RWS_Tarot_05_Hierophant.jpg',
  7: 'TheLovers.jpg',
  8: 'RWS_Tarot_07_Chariot.jpg',
  9: 'RWS_Tarot_08_Strength.jpg',
  10: 'RWS_Tarot_09_Hermit.jpg',
  11: 'RWS_Tarot_10_Wheel_of_Fortune.jpg',
  12: 'RWS_Tarot_11_Justice.jpg',
  13: 'RWS_Tarot_12_Hanged_Man.jpg',
  14: 'RWS_Tarot_13_Death.jpg',
  15: 'RWS_Tarot_14_Temperance.jpg',
  16: 'RWS_Tarot_15_Devil.jpg',
  17: 'RWS_Tarot_16_Tower.jpg',
  18: 'RWS_Tarot_17_Star.jpg',
  19: 'RWS_Tarot_18_Moon.jpg',
  20: 'RWS_Tarot_19_Sun.jpg',
  21: 'RWS_Tarot_20_Judgement.jpg',
  22: 'RWS_Tarot_21_World.jpg',
};

const SUIT_FILE: Record<string, string> = {
  wands: 'Wands', cups: 'Cups', swords: 'Swords', pentacles: 'Pents',
};

const SUIT_START: Record<string, number> = {
  wands: 23, cups: 37, swords: 51, pentacles: 65,
};

/** Get Wikimedia Commons image URL for a card */
export function getCardImageUrl(card: TarotCard): string {
  const BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath';
  if (card.arcana === 'major') {
    return `${BASE}/${MAJOR_IMG[card.id]}?width=300`;
  }
  const prefix = SUIT_FILE[card.suit!];
  const rank = String(card.id - SUIT_START[card.suit!] + 1).padStart(2, '0');
  return `${BASE}/${prefix}${rank}.jpg?width=300`;
}
