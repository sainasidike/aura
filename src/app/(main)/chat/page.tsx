'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getProfileById, getProfiles, type StoredProfile } from '@/lib/storage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type ChartMode = 'astrology' | 'bazi' | 'ziwei' | 'mixed';

const MODE_ORDER: ChartMode[] = ['mixed', 'astrology', 'bazi', 'ziwei'];
const MODE_LABELS: Record<ChartMode, string> = {
  mixed: '综合',
  astrology: '星盘',
  bazi: '八字',
  ziwei: '紫微',
};

const QUICK_TOPICS = [
  { label: '今日运势', color: '#5bc084', question: '请帮我分析一下我今天的运势如何？' },
  { label: '情感分析', color: '#d07090', question: '请帮我分析一下我的感情婚姻方面有什么特点？' },
  { label: '事业指引', color: '#e0a040', question: '请帮我分析一下我的事业运势和职业方向' },
  { label: '流年运势', color: '#8868b0', question: '请帮我分析一下我今年的流年运势' },
];

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
          加载中...
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
  const [mode, setMode] = useState<ChartMode>('mixed');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileIdRef = useRef<string | null>(null);

  const chatStorageKey = (id: string, m: ChartMode) => `aura_chat_${id}_${m}`;

  // Load profile
  useEffect(() => {
    let p: StoredProfile | undefined;
    if (paramProfileId) {
      p = getProfileById(paramProfileId);
    }
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

  // Restore conversation when profile or mode changes
  useEffect(() => {
    if (!profileIdRef.current) return;
    try {
      const saved = localStorage.getItem(chatStorageKey(profileIdRef.current, mode));
      setMessages(saved ? JSON.parse(saved) : []);
    } catch {
      setMessages([]);
    }
    setSuggestions([]);
  }, [mode, profile]);

  // Save conversation & scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!streaming && messages.length > 0 && profileIdRef.current) {
      try {
        localStorage.setItem(chatStorageKey(profileIdRef.current, mode), JSON.stringify(messages));
      } catch { /* ignore */ }
    }
  }, [messages, streaming, mode]);

  const fetchAllChartData = async (p: StoredProfile) => {
    try {
      const body = {
        year: p.year, month: p.month, day: p.day,
        hour: p.hour, minute: p.minute,
        gender: p.gender, longitude: p.longitude,
        latitude: p.latitude, timezone: p.timezone,
      };
      const [baziRes, ziweiRes, astroRes] = await Promise.all([
        fetch('/api/bazi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        fetch('/api/ziwei', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        fetch('/api/astrology', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      ]);

      const bazi = await baziRes.json();
      const ziwei = await ziweiRes.json();
      const astro = await astroRes.json();

      setAllChartData({
        profile: { name: p.name, gender: p.gender, birthDate: `${p.year}-${p.month}-${p.day}`, birthTime: `${p.hour}:${p.minute}`, city: p.city },
        bazi: bazi.chart,
        ziwei: ziwei.chart,
        astrology: astro.chart,
        timeInfo: bazi.timeInfo,
      });
    } catch {
      // 即使排盘失败也可以聊天
    }
  };

  /** Filter chart data based on current mode */
  const getChartDataForMode = (): Record<string, unknown> | null => {
    if (!allChartData) return null;
    const base = { profile: allChartData.profile, timeInfo: allChartData.timeInfo };
    switch (mode) {
      case 'astrology': return { ...base, astrology: allChartData.astrology };
      case 'bazi': return { ...base, bazi: allChartData.bazi };
      case 'ziwei': return { ...base, ziwei: allChartData.ziwei };
      case 'mixed': return allChartData;
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || streaming) return;

    const userMsg: Message = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSuggestions([]);
    setStreaming(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          chartData: getChartDataForMode(),
          mode,
        }),
      });

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
            if (parsed.content) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  last.content += parsed.content;
                }
                return updated;
              });
            }
          } catch {
            // skip
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant' && !last.content) {
          last.content = '抱歉，回复失败。请检查 ZHIPU_API_KEY 是否已配置。';
        }
        return updated;
      });
    }

    setStreaming(false);

    // Parse suggested questions from the last assistant message
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === 'assistant' && last.content) {
        // Match various formats: [推荐追问], [推荐问题], with or without code blocks
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
              .filter(Boolean)
              .slice(0, 3);
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleDelete = () => {
    if (!messages.length) return;
    if (!confirm('确定要清除当前对话记录吗？')) return;
    setMessages([]);
    setSuggestions([]);
    if (profileIdRef.current) {
      localStorage.removeItem(chatStorageKey(profileIdRef.current, mode));
    }
    showToast('对话已清除');
  };

  const handleShare = async () => {
    if (!messages.length) return;
    const text = messages
      .map(m => `${m.role === 'user' ? '我' : 'AI占星师'}：${m.content}`)
      .join('\n\n');
    const shareData = { title: 'AI占星师对话', text };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      showToast('对话已复制到剪贴板');
    }
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>请先创建一个档案</p>
          <Link href="/profile" className="rounded-lg px-4 py-2 text-sm text-white" style={{ background: 'var(--accent-primary)' }}>前往档案管理</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Fixed Header */}
      <div
        className="fixed left-0 right-0 top-0 px-4 pb-3 pt-3"
        style={{
          background: 'rgba(248,247,252,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 50,
        }}
      >
        <div className="mx-auto max-w-2xl">
          {/* Title + actions */}
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold" style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-display)' }}>
              ✦ AI 占星师
            </p>
            {messages.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleShare}
                  className="rounded-lg p-1.5 transition"
                  style={{ color: 'var(--text-tertiary)' }}
                  title="分享对话"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-lg p-1.5 transition"
                  style={{ color: 'var(--text-tertiary)' }}
                  title="清除对话"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Mode selector */}
          <div className="mt-2 flex items-center gap-1">
            {MODE_ORDER.map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="rounded-full px-3 py-1 text-xs transition"
                style={mode === m
                  ? { background: 'var(--accent-primary)', color: '#fff', fontWeight: 500 }
                  : { color: 'var(--text-tertiary)' }
                }
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Quick topic buttons */}
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            {QUICK_TOPICS.map((t, i) => (
              <button
                key={i}
                onClick={() => sendMessage(t.question)}
                disabled={streaming || !allChartData}
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition disabled:opacity-30"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: t.color }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-40" style={{ paddingTop: '140px' }}>
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="py-6">
              <p className="mb-4 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {allChartData ? '选择上方话题或试试以下问题' : '正在准备排盘数据...'}
              </p>
              {allChartData && (
                <div className="flex flex-wrap justify-center gap-2">
                  {COLD_START_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      disabled={streaming}
                      className="rounded-full px-4 py-2 text-sm transition disabled:opacity-30"
                      style={{
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-primary)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-primary)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={msg.role === 'user'
                  ? { background: 'var(--gradient-primary)', color: '#ffffff' }
                  : { background: 'var(--bg-surface)', color: 'var(--text-primary)' }
                }
              >
                <div className={msg.role === 'assistant' ? 'prose-chat' : 'whitespace-pre-wrap'}>
                  {msg.role === 'assistant' ? (
                    msg.content ? <ReactMarkdown>{msg.content}</ReactMarkdown> : '...'
                  ) : (
                    msg.content || '...'
                  )}
                </div>
              </div>
            </div>
          ))}
          {suggestions.length > 0 && !streaming && (
            <div className="flex flex-col gap-2 pt-2">
              {suggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="rounded-xl px-4 py-2.5 text-left text-sm transition"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--accent-primary)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div
        className="fixed left-0 right-0 px-4 py-3"
        style={{
          bottom: 'calc(56px + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(248,247,252,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 40,
        }}
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="输入你的问题..."
            disabled={streaming}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none disabled:opacity-50"
            style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={streaming || !input.trim()}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-30"
            style={{ background: 'var(--accent-primary)' }}
          >
            发送
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg"
          style={{ background: 'rgba(0,0,0,0.75)', zIndex: 100 }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
