/**
 * AI Astrology Classroom - Interactive Glossary
 * Comprehensive astrology glossary with ~60 entries and HTML annotation utility.
 */

export interface GlossaryEntry {
  term: string;
  aliases?: string[];
  category: 'sign' | 'planet' | 'house' | 'aspect' | 'concept';
  icon: string;
  brief: string;
  detail: string;
  element?: string;
  modality?: string;
  ruler?: string;
  keywords: string[];
}

// ═══════════════════════════════════════
//  12 星座 (Signs)
// ═══════════════════════════════════════

const SIGNS: GlossaryEntry[] = [
  {
    term: '白羊座', aliases: ['白羊', '牡羊座'],
    category: 'sign', icon: '♈',
    brief: '黄道第一宫，天生的开拓者与行动派。',
    detail: '白羊座是春天的第一个星座，充满了生命力与勇气。白羊座的人像火焰一样热情直接，喜欢冲在最前面。他们不怕挑战，行动力超强，但有时候也会因为太着急而忽略细节。',
    element: '火', modality: '开创', ruler: '火星',
    keywords: ['勇敢', '行动力', '直率', '冲劲', '领导', '竞争'],
  },
  {
    term: '金牛座', aliases: ['金牛'],
    category: 'sign', icon: '♉',
    brief: '踏实可靠的守护者，重视安全感与美好事物。',
    detail: '金牛座是大地的孩子，天生对美食、音乐、舒适的环境有敏锐的感知。他们做事稳扎稳打，一旦下定决心就很难被动摇。金牛座的人用耐心和毅力构建自己的安全感，也最懂得享受生活。',
    element: '土', modality: '固定', ruler: '金星',
    keywords: ['稳定', '务实', '耐心', '感官', '财富', '忠诚'],
  },
  {
    term: '双子座', aliases: ['双子'],
    category: 'sign', icon: '♊',
    brief: '灵活多变的信息使者，好奇心旺盛。',
    detail: '双子座的人思维敏捷，像一阵风一样灵活多变。他们对世界充满好奇，擅长沟通和表达，总能在不同领域间自如切换。虽然有时会显得三分钟热度，但双子座的适应力和学习能力是无人能及的。',
    element: '风', modality: '变动', ruler: '水星',
    keywords: ['沟通', '好奇', '灵活', '机智', '多才', '善变'],
  },
  {
    term: '巨蟹座', aliases: ['巨蟹'],
    category: 'sign', icon: '♋',
    brief: '温柔敏感的守护者，家与情感的港湾。',
    detail: '巨蟹座由月亮守护，是黄道中最富有情感的星座。他们像螃蟹一样，外壳坚硬内心柔软，总是默默保护着身边的人。巨蟹座的人重视家庭和归属感，有着超强的共情能力和记忆力。',
    element: '水', modality: '开创', ruler: '月亮',
    keywords: ['温情', '家庭', '保护', '直觉', '敏感', '滋养'],
  },
  {
    term: '狮子座', aliases: ['狮子'],
    category: 'sign', icon: '♌',
    brief: '自信闪耀的王者，天生的舞台焦点。',
    detail: '狮子座由太阳守护，自带光芒和感染力。他们慷慨大方、充满热情，走到哪里都是人群的焦点。狮子座的人有强烈的自尊心和创造力，渴望被认可和欣赏，也愿意用自己的温暖照亮别人。',
    element: '火', modality: '固定', ruler: '太阳',
    keywords: ['自信', '创造力', '慷慨', '领袖', '戏剧性', '忠诚'],
  },
  {
    term: '处女座', aliases: ['处女'],
    category: 'sign', icon: '♍',
    brief: '细致入微的完美主义者，服务与分析的达人。',
    detail: '处女座是黄道中最注重细节的星座。他们拥有极强的分析能力和逻辑思维，总能发现别人忽略的问题。处女座的人看似挑剔，其实是发自内心地想要让一切变得更好，他们的服务精神令人敬佩。',
    element: '土', modality: '变动', ruler: '水星',
    keywords: ['细致', '分析', '服务', '务实', '健康', '完善'],
  },
  {
    term: '天秤座', aliases: ['天秤', '天平座'],
    category: 'sign', icon: '♎',
    brief: '追求和谐与美的外交家，关系的艺术大师。',
    detail: '天秤座是天生的调和者，他们渴望公平、和谐与美好的关系。由金星守护的天秤座有很强的审美品味，善于在人际关系中找到平衡点。他们温文尔雅、善解人意，但有时也会因为太在意他人感受而犹豫不决。',
    element: '风', modality: '开创', ruler: '金星',
    keywords: ['和谐', '公平', '审美', '社交', '优雅', '合作'],
  },
  {
    term: '天蝎座', aliases: ['天蝎'],
    category: 'sign', icon: '♏',
    brief: '深邃强烈的变革者，洞察人心的力量。',
    detail: '天蝎座是黄道中最有深度和强度的星座。他们拥有穿透表象的洞察力，不怕面对生命中最黑暗和复杂的层面。天蝎座的人爱恨分明、意志坚定，一旦认定目标就会全力以赴，有着令人敬畏的重生与蜕变能力。',
    element: '水', modality: '固定', ruler: '冥王星',
    keywords: ['深度', '洞察', '蜕变', '专注', '神秘', '力量'],
  },
  {
    term: '射手座', aliases: ['射手', '人马座'],
    category: 'sign', icon: '♐',
    brief: '自由奔放的探索者，永远在追寻更大的真相。',
    detail: '射手座是黄道中最热爱自由的星座，他们的箭永远射向远方。射手座的人乐观开朗、热爱冒险，对哲学、旅行和异国文化充满热情。他们直言不讳、胸怀宽广，总能给身边的人带来希望和欢笑。',
    element: '火', modality: '变动', ruler: '木星',
    keywords: ['自由', '探索', '乐观', '哲学', '冒险', '直率'],
  },
  {
    term: '摩羯座', aliases: ['摩羯', '山羊座'],
    category: 'sign', icon: '♑',
    brief: '坚韧不拔的攀登者，长期目标的实践家。',
    detail: '摩羯座像山羊一样，不管山有多高都会一步一步往上爬。他们务实、有责任心、极度自律，是十二星座中最有长远眼光的。摩羯座的人可能不会急于表现，但时间会证明他们的实力和价值。',
    element: '土', modality: '开创', ruler: '土星',
    keywords: ['责任', '自律', '野心', '坚韧', '务实', '权威'],
  },
  {
    term: '水瓶座', aliases: ['水瓶', '宝瓶座'],
    category: 'sign', icon: '♒',
    brief: '独立前卫的革新者，为人类未来而思考。',
    detail: '水瓶座是黄道中最具独创性和前瞻性的星座。他们不走寻常路，总能看到别人看不到的可能性。水瓶座的人重视友谊和群体，但同时极度需要个人空间和自由。他们追求的不只是个人成功，更是整个世界的进步。',
    element: '风', modality: '固定', ruler: '天王星',
    keywords: ['独立', '创新', '人道', '前卫', '友谊', '自由'],
  },
  {
    term: '双鱼座', aliases: ['双鱼'],
    category: 'sign', icon: '♓',
    brief: '浪漫梦幻的灵魂艺术家，深具同理心。',
    detail: '双鱼座是黄道的最后一个星座，融合了前面十一个星座的智慧。他们有着丰富的想象力和极深的同理心，能感受到别人感受不到的微妙情感。双鱼座的人天生有艺术才华，在梦想与现实之间自由游走。',
    element: '水', modality: '变动', ruler: '海王星',
    keywords: ['直觉', '共情', '浪漫', '想象力', '灵性', '艺术'],
  },
];

