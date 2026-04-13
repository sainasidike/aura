import { NextRequest } from 'next/server';
import { streamChat, type ZhipuMessage } from '@/lib/ai/zhipu';
import { calculateChartFromDate } from '@/lib/engines/astrology';

const SIGNS = ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼'];
function lonToSign(lon: number) {
  const n = ((lon % 360) + 360) % 360;
  const si = Math.floor(n / 30);
  return `${SIGNS[si]}${Math.floor(n - si * 30)}°`;
}

/**
 * 通用行运触发计算：未来 N 年内指定行星对目标点的相位
 */
function calculateTargetTransits(opts: {
  targetLon: number;
  targetName: string;
  trackPlanets: string[];
  latitude: number;
  longitude: number;
  years?: number;
}): string {
  const { targetLon, targetName, trackPlanets, latitude, longitude, years = 5 } = opts;
  const now = new Date();
  const results: string[] = [];
  const months = years * 12;

  for (let m = 0; m < months; m++) {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() + m, 15));
    const chart = calculateChartFromDate(date, latitude, longitude);
    const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月`;

    for (const trackName of trackPlanets) {
      const planet = chart.planets.find(p => p.name === trackName);
      if (!planet) continue;
      let diff = Math.abs(planet.longitude - targetLon);
      if (diff > 180) diff = 360 - diff;

      if (diff <= 6) results.push(`${dateStr}: ${trackName}(${lonToSign(planet.longitude)}) 合相 ${targetName}(${lonToSign(targetLon)}) 容许度${diff.toFixed(1)}°`);
      else if (Math.abs(diff - 60) <= 4) results.push(`${dateStr}: ${trackName}(${lonToSign(planet.longitude)}) 六合 ${targetName} 容许度${Math.abs(diff - 60).toFixed(1)}°`);
      else if (Math.abs(diff - 90) <= 5) results.push(`${dateStr}: ${trackName}(${lonToSign(planet.longitude)}) 刑克 ${targetName} 容许度${Math.abs(diff - 90).toFixed(1)}°`);
      else if (Math.abs(diff - 120) <= 5) results.push(`${dateStr}: ${trackName}(${lonToSign(planet.longitude)}) 三合 ${targetName} 容许度${Math.abs(diff - 120).toFixed(1)}°`);
      else if (Math.abs(diff - 180) <= 6) results.push(`${dateStr}: ${trackName}(${lonToSign(planet.longitude)}) 对冲 ${targetName} 容许度${Math.abs(diff - 180).toFixed(1)}°`);
    }
  }

  if (results.length === 0) return `未来${years}年内无显著行运触发${targetName}的相位。`;
  return results.join('\n');
}

const REPORT_PROMPTS: Record<string, string> = {
  love: `你是一位资深占星师，擅长通过本命盘分析情感与婚姻。请根据用户提供的本命盘信息，生成一份详细的「正缘报告」。

## 报告定义
"正缘"指与用户有深刻宿缘、最可能走向稳定婚姻或长期伴侣关系的对象。报告需从占星学角度分析：正缘的性格特征、相遇的时机、关系中可能出现的议题，以及给用户的建议。

## 报告结构（严格按此 5 个板块输出）

### 一、正缘的基础画像
- 正缘的**太阳星座**（主导性格）、**月亮星座**（情感需求）、**上升星座**（外在气质）——根据用户第七宫宫头星座、下降点星座及金星落座来推断。
- 例如：下降双鱼座 → 正缘倾向具有双鱼座特质（浪漫、敏感、艺术气质）。
- 说明推断的占星依据（引用具体的宫头星座、金星位置、第七宫内行星等数据）。

### 二、正缘的外在特征与职业倾向
- 结合下降星座和第七宫宫主星、金星落座，推断可能的外貌气质、穿着风格、给人的第一印象。
- 结合第七宫和金星分析适合的职业领域（如艺术、医疗、教育、技术、金融等）。

### 三、如何相遇 & 关键时间窗口
- **重要**：我会在星盘数据后附上「未来5年行运触发第七宫/下降点的时间表」，请根据这份数据，挑选出**3个最可能的相遇时间段**（精确到年月区间，例如2027年3月-8月）。
- 优先选择木星或土星合相/三合下降点的时段，其次是六合。
- 描述每个时间窗口中典型的相遇场景（工作场合、朋友介绍、旅行、学习进修、线上社群等），结合行运行星的特质说明原因。

### 四、关系中的优势与挑战
- **优势**：根据用户本命盘中金星、月亮、第七宫的和谐相位，分析双方能量互补的方面。
- **挑战**：根据土星、冥王星与金星/月亮的紧张相位，分析可能出现的冲突领域（责任压力、信任问题、疏离感等）。
- 每条都要引用具体的相位数据。

