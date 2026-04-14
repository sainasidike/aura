'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { getProfiles, type StoredProfile } from '@/lib/storage';
import { extractChartSummary, getAscendantInfo, formatDegree, parseReportSections, SECTION_ICONS, type ChartSummary } from '@/lib/dual-chart-utils';
import { simpleMarkdown } from '@/lib/simple-markdown';
import type { AstrologyChart } from '@/types';

const ACCENT = '#9070b0';
type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function CompositePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}><span className="animate-breathe">...</span></div>}>
      <CompositeContent />
    </Suspense>
  );
}

function CompositeContent() {
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [selectedA, setSelectedA] = useState<StoredProfile | null>(null);
  const [selectedB, setSelectedB] = useState<StoredProfile | null>(null);
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState<unknown>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const cacheKey = (selectedA && selectedB) ? `composite_${selectedA.id}_${selectedB.id}` : '';

  const chartSummary = useMemo<ChartSummary | null>(() => {
    if (!chartData) return null;
    try {
      const d = chartData as { composite: AstrologyChart };
      if (d.composite?.planets) return extractChartSummary(d.composite);
    } catch { /* */ }
    return null;
  }, [chartData]);

  const ascInfo = useMemo(() => {
    if (!chartData) return null;
    try {
      const d = chartData as { composite: AstrologyChart };
      if (d.composite?.ascendant != null) return getAscendantInfo(d.composite);
    } catch { /* */ }
    return null;
  }, [chartData]);

  useEffect(() => {
    const ps = getProfiles();
    setProfiles(ps);
    if (ps.length > 0) {
      try {
        const saved = JSON.parse(localStorage.getItem('aura_pair') || '{}');
        const a = saved.a && ps.find((p: StoredProfile) => p.id === saved.a);
        const b = saved.b && ps.find((p: StoredProfile) => p.id === saved.b);
        setSelectedA(a || ps[0]);
        if (b && b.id !== (a || ps[0]).id) setSelectedB(b);
      } catch { setSelectedA(ps[0]); }
    }
  }, []);

  useEffect(() => {
    if (selectedA) try { localStorage.setItem('aura_pair', JSON.stringify({ a: selectedA.id, b: selectedB?.id || '' })); } catch { /* */ }
  }, [selectedA, selectedB]);

  // Load cache
  useEffect(() => {
    if (!cacheKey) return;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const d = JSON.parse(cached);
        if (d.report) setReport(d.report);
        if (d.chartData) setChartData(d.chartData);
      }
    } catch { /* */ }
  }, [cacheKey]);

  // Save cache
  useEffect(() => {
    if (!cacheKey || !report || loading) return;
    try { localStorage.setItem(cacheKey, JSON.stringify({ report, chartData, ts: Date.now() })); } catch { /* */ }
  }, [cacheKey, report, chartData, loading]);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }, [report]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const readSSE = async (res: Response, onChunk: (c: string) => void) => {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No stream');
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const t = line.trim();
        if (!t || !t.startsWith('data:')) continue;
        const d = t.slice(5).trim();
        if (d === '[DONE]') break;
        try {
          const p = JSON.parse(d);
          if (p.error) throw new Error(p.error);
          if (p.content) onChunk(p.content);
        } catch { /* skip */ }
      }
    }
  };

  const handleAnalyze = async (force = false) => {
    if (!selectedA || !selectedB) return;
    if (force && cacheKey) { try { localStorage.removeItem(cacheKey); } catch { /* */ } }
    setLoading(true);
    setError('');
    setReport('');
    setChartData(null);
    setChatMessages([]);
    setSuggestedQuestions([]);

    try {
      const calcRes = await fetch('/api/compatibility/composite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: { year: selectedA.year, month: selectedA.month, day: selectedA.day, hour: selectedA.hour, minute: selectedA.minute, longitude: selectedA.longitude, latitude: selectedA.latitude, timezone: selectedA.timezone },
          personB: { year: selectedB.year, month: selectedB.month, day: selectedB.day, hour: selectedB.hour, minute: selectedB.minute, longitude: selectedB.longitude, latitude: selectedB.latitude, timezone: selectedB.timezone },
        }),
      });
      if (!calcRes.ok) throw new Error((await calcRes.json()).error || '计算失败');
      const data = await calcRes.json();
      setChartData(data);

      const reportRes = await fetch('/api/compatibility/composite/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: { name: selectedA.name },
          personB: { name: selectedB.name },
          composite: data.composite,
          chartA: data.chartA,
          chartB: data.chartB,
        }),
      });
      if (!reportRes.ok) throw new Error((await reportRes.json()).error || '报告生成失败');
      await readSSE(reportRes, (chunk) => setReport(prev => prev + chunk));
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失败');
    }
    setLoading(false);
  };

  const extractSuggestions = (text: string) => {
    const match = text.match(/\[推荐追问\]\s*\n?([\s\S]*?)$/);
    if (!match) return { cleaned: text, questions: [] as string[] };
    return {
      cleaned: text.slice(0, match.index).trimEnd(),
      questions: match[1].split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(l => l.length > 0),
    };
  };

  const sendChat = async (question?: string) => {
    const msg = question || chatInput.trim();
    if (!msg || chatLoading || !report || !chartData) return;
    setChatInput('');
    setSuggestedQuestions([]);
    const newMsgs: ChatMessage[] = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(newMsgs);
    setChatLoading(true);
    let content = '';
    try {
      const res = await fetch('/api/compatibility/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs, reportContent: report, chartData, reportType: 'composite' }),
      });
      if (!res.ok) throw new Error((await res.json()).error || '回答失败');
      await readSSE(res, (chunk) => {
        content += chunk;
        setChatMessages([...newMsgs, { role: 'assistant', content }]);
      });
      const { cleaned, questions } = extractSuggestions(content);
      if (questions.length > 0) {
        setChatMessages([...newMsgs, { role: 'assistant', content: cleaned }]);
        setSuggestedQuestions(questions);
      }
    } catch (e) {
      setChatMessages([...newMsgs, { role: 'assistant', content: `抱歉，${e instanceof Error ? e.message : '回答失败'}` }]);
    }
    setChatLoading(false);
  };

  if (profiles.length < 2) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl text-2xl" style={{ background: `${ACCENT}15`, color: ACCENT }}>&#9678;</div>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>至少需要两个档案才能分析</p>
        <Link href="/profile?showForm=true" className="rounded-full px-6 py-2.5 text-sm font-medium text-white" style={{ background: 'var(--gradient-primary)' }}>创建档案</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-6 pb-24">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center gap-2">
          <Link href="/chart" className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>&#8592;</span>
          </Link>
          <span style={{ color: ACCENT, fontSize: '18px' }}>&#9678;</span>
          <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px' }}>组合盘分析</span>
        </div>

        {/* Profile selectors */}
        <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <label className="mb-2 block text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>A方档案</label>
          <select value={selectedA?.id || ''} onChange={e => setSelectedA(profiles.find(p => p.id === e.target.value) || null)}
            className="w-full rounded-xl border px-4 py-2.5 text-sm mb-3" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name} ({p.year}.{p.month}.{p.day})</option>)}
          </select>
          <label className="mb-2 block text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>B方档案</label>
          <select value={selectedB?.id || ''} onChange={e => setSelectedB(profiles.find(p => p.id === e.target.value) || null)}
            className="w-full rounded-xl border px-4 py-2.5 text-sm" style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}>
            <option value="">-- 选择 --</option>
            {profiles.filter(p => p.id !== selectedA?.id).map(p => <option key={p.id} value={p.id}>{p.name} ({p.year}.{p.month}.{p.day})</option>)}
          </select>
        </div>

        {/* Intro */}
        <div className="mb-4 rounded-2xl p-4" style={{ background: `${ACCENT}06`, border: `1px solid ${ACCENT}18` }}>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            组合盘取两人行星位置的中点，构成一张代表「关系本身」的星盘。它揭示这段关系的核心能量、情感表达方式和需要面对的课题。
          </p>
        </div>

        {selectedA && selectedB && !report && !loading && !error && !chartData && (
          <div className="flex justify-center py-4">
            <button onClick={() => handleAnalyze()} className="rounded-full px-8 py-3 text-sm font-semibold transition active:scale-95"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #7060a0)`, color: '#fff', boxShadow: `0 4px 20px ${ACCENT}40` }}>
              开始组合盘分析
            </button>
          </div>
        )}

        {loading && !report && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="animate-breathe">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg" style={{ background: `${ACCENT}15`, color: ACCENT }}>&#9678;</div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>正在计算组合盘...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
            <button onClick={() => handleAnalyze()} className="rounded-full px-6 py-2.5 text-sm font-medium text-white" style={{ background: `linear-gradient(135deg, ${ACCENT}, #7060a0)` }}>重试</button>
          </div>
        )}

        {/* Data Summary Card */}
        {chartSummary && (
          <div className="mb-4 animate-fadeIn rounded-2xl p-4" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            {/* Score Ring + Stats */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                style={{ background: `conic-gradient(${ACCENT} ${chartSummary.harmonyScore * 3.6}deg, ${ACCENT}15 0deg)` }}>
                <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full" style={{ background: 'var(--bg-base)' }}>
                  <span className="text-xl font-bold" style={{ color: ACCENT, fontFamily: 'var(--font-display)' }}>{chartSummary.harmonyScore}</span>
                  <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>和谐度</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-tertiary)' }}>行星</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{chartSummary.totalPlanets} 颗</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-tertiary)' }}>相位</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{chartSummary.totalAspects} 个</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#4a9060' }} />
                    <span style={{ color: 'var(--text-tertiary)' }}>和谐 {chartSummary.harmoniousCount}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#d04040' }} />
                    <span style={{ color: 'var(--text-tertiary)' }}>张力 {chartSummary.tenseCount}</span>
                  </span>
                </div>
                {/* Harmony bar */}
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#d0404020' }}>
                  <div className="h-full rounded-full" style={{
                    width: `${chartSummary.totalAspects > 0 ? Math.round(chartSummary.harmoniousCount / (chartSummary.harmoniousCount + chartSummary.tenseCount) * 100) : 50}%`,
                    background: '#4a9060',
                  }} />
                </div>
              </div>
            </div>

            {/* Key Planets */}
            <div className="flex flex-wrap gap-2">
              {ascInfo && (
                <div className="flex items-center gap-1 rounded-lg px-2.5 py-1.5" style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}18` }}>
                  <span className="text-xs font-medium" style={{ color: ACCENT }}>ASC</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ascInfo.signGlyph} {ascInfo.sign} {ascInfo.degree}°</span>
                </div>
              )}
              {chartSummary.keyPlanets.map(p => (
                <div key={p.name} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5" style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}18` }}>
                  <span className="text-xs" style={{ color: ACCENT }}>{p.glyph}</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{p.signGlyph} {p.sign} {formatDegree(p.degree, p.minute)}{p.retrograde ? ' ℞' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {report && (() => {
          const { preamble, sections } = parseReportSections(report);
          const icons = SECTION_ICONS.composite;
          return (
            <div ref={contentRef} className="space-y-3 animate-fadeIn">
              {preamble && (
                <div className="prose-chat rounded-2xl p-5" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-card)' }}
                  dangerouslySetInnerHTML={{ __html: simpleMarkdown(preamble) }} />
              )}
              {sections.map((sec, i) => {
                const ic = icons[i] || icons[0];
                return (
                  <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                    <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm" style={{ background: `${ic.color}15`, color: ic.color }}>{ic.icon}</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{sec.title}</span>
                    </div>
                    <div className="prose-chat px-5 pb-4" style={{ color: 'var(--text-secondary)' }}
                      dangerouslySetInnerHTML={{ __html: simpleMarkdown(sec.content) }} />
                  </div>
                );
              })}
              {loading && (
                <div className="flex justify-center py-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: ACCENT }} />
                </div>
              )}
            </div>
          );
        })()}

        {report && !loading && (
          <div className="mt-4 flex justify-center animate-fadeIn">
            <button onClick={() => handleAnalyze(true)} className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-95" style={{ color: 'var(--text-tertiary)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
              重新生成
            </button>
          </div>
        )}

        {/* Chat */}
        {report && !loading && (
          <div className="mt-6 animate-fadeIn">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm" style={{ color: ACCENT }}>&#9678;</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>对组合盘有疑问？追问 AI</span>
            </div>

            {chatMessages.length === 0 && suggestedQuestions.length === 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {['这段关系最核心的主题是什么？', '组合盘显示我们的挑战在哪？', '如何更好地经营这段关系？'].map(q => (
                  <button key={q} onClick={() => sendChat(q)} className="rounded-full px-3 py-1.5 text-xs transition active:scale-95"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>{q}</button>
                ))}
              </div>
            )}

            {chatMessages.length > 0 && (
              <div className="space-y-3 mb-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm"
                      style={msg.role === 'user'
                        ? { background: 'var(--gradient-primary)', color: '#fff', borderBottomRightRadius: '4px' }
                        : { background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderBottomLeftRadius: '4px' }}>
                      {msg.role === 'assistant' ? <div className="prose-chat" dangerouslySetInnerHTML={{ __html: simpleMarkdown(msg.content) }} /> : msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
                      <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: ACCENT }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {suggestedQuestions.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {suggestedQuestions.map(q => (
                  <button key={q} onClick={() => sendChat(q)} className="rounded-full px-3 py-1.5 text-xs transition active:scale-95"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>{q}</button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && sendChat()}
                placeholder="输入你的问题..." disabled={chatLoading}
                className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none transition disabled:opacity-50"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
              <button onClick={() => sendChat()} disabled={chatLoading || !chatInput.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40"
                style={{ background: 'var(--gradient-primary)', color: '#fff' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

