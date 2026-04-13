'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getProfileById, getProfiles, type StoredProfile } from '@/lib/storage';
import { generateChatImage, downloadBlob } from '@/lib/chat-image';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ShareModal from '@/components/ui/ShareModal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
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

  const chatStorageKey = (id: string, m: ChartMode) => `aura_chat_${id}_${m}`;

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

  // Restore conversation
  useEffect(() => {
    if (!profileIdRef.current) return;
    try {
      const saved = localStorage.getItem(chatStorageKey(profileIdRef.current, mode));
      setMessages(saved ? JSON.parse(saved) : []);
    } catch { setMessages([]); }
    setSuggestions([]);
    exitSelectMode();
  }, [mode, profile]);

  // Save & scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!streaming && messages.length > 0 && profileIdRef.current) {
      try { localStorage.setItem(chatStorageKey(profileIdRef.current, mode), JSON.stringify(messages)); }
      catch { /* ignore */ }
    }
  }, [messages, streaming, mode]);

  const fetchAllChartData = async (p: StoredProfile) => {
    try {
      const body = {
        year: p.year, month: p.month, day: p.day,
        hour: p.hour, minute: p.minute, gender: p.gender,
        longitude: p.longitude, latitude: p.latitude, timezone: p.timezone,
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
        bazi: bazi.chart, ziwei: ziwei.chart, astrology: astro.chart, timeInfo: bazi.timeInfo,
      });
    } catch { /* chart fetch failed, can still chat */ }
  };

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
                if (last.role === 'assistant') last.content += parsed.content;
                return updated;
              });
            }
          } catch { /* skip */ }
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
        localStorage.removeItem(chatStorageKey(profileIdRef.current, mode));
      } else {
        localStorage.setItem(chatStorageKey(profileIdRef.current, mode), JSON.stringify(remaining));
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
    if (profileIdRef.current) localStorage.removeItem(chatStorageKey(profileIdRef.current, mode));
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
        modeName: MODE_LABELS[mode],
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
      {/* ─── Fixed Header ─── */}
      <div
        className="fixed left-0 right-0 top-0 px-4 pb-3 pt-3"
        style={{
          background: 'rgba(248,247,252,0.92)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          zIndex: 50,
        }}
      >
        <div className="mx-auto max-w-2xl">
          {selectMode ? (
            /* ── Selection header ── */
            <div className="flex items-center justify-between">
              <button onClick={exitSelectMode} className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>取消</button>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>已选择 {selected.size} 条</p>
              <button onClick={selectAll} className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>全选</button>
            </div>
          ) : (
            /* ── Normal header ── */
            <>
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold" style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-display)' }}>
                  ✦ AI 占星师
                </p>
                {messages.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowShare(true)} className="rounded-lg p-1.5" style={{ color: 'var(--text-tertiary)' }} title="分享">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                    </button>
                    <button onClick={() => { setShowConfirm(true); }} className="rounded-lg p-1.5" style={{ color: 'var(--text-tertiary)' }} title="清除">
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

              {/* Quick topics */}
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
            </>
          )}
        </div>
      </div>

      {/* ─── Messages ─── */}
      <div className="flex-1 overflow-y-auto px-4 pb-40" style={{ paddingTop: selectMode ? '60px' : '140px' }}>
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
                      style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
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
            <div
              key={i}
              className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              onTouchStart={() => handleTouchStart(i)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={selectMode ? () => toggleSelect(i) : undefined}
              style={{ cursor: selectMode ? 'pointer' : undefined }}
            >
              {/* Selection checkbox */}
              {selectMode && (
                <div className="flex shrink-0 items-center pt-3">
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full border-2 transition"
                    style={selected.has(i)
                      ? { background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }
                      : { borderColor: 'var(--border-subtle)' }
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

              {/* Message bubble */}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${selectMode && selected.has(i) ? 'ring-2' : ''}`}
                style={{
                  ...(msg.role === 'user'
                    ? { background: 'var(--gradient-primary)', color: '#ffffff' }
                    : { background: 'var(--bg-surface)', color: 'var(--text-primary)' }),
                  ...(selectMode && selected.has(i) ? { ringColor: 'var(--accent-primary)', outline: '2px solid var(--accent-primary)', outlineOffset: '2px' } : {}),
                }}
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

          {suggestions.length > 0 && !streaming && !selectMode && (
            <div className="flex flex-col gap-2 pt-2">
              {suggestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="rounded-xl px-4 py-2.5 text-left text-sm transition"
                  style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--accent-primary)' }}
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

      {/* ─── Bottom Bar ─── */}
      <div
        className="fixed left-0 right-0 px-4 py-3"
        style={{
          bottom: 'calc(56px + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(248,247,252,0.92)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          zIndex: 40,
        }}
      >
        {selectMode ? (
          /* ── Selection action bar ── */
          <div className="mx-auto flex max-w-2xl gap-3">
            <button
              onClick={() => setShowShare(true)}
              disabled={selected.size === 0}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-30"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              分享 ({selected.size})
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={selected.size === 0}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition disabled:opacity-30"
              style={{ background: '#e05060' }}
            >
              删除 ({selected.size})
            </button>
          </div>
        ) : (
          /* ── Normal input ── */
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
        )}
      </div>

      {/* ─── Modals ─── */}
      <ConfirmModal
        open={showConfirm}
        title={selectMode ? `删除 ${selected.size} 条消息` : '清除全部对话'}
        message={selectMode ? '选中的消息将被永久删除，无法恢复。' : '当前模式的所有对话记录将被清除，无法恢复。'}
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
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg"
          style={{ background: 'rgba(0,0,0,0.75)', zIndex: 300 }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