// ═══════════════════════════════════════
//  10 行星 + 北交点 (Planets)
// ═══════════════════════════════════════

const PLANETS: GlossaryEntry[] = [
  {
    term: '太阳', aliases: ['日'],
    category: 'planet', icon: '☉',
    brief: '核心自我，代表你最本质的生命力与意志。',
    detail: '太阳是星盘的核心，代表你最真实的自我、生命目标和创造力。它描述了你内心深处「我是谁」的答案。太阳所在的星座就是我们通常说的「星座」，也就是你性格中最稳定、最核心的部分。',
    keywords: ['自我', '意志', '生命力', '核心性格', '父亲', '权威'],
  },
  {
    term: '月亮', aliases: ['月'],
    category: 'planet', icon: '☽',
    brief: '内心情感世界，你的本能反应和安全感来源。',
    detail: '月亮掌管你的情绪、直觉和潜意识，是你最私密的内在世界。它决定了你在放松状态下是什么样子、需要什么才能感到安心。月亮星座往往比太阳星座更能描述你的真实感受和情感模式。',
    keywords: ['情绪', '直觉', '安全感', '母亲', '习惯', '潜意识'],
  },
  {
    term: '水星',
    category: 'planet', icon: '☿',
    brief: '思维与沟通方式，你如何思考和表达。',
    detail: '水星主宰思维、学习、沟通和信息处理。它决定了你的思考方式——是快速直觉型还是缜密分析型，以及你喜欢怎样表达自己。水星逆行时期常常被提到，那是反思和检视沟通的好时机。',
    keywords: ['思维', '沟通', '学习', '表达', '逻辑', '信息'],
  },
  {
    term: '金星',
    category: 'planet', icon: '♀',
    brief: '爱与美的使者，你的恋爱方式和审美品味。',
    detail: '金星掌管爱情、美、价值观和享乐。它描述了你在感情中被什么吸引、如何表达爱、以及你觉得什么是美好的。金星也和金钱态度有关——你愿意为什么花钱，往往反映了金星的特质。',
    keywords: ['爱情', '美', '价值观', '享乐', '艺术', '和谐'],
  },
  {
    term: '火星',
    category: 'planet', icon: '♂',
    brief: '行动力与欲望的驱动者，你的战斗方式。',
    detail: '火星代表你的行动力、野心、欲望和愤怒的表达方式。它决定了你追求目标时的风格——是猛冲型还是策略型，以及你在面对冲突时如何反应。火星也和你的身体能量、运动偏好密切相关。',
    keywords: ['行动', '勇气', '欲望', '竞争', '愤怒', '能量'],
  },
  {
    term: '木星',
    category: 'planet', icon: '♃',
    brief: '幸运与扩张之星，你的成长方向和信仰。',
    detail: '木星是占星中最大的吉星，它所到之处带来扩张、机遇和好运。木星代表你的人生哲学、信仰体系，以及你最容易在哪个领域获得丰盛。不过木星的「多多益善」有时也会带来过度膨胀的倾向。',
    keywords: ['幸运', '扩张', '智慧', '信仰', '慷慨', '成长'],
  },
  {
    term: '土星',
    category: 'planet', icon: '♄',
    brief: '人生的严师，教你责任、纪律和耐心的功课。',
    detail: '土星常被称为「业力之星」，它指出你人生中需要下苦功的领域。虽然土星带来的考验不轻松，但它的礼物是真正的成熟和成就。每29年一次的土星回归是人生的重要转折点，标志着真正的成长。',
    keywords: ['责任', '纪律', '限制', '考验', '成熟', '结构'],
  },
  {
    term: '天王星',
    category: 'planet', icon: '♅',
    brief: '叛逆与创新之星，突破常规的力量。',
    detail: '天王星代表突变、革新和对自由的渴望。它在星盘中的位置揭示了你最不愿意墨守成规的领域，以及你独特的天赋。天王星的能量像闪电一样突然而有力，它推动你打破旧模式、拥抱全新的可能性。',
    keywords: ['创新', '自由', '叛逆', '突变', '觉醒', '独特'],
  },
  {
    term: '海王星',
    category: 'planet', icon: '♆',
    brief: '梦想与灵感之星，连接灵性世界的通道。',
    detail: '海王星掌管梦想、灵感、直觉和一切超越物质的领域。它能带来非凡的艺术灵感和灵性体验，但也可能制造迷雾和幻觉。海王星提醒我们，世界上有些东西是无法用逻辑解释的，需要用心去感受。',
    keywords: ['梦想', '灵感', '灵性', '幻觉', '慈悲', '艺术'],
  },
  {
    term: '冥王星',
    category: 'planet', icon: '♇',
    brief: '深层蜕变之星，毁灭与重生的力量。',
    detail: '冥王星代表深层的转化、权力和生命中最深刻的体验。它揭示了你需要面对和放下的东西，以及经历「死亡与重生」的人生领域。冥王星的力量是缓慢而深远的，它的蜕变虽然艰难却能带来真正的力量。',
    keywords: ['蜕变', '权力', '深度', '重生', '执着', '疗愈'],
  },
  {
    term: '北交点', aliases: ['北交', '龙头'],
    category: 'planet', icon: '☊',
    brief: '灵魂的成长方向，今生最该探索的领域。',
    detail: '北交点不是实际的星体，而是月亮轨道与黄道的交点。在占星中，它代表你灵魂在这一生想要成长的方向——可能让你感到陌生和不舒服，但越是朝这个方向走，就越能找到人生的意义和满足感。',
    keywords: ['灵魂使命', '成长方向', '命运', '人生目标', '潜能'],
  },
];

