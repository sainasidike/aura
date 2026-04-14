'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { getProfiles, type StoredProfile } from '@/lib/storage';
import ShareModal from '@/components/ui/ShareModal';

const LOVE_COLOR = '#d07090';

const CATEGORY_LABELS: Record<string, string> = {
  love_chemistry: '恋爱火花',
  emotional_sync: '情感共鸣',
  communication: '沟通默契',
  long_term: '长期稳定',
  growth: '共同成长',
};

const CATEGORY_COLORS: Record<string, string> = {
  love_chemistry: '#e05080',
  emotional_sync: '#c08060',
  communication: '#5090d0',
  long_term: '#609070',
  growth: '#9070b0',
};

interface CompatibilityResult {
  overall: number;
  categories: Record<string, { score: number; aspects: { planet1: string; planet2: string; type: string; orb: number }[] }>;
  chartA: unknown;
  chartB: unknown;
  crossAspectsAtoB: unknown[];
  crossAspectsBtoA: unknown[];
  baziA: unknown;
  baziB: unknown;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function CompatibilityPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}><span className="animate-breathe">...</span></div>}>
      <CompatibilityContent />
    </Suspense>
  );
}

function CompatibilityContent() {
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [selectedA, setSelectedA] = useState<StoredProfile | null>(null);
  const [selectedB, setSelectedB] = useState<StoredProfile | null>(null);
  const [mode, setMode] = useState<'select' | 'link'>('select');
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Composite & Davison states
  const [compositeReport, setCompositeReport] = useState('');
  const [compositeLoading, setCompositeLoading] = useState(false);
  const [compositeData, setCompositeData] = useState<unknown>(null);
  const [davisonReport, setDavisonReport] = useState('');
  const [davisonLoading, setDavisonLoading] = useState(false);
  const [davisonData, setDavisonData] = useState<unknown>(null);

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [activeReportType, setActiveReportType] = useState<'synastry' | 'composite' | 'davison'>('synastry');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ps = getProfiles();
    setProfiles(ps);
    if (ps.length > 0) setSelectedA(ps[0]);
  }, []);

  const handleCopyText = useCallback(async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShareOpen(false);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = report;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShareOpen(false);
    }
  }, [report]);

  const handleSaveImage = useCallback(async () => {
    if (!contentRef.current || !report || !selectedA || !selectedB) return;
    setShareLoading(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const container = document.createElement('div');
      container.style.cssText = `position:fixed;left:-9999px;top:0;width:390px;background:#f8f7fc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#2d2b3d;font-size:13px;line-height:1.6;`;
      container.innerHTML = `
        <div style="background:linear-gradient(135deg,${LOVE_COLOR},${LOVE_COLOR}cc);padding:28px 20px 22px;color:#fff">
          <div style="font-size:28px;margin-bottom:6px">&#10084;</div>
          <div style="font-size:20px;font-weight:700">配对报告</div>
          <div style="font-size:12px;margin-top:6px;opacity:0.85">${selectedA.name} & ${selectedB.name}</div>
        </div>
      `;
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
        a.href = url;
        a.download = `配对报告_${selectedA.name}_${selectedB.name}_${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
      setShareOpen(false);
    } catch (e) {
      console.error('生成图片失败:', e);
    }
    setShareLoading(false);
  }, [report, selectedA, selectedB]);

  function generateMatchLink(profile: StoredProfile): string {
    const data = {
      n: profile.name, g: profile.gender,
      y: profile.year, m: profile.month, d: profile.day,
      h: profile.hour, mi: profile.minute,
      c: profile.city, lo: profile.longitude, la: profile.latitude, tz: profile.timezone,
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    return `${window.location.origin}/match?d=${encoded}`;
  }

  const handleGenerateLink = () => {
    if (!selectedA) return;
    const link = generateMatchLink(selectedA);
    setGeneratedLink(link);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = generatedLink;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // SSE stream reader helper
  const readSSEStream = async (
    res: Response,
    onChunk: (content: string) => void,
  ) => {
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
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const d = trimmed.slice(5).trim();
        if (d === '[DONE]') break;
        try {
          const parsed = JSON.parse(d);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.content) onChunk(parsed.content);
        } catch { /* skip */ }
      }
    }
  };

  const handleCompare = async () => {
    if (!selectedA || !selectedB) return;
    setLoading(true);
    setError('');
    setResult(null);
    setReport('');
    setCompositeReport('');
    setCompositeData(null);
    setDavisonReport('');
    setDavisonData(null);
    setChatMessages([]);
    setSuggestedQuestions([]);

    try {
      const res = await fetch('/api/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: {
            year: selectedA.year, month: selectedA.month, day: selectedA.day,
            hour: selectedA.hour, minute: selectedA.minute, gender: selectedA.gender,
            longitude: selectedA.longitude, latitude: selectedA.latitude, timezone: selectedA.timezone,
          },
          personB: {
            year: selectedB.year, month: selectedB.month, day: selectedB.day,
            hour: selectedB.hour, minute: selectedB.minute, gender: selectedB.gender,
            longitude: selectedB.longitude, latitude: selectedB.latitude, timezone: selectedB.timezone,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '计算失败');
      }

      const data = await res.json();
      setResult(data);
      setLoading(false);

      // Start streaming synastry report
      setReportLoading(true);
      const reportRes = await fetch('/api/compatibility/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: { name: selectedA.name, gender: selectedA.gender, year: selectedA.year, month: selectedA.month, day: selectedA.day },
          personB: { name: selectedB.name, gender: selectedB.gender, year: selectedB.year, month: selectedB.month, day: selectedB.day },
          compatibilityData: data,
        }),
      });

      if (!reportRes.ok) {
        const errData = await reportRes.json();
        throw new Error(errData.error || '报告生成失败');
      }

      await readSSEStream(reportRes, (chunk) => {
        setReport(prev => prev + chunk);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '计算失败');
    }
    setLoading(false);
    setReportLoading(false);
  };

  // Load composite chart + report
  const handleLoadComposite = async () => {
    if (!selectedA || !selectedB || compositeLoading) return;
    setCompositeLoading(true);
    setCompositeReport('');
    setChatMessages([]);
    setSuggestedQuestions([]);

    try {
      // Step 1: Calculate composite chart
      const calcRes = await fetch('/api/compatibility/composite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: {
            year: selectedA.year, month: selectedA.month, day: selectedA.day,
            hour: selectedA.hour, minute: selectedA.minute,
            longitude: selectedA.longitude, latitude: selectedA.latitude, timezone: selectedA.timezone,
          },
          personB: {
            year: selectedB.year, month: selectedB.month, day: selectedB.day,
            hour: selectedB.hour, minute: selectedB.minute,
            longitude: selectedB.longitude, latitude: selectedB.latitude, timezone: selectedB.timezone,
          },
        }),
      });

      if (!calcRes.ok) {
        const errData = await calcRes.json();
        throw new Error(errData.error || '组合盘计算失败');
      }

      const calcData = await calcRes.json();
      setCompositeData(calcData);

      // Step 2: Stream composite report
      const reportRes = await fetch('/api/compatibility/composite/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: { name: selectedA.name },
          personB: { name: selectedB.name },
          composite: calcData.composite,
          chartA: calcData.chartA,
          chartB: calcData.chartB,
        }),
      });

      if (!reportRes.ok) {
        const errData = await reportRes.json();
        throw new Error(errData.error || '组合盘报告生成失败');
      }

      await readSSEStream(reportRes, (chunk) => {
        setCompositeReport(prev => prev + chunk);
      });

      setActiveReportType('composite');
    } catch (e) {
      setCompositeReport(`分析失败: ${e instanceof Error ? e.message : '未知错误'}`);
    }
    setCompositeLoading(false);
  };

  // Load Davison chart + report
  const handleLoadDavison = async () => {
    if (!selectedA || !selectedB || davisonLoading) return;
    setDavisonLoading(true);
    setDavisonReport('');
    setChatMessages([]);
    setSuggestedQuestions([]);

    try {
      // Step 1: Calculate Davison chart
      const calcRes = await fetch('/api/compatibility/davison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: {
            year: selectedA.year, month: selectedA.month, day: selectedA.day,
            hour: selectedA.hour, minute: selectedA.minute,
            longitude: selectedA.longitude, latitude: selectedA.latitude, timezone: selectedA.timezone,
          },
          personB: {
            year: selectedB.year, month: selectedB.month, day: selectedB.day,
            hour: selectedB.hour, minute: selectedB.minute,
            longitude: selectedB.longitude, latitude: selectedB.latitude, timezone: selectedB.timezone,
          },
        }),
      });

      if (!calcRes.ok) {
        const errData = await calcRes.json();
        throw new Error(errData.error || '时空中点盘计算失败');
      }

      const calcData = await calcRes.json();
      setDavisonData(calcData);

      // Step 2: Stream Davison report
      const reportRes = await fetch('/api/compatibility/davison/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: { name: selectedA.name },
          personB: { name: selectedB.name },
          davison: calcData.davison,
          midpointDate: calcData.midpointDate,
        }),
      });

      if (!reportRes.ok) {
        const errData = await reportRes.json();
        throw new Error(errData.error || '时空中点盘报告生成失败');
      }

      await readSSEStream(reportRes, (chunk) => {
        setDavisonReport(prev => prev + chunk);
      });

      setActiveReportType('davison');
    } catch (e) {
      setDavisonReport(`分析失败: ${e instanceof Error ? e.message : '未知错误'}`);
    }
    setDavisonLoading(false);
  };

  // Extract suggested questions from AI response
  const extractSuggestions = (text: string): { cleaned: string; questions: string[] } => {
    const match = text.match(/\[推荐追问\]\s*\n?([\s\S]*?)$/);
    if (!match) return { cleaned: text, questions: [] };
    const cleaned = text.slice(0, match.index).trimEnd();
    const questions = match[1]
      .split('\n')
      .map(l => l.replace(/^\d+\.\s*/, '').trim())
      .filter(l => l.length > 0);
    return { cleaned, questions };
  };

  // Get current active report content for chat context
  const getActiveReportContent = () => {
    if (activeReportType === 'composite') return compositeReport;
    if (activeReportType === 'davison') return davisonReport;
    return report;
  };

  const getActiveChartData = () => {
    if (activeReportType === 'composite' && compositeData) return compositeData;
    if (activeReportType === 'davison' && davisonData) return davisonData;
    return result;
  };

  // Send chat message
  const sendChatMessage = async (question?: string) => {
    const msg = question || chatInput.trim();
    const reportContent = getActiveReportContent();
    const chartData = getActiveChartData();
    if (!msg || chatLoading || !reportContent || !chartData) return;
    setChatInput('');
    setSuggestedQuestions([]);

    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(newMessages);
    setChatLoading(true);

    let assistantContent = '';
    try {
      const res = await fetch('/api/compatibility/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          reportContent,
          chartData,
          reportType: activeReportType,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '回答失败');
      }

      await readSSEStream(res, (chunk) => {
        assistantContent += chunk;
        setChatMessages([...newMessages, { role: 'assistant', content: assistantContent }]);
      });

      const { cleaned, questions } = extractSuggestions(assistantContent);
      if (questions.length > 0) {
        setChatMessages([...newMessages, { role: 'assistant', content: cleaned }]);
        setSuggestedQuestions(questions);
      }
    } catch (e) {
      setChatMessages([...newMessages, { role: 'assistant', content: `抱歉，${e instanceof Error ? e.message : '回答失败'}` }]);
    }
    setChatLoading(false);
  };

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [report]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Whether any report is complete and can show chat
  const hasCompleteSynastry = report && !reportLoading;
  const hasCompleteComposite = compositeReport && !compositeLoading;
  const hasCompleteDavison = davisonReport && !davisonLoading;
  const canChat = hasCompleteSynastry || hasCompleteComposite || hasCompleteDavison;

  if (profiles.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl text-3xl" style={{ background: `${LOVE_COLOR}15`, color: LOVE_COLOR }}>&#10084;</div>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>请先创建至少一个档案</p>
        <Link href="/profile" className="rounded-full px-6 py-2.5 text-sm font-medium text-white" style={{ background: 'var(--gradient-primary)', boxShadow: '0 4px 16px rgba(123,108,184,0.25)' }}>
          创建档案
        </Link>
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
          <span style={{ color: LOVE_COLOR, fontSize: '18px' }}>&#10084;</span>
          <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px' }}>星盘配对</span>
        </div>

        {/* Profile A selector */}
        <div className="mb-4 rounded-2xl p-4 animate-fadeIn" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
          <label className="mb-2 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>我的档案</label>
          <select
            value={selectedA?.id || ''}
            onChange={e => setSelectedA(profiles.find(p => p.id === e.target.value) || null)}
            className="w-full rounded-xl border px-4 py-2.5 text-sm"
            style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.year}.{p.month}.{p.day})</option>
            ))}
          </select>
        </div>

        {/* Mode toggle */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => { setMode('select'); setGeneratedLink(''); }}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition"
            style={{
              background: mode === 'select' ? `${LOVE_COLOR}15` : 'var(--bg-surface)',
              color: mode === 'select' ? LOVE_COLOR : 'var(--text-tertiary)',
              border: `1px solid ${mode === 'select' ? `${LOVE_COLOR}30` : 'var(--border-subtle)'}`,
            }}
          >
            选择已有档案
          </button>
          <button
            onClick={() => { setMode('link'); setResult(null); setReport(''); }}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition"
            style={{
              background: mode === 'link' ? `${LOVE_COLOR}15` : 'var(--bg-surface)',
              color: mode === 'link' ? LOVE_COLOR : 'var(--text-tertiary)',
              border: `1px solid ${mode === 'link' ? `${LOVE_COLOR}30` : 'var(--border-subtle)'}`,
            }}
          >
            生成配对链接
          </button>
        </div>

        {/* Select mode */}
        {mode === 'select' && (
          <div className="animate-fadeIn">
            <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              <label className="mb-2 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>对方档案</label>
              {profiles.length < 2 ? (
                <div className="py-4 text-center">
                  <p className="mb-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>至少需要两个档案才能配对</p>
                  <Link href="/profile?showForm=true" className="inline-block rounded-full px-5 py-2 text-xs font-medium text-white" style={{ background: 'var(--gradient-primary)' }}>
                    创建新档案
                  </Link>
                </div>
              ) : (
                <select
                  value={selectedB?.id || ''}
                  onChange={e => setSelectedB(profiles.find(p => p.id === e.target.value) || null)}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm"
                  style={{ background: 'var(--bg-base)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                >
                  <option value="">-- 选择 --</option>
                  {profiles.filter(p => p.id !== selectedA?.id).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.year}.{p.month}.{p.day})</option>
                  ))}
                </select>
              )}
            </div>

            {selectedA && selectedB && !result && !loading && !error && (
              <div className="flex justify-center py-4">
                <button
                  onClick={handleCompare}
                  className="rounded-full px-8 py-3 text-sm font-semibold transition active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${LOVE_COLOR}, #b06080)`, color: '#fff', boxShadow: `0 4px 20px ${LOVE_COLOR}40` }}
                >
                  开始配对分析
                </button>
              </div>
            )}
          </div>
        )}

        {/* Link mode */}
        {mode === 'link' && (
          <div className="animate-fadeIn rounded-2xl p-5" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
            <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              生成一个专属链接，发送给对方填写信息后即可查看配对结果
            </p>
            {!generatedLink ? (
              <button
                onClick={handleGenerateLink}
                disabled={!selectedA}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${LOVE_COLOR}, #b06080)`, boxShadow: `0 4px 16px ${LOVE_COLOR}30` }}
              >
                生成配对链接
              </button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl p-3 text-xs break-all" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                  {generatedLink}
                </div>
                <button
                  onClick={handleCopyLink}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${LOVE_COLOR}, #b06080)`, boxShadow: `0 4px 16px ${LOVE_COLOR}30` }}
                >
                  {linkCopied ? '已复制' : '复制链接'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && !result && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="animate-breathe">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg" style={{ background: `${LOVE_COLOR}15`, color: LOVE_COLOR }}>&#10084;</div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>正在计算配对数据...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
            <button onClick={handleCompare} className="rounded-full px-6 py-2.5 text-sm font-medium text-white" style={{ background: `linear-gradient(135deg, ${LOVE_COLOR}, #b06080)` }}>
              重试
            </button>
          </div>
        )}

        {/* Score display */}
        {result && (
          <div className="mb-5 animate-fadeIn">
            {/* Overall score circle */}
            <div className="mb-5 flex flex-col items-center py-4">
              <div
                className="relative flex h-28 w-28 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(${LOVE_COLOR} ${result.overall * 3.6}deg, ${LOVE_COLOR}15 0deg)`,
                  boxShadow: `0 8px 32px ${LOVE_COLOR}25`,
                }}
              >
                <div className="flex h-22 w-22 flex-col items-center justify-center rounded-full" style={{ background: 'var(--bg-base)', width: '88px', height: '88px' }}>
                  <span className="text-3xl font-bold" style={{ color: LOVE_COLOR, fontFamily: 'var(--font-display)' }}>{result.overall}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>综合得分</span>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {selectedA?.name} & {selectedB?.name}
              </p>
            </div>

            {/* Category bars */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const cat = result.categories[key];
                if (!cat) return null;
                const color = CATEGORY_COLORS[key] || LOVE_COLOR;
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span className="text-xs font-semibold" style={{ color }}>{cat.score}</span>
                    </div>
                    <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: `${color}15` }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cat.score}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Report loading */}
        {reportLoading && !report && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="animate-breathe">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm" style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)' }}>*</div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>AI 正在撰写配对报告...</p>
          </div>
        )}

        {/* Synastry report content */}
        {report && (
          <div
            ref={contentRef}
            className="animate-fadeIn prose-chat rounded-2xl p-6"
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              boxShadow: 'var(--shadow-card)',
            }}
            dangerouslySetInnerHTML={{ __html: simpleMarkdown(report) }}
          />
        )}

        {reportLoading && report && (
          <div className="mt-3 flex justify-center">
            <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: 'var(--accent-primary)' }} />
          </div>
        )}

        {/* Share buttons */}
        {report && !reportLoading && (
          <div className="mt-4 flex items-center justify-center gap-3 animate-fadeIn">
            <button
              onClick={handleCopyText}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition active:scale-95"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              {copied ? '已复制' : '复制全文'}
            </button>
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition active:scale-95"
              style={{ background: `linear-gradient(135deg, ${LOVE_COLOR}, #b06080)`, color: '#fff', boxShadow: `0 4px 16px ${LOVE_COLOR}25` }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
              保存为图片
            </button>
          </div>
        )}

        {/* ========== Progressive Disclosure: Composite & Davison ========== */}
        {report && !reportLoading && (
          <div className="mt-6 space-y-3 animate-fadeIn">
            <h3 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-tertiary)' }}>
              深度分析
            </h3>

            {/* Composite Card */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              <button
                onClick={() => {
                  if (!compositeReport && !compositeLoading) {
                    handleLoadComposite();
                  }
                  setActiveReportType('composite');
                  setChatMessages([]);
                  setSuggestedQuestions([]);
                }}
                disabled={compositeLoading}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:scale-[0.99]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base"
                  style={{ background: '#9070b018', color: '#9070b0' }}>
                  &#9678;
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>组合盘分析</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {compositeReport ? '查看关系能量分析' : '两人行星中点 — 关系本身的能量特质'}
                  </p>
                </div>
                {compositeLoading ? (
                  <span className="inline-block h-2 w-2 rounded-full animate-breathe" style={{ background: '#9070b0' }} />
                ) : compositeReport ? (
                  <span className="text-xs font-medium" style={{ color: '#9070b0' }}>&#10003;</span>
                ) : (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>&#8594;</span>
                )}
              </button>

              {/* Composite report content */}
              {(compositeReport || compositeLoading) && (
                <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  {compositeLoading && !compositeReport && (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="animate-breathe">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm" style={{ background: '#9070b018', color: '#9070b0' }}>&#9678;</div>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>AI 正在分析组合盘...</p>
                    </div>
                  )}
                  {compositeReport && (
                    <div
                      className="prose-chat p-5"
                      style={{ color: 'var(--text-secondary)' }}
                      dangerouslySetInnerHTML={{ __html: simpleMarkdown(compositeReport) }}
                    />
                  )}
                  {compositeLoading && compositeReport && (
                    <div className="flex justify-center pb-4">
                      <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: '#9070b0' }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Davison Card */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              <button
                onClick={() => {
                  if (!davisonReport && !davisonLoading) {
                    handleLoadDavison();
                  }
                  setActiveReportType('davison');
                  setChatMessages([]);
                  setSuggestedQuestions([]);
                }}
                disabled={davisonLoading}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:scale-[0.99]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base"
                  style={{ background: '#5090d018', color: '#5090d0' }}>
                  &#8982;
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>时空中点盘分析</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {davisonReport ? '查看关系命运分析' : '时间与地点中点 — 关系的先天命运'}
                  </p>
                </div>
                {davisonLoading ? (
                  <span className="inline-block h-2 w-2 rounded-full animate-breathe" style={{ background: '#5090d0' }} />
                ) : davisonReport ? (
                  <span className="text-xs font-medium" style={{ color: '#5090d0' }}>&#10003;</span>
                ) : (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>&#8594;</span>
                )}
              </button>

              {/* Davison report content */}
              {(davisonReport || davisonLoading) && (
                <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  {davisonLoading && !davisonReport && (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="animate-breathe">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm" style={{ background: '#5090d018', color: '#5090d0' }}>&#8982;</div>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>AI 正在分析时空中点盘...</p>
                    </div>
                  )}
                  {davisonReport && (
                    <div
                      className="prose-chat p-5"
                      style={{ color: 'var(--text-secondary)' }}
                      dangerouslySetInnerHTML={{ __html: simpleMarkdown(davisonReport) }}
                    />
                  )}
                  {davisonLoading && davisonReport && (
                    <div className="flex justify-center pb-4">
                      <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: '#5090d0' }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== Follow-up Chat Section ========== */}
        {canChat && (
          <div className="mt-6 animate-fadeIn">
            {/* Report type tabs for chat context */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm" style={{ color: LOVE_COLOR }}>&#10084;</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>对报告有疑问？追问 AI</span>
            </div>

            {/* Active context indicator */}
            <div className="mb-3 flex gap-2">
              {hasCompleteSynastry && (
                <button
                  onClick={() => { setActiveReportType('synastry'); setChatMessages([]); setSuggestedQuestions([]); }}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition"
                  style={{
                    background: activeReportType === 'synastry' ? `${LOVE_COLOR}15` : 'var(--bg-surface)',
                    color: activeReportType === 'synastry' ? LOVE_COLOR : 'var(--text-tertiary)',
                    border: `1px solid ${activeReportType === 'synastry' ? `${LOVE_COLOR}30` : 'var(--border-subtle)'}`,
                  }}
                >
                  合盘
                </button>
              )}
              {hasCompleteComposite && (
                <button
                  onClick={() => { setActiveReportType('composite'); setChatMessages([]); setSuggestedQuestions([]); }}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition"
                  style={{
                    background: activeReportType === 'composite' ? '#9070b015' : 'var(--bg-surface)',
                    color: activeReportType === 'composite' ? '#9070b0' : 'var(--text-tertiary)',
                    border: `1px solid ${activeReportType === 'composite' ? '#9070b030' : 'var(--border-subtle)'}`,
                  }}
                >
                  组合盘
                </button>
              )}
              {hasCompleteDavison && (
                <button
                  onClick={() => { setActiveReportType('davison'); setChatMessages([]); setSuggestedQuestions([]); }}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition"
                  style={{
                    background: activeReportType === 'davison' ? '#5090d015' : 'var(--bg-surface)',
                    color: activeReportType === 'davison' ? '#5090d0' : 'var(--text-tertiary)',
                    border: `1px solid ${activeReportType === 'davison' ? '#5090d030' : 'var(--border-subtle)'}`,
                  }}
                >
                  时空中点盘
                </button>
              )}
            </div>

            {/* Default suggested questions */}
            {chatMessages.length === 0 && suggestedQuestions.length === 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {(activeReportType === 'synastry' ? [
                  '我们之间最强的吸引力来自哪里？',
                  '长期在一起需要注意什么？',
                  '我们的沟通模式有什么特点？',
                ] : activeReportType === 'composite' ? [
                  '这段关系最核心的主题是什么？',
                  '组合盘显示我们的挑战在哪？',
                  '如何更好地经营这段关系？',
                ] : [
                  '时空中点盘显示的命运主题是什么？',
                  '我们需要共同面对的课题？',
                  '这段关系的灵魂成长方向？',
                ]).map(q => (
                  <button key={q} onClick={() => sendChatMessage(q)}
                    className="rounded-full px-3 py-1.5 text-xs transition active:scale-95"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Chat messages */}
            {chatMessages.length > 0 && (
              <div className="space-y-3 mb-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm"
                      style={msg.role === 'user'
                        ? { background: 'var(--gradient-primary)', color: '#fff', borderBottomRightRadius: '4px' }
                        : { background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderBottomLeftRadius: '4px' }
                      }
                    >
                      {msg.role === 'assistant'
                        ? <div className="prose-chat" dangerouslySetInnerHTML={{ __html: simpleMarkdown(msg.content) }} />
                        : msg.content
                      }
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
                      <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: 'var(--accent-primary)' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* AI suggested questions */}
            {suggestedQuestions.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {suggestedQuestions.map(q => (
                  <button key={q} onClick={() => sendChatMessage(q)}
                    className="rounded-full px-3 py-1.5 text-xs transition active:scale-95"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && sendChatMessage()}
                placeholder="输入你的问题..."
                disabled={chatLoading}
                className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none transition disabled:opacity-50"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
              />
              <button
                onClick={() => sendChatMessage()}
                disabled={chatLoading || !chatInput.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40"
                style={{ background: 'var(--gradient-primary)', color: '#fff' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <ShareModal
        open={shareOpen}
        loading={shareLoading}
        onClose={() => setShareOpen(false)}
        onCopyText={handleCopyText}
        onSaveImage={handleSaveImage}
      />
    </div>
  );
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
}
