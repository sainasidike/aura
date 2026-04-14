'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getProfileById, getProfiles, type StoredProfile } from '@/lib/storage';
import { fetchNatalCharts } from '@/lib/chart-cache';
import { generateChatImage, downloadBlob } from '@/lib/chat-image';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ShareModal from '@/components/ui/ShareModal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
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

  // Modals
  const [showConfirm, setShowConfirm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileIdRef = useRef<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMoved = useRef(false);

  const chatStorageKey = (id: string) => `aura_chat_${id}`;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  // ─── Profile loading ───
  useEffect(() => {
    let p: StoredProfile | undefined;
    if (paramProfileId) p = getProfileById(paramProfileId);
    if (!p) {
      const all = getProfiles();
      if (all.length > 0) p = all[0];
    }
    if (p) {
      setProfile(p);
      profileIdRef.current = p.id;
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
    setSuggestions([]);
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

    const userMsg: Message = { role: 'user', content: content.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSuggestions([]);
    setStreaming(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          chartData: getChartData(),
          ...(astroContext?.analysisType ? { analysisType: astroContext.analysisType } : {}),
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
          /```\s*\n?\[推荐[追问题]+\]\s*\n([\s\S]*?)```/,
          /\[推荐[追问题]+\]\s*\n((?:\d+[.、]\s*.+\n?){1,3})/,
          /\*?\*?推荐[追问题]+\*?\*?[:：]\s*\n((?:\d+[.、]\s*.+\n?){1,3})/,
        ];
        for (const pattern of patterns) {
          const match = last.content.match(pattern);
          if (match) {
            const questions = match[1].trim().split('\n')
              .map(q => q.replace(/^\d+[.、]\s*/, '').trim())
              .filter(Boolean).slice(0, 3);
            if (questions.length > 0) {
              setSuggestions(questions);
              last.content = last.content.replace(pattern, '').trimEnd();
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

  // ─── Share helpers ───
  const getShareMessages = (): Message[] => {
    if (selectMode && selected.size > 0) {
      return messages.filter((_, i) => selected.has(i));
    }
    return messages;
  };

  const handleCopyText = () => {
    const msgs = getShareMessages();
    const text = msgs.map(m => `${m.role === 'user' ? '我' : 'AI占星师'}：${m.content}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setShowShare(false);
    if (selectMode) exitSelectMode();
    showToast('已复制到剪贴板');
  };

  const handleSaveImage = async () => {
    if (!profile) return;
    setImageLoading(true);
    try {
      const msgs = getShareMessages();
      const blob = await generateChatImage({
        messages: msgs,
        profileName: profile.name,
        modeName: 'AI 占星师',
      });
      downloadBlob(blob, `AI占星师_${profile.name}_${Date.now()}.png`);
      setShowShare(false);
      if (selectMode) exitSelectMode();
      showToast('图片已保存');
    } catch {
      showToast('图片生成失败');
    }
    setImageLoading(false);
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
                      onClick={() => setShowShare(true)}
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
        <div className="mx-auto max-w-2xl space-y-5">
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
                  {allChartData ? '你好，我是你的 AI 占星师' : '正在准备排盘数据...'}
                </p>
                {allChartData && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    基于你的完整星盘数据，试试以下问题
                  </p>
                )}
              </div>
              {allChartData && (
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
              )}
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              style={{ animation: `fadeIn 0.3s ease-out ${Math.min(i * 0.05, 0.3)}s both` }}
              onTouchStart={() => handleTouchStart(i)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={selectMode ? () => toggleSelect(i) : undefined}
              onContextMenu={selectMode ? undefined : (e) => { e.preventDefault(); }}
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
                <div className={msg.role === 'assistant' ? 'prose-chat' : 'whitespace-pre-wrap'}>
                  {msg.role === 'assistant' ? (
                    msg.content ? <ReactMarkdown>{msg.content}</ReactMarkdown> : (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: 'var(--accent-primary)' }} />
                        <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: 'var(--accent-primary)', animationDelay: '0.3s' }} />
                        <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: 'var(--accent-primary)', animationDelay: '0.6s' }} />
                      </div>
                    )
                  ) : (
                    msg.content || '...'
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Suggestions */}
          {suggestions.length > 0 && !streaming && !selectMode && (
            <div className="stagger-children flex flex-col gap-2 pl-10 pt-1">
              {suggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="group flex items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm transition-all"
                  style={{
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-base)',
                    color: 'var(--accent-primary)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary-dim)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-primary)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-base)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                  }}
                >
                  <span className="text-xs" style={{ color: 'var(--accent-primary-light)' }}>→</span>
                  {q}
                </button>
              ))}
            </div>
          )}
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
              onClick={() => setShowShare(true)}
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
          <div className="mx-auto flex max-w-2xl gap-2.5">
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

      <ShareModal
        open={showShare}
        loading={imageLoading}
        onClose={() => setShowShare(false)}
        onCopyText={handleCopyText}
        onSaveImage={handleSaveImage}
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
    </div>
  );
}
