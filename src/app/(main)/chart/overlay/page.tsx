'use client';

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { getProfiles, type StoredProfile } from '@/lib/storage';
import { extractChartSummary, formatDegree, parseReportSections, SECTION_ICONS, type ChartSummary } from '@/lib/dual-chart-utils';
import { simpleMarkdown } from '@/lib/simple-markdown';
import { NatalChartSVG } from '@/components/chart/AstrologyComponents';
import type { AstrologyChart } from '@/types';

const ACCENT = '#c08050';

const PLANET_GLYPHS: Record<string, string> = {
  '太阳': '☉', '月亮': '☽', '水星': '☿', '金星': '♀', '火星': '♂',
  '木星': '♃', '土星': '♄', '天王星': '♅', '海王星': '♆', '冥王星': '♇', '北交点': '☊',
};
const PLANET_COLORS: Record<string, string> = {
  '太阳': '#e0a020', '月亮': '#8090b0', '水星': '#60a060', '金星': '#d06088',
  '火星': '#d04040', '木星': '#8060c0', '土星': '#606060', '天王星': '#40a0d0',
  '海王星': '#6080c0', '冥王星': '#804060', '北交点': '#808080',
};
const HOUSE_SHORT: Record<number, string> = {
  1: '命', 2: '财帛', 3: '兄弟', 4: '田宅', 5: '子女', 6: '奴仆',
  7: '夫妻', 8: '疾厄', 9: '迁移', 10: '官禄', 11: '福德', 12: '玄秘',
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function OverlayPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}><span className="animate-breathe">...</span></div>}>
      <OverlayContent />
    </Suspense>
  );
}