// ═══════════════════════════════════════
//  12 宫位 (Houses)
// ═══════════════════════════════════════

const HOUSES: GlossaryEntry[] = [
  {
    term: '第一宫', aliases: ['一宫', '命宫'],
    category: 'house', icon: '1',
    brief: '命宫——你的面具与外在形象，别人第一眼看到的你。',
    detail: '第一宫是星盘的起点，也叫上升点所在的宫位。它决定了你给人的第一印象、外貌特征和自然而然的行为方式。第一宫就像你面对世界时戴上的面具，是你最外在的「人设」。',
    keywords: ['外在形象', '第一印象', '自我认同', '体质'],
  },
  {
    term: '第二宫', aliases: ['二宫', '财帛宫'],
    category: 'house', icon: '2',
    brief: '财帛宫——你的金钱观念和物质安全感。',
    detail: '第二宫掌管你的财务状况、物质资源和自我价值感。它描述了你赚钱的方式、花钱的态度，以及什么能让你在物质层面感到安心。第二宫也和你的天赋才能有关——你天生「值钱」的地方。',
    keywords: ['财富', '价值观', '物质', '自我价值', '才能'],
  },
  {
    term: '第三宫', aliases: ['三宫', '兄弟宫'],
    category: 'house', icon: '3',
    brief: '兄弟宫——日常沟通、学习和近距离交流。',
    detail: '第三宫掌管日常的沟通与交流、短途旅行、基础教育和兄弟姐妹关系。它描述了你的思维风格、说话方式和学习习惯。在现代占星中，第三宫也和社交媒体表达、日常通勤等有关。',
    keywords: ['沟通', '学习', '兄弟姐妹', '短途旅行', '写作'],
  },
  {
    term: '第四宫', aliases: ['四宫', '田宅宫'],
    category: 'house', icon: '4',
    brief: '田宅宫——你的根基、家庭和内心最深处。',
    detail: '第四宫是星盘的最底部，代表你的根基——家庭背景、童年记忆、以及你内心最隐秘的情感。它也和房产、故乡有关。第四宫揭示了什么样的环境能让你真正放松下来、找到「家」的感觉。',
    keywords: ['家庭', '根基', '童年', '母亲', '房产', '安全感'],
  },
  {
    term: '第五宫', aliases: ['五宫', '子女宫'],
    category: 'house', icon: '5',
    brief: '子女宫——创造力、恋爱和纯粹的快乐。',
    detail: '第五宫是最「好玩」的宫位，掌管恋爱（注意是恋爱而非婚姻）、创造力、娱乐、孩子和一切让你开心的事。它描述了你在放飞自我时是什么样子，你的「快乐密码」藏在这里。',
    keywords: ['恋爱', '创造力', '娱乐', '子女', '冒险', '表演'],
  },
  {
    term: '第六宫', aliases: ['六宫', '奴仆宫'],
    category: 'house', icon: '6',
    brief: '奴仆宫——日常工作、健康习惯和服务意识。',
    detail: '第六宫掌管你的日常工作节奏、健康状况、生活习惯和为他人服务的方式。它不是关于事业的高光时刻，而是每一天的柴米油盐——你怎么安排工作、照顾身体、和同事相处。',
    keywords: ['日常工作', '健康', '习惯', '服务', '宠物', '细节'],
  },
  {
    term: '第七宫', aliases: ['七宫', '夫妻宫'],
    category: 'house', icon: '7',
    brief: '夫妻宫——一对一的亲密关系与合作伙伴。',
    detail: '第七宫是第一宫的对面，代表你在重要关系中的模式——婚姻、商业合作、甚至公开的敌人。它描述了你渴望什么样的伴侣，以及你在亲密关系中会呈现出什么样的一面。',
    keywords: ['婚姻', '伴侣', '合作', '关系', '契约', '他人'],
  },
  {
    term: '第八宫', aliases: ['八宫', '疾厄宫'],
    category: 'house', icon: '8',
    brief: '疾厄宫——深层转化、共享资源与生命奥秘。',
    detail: '第八宫是星盘中最「深」的宫位之一，掌管深度的心理转化、亲密关系中的融合、共享财务（投资、保险、遗产）以及生死议题。这里藏着你最不愿面对却最能带来蜕变的人生课题。',
    keywords: ['蜕变', '亲密', '共享资源', '心理', '神秘', '重生'],
  },
  {
    term: '第九宫', aliases: ['九宫', '迁移宫'],
    category: 'house', icon: '9',
    brief: '迁移宫——远方的旅行、高等教育和人生信仰。',
    detail: '第九宫是探索更大世界的窗口，掌管长途旅行、异国文化、高等教育、哲学和宗教信仰。它描述了你如何寻找人生的意义，以及你和「远方」的关系——无论是地理上的还是精神上的远方。',
    keywords: ['旅行', '哲学', '教育', '信仰', '异国', '远见'],
  },
  {
    term: '第十宫', aliases: ['十宫', '官禄宫'],
    category: 'house', icon: '10',
    brief: '官禄宫——事业成就、社会地位和人生志向。',
    detail: '第十宫位于星盘最顶端（中天所在位置），代表你在社会中的地位、事业目标和公众形象。它描述了你想在世界上留下什么样的印记，以及你最终能达到什么样的成就。这是你「被世界记住」的宫位。',
    keywords: ['事业', '成就', '社会地位', '使命', '权威', '荣誉'],
  },
  {
    term: '第十一宫', aliases: ['十一宫', '福德宫'],
    category: 'house', icon: '11',
    brief: '福德宫——友谊、社群和对未来的愿景。',
    detail: '第十一宫掌管友谊、社会团体、理想愿景和对未来的期待。它描述了你在群体中扮演什么角色、被什么样的朋友吸引，以及你对世界有什么样的美好愿望。在现代社会，它也和你的「社群圈子」有关。',
    keywords: ['友谊', '社群', '理想', '愿望', '团队', '未来'],
  },
  {
    term: '第十二宫', aliases: ['十二宫', '玄秘宫'],
    category: 'house', icon: '12',
    brief: '玄秘宫——潜意识深处、灵性修行和隐藏的力量。',
    detail: '第十二宫是星盘中最神秘的领域，掌管潜意识、梦境、灵性体验和隐藏的内在世界。它代表你需要独处时的状态、前世的印记、以及那些难以言说的内心感受。这是一个需要安静倾听的宫位。',
    keywords: ['潜意识', '灵性', '梦境', '隐退', '疗愈', '牺牲'],
  },
];

