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

const PRESET_QUESTIONS = [
  '请帮我全面分析一下我的命盘',
  '我的事业运势如何？',
  '我的感情婚姻方面有什么特点？',
  '我今年的运势怎么样？',
  '我的财运如何？适合什么方式理财？',
  '我的性格有什么优缺点？',
];

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ color: 'var(--text-tertiary)' }}
        >
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
  const [chartData, setChartData] = useState<Record<string, unknown> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileIdRef = useRef<string | null>(null);

  // 从 localStorage 恢复对话历史
  const chatStorageKey = (id: string) => `aura_chat_${id}`;

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
      fetchChartData(p);
      // 恢复对话历史
      try {
        const saved = localStorage.getItem(chatStorageKey(p.id));
        if (saved) setMessages(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, [paramProfileId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // 保存对话历史（仅在非流式且有消息时）
    if (!streaming && messages.length > 0 && profileIdRef.current) {
      try {
        localStorage.setItem(chatStorageKey(profileIdRef.current), JSON.stringify(messages));
      } catch { /* ignore */ }
    }
  }, [messages, streaming]);

  const fetchChartData = async (p: StoredProfile) => {
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

      setChartData({
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

  const sendMessage = async (content: string) => {
    if (!content.trim() || streaming) return;

    const userMsg: Message = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    // 添加 assistant 空消息用于流式填充
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          chartData,
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
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            请先创建一个档案
          </p>
          <Link
            href="/profile"
            className="rounded-lg px-4 py-2 text-sm text-white"
            style={{ background: 'var(--accent-primary)' }}
          >
            前往档案管理
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div
        className="px-4 py-3"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(248,247,252,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            href="/profile"
            className="text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            &larr;
          </Link>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              AI 命理对话
            </p>
            {profile && (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {profile.name} &middot; {profile.city}
              </p>
            )}
          </div>
          <Link
            href="/chart"
            className="text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            排盘
          </Link>
        </div>
      </div>

      {/* Messages — pb-24 leaves room for the fixed input bar + BottomNav */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-40">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="py-8">
              <p
                className="mb-6 text-center text-sm"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {chartData ? '排盘数据已就绪，选择一个问题开始对话' : '正在准备排盘数据...'}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PRESET_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    disabled={streaming || !chartData}
                    className="rounded-xl px-4 py-3 text-left text-sm transition disabled:opacity-30"
                    style={{
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)';
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={
                  msg.role === 'user'
                    ? {
                        background: 'var(--gradient-primary)',
                        color: '#ffffff',
                      }
                    : {
                        background: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                      }
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
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input — fixed above BottomNav (bottom ~56px + safe-area) */}
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
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-base)',
              color: 'var(--text-primary)',
            }}
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
    </div>
  );
}
