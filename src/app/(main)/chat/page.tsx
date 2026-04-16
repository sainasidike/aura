'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getProfileById, getProfiles, getActiveProfileId, setActiveProfileId, type StoredProfile } from '@/lib/storage';
import { fetchNatalCharts } from '@/lib/chart-cache';
import { generateChatImage, downloadBlob } from '@/lib/chat-image';
import { annotateGlossaryTerms, getGlossaryEntry, type GlossaryEntry } from '@/lib/astrology-glossary';
import { simpleMarkdown } from '@/lib/simple-markdown';
import { annotateDataRefs } from '@/lib/annotate-data-refs';
import { parseChatSections } from '@/lib/parse-chat-sections';
import { NatalChartSVG } from '@/components/chart/AstrologyComponents';
import type { AstrologyChart } from '@/types';
import GlossaryPopup from '@/components/ui/GlossaryPopup';
import ConfirmModal from '@/components/ui/ConfirmModal';

type ChartType = 'natal' | 'transit' | 'solar_return' | 'lunar_return';

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  natal: '本命盘',
  transit: '行运盘',
  solar_return: '日返盘（年运）',
  lunar_return: '月返盘（月运）',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  chartType?: ChartType;
}

/** 根据用户提问内容自动推断应使用的星盘类型 */
function detectChartType(question: string): ChartType {
  const q = question.toLowerCase();
  // 月运 / 本月 / 这个月 → 月返盘
  if (/月运|本月|这个月|这月|当月|月度|近一个月|最近一个月|月返/.test(q)) return 'lunar_return';
  // 年运 / 今年 / 明年 / 2025年 / 流年 → 日返盘
  if (/年运|今年|明年|后年|去年|流年|本年|这一年|年度|\d{4}年|日返/.test(q)) return 'solar_return';
  // 时机类问题 → 行运盘（"什么时候出现"、"何时"、"几岁"等）
  if (/什么时候|何时|多久|哪年|哪个月|几月|几岁|时间点|时机|会不会出现|啥时候|几时/.test(q)) return 'transit';
  // 行运 / 最近运势 / 近期 / 当前 / 这段时间 → 行运盘
  if (/行运|最近|近期|当前|目前|这段时间|现在|眼下|运势|未来/.test(q)) return 'transit';
  // 默认本命盘
  return 'natal';
}