// ═══════════════════════════════════════
//  5 相位 (Aspects)
// ═══════════════════════════════════════

const ASPECTS: GlossaryEntry[] = [
  {
    term: '合相', aliases: ['合', '0度'],
    category: 'aspect', icon: '☌',
    brief: '两颗行星紧密相连（0°），能量融合为一体。',
    detail: '合相是最强烈的相位，两颗行星的能量完全融合在一起，像两种颜料混在一起产生新的颜色。合相既不算好也不算坏，取决于哪两颗行星相遇。能量可以是强化也可以是碰撞，关键看你怎么运用。',
    keywords: ['融合', '强化', '起始', '集中', '混合'],
  },
  {
    term: '六合', aliases: ['六分相', '60度'],
    category: 'aspect', icon: '⚹',
    brief: '和谐的机遇相位（60°），需要你主动抓住。',
    detail: '六合是一个轻松愉快的相位，两颗行星之间形成友好的合作关系。它带来机遇和可能性，但不会把好运直接送到你手上——你需要主动去把握。六合就像一扇微微打开的门，推一下就能看到新风景。',
    keywords: ['机遇', '和谐', '合作', '轻松', '潜力'],
  },
  {
    term: '四分相', aliases: ['刑克', '刑', '90度', '四分'],
    category: 'aspect', icon: '□',
    brief: '内在张力与挑战（90°），推动你行动和成长。',
    detail: '四分相制造摩擦和紧张感，两颗行星的能量像在「掰手腕」。这听起来不太舒服，但恰恰是四分相给了你改变的动力——如果一切顺顺利利，你可能永远不会迈出那一步。它是成长的催化剂。',
    keywords: ['挑战', '张力', '行动', '冲突', '成长', '转折'],
  },
  {
    term: '三合', aliases: ['拱', '三分相', '120度'],
    category: 'aspect', icon: '△',
    brief: '天赐的和谐流动（120°），与生俱来的天赋。',
    detail: '三合是最和谐的相位，两颗行星之间能量自然流动，毫不费力。它代表你的天赋和幸运所在。不过三合也有「太顺利」的风险——因为不需要努力就能得到，有时反而容易被忽略或浪费。',
    keywords: ['天赋', '和谐', '流畅', '幸运', '自然', '才能'],
  },
  {
    term: '对冲', aliases: ['冲', '对分相', '180度', '对冲相'],
    category: 'aspect', icon: '☍',
    brief: '对立面的拉扯（180°），学会在两极间找到平衡。',
    detail: '对冲相让两颗行星隔着星盘「对望」，像跷跷板的两端不断拉锯。这个相位的功课是平衡——你往往在两个相反的需求间摇摆。好消息是，当你学会整合这两种能量时，就能获得比任何一端都更完整的视角。',
    keywords: ['对立', '平衡', '关系', '觉察', '整合', '投射'],
  },
];