### 五、给用户的具体建议
- 针对自身需要成长的部分（如学会表达脆弱、放下过度理想化、建立安全感）。
- 主动创造相遇机会的行动指南（参加什么类型的活动、调整社交圈的方向）。
- 在感情中需要特别注意的课题。

## 输出风格
- 专业、温和、鼓励性语气，使用"可能"、"倾向"、"建议关注"等措辞，避免绝对化断言。
- 每个板块的分析必须引用具体的星盘数据（星座、宫位、相位、度数），不可泛泛而谈或编造数据。
- 使用 markdown 格式，结构清晰。
- 结尾提醒：占星分析仅供参考和自我认知，最终的缘分需要在现实中用心经营。`,

  career: `你是一位资深占星师，精通通过本命盘分析职业天赋与事业发展。请根据用户的星盘数据，生成一份详细的「事业报告」。

## 报告定义
事业报告通过分析中天(MC)、第十宫、太阳、土星等关键指标，揭示用户的职业天赋、财运格局和事业发展节奏，并基于真实行运数据指出关键的事业转折期。

## 报告结构（严格按此 5 个板块输出）

### 一、核心职业天赋与方向
- **MC（中天）星座** → 适合的职业领域、公众形象、事业追求的方向
- **第十宫内行星**（如有）→ 事业如何具体展现
- **太阳星座+宫位** → 人生目标、领导风格、在哪个生活领域追求成就
- 引用具体的MC度数、10宫行星、太阳数据，说明推断依据。

### 二、工作风格与能力优势
- **第六宫宫头星座+宫内行星** → 日常工作方式、对待工作的态度
- **水星星座+宫位** → 思维方式、沟通风格、适合的智力工作类型
- **火星星座+宫位** → 行动力模式、竞争风格、执行力特点
- 引用具体的水星、火星位置数据。

### 三、财运格局
- **第二宫（正财）宫头+宫内行星** → 赚钱方式、对金钱的态度
- **第八宫（偏财）宫头+宫内行星** → 投资收益、合作分成、遗产
- **金星** → 物质价值观；**木星** → 财务扩展潜力
- 引用具体的2宫、8宫、金星、木星数据。

### 四、事业关键时间窗口
- **重要**：我会在星盘数据后附上「未来5年行运触发MC(中天)的时间表」，请根据这份数据，挑选出**3个最重要的事业转折/上升期**（精确到年月区间）。
- 优先选择木星合相/三合MC的时段（机遇扩展期），以及土星合相MC的时段（责任加重/权威确立期）。
- 每个时间窗口说明适合做什么：跳槽、创业、升职谈判、技能深造、转型等。

### 五、职业发展策略建议
- 结合MC和太阳，列出最适合的 **3-5 个行业方向**，说明原因。
- 指出需要突破的瓶颈（土星紧张相位暗示的限制）。
- 可执行的行动指南（短期和长期）。

## 输出风格
- 专业务实的语气，使用"倾向"、"适合"、"建议关注"等措辞，避免绝对化断言。
- 每个板块的分析必须引用具体的星盘数据（星座、宫位、相位、度数），不可泛泛而谈或编造数据。
- 使用 markdown 格式，结构清晰。
- 结尾提醒：占星分析仅供参考，职业选择还需结合个人兴趣和现实条件。`,

  emotion: `你是一位资深占星师，擅长通过本命盘深度解读情感世界与内在心理。请根据用户的星盘数据，生成一份详细的「感情报告」。

## 报告定义
感情报告从月亮、金星、第4/7/8/12宫等关键指标出发，揭示用户的情感内核、依恋模式、潜意识中的情感伤痛，并基于真实行运数据指出情感成长的关键时期。

## 报告结构（严格按此 5 个板块输出）

### 一、情感内核与安全感来源
- **月亮星座+宫位** → 核心情感需求、什么让你感到安心
- **第四宫宫头+宫内行星** → 对"家"和归属感的理解、原生家庭的影响
- **月亮与其他行星的主要相位** → 情绪的表达模式（和谐相位=流畅表达；紧张相位=压抑或爆发）
- 引用具体的月亮度数、宫位和相位数据。

### 二、爱的方式与亲密关系模式
- **金星星座+宫位** → 如何表达爱、渴望被怎样对待
- **第七宫宫头+宫内行星** → 对伴侣的期待和投射
- **第八宫情况** → 深层情感连接的方式、对亲密和信任的态度
- 引用金星和7/8宫的具体数据。

### 三、内在伤痛与潜意识模式
- **第十二宫宫头+宫内行星** → 隐藏的情感模式、自我逃避的领域
- **土星/冥王星与月亮/金星的紧张相位**（如有）→ 情感创伤来源和防御机制
- **南交点星座+宫位** → 前世/过去的情感惯性，容易重复的旧模式
- 引用具体的相位和度数数据。

