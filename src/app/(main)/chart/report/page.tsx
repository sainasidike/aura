'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getProfileById, getProfiles, getActiveProfileId, type StoredProfile } from '@/lib/storage';
import { fetchNatalCharts } from '@/lib/chart-cache';
import { annotateGlossaryTerms, getGlossaryEntry, type GlossaryEntry } from '@/lib/astrology-glossary';
import GlossaryPopup from '@/components/ui/GlossaryPopup';
import ShareModal from '@/components/ui/ShareModal';
import { simpleMarkdown } from '@/lib/simple-markdown';

const REPORT_META: Record<string, { title: string; icon: string; color: string }> = {
  love: { title: '正缘报告', icon: '♡', color: '#d07090' },
  career: { title: '事业报告', icon: '◆', color: '#4888d0' },
  emotion: { title: '感情报告', icon: '✧', color: '#c88050' },
  health: { title: '健康报告', icon: '✦', color: '#40a080' },
};

// Section 图标和颜色映射
const SECTION_STYLE: Record<string, { icon: string; color: string }> = {
  // 正缘报告
  PARTNER: { icon: '👤', color: '#d07090' },
  APPEARANCE: { icon: '✨', color: '#c88050' },
  LOVE_STYLE: { icon: '💕', color: '#e06888' },
  TIMING: { icon: '⏰', color: '#7b6cb8' },
  STRENGTHS: { icon: '🌟', color: '#40a080' },
  CHALLENGES: { icon: '⚡', color: '#e08040' },
  ADVICE: { icon: '💡', color: '#4888d0' },
  // 事业报告
  VOCATION: { icon: '🎯', color: '#4888d0' },
  SKILLS: { icon: '🛠', color: '#40a080' },
  WEALTH: { icon: '💰', color: '#c8a030' },
  LEADERSHIP: { icon: '👑', color: '#d07090' },
  CAREER_TIMING: { icon: '📅', color: '#7b6cb8' },
  INDUSTRIES: { icon: '🏢', color: '#4888d0' },
  CAREER_ADVICE: { icon: '🚀', color: '#40a080' },
  // 感情报告
  EMOTIONAL_CORE: { icon: '🌊', color: '#5b8def' },
  LOVE_PATTERN: { icon: '💗', color: '#d07090' },
  ATTACHMENT: { icon: '🔗', color: '#c88050' },
  KARMIC: { icon: '🔮', color: '#7b6cb8' },
  EMOTION_TIMING: { icon: '📅', color: '#7b6cb8' },
  HEALING: { icon: '🌿', color: '#40a080' },
  // 健康报告
  CONSTITUTION: { icon: '🏋', color: '#4888d0' },
  BODY_MAP: { icon: '🗺', color: '#d07090' },
  ENERGY: { icon: '⚡', color: '#e08040' },
  MENTAL_HEALTH: { icon: '🧠', color: '#7b6cb8' },
  HEALTH_TIMING: { icon: '📅', color: '#7b6cb8' },
  WELLNESS: { icon: '🌿', color: '#40a080' },
};

interface ReportSection {
  key: string;
  title: string;
  content: string;
}