// ═══════════════════════════════════════
//  关键概念 (Concepts)
// ═══════════════════════════════════════

const CONCEPTS: GlossaryEntry[] = [
  {
    term: '上升点', aliases: ['上升', 'ASC', '上升星座'],
    category: 'concept', icon: '⬆',
    brief: '你出生时东方地平线的星座，决定了你的外在人设。',
    detail: '上升点是你出生那一刻东方地平线正在升起的星座度数，也是星盘第一宫的起点。它决定了你给别人的第一印象和自然而然的行为方式。很多人觉得上升星座比太阳星座更像「别人眼中的你」。',
    keywords: ['第一印象', '外在形象', '面具', '生命起点'],
  },
  {
    term: '中天', aliases: ['MC', '天顶'],
    category: 'concept', icon: '⬆',
    brief: '星盘最高点，代表你的事业方向和社会形象。',
    detail: '中天是星盘中最高的位置，也是第十宫的起点。它代表你想在世界上留下什么印记——你的事业方向、职业形象和人生成就。如果上升点是你的「出场方式」，中天就是你的「人生巅峰」。',
    keywords: ['事业', '社会形象', '人生目标', '公众', '成就'],
  },
  {
    term: '下降点', aliases: ['下降', 'DSC'],
    category: 'concept', icon: '⬇',
    brief: '上升的对面，揭示你在关系中寻找的另一半。',
    detail: '下降点是上升点的正对面，也是第七宫的起点。如果上升是「我」，下降就是「你」——它描述了你在伴侣和合作关系中最被吸引的特质。有趣的是，下降点的特质往往是你自身不太发展的那一面。',
    keywords: ['伴侣特质', '关系需求', '合作', '互补'],
  },
  {
    term: '天底', aliases: ['IC', '下中天'],
    category: 'concept', icon: '⬇',
    brief: '星盘最深处，你的情感根基和内心归属。',
    detail: '天底是中天的对面，也是第四宫的起点，位于星盘最底部。它代表你最私密的情感世界、家庭根基和内心安全感的来源。当你疲惫不堪想回到最舒适的状态，天底描述的就是那个「家」的感觉。',
    keywords: ['家庭', '根基', '内心', '归属感', '私密'],
  },
  {
    term: '逆行', aliases: ['行星逆行', '退行'],
    category: 'concept', icon: '℞',
    brief: '行星看起来在「倒退」，是反思和回顾的时期。',
    detail: '逆行不是行星真的在倒退，而是从地球视角看起来像在后退（就像两辆车并行时的错觉）。逆行期间，那颗行星掌管的事务容易出现延迟、重新审视或「回炉再造」的情况。水星逆行是最出名的，但每颗行星都会逆行。',
    keywords: ['反思', '延迟', '回顾', '内省', '重新审视'],
  },
  {
    term: '入庙', aliases: ['庙旺', '守护'],
    category: 'concept', icon: '🏛',
    brief: '行星回到自己守护的星座，能量最强最自在。',
    detail: '当一颗行星落在它守护的星座时就叫「入庙」，比如火星在白羊座、金星在金牛座。这时行星就像回到了自己的家，能量发挥得最自在、最充分。入庙的行星通常意味着这个领域是你的强项。',
    keywords: ['守护', '强势', '自在', '最佳状态', '掌管'],
  },
  {
    term: '旺相', aliases: ['擢升', '耀升'],
    category: 'concept', icon: '⭐',
    brief: '行星在特别友好的星座，表现突出受到「提拔」。',
    detail: '旺相（也叫擢升）是行星在某个特定星座特别出色的状态，比如太阳在白羊座旺相、月亮在金牛座旺相。虽然不是自己的「家」，但像是被提拔到重要岗位，能展现出特别耀眼的一面。',
    keywords: ['提升', '突出', '优势', '发挥', '受尊'],
  },
  {
    term: '落陷', aliases: ['失势', '陷落'],
    category: 'concept', icon: '⬇',
    brief: '行星在不利的星座，需要花更多功夫才能发挥。',
    detail: '落陷是入庙的反面——行星落在与守护星座相对的星座，比如火星在天秤座、金星在天蝎座。这不代表「不好」，只是行星表达自己的方式不那么直接，需要你付出更多努力来找到属于自己的表达方式。',
    keywords: ['挑战', '不利', '需要努力', '非典型', '成长'],
  },
  {
    term: '宫主星', aliases: ['宫头主星', '宫位守护星'],
    category: 'concept', icon: '👑',
    brief: '掌管某个宫位的行星，是那个宫位的「老板」。',
    detail: '宫主星就是某个宫位宫头星座的守护星。比如你的第七宫宫头是天蝎座，那冥王星就是你第七宫的宫主星。宫主星在星盘中的位置和状态，深刻影响着那个宫位的人生领域，就像一个部门老板的风格会影响整个部门。',
    keywords: ['守护', '掌管', '影响', '连结', '主宰'],
  },
  {
    term: '容许度', aliases: ['容许', '度数容许'],
    category: 'concept', icon: '📐',
    brief: '相位的「误差空间」，角度不必完全精确。',
    detail: '在占星中，两颗行星形成相位时不需要角度完全精确。比如三合是120°，但118°或122°也算三合，这个允许的偏差范围就叫容许度。一般来说，容许度越小，相位的影响力越强。太阳和月亮的容许度通常会给得更大一些。',
    keywords: ['精确度', '角度偏差', '相位强度', '允许范围'],
  },
];

