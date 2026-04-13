# Aura 产品信息快照

**生成日期**: 2026-04-10  
**版本**: 0.1.0  
**Git Commit**: 8baa226

---

## 1. 项目概述

**Aura** 是一个基于 Next.js 16 的 AI 命理顾问 Web 应用，融合中西三大命理体系：
- **八字四柱** (lunar-javascript)
- **紫微斗数** (fortel-ziweidoushu)
- **西洋占星** (astronomy-engine)

配合智谱 AI (GLM-4-Flash) 提供流式解读。

**线上地址**: https://aura-eight-navy.vercel.app  
**GitHub**: https://github.com/sainasidike/aura.git

---

## 2. 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.2.3 | 全栈框架 |
| React | 19.2.4 | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 样式 |
| framer-motion | 12.38.0 | 动画 |
| lunar-javascript | 1.7.7 | 八字计算 |
| fortel-ziweidoushu | 1.3.4 | 紫微斗数 |
| astronomy-engine | 2.1.19 | 天文星历 (NASA 级精度) |
| opencc-js | 1.0.5 | 繁简转换 |
| react-markdown | 10.1.0 | Markdown 渲染 |
| 智谱 AI (GLM-4-Flash) | — | AI 对话与解读 |

---

## 3. 目录结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局 (metadata, fonts)
│   ├── page.tsx                # 根页面 → redirect('/fortune')
│   ├── globals.css             # 全局样式 (CSS 变量, 主题)
│   ├── api/
│   │   ├── time/route.ts       # 真太阳时标准化 API
│   │   ├── bazi/route.ts       # 八字排盘 API
│   │   ├── ziwei/route.ts      # 紫微斗数 API
│   │   ├── astrology/route.ts  # 西洋星盘 API
│   │   ├── fortune/route.ts    # 运势评分 API
│   │   ├── fortune/interpret/route.ts  # AI 运势解读 (SSE)
│   │   └── chat/route.ts       # AI 对话 (SSE)
│   └── (main)/
│       ├── layout.tsx           # 主布局 (含 BottomNav)
│       ├── fortune/page.tsx     # 运势页 (主页)
│       ├── chat/page.tsx        # AI 对话页
│       ├── chart/page.tsx       # 排盘展示页
│       └── profile/page.tsx     # 档案管理页
├── lib/
│   ├── cities.ts               # 48 个中国城市经纬度
│   ├── storage.ts              # localStorage 存储层
│   ├── ai/zhipu.ts             # 智谱 AI 集成
│   ├── engines/
│   │   ├── bazi.ts             # 八字计算引擎
│   │   ├── astrology.ts        # 西洋占星引擎
│   │   └── ziwei.ts            # 紫微斗数引擎
│   └── time/
│       └── solar-time.ts       # 真太阳时计算
├── components/ui/
│   ├── BottomNav.tsx            # 底部导航 (3 Tab)
│   └── PersonSelector.tsx       # 人物选择器
└── types/
    └── index.ts                 # 所有 TypeScript 类型定义
