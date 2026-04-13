'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CITIES, searchCity } from '@/lib/cities';

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

interface DecodedPerson {
  n: string;
  g: string;
  y: number;
  m: number;
  d: number;
  h: number;
  mi: number;
  c: string;
  lo: number;
  la: number;
  tz: string;
}

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

export default function MatchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}><span className="animate-breathe">...</span></div>}>
      <MatchContent />
    </Suspense>
  );
}

function MatchContent() {
  const searchParams = useSearchParams();
  const dParam = searchParams.get('d');

  const [personA, setPersonA] = useState<DecodedPerson | null>(null);
  const [decodeError, setDecodeError] = useState(false);
  const [form, setForm] = useState({
    name: '', gender: '女',
    year: 1995, month: 1, day: 1, hour: 12, minute: 0,
    city: '北京',
  });
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState(CITIES.slice(0, 10));
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const daysInMonth = new Date(form.year, form.month, 0).getDate();
  useEffect(() => {
    if (form.day > daysInMonth) {
      setForm(prev => ({ ...prev, day: daysInMonth }));
    }
  }, [form.year, form.month, form.day, daysInMonth]);

  useEffect(() => {
    if (!dParam) { setDecodeError(true); return; }
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(dParam)))) as DecodedPerson;
      if (!decoded.n || !decoded.y) { setDecodeError(true); return; }
      setPersonA(decoded);
    } catch {
      setDecodeError(true);
    }
  }, [dParam]);

  useEffect(() => {
    if (citySearch) {
      setCityResults(searchCity(citySearch));
    } else {
      setCityResults(CITIES.slice(0, 10));
    }
  }, [citySearch]);

  const handleCopyText = useCallback(async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = report;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [report]);

  const handleSaveImage = useCallback(async () => {
    if (!contentRef.current || !report || !personA) return;
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const container = document.createElement('div');
      container.style.cssText = `position:fixed;left:-9999px;top:0;width:390px;background:#f8f7fc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#2d2b3d;font-size:13px;line-height:1.6;`;
      container.innerHTML = `
        <div style="background:linear-gradient(135deg,${LOVE_COLOR},${LOVE_COLOR}cc);padding:28px 20px 22px;color:#fff">
          <div style="font-size:20px;font-weight:700">配对报告</div>
          <div style="font-size:12px;margin-top:6px;opacity:0.85">${personA.n} & ${form.name}</div>
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
        a.download = `配对报告_${personA.n}_${form.name}_${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (e) {
      console.error('生成图片失败:', e);
    }
  }, [report, personA, form.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personA || !form.name) return;

    const cityData = CITIES.find(c => c.name === form.city);
    const personBData = {
      year: form.year, month: form.month, day: form.day,
      hour: form.hour, minute: form.minute, gender: form.gender,
      longitude: cityData?.longitude ?? 116.40,
      latitude: cityData?.latitude ?? 39.90,
      timezone: cityData?.timezone ?? 'Asia/Shanghai',
    };

    setLoading(true);
    setError('');
    setResult(null);
    setReport('');

    try {
      const res = await fetch('/api/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: {
            year: personA.y, month: personA.m, day: personA.d,
            hour: personA.h, minute: personA.mi, gender: personA.g,
            longitude: personA.lo, latitude: personA.la, timezone: personA.tz,
          },
          personB: personBData,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '计算失败');
      }

      const data = await res.json();
      setResult(data);
      setLoading(false);

      // Stream report
      setReportLoading(true);
      const reportRes = await fetch('/api/compatibility/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: { name: personA.n, gender: personA.g, year: personA.y, month: personA.m, day: personA.d },
          personB: { name: form.name, gender: form.gender, year: form.year, month: form.month, day: form.day },
          compatibilityData: data,
        }),
      });

      if (!reportRes.ok) {
        const errData = await reportRes.json();
        throw new Error(errData.error || '报告生成失败');
      }

      const reader = reportRes.body?.getReader();
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
            if (parsed.content) setReport(prev => prev + parsed.content);
          } catch { /* skip */ }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '计算失败');
    }
    setLoading(false);
    setReportLoading(false);
  };

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [report]);

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-base)',
    borderColor: 'var(--border-default)',
    color: 'var(--text-primary)',
  };

  // Error state: invalid link
  if (decodeError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6" style={{ background: 'var(--bg-surface)' }}>
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl text-3xl" style={{ background: `${LOVE_COLOR}15`, color: LOVE_COLOR }}>?</div>
        <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>链接无效或已过期</p>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>请让对方重新生成配对链接</p>
        <Link href="/" className="mt-2 rounded-full px-6 py-2.5 text-sm font-medium text-white" style={{ background: 'var(--gradient-primary)', boxShadow: '0 4px 16px rgba(123,108,184,0.25)' }}>
          前往 Aura
        </Link>
      </div>
    );
  }

  if (!personA) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
        <span className="animate-breathe">加载中...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-surface)' }}>
      {/* Branded header */}
      <div
        className="px-5 pb-6 pt-10 text-center"
        style={{ background: `linear-gradient(135deg, #7b6cb8, ${LOVE_COLOR})` }}
      >
        <div className="mb-2 text-2xl text-white" style={{ opacity: 0.9 }}>*</div>
        <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          {personA.n} 邀请你查看星盘配对
        </h1>
        <p className="mt-1.5 text-xs text-white" style={{ opacity: 0.75 }}>填写你的出生信息，查看你们的星盘缘分</p>
      </div>

      <div className="mx-auto max-w-lg px-5 py-6">
        {/* Form (hidden when results are shown) */}
        {!result && !loading && !error && (
          <form
            onSubmit={handleSubmit}
            className="animate-fadeIn rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-md)' }}
          >
            <div>
              <label className="mb-1.5 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>你的名字</label>
              <input
                type="text" required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border px-4 py-2.5 text-sm transition"
                style={inputStyle}
                placeholder="输入你的名字"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>性别</label>
                <div className="flex gap-2">
                  {(['男', '女'] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm({ ...form, gender: g })}
                      className="flex-1 rounded-xl border py-2.5 text-sm font-medium transition"
                      style={{
                        background: form.gender === g ? `${LOVE_COLOR}15` : 'var(--bg-base)',
                        borderColor: form.gender === g ? LOVE_COLOR : 'var(--border-default)',
                        color: form.gender === g ? LOVE_COLOR : 'var(--text-secondary)',
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>出生城市</label>
                <div className="relative">
                  <input
                    type="text"
                    value={showCityDropdown ? citySearch : form.city}
                    onChange={e => { setCitySearch(e.target.value); setShowCityDropdown(true); }}
                    onFocus={() => { setShowCityDropdown(true); setCitySearch(''); }}
                    onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                    placeholder="搜索城市..."
                    className="w-full rounded-xl border px-4 py-2.5 text-sm transition"
                    style={inputStyle}
                  />
                  {showCityDropdown && (
                    <div
                      className="absolute z-10 mt-1.5 max-h-48 w-full overflow-y-auto rounded-xl border shadow-lg"
                      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)', boxShadow: 'var(--shadow-lg)' }}
                    >
                      {cityResults.length > 0 ? cityResults.map(c => (
                        <button
                          key={c.name}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => { setForm({ ...form, city: c.name }); setCitySearch(''); setShowCityDropdown(false); }}
                          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition"
                          style={{ color: 'var(--text-primary)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-primary-dim)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          <span>{c.name}</span>
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{c.province}</span>
                        </button>
                      )) : (
                        <div className="px-4 py-3 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          未找到「{citySearch}」
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>年</label>
                <input type="number" min={1900} max={2030}
                  value={form.year} onChange={e => setForm({ ...form, year: +e.target.value })}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm transition"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>月</label>
                <select value={form.month} onChange={e => setForm({ ...form, month: +e.target.value })}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm transition" style={inputStyle}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}月</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>日</label>
                <select value={form.day} onChange={e => setForm({ ...form, day: +e.target.value })}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm transition" style={inputStyle}>
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}日</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>时</label>
                <select value={form.hour} onChange={e => setForm({ ...form, hour: +e.target.value })}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm transition" style={inputStyle}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}时</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>分</label>
                <select value={form.minute} onChange={e => setForm({ ...form, minute: +e.target.value })}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm transition" style={inputStyle}>
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}分</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${LOVE_COLOR}, #b06080)`, boxShadow: `0 4px 16px ${LOVE_COLOR}30` }}
            >
              查看配对结果
            </button>
          </form>
        )}

        {/* Loading */}
        {loading && !result && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="animate-breathe">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg" style={{ background: `${LOVE_COLOR}15`, color: LOVE_COLOR }}>*</div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>正在计算配对数据...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-4 py-16">
            <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
            <button onClick={() => { setError(''); setResult(null); setReport(''); }} className="rounded-full px-6 py-2.5 text-sm font-medium text-white" style={{ background: `linear-gradient(135deg, ${LOVE_COLOR}, #b06080)` }}>
              重试
            </button>
          </div>
        )}

        {/* Score display */}
        {result && (
          <div className="mb-5 animate-fadeIn">
            <div className="mb-5 flex flex-col items-center py-4">
              <div
                className="relative flex h-28 w-28 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(${LOVE_COLOR} ${result.overall * 3.6}deg, ${LOVE_COLOR}15 0deg)`,
                  boxShadow: `0 8px 32px ${LOVE_COLOR}25`,
                }}
              >
                <div className="flex flex-col items-center justify-center rounded-full" style={{ background: 'var(--bg-base)', width: '88px', height: '88px' }}>
                  <span className="text-3xl font-bold" style={{ color: LOVE_COLOR, fontFamily: 'var(--font-display)' }}>{result.overall}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>综合得分</span>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {personA.n} & {form.name}
              </p>
            </div>

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

        {/* Report content */}
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
              onClick={handleSaveImage}
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

        {/* CTA at bottom */}
        {(result || report) && !reportLoading && (
          <div className="mt-10 mb-8 rounded-2xl p-6 text-center animate-fadeIn" style={{ background: `${LOVE_COLOR}08`, border: `1px solid ${LOVE_COLOR}20` }}>
            <p className="mb-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>也想测测你的配对?</p>
            <p className="mb-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>下载 Aura，探索你的星盘世界</p>
            <Link
              href="/"
              className="inline-block rounded-full px-6 py-2.5 text-sm font-semibold text-white transition active:scale-95"
              style={{ background: 'var(--gradient-primary)', boxShadow: '0 4px 16px rgba(123,108,184,0.25)' }}
            >
              前往 Aura
            </Link>
          </div>
        )}
      </div>
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