// ═══════════════════════════════════════
//  完整词汇表
// ═══════════════════════════════════════

export const GLOSSARY: GlossaryEntry[] = [
  ...SIGNS,
  ...PLANETS,
  ...HOUSES,
  ...ASPECTS,
  ...CONCEPTS,
];

// ═══════════════════════════════════════
//  Helper: 根据 term 或 alias 查找词条
// ═══════════════════════════════════════

/** Look up an entry by its canonical term or any alias. */
export function getGlossaryEntry(term: string): GlossaryEntry | undefined {
  const normalized = term.trim();
  return GLOSSARY.find(
    (entry) =>
      entry.term === normalized ||
      entry.aliases?.includes(normalized),
  );
}

// ═══════════════════════════════════════
//  Helper: 在 HTML 中标注术语
// ═══════════════════════════════════════

/**
 * Annotate HTML with glossary term spans.
 * Returns HTML string with matched terms wrapped in
 *   <span class="glossary-term" data-term="...">
 * Matches longest terms first to avoid partial matches.
 * Only annotates the FIRST occurrence of each term.
 * Avoids matching inside HTML tags or already-annotated spans.
 */
export function annotateGlossaryTerms(html: string): string {
  // 1. Build a flat list of { text, canonicalTerm } sorted by length desc
  const termPairs: { text: string; canonical: string }[] = [];
  for (const entry of GLOSSARY) {
    termPairs.push({ text: entry.term, canonical: entry.term });
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        termPairs.push({ text: alias, canonical: entry.term });
      }
    }
  }
  // Sort by text length descending so longer matches take priority
  termPairs.sort((a, b) => b.text.length - a.text.length);

  // Track which canonical terms have already been annotated
  const annotated = new Set<string>();

  // 2. Process each term
  for (const { text, canonical } of termPairs) {
    if (annotated.has(canonical)) continue;

    // Escape regex special chars in the term text
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Build a regex that:
    // - Matches the term text
    // - Only when NOT inside an HTML tag (< ... >) or an already-annotated span
    // Strategy: split on HTML tags, only replace in text nodes
    const termRegex = new RegExp(escaped);

    let found = false;
    const parts: string[] = [];
    // Split HTML into tag tokens and text tokens
    // The regex captures HTML tags (including self-closing) and annotated spans
    const tokenRegex = /(<[^>]*>)/g;
    const tokens = html.split(tokenRegex);

    let insideAnnotatedSpan = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Check if this is an HTML tag
      if (token.startsWith('<')) {
        // Track whether we're inside an already-annotated glossary span
        if (token.startsWith('<span') && token.includes('glossary-term')) {
          insideAnnotatedSpan++;
        } else if (token === '</span>' && insideAnnotatedSpan > 0) {
          insideAnnotatedSpan--;
        }
        parts.push(token);
        continue;
      }

      // It's a text node — only replace if not inside an annotated span, and only first occurrence
      if (!found && insideAnnotatedSpan === 0 && termRegex.test(token)) {
        // Replace only the first match in this text node
        parts.push(
          token.replace(
            termRegex,
            `<span class="glossary-term" data-term="${canonical}">${text}</span>`,
          ),
        );
        found = true;
      } else {
        parts.push(token);
      }
    }

    if (found) {
      html = parts.join('');
      annotated.add(canonical);
    }
  }

  return html;
}