```

---

## 4. 页面与路由

| 路由 | 页面 | 功能 |
|------|------|------|
| `/` | 重定向 | → `/fortune` |
| `/fortune` | 运势解读 | 综合分+5类运势+AI解读+日期/周期/人物切换 |
| `/chat` | AI 对话 | 流式对话+预设问题+排盘上下文 |
| `/chart` | 排盘展示 | 八字/紫微/星盘三 Tab 切换 |
| `/profile` | 档案管理 | 创建/删除/查看个人档案 |

---

## 5. API 接口

### POST /api/time
- **输入**: year, month, day, hour, minute, longitude, timezone
- **输出**: TimeStandardization (UTC, 真太阳时, 时辰, 经度修正, 均时差)

### POST /api/bazi
- **输入**: 出生信息 + gender + zishiMode
- **输出**: timeInfo + BaziChart (四柱/五行/纳音/十神/藏干/大运等)
- **引擎**: lunar-javascript 1.7.7

### POST /api/ziwei
- **输入**: 出生信息 + gender
- **输出**: timeInfo + ZiweiChart (命主/身主/五行局/12宫+主星副星四化)
- **引擎**: fortel-ziweidoushu 1.3.4

### POST /api/astrology
- **输入**: 出生信息 + latitude
- **输出**: timeInfo + AstrologyChart (10行星/12宫/相位/ASC/MC)
- **引擎**: astronomy-engine 2.1.19
- **宫位系统**: Equal House (等宫制)
- **行星**: 太阳/月亮/水星/金星/火星/木星/土星/天王星/海王星/冥王星

### POST /api/fortune
- **输入**: 出生信息 + period + targetDate
- **输出**: 综合分 + 5类分数 (love/career/health/study/social)
- **算法**: 确定性哈希 + 行运相位 + 五行亲和度

### POST /api/fortune/interpret (SSE)
- **输入**: 同 fortune
- **输出**: SSE 流式 AI 解读 (---LOVE---/---CAREER--- 等分隔符)
- **AI**: 智谱 GLM-4-Flash

### POST /api/chat (SSE)
- **输入**: messages + chartData
- **输出**: SSE 流式对话
- **AI**: 智谱 GLM-4-Flash

---

## 6. 核心算法

### 6.1 真太阳时计算 (solar-time.ts, 254 行)
```
本地时间 → DST检测(1986-1991) → UTC转换 → 儒略日
→ 均时差(Meeus算法, ~1秒精度) → 经度修正(经度差×4分/度)
→ 真太阳时 → 时辰判定(含15分钟边界警告)
```

### 6.2 八字引擎 (bazi.ts, 164 行)
- 真太阳时 → Solar → Lunar → EightChar
- 支持三种子时模式: midnight / zishi23 / split
- 输出: 四柱/五行/纳音/十神/藏干/地势/命宫/身宫/大运

### 6.3 占星引擎 (astrology.ts, 222 行)
- **行星计算**: astronomy-engine 天文历表 (10 颗天体)
- **上升点**: 简化 Placidus 公式 (本地恒星时 + 球面三角)
- **宫位**: 等宫制 (ASC 起始, 每宫 30°)
- **中天**: 简化计算 (ASC + 270°)
- **逆行**: 1日速度比较法
- **相位**: 5种主相位
  - 合相 0° (容许度 8°)
  - 六合 60° (容许度 6°)
  - 四分 90° (容许度 7°)
  - 三合 120° (容许度 7°)
  - 对冲 180° (容许度 8°)

### 6.4 紫微引擎 (ziwei.ts, 107 行)
- fortel-ziweidoushu 库 + opencc 繁简转换
- 14主星 + 辅星分配到12宫
- 四化提取: 化禄/化权/化科/化忌

### 6.5 运势评分 (fortune/route.ts, 194 行)
```
基础分(52-71, 确定性哈希) + 主星相位(±5-8) + 副星相位(±2-4)
+ 哈希偏移(±5) + 五行亲和度(±5) + 周期调整 → 夹紧到 30-95
```

---

## 7. 数据类型定义 (types/index.ts, 124 行)

### TimeStandardization
```typescript
{
  utc: { year, month, day, hour, minute }
  isDST: boolean
  utcOffset: number
  trueSolarTime: { hour, minute }
  longitudeCorrection: number  // 经度修正(分钟)
  equationOfTime: number       // 均时差(分钟)
  totalCorrection: number      // 总修正(分钟)
  shichen: string              // 地支
  shichenName: string          // X时
  nearBoundary: boolean        // 是否临界
  boundaryWarning?: string
}
```

### AstrologyChart
```typescript
{
  planets: PlanetPosition[]    // 10颗行星
  houses: HousePosition[]      // 12宫位
  aspects: Aspect[]            // 相位列表
  ascendant: number            // 上升点经度
  midheaven: number            // 中天经度
}
```

### PlanetPosition
```typescript
{
  name: string                 // 行星名
  longitude: number            // 黄经
  latitude: number             // 黄纬
  sign: string                 // 星座
  degree: number               // 度数
  minute: number               // 分数
  house: number                // 所在宫位
  retrograde: boolean          // 是否逆行
}
```

---

## 8. UI 设计系统

### 色彩体系 (CSS 变量)
- **主色**: #7b6cb8 (紫色)
- **辅色**: #3abfb6 (青色), #b8963e (金色), #b86ca0 (玫红)
- **背景**: #f5f3fa (深), #ffffff (基础), #f8f6fc (表面)
- **文字**: #1a1528 (主), #5c5470 (次), #9890a8 (弱)
- **渐变**: 紫→青 (primary), 金→玫红 (warm)

### 字体
- **展示**: Noto Serif SC (衬线)
- **正文**: Noto Sans SC / PingFang SC (无衬线)

### 运势分类配色
| 分类 | 颜色 | 图标 |
|------|------|------|
| 爱情 | #e8668a | ♥ |
| 事业 | #5b8def | ◆ |
| 健康 | #4bc9a0 | ✦ |
| 学习 | #f0b429 | ◈ |
| 人际 | #9b6cb8 | ✧ |

### 导航
- 底部固定 3 Tab: 运势(☽) / AI占星师(✦, 居中浮起) / 排盘(◇)
- SPA 路由 (router.push)
- 毛玻璃背景 (backdrop-filter: blur)

---

## 9. 数据存储

### localStorage Keys
| Key | 用途 |
|-----|------|
| `aura_profiles` | 用户档案列表 |
| `aura_chat_{profileId}` | 对话历史 |
| `fortune_{id}_{period}_{date}` | 运势数据缓存 |
| `interp_{id}_{period}_{date}` | AI解读缓存 |

### StoredProfile 结构
```typescript
{
  id: string
  name: string
  gender: string       // '男' | '女'
  year, month, day, hour, minute: number
  city: string
  longitude, latitude: number
  timezone: string
  createdAt: string    // ISO
}
```

---

## 10. 城市数据 (48 个)

覆盖中国所有省份和特别行政区:
- 直辖市: 北京/天津/上海/重庆
- 各省会 + 重点城市
- 新疆 9 城 (Asia/Urumqi 时区)
- 港澳台 4 城 (各自时区)

---

## 11. 环境变量

| 变量 | 用途 | 必需 |
|------|------|------|
| ZHIPU_API_KEY | 智谱 AI API 密钥 | 是 (AI功能) |

---

## 12. 已知限制

1. **占星宫位**: 使用等宫制而非 Placidus，与专业占星软件有差异
2. **中天计算**: 简化为 ASC+270°，非精确计算
3. **行星数量**: 仅 10 颗主要天体，无凯龙星等小行星
4. **相位类型**: 仅 5 种主相位，无半六合/补十二分等次要相位
5. **数据存储**: 仅 localStorage，无云端同步
6. **DST 数据**: 仅中国 1986-1991 年夏令时

---

## 13. 代码统计

| 类别 | 文件数 | 约行数 |
|------|--------|--------|
| API 路由 | 7 | ~390 |
| 页面组件 | 5 | ~1,450 |
| 核心库 | 6 | ~600 |
| UI 组件 | 2 | ~150 |
| 配置/样式 | 5 | ~250 |
| 数据/存储 | 2 | ~155 |
| **合计** | **28** | **~3,000** |
