'use client';

import Link from 'next/link';

const CHART_TOOLS = [
  { href: '/chart/astrology', icon: '☉', iconBg: '#e8838320', iconColor: '#d06060', title: '专业星盘', desc: '20+ 种星盘排盘' },
  { href: '/chart/tarot', icon: '⊡', iconBg: '#b07cd020', iconColor: '#9070b0', title: '塔罗牌', desc: 'AI 塔罗解读' },
  { href: '/chart/ziwei', icon: '☆', iconBg: '#d0a03020', iconColor: '#c09030', title: '紫微斗数', desc: '紫微排盘 + 解读' },
  { href: '/chart/bazi', icon: '☰', iconBg: '#70a08020', iconColor: '#609070', title: '国学八字', desc: '八字排盘 + 解读' },
];

const AI_REPORTS = [
  { type: 'love', icon: '♡', iconBg: '#e0809020', iconColor: '#d07090', title: '正缘报告', desc: 'AI 姻缘分析' },
  { type: 'career', icon: '◆', iconBg: '#5090d020', iconColor: '#4888d0', title: '事业报告', desc: 'AI 事业分析' },
  { type: 'emotion', icon: '✧', iconBg: '#d0905020', iconColor: '#c88050', title: '感情报告', desc: 'AI 感情分析' },
  { type: 'health', icon: '✦', iconBg: '#50b09020', iconColor: '#40a080', title: '健康报告', desc: 'AI 健康分析' },
];

const COMING_SOON = ['MBTI 测试', '生命数字', '占星骰子'];

export default function ToolsPage() {
  return (
    <div className="min-h-screen px-4 py-6 pb-24">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <h1 className="mb-6 flex items-center gap-2 text-xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--accent-primary)' }}>◇</span> 更多工具
        </h1>

        {/* 排盘工具 */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>排盘工具</h2>
          <div className="grid grid-cols-2 gap-3">
            {CHART_TOOLS.map(tool => (
              <Link key={tool.href} href={tool.href}
                className="rounded-2xl p-4 transition-all active:scale-[0.98]"
                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                  style={{ background: tool.iconBg, color: tool.iconColor }}>
                  {tool.icon}
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tool.title}</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{tool.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* AI 深度报告 */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>AI 深度报告</h2>
          <div className="grid grid-cols-2 gap-3">
            {AI_REPORTS.map(r => (
              <Link key={r.type} href={`/chart/report?type=${r.type}`}
                className="rounded-2xl p-4 transition-all active:scale-[0.98]"
                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                  style={{ background: r.iconBg, color: r.iconColor }}>
                  {r.icon}
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{r.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Coming Soon */}
        <div className="flex flex-wrap gap-2">
          {COMING_SOON.map(item => (
            <span key={item} className="rounded-full px-3 py-1.5 text-xs"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>
              {item} (即将上线)
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