const COLD_START_QUESTIONS = [
  '请帮我全面分析一下我的命盘',
  '我的性格有什么优缺点？',
  '我的财运如何？适合什么方式理财？',
  '我适合从事什么行业？',
  '我的正缘会在什么时候出现？',
  '我今年需要注意什么？',
];

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
          <span className="animate-breathe">加载中...</span>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const paramProfileId = searchParams.get('profileId');
  const isFirstVisit = searchParams.get('firstVisit') === 'true';

  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [allChartData, setAllChartData] = useState<Record<string, unknown> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [toast, setToast] = useState('');

  // Astrology AI context (from astrology page "问AI" button)
  const [astroContext, setAstroContext] = useState<{
    chartData: Record<string, unknown>;
    analysisType: string;
  } | null>(null);
  const [autoSendQuestion, setAutoSendQuestion] = useState<string | null>(null);
  const didProcessPendingRef = useRef(false);

  // Selection mode
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Glossary
  const [glossaryEntry, setGlossaryEntry] = useState<GlossaryEntry | null>(null);
  const [glossaryRect, setGlossaryRect] = useState<DOMRect | null>(null);

  // Chart panel (mobile toggle)
  const [chartExpanded, setChartExpanded] = useState(false);

  // Modals
  const [showConfirm, setShowConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileIdRef = useRef<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMoved = useRef(false);

  const chatStorageKey = (id: string) => `aura_chat_${id}`;
  const suggestionsStorageKey = (id: string) => `aura_chat_suggestions_${id}`;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  // Glossary click delegation
  const handleGlossaryClick = useCallback((e: React.MouseEvent) => {
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

  // ─── Profile loading ───
  useEffect(() => {
    let p: StoredProfile | undefined;
    if (paramProfileId) p = getProfileById(paramProfileId);
    if (!p) {
      // 优先使用全局活跃档案（跨页面同步）
      const savedId = getActiveProfileId();
      if (savedId) p = getProfileById(savedId);
    }
    if (!p) {
      const all = getProfiles();
      if (all.length > 0) p = all[0];
    }
    if (p) {
      setProfile(p);
      profileIdRef.current = p.id;
      setActiveProfileId(p.id);
      fetchAllChartData(p);
    }
  }, [paramProfileId]);

  // ─── Check for pending astrology AI question ───
  useEffect(() => {
    // Prevent double-processing in React 18 StrictMode
    if (didProcessPendingRef.current) return;
    try {
      const raw = localStorage.getItem('aura_astrology_ai_pending');
      if (raw) {
        didProcessPendingRef.current = true;
        localStorage.removeItem('aura_astrology_ai_pending');
        const pending = JSON.parse(raw);
        if (pending.question && pending.chartData) {
          setAstroContext({ chartData: pending.chartData, analysisType: pending.analysisType });
          setMessages([]);
          setSuggestions([]);
          setAutoSendQuestion(pending.question);
        }
      }
    } catch { /* ignore parse errors */ }
  }, []);

  // ─── Auto-send pending question ───
  useEffect(() => {
    if (autoSendQuestion && !streaming) {
      const q = autoSendQuestion;
      setAutoSendQuestion(null);
      sendMessage(q);
    }
  }, [autoSendQuestion, streaming]);

  // Restore conversation (skip when astroContext is active — user came from "问AI")
  useEffect(() => {
    if (astroContext) return;
    if (!profileIdRef.current) return;
    try {
      const saved = localStorage.getItem(chatStorageKey(profileIdRef.current));
      setMessages(saved ? JSON.parse(saved) : []);
    } catch { setMessages([]); }
    try {
      const savedSugg = localStorage.getItem(suggestionsStorageKey(profileIdRef.current));
      setSuggestions(savedSugg ? JSON.parse(savedSugg) : []);
    } catch { setSuggestions([]); }
    exitSelectMode();
  }, [profile, astroContext]);

  // Save & scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!streaming && messages.length > 0 && profileIdRef.current) {
      try { localStorage.setItem(chatStorageKey(profileIdRef.current), JSON.stringify(messages)); }
      catch { /* ignore */ }
    }
  }, [messages, streaming]);

  const fetchAllChartData = async (p: StoredProfile) => {
    try {
      // 本命盘（bazi/ziwei）走缓存；行运/回归盘实时计算
      const body = {
        year: p.year, month: p.month, day: p.day,
        hour: p.hour, minute: p.minute, gender: p.gender,
        longitude: p.longitude, latitude: p.latitude, timezone: p.timezone,
      };
      const opts = { method: 'POST' as const, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };

      const [natalCharts, transitRes, solarRes, lunarRes] = await Promise.all([
        fetchNatalCharts(p, ['bazi', 'ziwei']),
        fetch('/api/astrology/transit', opts).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/astrology/solar-return', opts).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/astrology/lunar-return', opts).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      const bazi = natalCharts.bazi as Record<string, unknown> | null;
      const ziwei = natalCharts.ziwei as Record<string, unknown> | null;

      const data: Record<string, unknown> = {
        profile: { name: p.name, gender: p.gender, birthDate: `${p.year}-${p.month}-${p.day}`, birthTime: `${p.hour}:${p.minute}`, city: p.city },
        timeInfo: (bazi as Record<string, unknown>)?.timeInfo,
      };
      if ((bazi as Record<string, unknown>)?.chart) data.bazi = (bazi as Record<string, unknown>).chart;
      if ((ziwei as Record<string, unknown>)?.chart) data.ziwei = (ziwei as Record<string, unknown>).chart;
      if (transitRes) {
        data.natalChart = transitRes.natalChart;
        data.transitChart = transitRes.transitChart;
        data.crossAspects = transitRes.crossAspects;
        data.transitTime = transitRes.transitTime;
      }
      if (solarRes) {
        data.solarReturn = { year: solarRes.year, returnMoment: solarRes.returnMoment, chart: solarRes.chart };
      }
      if (lunarRes) {
        data.lunarReturn = { returnMoment: lunarRes.returnMoment, nextReturn: lunarRes.nextReturn, chart: lunarRes.chart };
      }
      setAllChartData(data);
    } catch { /* chart fetch failed, can still chat */ }
  };

  const getChartData = (): Record<string, unknown> | null => {
    if (astroContext) return astroContext.chartData;
    return allChartData;
  };

  // ─── Send message ───
  const sendMessage = async (content: string) => {
    if (!content.trim() || streaming) return;

    // Auto-detect which chart type to use based on the question
    const detectedType = astroContext?.analysisType
      ? (astroContext.analysisType as ChartType)
      : detectChartType(content.trim());
    const analysisType = detectedType === 'natal' ? undefined : detectedType;

    const userMsg: Message = { role: 'user', content: content.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSuggestions([]);
    setStreaming(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now(), chartType: detectedType }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          chartData: getChartData(),
          ...(analysisType ? { analysisType } : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

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
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') last.content += parsed.content;
                return updated;
              });
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '回复失败';
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant') {
          if (!last.content) {
            last.content = `抱歉，${errMsg}`;
          }
        }
        return updated;
      });
    }

    setStreaming(false);

    // Parse suggested questions
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === 'assistant' && last.content) {
        const patterns = [
          // 代码块包裹的推荐追问
          /```\s*\n?\[推荐[追问题]+\]\s*\n([\s\S]*?)```/,
          // 标准格式：[推荐追问] 后跟编号列表（匹配到文末）
          /\[推荐[追问题]+\]\s*\n([\s\S]*?)$/,
          // 带星号或冒号的变体
          /\*?\*?推荐[追问题]+\*?\*?[:：]\s*\n([\s\S]*?)$/,
          // 没有方括号，直接 "推荐追问" 文字
          /推荐追问\s*[:：]?\s*\n([\s\S]*?)$/,
        ];
        for (const pattern of patterns) {
          const match = last.content.match(pattern);
          if (match) {
            const questions = match[1].trim().split('\n')
              .map(q => q.replace(/^\d+[.、)\-]\s*/, '').replace(/^\*+\s*/, '').trim())
              .filter(q => q.length > 0 && q.length < 100)
              .slice(0, 3);
            if (questions.length > 0) {
              setSuggestions(questions);
              if (profileIdRef.current) {
                try { localStorage.setItem(suggestionsStorageKey(profileIdRef.current), JSON.stringify(questions)); } catch { /* ignore */ }
              }
              last.content = last.content.slice(0, match.index).trimEnd();
              break;
            }
          }
        }
      }
      return updated;
    });
  };

  // ─── Selection mode ───
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const toggleSelect = (index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(messages.map((_, i) => i)));

  // Long press handlers
  const handleTouchStart = (index: number) => {
    if (selectMode || streaming) return;
    touchMoved.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) {
        setSelectMode(true);
        setSelected(new Set([index]));
      }
    }, 500);
  };
  const handleTouchMove = () => {
    touchMoved.current = true;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // ─── Delete ───
  const handleDeleteSelected = () => {
    const remaining = messages.filter((_, i) => !selected.has(i));
    setMessages(remaining);
    if (profileIdRef.current) {
      if (remaining.length === 0) {
        localStorage.removeItem(chatStorageKey(profileIdRef.current));
      } else {
        localStorage.setItem(chatStorageKey(profileIdRef.current), JSON.stringify(remaining));
      }
    }
    exitSelectMode();
    setShowConfirm(false);
    setSuggestions([]);
    showToast(`已删除 ${selected.size} 条消息`);
  };

  const handleDeleteAll = () => {
    setMessages([]);
    setSuggestions([]);
    if (profileIdRef.current) localStorage.removeItem(chatStorageKey(profileIdRef.current));
    exitSelectMode();
    setShowConfirm(false);
    showToast('对话已清除');
  };

  // ─── Message actions (copy / regenerate / share) ───
  const handleCopySingle = (content: string) => {
    navigator.clipboard.writeText(content);
    showToast('已复制到剪贴板');
  };

  const handleRegenerate = (msgIndex: number) => {
    if (streaming) return;
    // Find the user message before this assistant message
    let userMsgIndex = -1;
    for (let j = msgIndex - 1; j >= 0; j--) {
      if (messages[j].role === 'user') { userMsgIndex = j; break; }
    }
    if (userMsgIndex < 0) return;
    const userContent = messages[userMsgIndex].content;
    // Remove only the assistant response, keep the user message
    // sendMessage will add a new user message, so remove both and re-send
    setMessages(prev => prev.slice(0, userMsgIndex));
    setSuggestions([]);
    setTimeout(() => sendMessage(userContent), 50);
  };

  const handleShareSingle = async (msgIndex: number) => {
    // Select this message and its preceding user message, then directly save as image
    if (!profile) return;
    const sel = new Set<number>([msgIndex]);
    for (let j = msgIndex - 1; j >= 0; j--) {
      if (messages[j].role === 'user') { sel.add(j); break; }
    }
    const msgs = messages.filter((_, i) => sel.has(i));
    showToast('正在生成图片...');
    try {
      const blob = await generateChatImage({
        messages: msgs,
        profileName: profile.name,
        modeName: 'AI 占星师',
      });
      downloadBlob(blob, `AI占星师_${profile.name}_${Date.now()}.png`);
      showToast('图片已保存');
    } catch {
      showToast('图片生成失败');
    }
  };

  // ─── Share helpers ───
  const getShareMessages = (): Message[] => {
    if (selectMode && selected.size > 0) {
      return messages.filter((_, i) => selected.has(i));
    }
    return messages;
  };

  const handleSaveImage = async () => {
    if (!profile) return;
    showToast('正在生成图片...');
    try {
      const msgs = getShareMessages();
      const blob = await generateChatImage({
        messages: msgs,
        profileName: profile.name,
        modeName: 'AI 占星师',
      });
      downloadBlob(blob, `AI占星师_${profile.name}_${Date.now()}.png`);
      if (selectMode) exitSelectMode();
      showToast('图片已保存');
    } catch {
      showToast('图片生成失败');
    }
  };

  // ─── Render ───
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl text-3xl" style={{ background: 'var(--accent-primary-dim)' }}>✦</div>
        <p className="text-center text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          请先创建一个档案<br />开始你的命理之旅
        </p>
        <Link
          href="/profile"
          className="rounded-full px-6 py-2.5 text-sm font-medium text-white"
          style={{ background: 'var(--gradient-primary)', boxShadow: '0 4px 16px rgba(123,108,184,0.25)' }}
        >
          创建档案
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* ─── Fixed Header ─── */}
      <div
        className="fixed left-0 right-0 top-0 px-4 pb-3 pt-3"
        style={{
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          zIndex: 50,
          borderBottom: '1px solid rgba(123,108,184,0.05)',
        }}
      >
        <div className="mx-auto max-w-2xl">
          {selectMode ? (
            /* ── Selection header ── */
            <div className="flex items-center justify-between py-1">
              <button onClick={exitSelectMode} className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>取消</button>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>已选择 {selected.size} 条</p>
              <button onClick={selectAll} className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>全选</button>
            </div>
          ) : (
            /* ── Normal header ── */
            <>
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold tracking-wide" style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-display)' }}>
                  ✦ AI 占星师
                </p>
                {messages.length > 0 && (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleSaveImage()}
                      className="rounded-lg p-2 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary-dim)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      title="分享"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => { setShowConfirm(true); }}
                      className="rounded-lg p-2 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(192,80,96,0.08)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      title="清除"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>

            </>
          )}
        </div>
      </div>

      {/* ─── Messages ─── */}
      <div className="flex-1 overflow-y-auto px-4 pb-40" style={{ paddingTop: selectMode ? '60px' : '68px' }}>
        <div className="mx-auto max-w-2xl md:max-w-4xl space-y-5">
          {/* Cold start */}
          {messages.length === 0 && (
            <div className="py-8 animate-fadeIn">
              {/* Welcome illustration */}
              <div className="mb-6 flex flex-col items-center">
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl"
                  style={{ background: 'var(--gradient-primary)', color: '#fff', boxShadow: '0 8px 24px rgba(123,108,184,0.20)' }}
                >
                  ✦
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {allChartData ? (isFirstVisit ? `${profile?.name}，你的星盘已生成` : '你好，我是你的 AI 占星师') : '正在准备排盘数据...'}
                </p>
                {allChartData && (() => {
                  const natal = allChartData.natalChart as AstrologyChart | undefined;

                  const sun = natal?.planets?.find(p => p.name === '太阳');
                  const moon = natal?.planets?.find(p => p.name === '月亮');
                  const SIGNS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
                  const ascDeg = natal?.ascendant;
                  const ascSign = ascDeg != null ? SIGNS[Math.floor(((ascDeg % 360 + 360) % 360) / 30)] : null;

                  const planetCount = natal?.planets?.length || 0;
                  const houseCount = natal?.houses?.length || 0;
                  const aspectCount = natal?.aspects?.length || 0;

                  const hasSummary = sun || moon || ascSign;

                  return hasSummary ? (
                    <>
                      {/* First visit: show natal chart SVG */}
                      {isFirstVisit && natal && (
                        <div className="mt-4 mb-2 w-full max-w-sm">
                          <div
                            className="overflow-hidden rounded-2xl"
                            style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
                          >
                            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'linear-gradient(135deg, rgba(123,108,184,0.08), transparent)', borderBottom: '1px solid var(--border-subtle)' }}>
                              <span className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] text-white" style={{ background: 'var(--gradient-primary)' }}>✦</span>
                              <span className="text-[12px] font-semibold" style={{ color: 'var(--accent-primary)' }}>本命星盘</span>
                            </div>
                            <div className="px-2 py-3">
                              <NatalChartSVG chart={natal} hideAskAI />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="mt-3 w-full max-w-xs rounded-xl px-4 py-3 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                        <p className="mb-1.5 text-[11px] font-medium tracking-wide" style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>已加载星盘数据</p>
                        {(sun || moon || ascSign) && (
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {sun && <span>☉ {sun.sign}{sun.degree}°{sun.minute != null ? String(sun.minute).padStart(2, '0') + "'" : ''}</span>}
                            {sun && moon && <span style={{ color: 'var(--text-tertiary)' }}> · </span>}
                            {moon && <span>☽ {moon.sign}{moon.degree}°{moon.minute != null ? String(moon.minute).padStart(2, '0') + "'" : ''}</span>}
                            {(sun || moon) && ascSign && <span style={{ color: 'var(--text-tertiary)' }}> · </span>}
                            {ascSign && <span>↑ {ascSign}座</span>}
                          </p>
                        )}
                        {planetCount > 0 && (
                          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                            {planetCount} 颗行星 · {houseCount} 宫位 · {aspectCount} 个相位
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      基于你的完整星盘数据，试试以下问题
                    </p>
                  );
                })()}
              </div>
              {allChartData && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{isFirstVisit ? '你可以问我任何关于命盘的问题' : '试试以下问题'}</p>
                  <div className="stagger-children flex flex-wrap justify-center gap-2">
                  {COLD_START_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      disabled={streaming}
                      className="rounded-full px-4 py-2.5 text-[13px] transition-all disabled:opacity-30"
                      style={{
                        border: '1px solid var(--border-default)',
                        background: 'var(--bg-base)',
                        color: 'var(--text-secondary)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-primary)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-primary)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary-dim)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-base)';
                      }}
                    >
                      {q}
                    </button>
                  ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => {
            // Check if this assistant message has card sections (including during streaming)
            const isStreamingThis = streaming && i === messages.length - 1;
            const cardSections = msg.role === 'assistant' && msg.content
              ? parseChatSections(msg.content)
              : null;

            // ── Card-style layout with left-right split ──
            if (cardSections && cardSections.length > 0) {
              const data = getChartData();
              const ct = msg.chartType || 'natal';

              // Dedup: find previous assistant message's chartType — hide chart panel if same
              let prevAssistantChartType: ChartType | null = null;
              for (let j = i - 1; j >= 0; j--) {
                if (messages[j].role === 'assistant' && messages[j].chartType) {
                  prevAssistantChartType = messages[j].chartType!;
                  break;
                }
              }
              const showChartPanel = ct !== prevAssistantChartType;

              // Pick the chart matching the detected type
              const displayChart: AstrologyChart | undefined = showChartPanel ? (() => {
                if (ct === 'solar_return') return (data?.solarReturn as Record<string, unknown>)?.chart as AstrologyChart | undefined;
                if (ct === 'lunar_return') return (data?.lunarReturn as Record<string, unknown>)?.chart as AstrologyChart | undefined;
                if (ct === 'transit') return (data?.transitChart as AstrologyChart | undefined) || (data?.natalChart as AstrologyChart | undefined);
                return data?.natalChart as AstrologyChart | undefined;
              })() : undefined;
              const displayPlanets = displayChart?.planets;
              const chartLabel = CHART_TYPE_LABELS[ct];

              return (
                <div
                  key={i}
                  style={{ animation: `fadeIn 0.3s ease-out ${Math.min(i * 0.05, 0.3)}s both` }}
                  onTouchStart={() => handleTouchStart(i)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={selectMode ? () => toggleSelect(i) : undefined}
                  onContextMenu={undefined}
                >
                  {/* Selection checkbox for card messages */}
                  {selectMode && (
                    <div className="flex shrink-0 items-center pb-2">
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all"
                        style={selected.has(i)
                          ? { background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', boxShadow: '0 2px 8px rgba(123,108,184,0.25)' }
                          : { borderColor: 'var(--border-default)', background: 'var(--bg-base)' }
                        }
                      >
                        {selected.has(i) && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Left-right split layout ── */}
                  <div className="flex flex-col md:flex-row md:gap-5">

                    {/* ── LEFT: Chart panel ── */}
                    {displayChart && (
                      <div className="mb-4 md:mb-0 md:w-[280px] md:shrink-0">
                        <div
                          className="overflow-hidden rounded-2xl md:sticky md:top-[76px]"
                          style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}
                        >
                          {/* Chart type label */}
                          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: 'linear-gradient(135deg, rgba(123,108,184,0.08), transparent)', borderBottom: '1px solid var(--border-subtle)' }}>
                            <span className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] text-white" style={{ background: 'var(--gradient-primary)' }}>
                              {ct === 'solar_return' ? '☉' : ct === 'lunar_return' ? '☽' : ct === 'transit' ? '⟳' : '✦'}
                            </span>
                            <span className="text-[12px] font-semibold" style={{ color: 'var(--accent-primary)' }}>{chartLabel}</span>
                          </div>

                          {/* Mobile: collapsible toggle */}
                          <button
                            className="flex w-full items-center justify-between px-4 py-2 md:hidden"
                            onClick={(e) => { e.stopPropagation(); setChartExpanded(v => !v); }}
                          >
                            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                              {chartExpanded ? '收起星盘' : '展开星盘'}
                            </span>
                            <svg
                              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"
                              style={{ transform: chartExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>

                          {/* Chart content: always visible on md+, toggle on mobile */}
                          <div className={`${chartExpanded ? 'block' : 'hidden'} md:block`}>
                            {/* SVG Chart */}
                            <div className="flex justify-center px-3 py-3" style={{ background: 'linear-gradient(180deg, rgba(123,108,184,0.03), transparent)' }}>
                              <div style={{ maxWidth: '240px', width: '100%' }}>
                                <NatalChartSVG chart={displayChart} hideAskAI />
                              </div>
                            </div>

                            {/* Planet summary table */}
                            {displayPlanets && displayPlanets.length > 0 && (
                              <div className="border-t px-3 py-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
                                <p className="mb-2 text-[10px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                                  行星位置
                                </p>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                  {displayPlanets.slice(0, 10).map((p) => (
                                    <div key={p.name} className="flex items-center gap-1.5 text-[11px]">
                                      <span style={{ color: 'var(--accent-primary)', fontWeight: 600, width: '24px' }}>
                                        {p.name.slice(0, 2)}
                                      </span>
                                      <span style={{ color: 'var(--text-secondary)' }}>
                                        {p.sign}{p.degree}°{String(p.minute).padStart(2, '0')}&apos;
                                      </span>
                                      {p.retrograde && (
                                        <span className="text-[9px] font-bold" style={{ color: '#c05050' }}>R</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {/* Key angles */}
                                <div className="mt-2 flex gap-3 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                                  <span>ASC {displayChart.ascendant.toFixed(1)}°</span>
                                  <span>MC {displayChart.midheaven.toFixed(1)}°</span>
                                  <span>{displayChart.aspects?.length || 0} 相位</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── RIGHT: Card sections ── */}
                    <div className="flex-1 min-w-0 space-y-3" onClick={handleGlossaryClick}>
                      {cardSections.map((sec, si) => {
                        const isSummary = sec.tag === 'SUMMARY';
                        const isLastSection = si === cardSections.length - 1;
                        const showStreamingDot = isStreamingThis && isLastSection;
                        return (
                          <div
                            key={si}
                            className="section-card overflow-hidden rounded-2xl"
                            style={{
                              background: isSummary
                                ? `linear-gradient(135deg, ${sec.color}18, ${sec.color}08)`
                                : 'var(--bg-base)',
                              border: `1px solid ${sec.color}25`,
                              borderLeft: `3px solid ${sec.color}`,
                              boxShadow: isSummary
                                ? `0 4px 20px ${sec.color}15, var(--shadow-card)`
                                : 'var(--shadow-card)',
                              animation: isStreamingThis ? 'none' : `fadeInUp 0.4s ease-out ${si * 0.08}s both`,
                            }}
                          >
                            {/* Card header */}
                            <div
                              className="flex items-center gap-2.5 px-4 py-3"
                              style={{
                                borderBottom: `1px solid ${sec.color}12`,
                                background: `linear-gradient(135deg, ${sec.color}10, transparent)`,
                              }}
                            >
                              <span
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                                style={{
                                  background: `linear-gradient(135deg, ${sec.color}, ${sec.color}cc)`,
                                  color: '#fff',
                                  boxShadow: `0 2px 8px ${sec.color}30`,
                                }}
                              >
                                {sec.icon}
                              </span>
                              <span className="text-[13px] font-semibold tracking-wide" style={{ color: sec.color }}>
                                {sec.title}
                              </span>
                              {showStreamingDot && (
                                <span className="ml-auto flex items-center gap-1">
                                  <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: sec.color }} />
                                  <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: sec.color, animationDelay: '0.3s' }} />
                                  <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: sec.color, animationDelay: '0.6s' }} />
                                </span>
                              )}
                            </div>
                            {/* Card body */}
                            <div className="px-4 py-3">
                              <div
                                className="prose-chat text-[13px] leading-[1.8]"
                                style={{ color: 'var(--text-primary)' }}
                                dangerouslySetInnerHTML={{ __html: annotateDataRefs(annotateGlossaryTerms(simpleMarkdown(sec.content)), getChartData()) }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action buttons for card layout */}
                  {!streaming && !selectMode && msg.content && (
                    <div className="mt-2 flex items-center justify-center gap-6">
                      <button onClick={() => handleCopySingle(msg.content)} className="flex items-center gap-1.5 py-1.5 text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--text-tertiary)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        复制
                      </button>
                      <button onClick={() => handleRegenerate(i)} className="flex items-center gap-1.5 py-1.5 text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--text-tertiary)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                        重新生成
                      </button>
                      <button onClick={() => handleShareSingle(i)} className="flex items-center gap-1.5 py-1.5 text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--text-tertiary)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        分享
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            // ── Normal bubble layout (user messages + plain assistant messages) ──
            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                style={{ animation: `fadeIn 0.3s ease-out ${Math.min(i * 0.05, 0.3)}s both` }}
                onTouchStart={() => handleTouchStart(i)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={selectMode ? () => toggleSelect(i) : undefined}
                onContextMenu={undefined}
              >
                {/* Selection checkbox */}
                {selectMode && (
                  <div className="flex shrink-0 items-center pt-3">
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all"
                      style={selected.has(i)
                        ? { background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', boxShadow: '0 2px 8px rgba(123,108,184,0.25)' }
                        : { borderColor: 'var(--border-default)', background: 'var(--bg-base)' }
                      }
                    >
                      {selected.has(i) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}

                {/* Avatar */}
                {msg.role === 'assistant' && !selectMode && (
                  <div
                    className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm text-white"
                    style={{ background: 'var(--gradient-primary)', boxShadow: '0 2px 8px rgba(123,108,184,0.18)' }}
                  >
                    ✦
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${selectMode && selected.has(i) ? 'ring-2' : ''}`}
                  style={{
                    ...(msg.role === 'user'
                      ? {
                          background: 'var(--gradient-primary)',
                          color: '#ffffff',
                          borderBottomRightRadius: '6px',
                          boxShadow: '0 2px 12px rgba(123,108,184,0.18)',
                        }
                      : {
                          background: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          borderBottomLeftRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                        }),
                    ...(selectMode && selected.has(i) ? { outline: '2px solid var(--accent-primary)', outlineOffset: '2px' } : {}),
                  }}
                >
                  {msg.role === 'assistant' ? (
                    msg.content ? (
                      <div
                        className="prose-chat"
                        onClick={handleGlossaryClick}
                        dangerouslySetInnerHTML={{ __html: annotateDataRefs(annotateGlossaryTerms(simpleMarkdown(msg.content)), getChartData()) }}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: 'var(--accent-primary)' }} />
                        <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: 'var(--accent-primary)', animationDelay: '0.3s' }} />
                        <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: 'var(--accent-primary)', animationDelay: '0.6s' }} />
                      </div>
                    )
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content || '...'}</div>
                  )}
                </div>

                {/* Action buttons for bubble layout (assistant only) */}
                {msg.role === 'assistant' && !streaming && !selectMode && msg.content && (
                  <div className="mt-1 flex items-center gap-5 pl-10">
                    <button onClick={() => handleCopySingle(msg.content)} className="flex items-center gap-1 py-1 text-[11px] transition-opacity hover:opacity-70" style={{ color: 'var(--text-tertiary)' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                    <button onClick={() => handleRegenerate(i)} className="flex items-center gap-1 py-1 text-[11px] transition-opacity hover:opacity-70" style={{ color: 'var(--text-tertiary)' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                    </button>
                    <button onClick={() => handleShareSingle(i)} className="flex items-center gap-1 py-1 text-[11px] transition-opacity hover:opacity-70" style={{ color: 'var(--text-tertiary)' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Suggestions removed from here — moved to bottom bar */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ─── Bottom Bar ─── */}
      <div
        className="fixed left-0 right-0 px-4 py-3"
        style={{
          bottom: 'calc(60px + env(safe-area-inset-bottom))',
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderTop: '1px solid rgba(123,108,184,0.05)',
          zIndex: 40,
        }}
      >
        {selectMode ? (
          /* ── Selection action bar ── */
          <div className="mx-auto flex max-w-2xl gap-3">
            <button
              onClick={() => handleSaveImage()}
              disabled={selected.size === 0}
              className="flex-1 rounded-xl py-3 text-sm font-medium transition-all disabled:opacity-30"
              style={{ background: 'var(--accent-primary)', color: '#fff', boxShadow: '0 2px 12px rgba(123,108,184,0.20)' }}
            >
              分享 ({selected.size})
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={selected.size === 0}
              className="flex-1 rounded-xl py-3 text-sm font-medium text-white transition-all disabled:opacity-30"
              style={{ background: '#e05060', boxShadow: '0 2px 12px rgba(224,80,96,0.20)' }}
            >
              删除 ({selected.size})
            </button>
          </div>
        ) : (
          /* ── Normal input ── */
          <div className="mx-auto max-w-2xl">
            {/* Suggested questions chips */}
            {suggestions.length > 0 && !streaming && (
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95"
                    style={{
                      background: 'rgba(123,108,184,0.08)',
                      color: 'var(--accent-primary)',
                      border: '1px solid rgba(123,108,184,0.15)',
                      maxWidth: '200px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2.5">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="输入你的问题..."
              disabled={streaming}
              className="flex-1 rounded-2xl px-4 py-3 text-sm transition-all disabled:opacity-50"
              style={{
                border: '1px solid var(--border-default)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={streaming || !input.trim()}
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl text-white transition-all disabled:opacity-30"
              style={{
                background: input.trim() ? 'var(--gradient-primary)' : 'var(--accent-primary)',
                boxShadow: input.trim() ? '0 4px 16px rgba(123,108,184,0.30)' : 'none',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ─── */}
      <ConfirmModal
        open={showConfirm}
        title={selectMode ? `删除 ${selected.size} 条消息` : '清除全部对话'}
        message={selectMode ? '选中的消息将被永久删除，无法恢复。' : '所有对话记录将被清除，无法恢复。'}
        confirmText="删除"
        destructive
        onConfirm={selectMode ? handleDeleteSelected : handleDeleteAll}
        onCancel={() => setShowConfirm(false)}
      />


      {/* Glossary Popup */}
      <GlossaryPopup
        entry={glossaryEntry}
        anchorRect={glossaryRect}
        onClose={() => { setGlossaryEntry(null); setGlossaryRect(null); }}
      />

      {/* Toast */}
      {toast && (
        <div
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl px-6 py-3.5 text-sm font-medium text-white animate-scaleIn"
          style={{ background: 'rgba(26,21,40,0.82)', backdropFilter: 'blur(12px)', zIndex: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
        >
          {toast}
        </div>
      )}

      {/* Glossary term + data badge inline styles */}
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
        .data-badge {
          display: inline-block;
          margin-left: 2px;
          font-size: 10px;
          color: #40a080;
          vertical-align: super;
          font-weight: 600;
          opacity: 0.85;
        }
        /* ── Section card sub-structure: 📊🔮💡 ── */
        .section-card-body p {
          margin: 0 0 6px;
        }
        .section-card-body p:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}