function OverlayContent() {
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
  const [overlayTab, setOverlayTab] = useState<'aToB' | 'bToA'>('aToB');
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const cacheKey = (selectedA && selectedB) ? `overlay_${selectedA.id}_${selectedB.id}` : '';

  const overlayCharts = useMemo<{ aToB: AstrologyChart; bToA: AstrologyChart } | null>(() => {
    if (!chartData) return null;
    try {
      const d = chartData as { overlayAtoB: AstrologyChart; overlayBtoA: AstrologyChart };
      if (d.overlayAtoB?.planets && d.overlayBtoA?.planets) return { aToB: d.overlayAtoB, bToA: d.overlayBtoA };
    } catch { /* */ }
    return null;
  }, [chartData]);

  const overlaySummary = useMemo<{ aToB: ChartSummary; bToA: ChartSummary } | null>(() => {
    if (!chartData) return null;
    try {
      const d = chartData as { overlayAtoB: AstrologyChart; overlayBtoA: AstrologyChart };
      if (d.overlayAtoB?.planets && d.overlayBtoA?.planets) {
        return {
          aToB: extractChartSummary(d.overlayAtoB),
          bToA: extractChartSummary(d.overlayBtoA),
        };
      }
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

  const handleCopyText = useCallback(async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true); setTimeout(() => setCopied(false), 2000);    } catch {
      const ta = document.createElement('textarea');
      ta.value = report; ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      setCopied(true); setTimeout(() => setCopied(false), 2000);    }
  }, [report]);

  const handleSaveImage = useCallback(async () => {
    if (!report || !selectedA || !selectedB) return;
    setShareLoading(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const container = document.createElement('div');
      container.style.cssText = `position:fixed;left:-9999px;top:0;width:390px;background:#f8f7fc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#2d2b3d;font-size:13px;line-height:1.6;`;
      container.innerHTML = `<div style="background:linear-gradient(135deg,${ACCENT},${ACCENT}cc);padding:28px 20px 22px;color:#fff"><div style="font-size:28px;margin-bottom:6px">&#9670;</div><div style="font-size:20px;font-weight:700">马盘分析</div><div style="font-size:12px;margin-top:6px;opacity:0.85">${selectedA.name} & ${selectedB.name}</div></div>`;
      const body = document.createElement('div');
      body.style.cssText = 'padding:20px;font-size:13px;line-height:1.8;color:#2d2b3d';
      body.innerHTML = simpleMarkdown(report);
      container.appendChild(body);
      const footer = document.createElement('div');
      footer.style.cssText = 'text-align:center;padding:16px 0 24px;font-size:11px;color:#bbb';
      footer.textContent = 'Aura AI - 仅供参考与娱乐';
      container.appendChild(footer);
      document.body.appendChild(container);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#f8f7fc', useCORS: true, logging: false });
      document.body.removeChild(container);
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `马盘_${selectedA.name}_${selectedB.name}_${new Date().toISOString().slice(0, 10)}.png`;
        a.click(); URL.revokeObjectURL(url);
      }, 'image/png');
         } catch (e) { console.error('生成图片失败:', e); }
    setShareLoading(false);
  }, [report, selectedA, selectedB]);

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
      const calcRes = await fetch('/api/compatibility/overlay', {
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

      const reportRes = await fetch('/api/compatibility/overlay/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: { name: selectedA.name },
          personB: { name: selectedB.name },
          overlayAtoB: data.overlayAtoB,
          overlayBtoA: data.overlayBtoA,
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
        body: JSON.stringify({ messages: newMsgs, reportContent: report, chartData, reportType: 'overlay' }),
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
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl text-2xl" style={{ background: `${ACCENT}15`, color: ACCENT }}>&#9670;</div>
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
          <span style={{ color: ACCENT, fontSize: '18px' }}>&#9670;</span>
          <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px' }}>马盘分析</span>
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
            马盘（行星落宫盘）将一方的行星放入另一方的宫位体系，揭示双方能量如何在对方的生活领域中发挥作用。分析是双向的：A如何影响B + B如何影响A。
          </p>
        </div>

        {selectedA && selectedB && !report && !loading && !error && !chartData && (
          <div className="flex justify-center py-4">
            <button onClick={() => handleAnalyze()} className="rounded-full px-8 py-3 text-sm font-semibold transition active:scale-95"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #a07040)`, color: '#fff', boxShadow: `0 4px 20px ${ACCENT}40` }}>
              开始马盘分析
            </button>
          </div>
        )}

        {loading && !report && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="animate-breathe">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg" style={{ background: `${ACCENT}15`, color: ACCENT }}>&#9670;</div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>正在计算马盘...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
            <button onClick={() => handleAnalyze()} className="rounded-full px-6 py-2.5 text-sm font-medium text-white" style={{ background: `linear-gradient(135deg, ${ACCENT}, #a07040)` }}>重试</button>
          </div>
        )}

        {/* Data Summary Card */}
        {overlaySummary && (
          <div className="mb-4 animate-fadeIn rounded-2xl p-4" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div className="grid grid-cols-2 gap-3">
              {/* A → B */}
              <div className="rounded-xl p-3" style={{ background: `${ACCENT}06` }}>
                <p className="text-[10px] font-medium mb-2" style={{ color: ACCENT }}>{selectedA?.name} → {selectedB?.name}</p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(${ACCENT} ${overlaySummary.aToB.harmonyScore * 3.6}deg, ${ACCENT}15 0deg)` }}>
                    <div className="flex h-9 w-9 flex-col items-center justify-center rounded-full" style={{ background: 'var(--bg-base)' }}>
                      <span className="text-sm font-bold" style={{ color: ACCENT }}>{overlaySummary.aToB.harmonyScore}</span>
                    </div>
                  </div>
                  <div className="text-[10px] space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    <div>相位 {overlaySummary.aToB.totalAspects}</div>
                    <div className="flex gap-1.5">
                      <span className="flex items-center gap-0.5"><span className="inline-block h-1 w-1 rounded-full" style={{ background: '#4a9060' }} />{overlaySummary.aToB.harmoniousCount}</span>
                      <span className="flex items-center gap-0.5"><span className="inline-block h-1 w-1 rounded-full" style={{ background: '#d04040' }} />{overlaySummary.aToB.tenseCount}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {overlaySummary.aToB.keyPlanets.slice(0, 3).map(p => (
                    <span key={p.name} className="text-[10px] rounded px-1.5 py-0.5" style={{ background: `${ACCENT}10`, color: 'var(--text-secondary)' }}>
                      {p.glyph} {p.sign} {p.degree}°
                    </span>
                  ))}
                </div>
              </div>
              {/* B → A */}
              <div className="rounded-xl p-3" style={{ background: `${ACCENT}06` }}>
                <p className="text-[10px] font-medium mb-2" style={{ color: ACCENT }}>{selectedB?.name} → {selectedA?.name}</p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(${ACCENT} ${overlaySummary.bToA.harmonyScore * 3.6}deg, ${ACCENT}15 0deg)` }}>
                    <div className="flex h-9 w-9 flex-col items-center justify-center rounded-full" style={{ background: 'var(--bg-base)' }}>
                      <span className="text-sm font-bold" style={{ color: ACCENT }}>{overlaySummary.bToA.harmonyScore}</span>
                    </div>
                  </div>
                  <div className="text-[10px] space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    <div>相位 {overlaySummary.bToA.totalAspects}</div>
                    <div className="flex gap-1.5">
                      <span className="flex items-center gap-0.5"><span className="inline-block h-1 w-1 rounded-full" style={{ background: '#4a9060' }} />{overlaySummary.bToA.harmoniousCount}</span>
                      <span className="flex items-center gap-0.5"><span className="inline-block h-1 w-1 rounded-full" style={{ background: '#d04040' }} />{overlaySummary.bToA.tenseCount}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {overlaySummary.bToA.keyPlanets.slice(0, 3).map(p => (
                    <span key={p.name} className="text-[10px] rounded px-1.5 py-0.5" style={{ background: `${ACCENT}10`, color: 'var(--text-secondary)' }}>
                      {p.glyph} {p.sign} {p.degree}°
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart Wheels — tab toggle between A→B and B→A */}
        {overlayCharts && (
          <div className="mb-4 animate-fadeIn rounded-2xl overflow-hidden" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <button onClick={() => setOverlayTab('aToB')}
                className="flex-1 py-2.5 text-xs font-medium transition"
                style={{ color: overlayTab === 'aToB' ? ACCENT : 'var(--text-tertiary)', borderBottom: overlayTab === 'aToB' ? `2px solid ${ACCENT}` : '2px solid transparent' }}>
                {selectedA?.name} → {selectedB?.name}
              </button>
              <button onClick={() => setOverlayTab('bToA')}
                className="flex-1 py-2.5 text-xs font-medium transition"
                style={{ color: overlayTab === 'bToA' ? ACCENT : 'var(--text-tertiary)', borderBottom: overlayTab === 'bToA' ? `2px solid ${ACCENT}` : '2px solid transparent' }}>
                {selectedB?.name} → {selectedA?.name}
              </button>
            </div>
            <div className="flex justify-center p-4">
              <NatalChartSVG chart={overlayTab === 'aToB' ? overlayCharts.aToB : overlayCharts.bToA} hideAskAI />
            </div>
            {/* Planet-House Grid */}
            {(() => {
              const currentChart = overlayTab === 'aToB' ? overlayCharts.aToB : overlayCharts.bToA;
              return (
                <div className="px-4 pb-4">
                  <div className="text-[10px] font-medium mb-2.5" style={{ color: 'var(--text-tertiary)' }}>行星落宫分布</div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {Array.from({ length: 12 }, (_, i) => {
                      const h = i + 1;
                      const planets = currentChart.planets.filter(p => p.house === h);
                      const hot = planets.length >= 2;
                      return (
                        <div key={h} className="rounded-lg p-1.5 text-center" style={{
                          background: hot ? `${ACCENT}12` : planets.length > 0 ? `${ACCENT}06` : 'var(--bg-surface)',
                          border: hot ? `1px solid ${ACCENT}25` : '1px solid transparent',
                          minHeight: 48,
                        }}>
                          <div className="text-[9px] leading-tight" style={{ color: 'var(--text-tertiary)' }}>
                            {h}宫 <span className="opacity-60">{HOUSE_SHORT[h]}</span>
                          </div>
                          {planets.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                              {planets.map(p => (
                                <span key={p.name} className="text-[13px] leading-none" style={{ color: PLANET_COLORS[p.name] || ACCENT }} title={`${p.name} ${p.sign}${p.degree}°`}>
                                  {PLANET_GLYPHS[p.name] || p.name[0]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2.5 flex flex-wrap justify-center gap-x-3 gap-y-1">
                    {currentChart.planets.slice(0, 10).map(p => (
                      <span key={p.name} className="text-[9px] flex items-center gap-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        <span style={{ color: PLANET_COLORS[p.name] || ACCENT }}>{PLANET_GLYPHS[p.name]}</span>{p.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {report && (() => {
          const { preamble, sections } = parseReportSections(report);
          const icons = SECTION_ICONS.overlay;
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
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 animate-fadeIn">
            <button onClick={handleCopyText}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition active:scale-95"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              {copied ? '已复制' : '复制全文'}
            </button>
            <button onClick={handleSaveImage} disabled={shareLoading}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition active:scale-95"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #a07040)`, color: '#fff', boxShadow: `0 4px 16px ${ACCENT}25` }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
              {shareLoading ? '保存中...' : '保存为图片'}
            </button>
            <button onClick={() => handleAnalyze(true)} className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-95" style={{ color: 'var(--text-tertiary)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
              重新生成
            </button>
          </div>
        )}

        {/* Chat */}
        {report && !loading && (
          <div className="mt-6 animate-fadeIn">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm" style={{ color: ACCENT }}>&#9670;</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>对马盘有疑问？追问 AI</span>
            </div>

            {chatMessages.length === 0 && suggestedQuestions.length === 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {['对方的行星对我影响最大的是哪个领域？', '我们之间的互动模式有什么特点？', '马盘显示的相处建议？'].map(q => (
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

