'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CHART_TOOLS = [
  { href: '/chart/astrology', icon: '☉', iconBg: 'linear-gradient(135deg, #e8838318, #e8838308)', iconColor: '#d06060', title: '专业星盘', desc: '20+ 种星盘排盘', comingSoon: false },
  { href: '/chart/tarot', icon: '⊡', iconBg: 'linear-gradient(135deg, #b07cd018, #b07cd008)', iconColor: '#9070b0', title: '塔罗牌', desc: 'AI 塔罗解读', comingSoon: false },
  { href: '/chart/ziwei', icon: '☆', iconBg: 'linear-gradient(135deg, #d0a03018, #d0a03008)', iconColor: '#c09030', title: '紫微斗数', desc: '紫微排盘 + 解读', comingSoon: true },
  { href: '/chart/bazi', icon: '☰', iconBg: 'linear-gradient(135deg, #70a08018, #70a08008)', iconColor: '#609070', title: '国学八字', desc: '八字排盘 + 解读', comingSoon: true },
];

const AI_REPORTS = [
  { type: 'love', icon: '♡', iconBg: 'linear-gradient(135deg, #e0809018, #e0809008)', iconColor: '#d07090', title: '正缘报告', desc: 'AI 姻缘分析' },
  { type: 'career', icon: '◆', iconBg: 'linear-gradient(135deg, #5090d018, #5090d008)', iconColor: '#4888d0', title: '事业报告', desc: 'AI 事业分析' },
  { type: 'emotion', icon: '✧', iconBg: 'linear-gradient(135deg, #d0905018, #d0905008)', iconColor: '#c88050', title: '感情报告', desc: 'AI 感情分析' },
  { type: 'health', icon: '✦', iconBg: 'linear-gradient(135deg, #50b09018, #50b09008)', iconColor: '#40a080', title: '健康报告', desc: 'AI 健康分析' },
];

const INTERACTIVE = [
  { href: '/chart/compatibility', icon: '♡♡', iconBg: 'linear-gradient(135deg, #e0609018, #d0709008)', iconColor: '#d06080', title: '合盘配对', desc: '双人星盘配对分析' },
  { href: '/chart/composite', icon: '◎', iconBg: 'linear-gradient(135deg, #9070b018, #9070b008)', iconColor: '#9070b0', title: '组合盘', desc: '关系本身的能量分析' },
  { href: '/chart/davison', icon: '⌖', iconBg: 'linear-gradient(135deg, #5090d018, #5090d008)', iconColor: '#5090d0', title: '时空中点盘', desc: '关系的先天命运分析' },
  { href: '/chart/overlay', icon: '◆', iconBg: 'linear-gradient(135deg, #c0805018, #c0805008)', iconColor: '#c08050', title: '马盘', desc: '行星落宫互动分析' },
];

const COMING_SOON = ['MBTI 测试', '生命数字', '占星骰子'];

export default function ToolsPage() {
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="min-h-screen px-5 py-6 pb-24">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <h1 className="mb-6 flex items-center gap-2 text-xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          <span className="gradient-text">◇</span> 更多工具
        </h1>

        {/* 排盘工具 */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-tertiary)' }}>排盘工具</h2>
          <div className="stagger-children grid grid-cols-2 gap-3">
            {CHART_TOOLS.map(tool => tool.comingSoon ? (
              <button key={tool.href}
                onClick={() => setToast(`${tool.title}即将上线，敬请期待`)}
                className="group rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                  opacity: 0.6,
                }}>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-transform group-active:scale-95"
                  style={{ background: tool.iconBg, color: tool.iconColor }}>
                  {tool.icon}
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tool.title}</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{tool.desc}</p>
              </button>
            ) : (
              <Link key={tool.href} href={tool.href}
                className="group rounded-2xl p-4 transition-all active:scale-[0.98]"
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                }}>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-transform group-active:scale-95"
                  style={{ background: tool.iconBg, color: tool.iconColor }}>
                  {tool.icon}
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tool.title}</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>{tool.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* 互动功能 */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-tertiary)' }}>互动功能</h2>
          <div className="stagger-children grid grid-cols-2 gap-3">
            {INTERACTIVE.map(tool => (
              <Link key={tool.href} href={tool.href}
                className="group rounded-2xl p-4 transition-all active:scale-[0.98]"
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                }}>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-base transition-transform group-active:scale-95"
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
          <h2 className="mb-3 text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-tertiary)' }}>AI 深度报告</h2>
          <div className="stagger-children grid grid-cols-2 gap-3">
            {AI_REPORTS.map(r => (
              <Link key={r.type} href={`/chart/report?type=${r.type}`}
                className="group rounded-2xl p-4 transition-all active:scale-[0.98]"
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                }}>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-transform group-active:scale-95"
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
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-tertiary)' }}>即将上线</h2>
          <div className="flex flex-wrap gap-2">
            {COMING_SOON.map(item => (
              <span key={item} className="rounded-full px-4 py-2 text-xs font-medium"
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-tertiary)',
                  border: '1px dashed var(--border-default)',
                }}>
                {item}
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-[15%] z-[999] -translate-x-1/2 animate-fadeIn">
          <div className="rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg"
            style={{ background: 'rgba(40,30,60,0.9)', backdropFilter: 'blur(8px)' }}>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
