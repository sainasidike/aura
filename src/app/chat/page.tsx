'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Profile {
  id: string; name: string; gender: string;
  year: number; month: number; day: number;
  hour: number; minute: number;
  city: string; longitude: number; latitude: number; timezone: string;
}

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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-purple-300/40">加载中...</div>}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const profileId = searchParams.get('profileId');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [chartData, setChartData] = useState<Record<string, unknown> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileId) return;
    fetch('/api/profiles').then(r => r.json()).then((profiles: Profile[]) => {
      const p = profiles.find(p => p.id === profileId);
      if (p) {
        setProfile(p);
        // 预先获取排盘数据
        fetchChartData(p);
      }
    });
  }, [profileId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChartData = async (p: Profile) => {
    try {
      const [baziRes, ziweiRes] = await Promise.all([
        fetch('/api/bazi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: p.year, month: p.month, day: p.day,
            hour: p.hour, minute: p.minute,
            gender: p.gender, longitude: p.longitude, timezone: p.timezone,
          }),
        }),
        fetch('/api/ziwei', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: p.year, month: p.month, day: p.day,
            hour: p.hour, minute: p.minute,
            gender: p.gender, longitude: p.longitude, timezone: p.timezone,
          }),
        }),
      ]);

      const bazi = await baziRes.json();
      const ziwei = await ziweiRes.json();

      setChartData({
        profile: { name: p.name, gender: p.gender, birthDate: `${p.year}-${p.month}-${p.day}`, birthTime: `${p.hour}:${p.minute}`, city: p.city },
        bazi: bazi.chart,
        ziwei: ziwei.chart,
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

  if (!profileId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-purple-300/60 mb-4">请先选择一个档案</p>
          <Link href="/profile" className="rounded-lg bg-purple-600 px-4 py-2 text-sm hover:bg-purple-500">
            前往档案管理
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/profile" className="text-purple-300/60 hover:text-purple-200 text-sm">&larr;</Link>
          <div className="text-center">
            <p className="text-sm font-medium text-purple-100">AI 命理对话</p>
            {profile && (
              <p className="text-xs text-purple-300/50">{profile.name} · {profile.city}</p>
            )}
          </div>
          <Link href={`/chart?profileId=${profileId}`} className="text-purple-300/60 hover:text-purple-200 text-xs">排盘</Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="py-8">
              <p className="mb-6 text-center text-purple-300/40 text-sm">
                {chartData ? '排盘数据已就绪，选择一个问题开始对话' : '正在准备排盘数据...'}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PRESET_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    disabled={streaming || !chartData}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-purple-200 hover:bg-white/10 transition disabled:opacity-30"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-purple-100'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content || '...'}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 bg-black/20 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="输入你的问题..."
            disabled={streaming}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-purple-400 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={streaming || !input.trim()}
            className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium hover:bg-purple-500 transition disabled:opacity-30"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