/** 解析 AI 输出中的 ---SECTION_XXX--- 标记，拆分为多个板块 */
function parseReportSections(text: string): ReportSection[] {
  const regex = /---SECTION_(\w+)---\s*(.+?)(?:\n|$)/g;
  const sections: ReportSection[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // 收集所有 section 起始位置
  const markers: { key: string; title: string; start: number; contentStart: number }[] = [];
  while ((match = regex.exec(text)) !== null) {
    markers.push({
      key: match[1],
      title: match[2].trim(),
      start: match.index,
      contentStart: match.index + match[0].length,
    });
  }

  if (markers.length === 0) {
    // 没有 section 标记，作为整体返回
    return [{ key: '_FULL', title: '', content: text }];
  }

  // 如果第一个标记前有内容，作为 intro
  const preContent = text.slice(0, markers[0].start).trim();
  if (preContent) {
    sections.push({ key: '_INTRO', title: '', content: preContent });
  }

  for (let i = 0; i < markers.length; i++) {
    const end = i + 1 < markers.length ? markers[i + 1].start : text.length;
    const content = text.slice(markers[i].contentStart, end).trim();
    sections.push({ key: markers[i].key, title: markers[i].title, content });
  }

  return sections;
}

// Timing 类 section 的 key
const TIMING_KEYS = new Set(['TIMING', 'CAREER_TIMING', 'EMOTION_TIMING', 'HEALTH_TIMING']);

interface TimeWindow {
  period: string;     // e.g. "2027年3月-8月"
  planet: string;     // e.g. "木星"
  aspect: string;     // e.g. "三合"
}

/** 从 timing section 内容中提取时间窗口 */
function extractTimeWindows(content: string): TimeWindow[] {
  const windows: TimeWindow[] = [];
  // 匹配模式如：2027年3月-8月、2027年3月-2028年1月 等
  const periodRegex = /(\d{4}年\d{1,2}月[\s\S]*?(?:\d{4}年)?\d{1,2}月|\d{4}年\d{1,2}月)/g;
  let match: RegExpExecArray | null;
  while ((match = periodRegex.exec(content)) !== null) {
    const period = match[1].replace(/\s+/g, '');
    // 往后找行星名和相位类型
    const ctx = content.slice(Math.max(0, match.index - 60), match.index + match[0].length + 120);
    const planetMatch = ctx.match(/(木星|土星|天王星|海王星|冥王星|金星|火星)/);
    const aspectMatch = ctx.match(/(合相|三合|六合|刑克|对冲)/);
    if (planetMatch) {
      windows.push({
        period,
        planet: planetMatch[1],
        aspect: aspectMatch?.[1] || '',
      });
    }
  }
  // 去重
  const seen = new Set<string>();
  return windows.filter(w => {
    const key = w.period + w.planet;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

const PLANET_COLORS: Record<string, string> = {
  '木星': '#f0a030',
  '土星': '#7b6cb8',
  '天王星': '#40a080',
  '海王星': '#5b8def',
  '冥王星': '#d07090',
  '金星': '#e06888',
  '火星': '#e05040',
};

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}><span className="animate-breathe">加载中...</span></div>}>
      <ReportContent />
    </Suspense>
  );
}

function ReportContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'love';
  const paramProfileId = searchParams.get('profileId');
  const meta = REPORT_META[type] || REPORT_META.love;

  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chartLoading, setChartLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  // 追问对话
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const chartDataRef = useRef<Record<string, unknown> | null>(null);
  const [glossaryEntry, setGlossaryEntry] = useState<GlossaryEntry | null>(null);
  const [glossaryRect, setGlossaryRect] = useState<DOMRect | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasAutoGenerated = useRef(false);
  const [confirmed, setConfirmed] = useState(false);

  // 缓存 key
  const cacheKey = profile ? `report_${profile.id}_${type}` : '';

  // 页面加载时读取缓存
  useEffect(() => {
    if (!cacheKey) return;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.report) setReport(data.report);
        if (data.chatMessages) setChatMessages(data.chatMessages);
        if (data.suggestedQuestions) setSuggestedQuestions(data.suggestedQuestions);
        if (data.chartData) chartDataRef.current = data.chartData;
      }
    } catch { /* ignore */ }
  }, [cacheKey]);

  // 有缓存时自动加载，无缓存时等用户确认
  useEffect(() => {
    if (!profile || hasAutoGenerated.current || loading || chartLoading) return;
    const key = `report_${profile.id}_${type}`;
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.report) { setConfirmed(true); return; }
      }
    } catch { /* */ }
    // 无缓存：不自动生成，等用户点击确认
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // 用户确认后生成报告
  useEffect(() => {
    if (!confirmed || !profile || hasAutoGenerated.current || report) return;
    hasAutoGenerated.current = true;
    generateReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, profile]);

  // 报告/聊天变化时写入缓存（仅在非 loading 时）
  useEffect(() => {
    if (!cacheKey || !report || loading) return;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        report,
        chatMessages,
        suggestedQuestions,
        chartData: chartDataRef.current,
        timestamp: Date.now(),
      }));
    } catch { /* quota exceeded, ignore */ }
  }, [cacheKey, report, chatMessages, suggestedQuestions, loading]);

  const handleCopyText = useCallback(async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShareOpen(false);
    } catch {
      // fallback
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
    if (!contentRef.current || !report || !profile) return;
    setShareLoading(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;

      // 创建离屏容器渲染报告长图
      const container = document.createElement('div');
      container.style.cssText = `
        position:fixed;left:-9999px;top:0;width:390px;
        background:#f8f7fc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
        color:#2d2b3d;font-size:13px;line-height:1.6;
      `;

      // 头部
      container.innerHTML = `
        <div style="background:linear-gradient(135deg,${meta.color},${meta.color}cc);padding:28px 20px 22px;color:#fff">
          <div style="font-size:28px;margin-bottom:6px">${meta.icon}</div>
          <div style="font-size:20px;font-weight:700;letter-spacing:0.5px">${meta.title}</div>
          <div style="font-size:12px;margin-top:6px;opacity:0.85">${profile.name} · ${profile.year}.${profile.month}.${profile.day}</div>
        </div>
      `;

      // 报告内容
      const body = document.createElement('div');
      body.style.cssText = 'padding:20px;font-size:13px;line-height:1.8;color:#2d2b3d';
      body.innerHTML = simpleMarkdown(report);
      container.appendChild(body);

      // 水印
      const footer = document.createElement('div');
      footer.style.cssText = 'text-align:center;padding:16px 0 24px;font-size:11px;color:#bbb';
      footer.textContent = '✦ 由 Aura AI 占星师生成 · 仅供参考与娱乐';
      container.appendChild(footer);

      document.body.appendChild(container);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#f8f7fc',
        useCORS: true,
        logging: false,
      });
      document.body.removeChild(container);

      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${meta.title}_${profile.name}_${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');

      setShareOpen(false);
    } catch (e) {
      console.error('生成图片失败:', e);
    }
    setShareLoading(false);
  }, [report, meta, profile]);

  useEffect(() => {
    if (paramProfileId) {
      const p = getProfileById(paramProfileId);
      if (p) { setProfile(p); return; }
    }
    const savedId = getActiveProfileId();
    if (savedId) {
      const p = getProfileById(savedId);
      if (p) { setProfile(p); return; }
    }
    const all = getProfiles();
    if (all.length > 0) setProfile(all[0]);
  }, [paramProfileId]);

  const generateReport = async () => {
    if (!profile) return;
    setChartLoading(true);
    setError('');
    setReport('');
    setChatMessages([]);
    setSuggestedQuestions([]);
    chartDataRef.current = null;
    if (cacheKey) try { localStorage.removeItem(cacheKey); } catch { /* */ }

    try {
      const charts = await fetchNatalCharts(profile, ['astrology']);
      const astroData = charts.astrology;

      if (!astroData) throw new Error('星盘计算失败');

      setChartLoading(false);
      setLoading(true);

      const chartData = {
        profile: { name: profile.name, gender: profile.gender, birthDate: `${profile.year}-${profile.month}-${profile.day}`, birthTime: `${profile.hour}:${profile.minute}`, city: profile.city, longitude: profile.longitude, latitude: profile.latitude, timezone: profile.timezone },
        astrology: astroData.chart,
      };
      chartDataRef.current = chartData;

      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, chartData }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '生成失败');
      }

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
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) {
              setReport(prev => prev + parsed.content);
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败');
    }
    setLoading(false);
    setChartLoading(false);
  };

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [report]);

  // 滚动到对话底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Glossary 点击事件委托
  const handleGlossaryClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('.glossary-term') as HTMLElement | null;
    if (!target) return;
    const term = target.getAttribute('data-term');
    if (!term) return;
    const entry = getGlossaryEntry(term);
    if (entry) {
      setGlossaryEntry(entry);
      setGlossaryRect(target.getBoundingClientRect());
    }
  }, []);

  // 从 AI 回复中提取推荐追问
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

  // 发送追问
  const sendChatMessage = async (question?: string) => {
    const msg = question || chatInput.trim();
    if (!msg || chatLoading || !report || !chartDataRef.current) return;
    setChatInput('');
    setSuggestedQuestions([]);

    const newMessages = [...chatMessages, { role: 'user' as const, content: msg }];
    setChatMessages(newMessages);
    setChatLoading(true);

    let assistantContent = '';
    try {
      const res = await fetch('/api/report/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          reportContent: report,
          chartData: chartDataRef.current,
          reportType: type,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '回答失败');
      }

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
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) {
              assistantContent += parsed.content;
              setChatMessages([...newMessages, { role: 'assistant', content: assistantContent }]);
            }
          } catch { /* skip */ }
        }
      }

      // 提取推荐追问
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

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl text-3xl" style={{ background: `${meta.color}15`, color: meta.color }}>
          {meta.icon}
        </div>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>请先创建一个档案</p>
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
        <div className="mb-5 flex items-center justify-between">
          <Link href="/chart" className="flex items-center gap-2 text-sm transition"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>←</span>
            <span style={{ color: meta.color, fontSize: '16px' }}>{meta.icon}</span>
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 600 }}>{meta.title}</span>
          </Link>
          <div className="rounded-full px-3 py-1 text-xs" style={{ background: 'var(--bg-surface)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>
            {profile.name} · {profile.year}.{profile.month}.{profile.day}
          </div>
        </div>

        {/* Confirmation screen — 无缓存时先确认再生成 */}
        {!confirmed && !report && !loading && !chartLoading && !error && (
          <div className="flex flex-col items-center gap-5 py-16">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl text-3xl"
              style={{ background: `${meta.color}15`, color: meta.color }}>
              {meta.icon}
            </div>
            <div className="text-center">
              <h2 className="mb-1.5 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{meta.title}</h2>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                将为 <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{profile.name}</span> 生成专属分析报告
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>
                {profile.year}年{profile.month}月{profile.day}日 {profile.hour}:{String(profile.minute || 0).padStart(2, '0')} · {profile.city}
              </p>
            </div>
            <button
              onClick={() => setConfirmed(true)}
              className="rounded-full px-8 py-3 text-sm font-medium text-white transition active:scale-95"
              style={{ background: 'var(--gradient-primary)', boxShadow: `0 4px 20px ${meta.color}30` }}
            >
              开始分析
            </button>
          </div>
        )}

        {/* Loading states */}
        {chartLoading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="animate-breathe">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg" style={{ background: `${meta.color}15`, color: meta.color }}>{meta.icon}</div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>正在计算星盘数据...</p>
          </div>
        )}

        {loading && !report && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="animate-breathe">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg" style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)' }}>✦</div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>AI 正在撰写报告...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
            <button onClick={generateReport} className="rounded-full px-6 py-2.5 text-sm font-medium text-white" style={{ background: 'var(--gradient-primary)' }}>
              重试
            </button>
          </div>
        )}

        {/* 数据摘要卡片 — 展示报告基于的关键星盘数据 */}
        {report && chartDataRef.current && (() => {
          const astro = chartDataRef.current!.astrology as Record<string, unknown> | undefined;
          if (!astro) return null;
          const planets = astro.planets as { name: string; sign: string; degree: number; minute?: number; house: number; longitude: number }[] | undefined;
          const houses = astro.houses as { number: number; sign: string; degree: number; minute?: number; longitude: number }[] | undefined;
          const aspects = astro.aspects as { planet1: string; planet2: string; type: string; orb: number }[] | undefined;
          const sun = planets?.find(p => p.name === '太阳');
          const moon = planets?.find(p => p.name === '月亮');
          const venus = planets?.find(p => p.name === '金星');
          const mars = planets?.find(p => p.name === '火星');
          const h1 = houses?.find(h => h.number === 1);
          const h7 = houses?.find(h => h.number === 7);
          const h10 = houses?.find(h => h.number === 10);
          const fmtP = (p: typeof sun) => p ? `${p.sign}${p.degree}°${String(p.minute || 0).padStart(2, '0')}'` : '—';
          const fmtH = (h: typeof h1) => h ? `${h.sign}${h.degree}°` : '—';

          // 根据报告类型选择关键数据点
          const dataPoints: { label: string; value: string; icon: string }[] = [];
          if (type === 'love') {
            dataPoints.push(
              { label: '金星', value: fmtP(venus), icon: '♀' },
              { label: '下降点', value: fmtH(h7), icon: '↓' },
              { label: '月亮', value: fmtP(moon), icon: '☽' },
              { label: '上升', value: fmtH(h1), icon: '↑' },
            );
          } else if (type === 'career') {
            dataPoints.push(
              { label: '中天MC', value: fmtH(h10), icon: '⬆' },
              { label: '太阳', value: fmtP(sun), icon: '☉' },
              { label: '火星', value: fmtP(mars), icon: '♂' },
              { label: '上升', value: fmtH(h1), icon: '↑' },
            );
          } else if (type === 'emotion') {
            dataPoints.push(
              { label: '月亮', value: fmtP(moon), icon: '☽' },
              { label: '金星', value: fmtP(venus), icon: '♀' },
              { label: '下降点', value: fmtH(h7), icon: '↓' },
              { label: '太阳', value: fmtP(sun), icon: '☉' },
            );
          } else {
            dataPoints.push(
              { label: '上升', value: fmtH(h1), icon: '↑' },
              { label: '太阳', value: fmtP(sun), icon: '☉' },
              { label: '月亮', value: fmtP(moon), icon: '☽' },
              { label: '火星', value: fmtP(mars), icon: '♂' },
            );
          }

          return (
            <div className="mb-4 animate-fadeIn rounded-2xl p-4"
              style={{ background: `${meta.color}06`, border: `1px solid ${meta.color}18` }}>
              <div className="mb-2.5 flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: meta.color }}>排盘数据摘要</span>
                <span className="text-[0.65rem]" style={{ color: 'var(--text-tertiary)' }}>
                  {planets?.length || 0} 颗行星 · {houses?.length || 0} 宫位 · {aspects?.length || 0} 个相位
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {dataPoints.map(dp => (
                  <div key={dp.label} className="rounded-xl px-2.5 py-2 text-center"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}>
                    <div className="text-[0.65rem]" style={{ color: 'var(--text-tertiary)' }}>{dp.icon} {dp.label}</div>
                    <div className="mt-0.5 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{dp.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Report content — 卡片式分段渲染 */}
        {report && (() => {
          const sections = parseReportSections(report);
          const hasSections = sections.length > 1 || sections[0]?.key !== '_FULL';
          if (!hasSections) {
            // 兼容旧格式：无 section 标记时整体渲染
            return (
              <div ref={contentRef}
                className="animate-fadeIn prose-chat rounded-2xl p-6"
                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-card)' }}
                onClick={handleGlossaryClick}
                dangerouslySetInnerHTML={{ __html: annotateGlossaryTerms(simpleMarkdown(report)) }}
              />
            );
          }
          return (
            <div ref={contentRef} className="animate-fadeIn space-y-4">
              {sections.map((sec, idx) => {
                const style = SECTION_STYLE[sec.key];
                const sColor = style?.color || meta.color;
                const sIcon = style?.icon || '✦';
                if (sec.key === '_INTRO') {
                  return (
                    <div key={idx} className="prose-chat rounded-2xl p-5"
                      style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-card)' }}
                      onClick={handleGlossaryClick}
                      dangerouslySetInnerHTML={{ __html: annotateGlossaryTerms(simpleMarkdown(sec.content)) }}
                    />
                  );
                }
                return (
                  <div key={idx} className="rounded-2xl overflow-hidden"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
                    {/* Section header */}
                    <div className="flex items-center gap-3 px-5 py-3.5"
                      style={{ background: `${sColor}08`, borderBottom: `1px solid ${sColor}18` }}>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                        style={{ background: `${sColor}15`, color: sColor }}>
                        {sIcon}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {sec.title}
                      </span>
                      <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {idx}/{sections.length - (sections[0]?.key === '_INTRO' ? 1 : 0)}
                      </span>
                    </div>
                    {/* Timeline visualization for timing sections */}
                    {TIMING_KEYS.has(sec.key) && (() => {
                      const windows = extractTimeWindows(sec.content);
                      if (windows.length === 0) return null;
                      return (
                        <div className="px-5 pt-3 pb-1">
                          <div className="relative flex items-start gap-0 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                            {/* 横线 */}
                            <div className="absolute left-0 right-0 top-[14px] h-[2px]" style={{ background: 'var(--border-subtle)' }} />
                            {windows.map((w, wi) => {
                              const pColor = PLANET_COLORS[w.planet] || sColor;
                              return (
                                <div key={wi} className="relative flex flex-col items-center shrink-0" style={{ minWidth: '90px', flex: 1 }}>
                                  {/* 节点 */}
                                  <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[0.6rem] font-bold"
                                    style={{ background: pColor, color: '#fff', boxShadow: `0 2px 8px ${pColor}40` }}>
                                    {wi + 1}
                                  </div>
                                  {/* 行星标签 */}
                                  <div className="mt-1.5 rounded-full px-2 py-0.5 text-[0.6rem] font-medium"
                                    style={{ background: `${pColor}15`, color: pColor }}>
                                    {w.planet}{w.aspect ? ` ${w.aspect}` : ''}
                                  </div>
                                  {/* 时间 */}
                                  <div className="mt-1 text-center text-[0.6rem] leading-tight" style={{ color: 'var(--text-tertiary)' }}>
                                    {w.period}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                    {/* Section body */}
                    <div className="prose-chat px-5 py-4"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={handleGlossaryClick}
                      dangerouslySetInnerHTML={{ __html: annotateGlossaryTerms(simpleMarkdown(sec.content)) }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })()}

        {loading && report && (
          <div className="mt-3 flex justify-center">
            <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: 'var(--accent-primary)' }} />
          </div>
        )}

        {/* Share buttons + regenerate - shown when report is complete */}
        {report && !loading && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 animate-fadeIn">
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
              style={{ background: 'var(--gradient-primary)', color: 'var(--text-inverse)', boxShadow: '0 4px 16px rgba(123,108,184,0.25)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
              保存为图片
            </button>
            <button
              onClick={generateReport}
              className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition active:scale-95"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              重新生成
            </button>
          </div>
        )}

        {/* Follow-up Chat Section */}
        {report && !loading && (
          <div className="mt-6 animate-fadeIn">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm" style={{ color: meta.color }}>✦</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>对报告有疑问？追问 AI</span>
            </div>

            {/* Suggested questions */}
            {chatMessages.length === 0 && suggestedQuestions.length === 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  '帮我解释一下报告中提到的关键相位',
                  '我最需要注意的是什么？',
                  '能更详细地分析时间窗口吗？',
                ].map(q => (
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

            {/* Suggested from AI */}
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

      <GlossaryPopup
        entry={glossaryEntry}
        anchorRect={glossaryRect}
        onClose={() => { setGlossaryEntry(null); setGlossaryRect(null); }}
      />

      {/* Glossary term inline styles */}
      <style jsx global>{`
        .glossary-term {
          color: var(--accent-primary);
          text-decoration: underline;
          text-decoration-style: dotted;
          text-underline-offset: 3px;
          text-decoration-thickness: 1px;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .glossary-term:hover { opacity: 0.75; }
      `}</style>
    </div>
  );
}