### 四、情感发展关键时期
- **重要**：我会在星盘数据后附上「未来5年行运触发本命月亮的时间表」，请根据这份数据，挑选出**3个重要的情感转折期**（精确到年月区间）。
- 土星触发月亮 → 情感考验/成熟期；木星触发月亮 → 情感扩展/愉悦期。
- 每个时期说明情感主题：深化关系、疗愈旧伤、开放心扉、直面恐惧等。

### 五、情感成长路径与建议
- **北交点星座+宫位** → 灵魂渴望成长的方向
- 针对星盘中具体紧张相位暗示的情感课题，给出个性化建议。
- 可执行的自我疗愈方法（独处反思、创造性表达、身体觉察等）。

## 输出风格
- 温暖细腻的语气，使用"倾向"、"可能"、"建议探索"等措辞，传递理解和接纳。
- 每个板块的分析必须引用具体的星盘数据（星座、宫位、相位、度数），不可泛泛而谈或编造数据。
- 使用 markdown 格式，结构清晰。
- 结尾提醒：占星分析是自我认知的工具，情感成长需要在生活中持续实践。`,

  health: `你是一位擅长医学占星的资深命理健康分析师。请根据用户的星盘数据，生成一份详细的「健康趋势报告」。

## 报告定义
健康报告通过分析上升星座(ASC)、第一宫、第六宫、太阳、月亮、火星、土星等关键指标，揭示用户的先天体质特征、身体易感区域、精力节奏模式，并基于真实行运数据指出健康敏感时段。

## 星座-身体部位对应参考
白羊=头部/面部、金牛=喉咙/颈部、双子=手臂/肺部、巨蟹=胃部/胸部、狮子=心脏/脊椎、处女=肠道/消化系统、天秤=肾脏/腰部、天蝎=生殖/泌尿系统、射手=肝脏/臀部、摩羯=骨骼/关节/皮肤、水瓶=小腿/循环系统、双鱼=足部/淋巴系统

## 报告结构（严格按此 5 个板块输出）

### 一、先天体质画像
- **上升星座** → 身体类型、外在特征、先天体质倾向
- **第一宫内行星**（如有）→ 对身体活力的加持或消耗
- **太阳星座+宫位** → 核心生命力来源、哪个生活领域消耗最多精力
- 引用具体的ASC度数、1宫行星和太阳数据，说明推断依据。

### 二、身体易感区域地图
- 根据**太阳、月亮、上升**所落星座 → 对应的身体区域（参照上方星座-身体对应表）
- **第六宫宫头星座+宫内行星** → 健康习惯和慢性风险倾向
- **土星落座星座** → 长期需要关注的身体部位（土星代表限制和慢性议题）
- **火星落座星座** → 容易发炎或受伤的区域
- 引用具体的6宫、土星、火星位置数据。

### 三、精力节奏与运动建议
- **火星星座+宫位** → 精力模式（火象=爆发型、土象=持久型、风象=灵活型、水象=波动型）
- **太阳与火星的相位**（如有）→ 体能上限和运动天赋
- 推荐适合的运动类型：
  - 火象（白羊/狮子/射手）→ HIIT、竞技运动、拳击
  - 土象（金牛/处女/摩羯）→ 力量训练、瑜伽、登山
  - 风象（双子/天秤/水瓶）→ 舞蹈、球类运动、骑行
  - 水象（巨蟹/天蝎/双鱼）→ 游泳、冥想、太极
- 引用火星和太阳的具体数据。

### 四、健康敏感时段
- **重要**：我会在星盘数据后附上「未来5年行运触发上升点(ASC)的时间表」，请根据这份数据，挑选出**3个需要特别注意健康的时段**（精确到年月区间）。
- 土星触发ASC → 身体负担加重、慢性问题浮现、需要严格自律养生
- 火星触发ASC → 容易受伤、发炎、精力过度消耗、需注意安全
- 每个时段给出具体的注意事项（减少运动强度/注意饮食/防止意外/定期体检等）。

### 五、个性化养生方案
- **饮食建议**：结合上升和月亮的元素属性（火=清热降火、土=健脾养胃、风=润肺安神、水=补肾利湿）
- **作息建议**：结合太阳宫位分析最佳作息节奏
- **心理健康**：月亮+海王星相位（如有）→ 情绪健康建议；月亮+土星相位 → 压力管理
- **季节性调养**：结合太阳和上升的元素属性，给出四季养生侧重点

## 输出风格
- 关怀务实的语气，使用"倾向"、"建议关注"、"可能需要"等措辞，避免绝对化断言。
- 每个板块的分析必须引用具体的星盘数据（星座、宫位、相位、度数），不可泛泛而谈或编造数据。
- 使用 markdown 格式，结构清晰。
- 结尾提醒：医学占星仅供参考和自我认知，不替代专业医疗诊断，如有健康问题请及时就医。`,
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return Response.json({ error: '未配置 ZHIPU_API_KEY' }, { status: 500 });
    }

    const body = await request.json();
    const { type, chartData } = body as { type: string; chartData: Record<string, unknown> };

    if (!type || !chartData) {
      return Response.json({ error: '缺少 type 或 chartData 参数' }, { status: 400 });
    }

    const systemPrompt = REPORT_PROMPTS[type];
    if (!systemPrompt) {
      return Response.json({ error: `未知报告类型: ${type}` }, { status: 400 });
    }

    // 为各类报告计算未来行运触发数据
    let extraContext = '';
    try {
      const astro = chartData.astrology as { houses?: { number: number; longitude: number }[]; planets?: { name: string; sign: string; degree: number; house: number; longitude: number; retrograde: boolean }[]; aspects?: { planet1: string; planet2: string; type: string; orb: number }[]; ascendant?: number; midheaven?: number };
      const profile = chartData.profile as { longitude?: number; latitude?: number };

      if (profile.latitude && profile.longitude) {
        if (type === 'love') {
          // 正缘报告：追踪木星/土星/金星触发下降点(7宫宫头)
          const house7 = astro.houses?.find((h: { number: number }) => h.number === 7);
          if (house7) {
            const transitData = calculateTargetTransits({ targetLon: house7.longitude, targetName: '下降点', trackPlanets: ['木星', '土星', '金星'], latitude: profile.latitude, longitude: profile.longitude });
            extraContext = `\n\n## 未来5年行运触发第七宫/下降点时间表\n\n下降点（第七宫宫头）位于 ${lonToSign(house7.longitude)}\n\n${transitData}\n\n请根据以上行运数据，挑选3个最有利的相遇时间窗口。`;
          }
        } else if (type === 'career') {
          // 事业报告：追踪木星/土星触发MC(中天/10宫宫头)
          const house10 = astro.houses?.find((h: { number: number }) => h.number === 10);
          const mcLon = house10?.longitude ?? astro.midheaven;
          if (mcLon !== undefined) {
            const transitData = calculateTargetTransits({ targetLon: mcLon, targetName: 'MC(中天)', trackPlanets: ['木星', '土星'], latitude: profile.latitude, longitude: profile.longitude });
            extraContext = `\n\n## 未来5年行运触发MC(中天)时间表\n\nMC（中天/第十宫宫头）位于 ${lonToSign(mcLon)}\n\n${transitData}\n\n请根据以上行运数据，挑选3个最重要的事业转折/上升期。`;
          }
        } else if (type === 'emotion') {
          // 感情报告：追踪土星/木星触发本命月亮
          const natalMoon = astro.planets?.find((p: { name: string }) => p.name === '月亮');
          if (natalMoon) {
            const transitData = calculateTargetTransits({ targetLon: natalMoon.longitude, targetName: '本命月亮', trackPlanets: ['土星', '木星'], latitude: profile.latitude, longitude: profile.longitude });
            extraContext = `\n\n## 未来5年行运触发本命月亮时间表\n\n本命月亮位于 ${lonToSign(natalMoon.longitude)}\n\n${transitData}\n\n请根据以上行运数据，挑选3个重要的情感转折期。`;
          }
        } else if (type === 'health') {
          // 健康报告：追踪土星/火星触发上升点(ASC)
          const house1 = astro.houses?.find((h: { number: number }) => h.number === 1);
          const ascLon = house1?.longitude ?? astro.ascendant;
          if (ascLon !== undefined) {
            const transitData = calculateTargetTransits({ targetLon: ascLon, targetName: '上升点(ASC)', trackPlanets: ['土星', '火星'], latitude: profile.latitude, longitude: profile.longitude });
            extraContext = `\n\n## 未来5年行运触发上升点(ASC)时间表\n\n上升点（ASC）位于 ${lonToSign(ascLon)}\n\n${transitData}\n\n请根据以上行运数据，挑选3个需要特别注意健康的时段。`;
          }
        }
      }
    } catch { /* 计算失败不影响报告生成 */ }

    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: `${systemPrompt}\n\n## 用户星盘数据\n\`\`\`json\n${JSON.stringify(chartData, null, 2)}\n\`\`\`${extraContext}\n\nAI 绝不自行计算或修改排盘数据，只基于上述数据进行解读。`,
      },
      {
        role: 'user',
        content: '请根据我的星盘数据生成完整报告。',
      },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChat(messages, apiKey)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          const msg = error instanceof Error ? error.message : '生成失败';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : '请求失败' },
      { status: 500 }
    );
  }
}
