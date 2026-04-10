'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getProfileById, getProfiles, type StoredProfile } from '@/lib/storage';

const REPORT_META: Record<string, { title: string; icon: string; color: string }> = {
  love: { title: '正缘报告', icon: '♡', color: '#d07090' },
  career: { title: '事业报告', icon: '◆', color: '#4888d0' },
  emotion: { title: '感情报告', icon: '✧', color: '#c88050' },
  health: { title: '健康报告', icon: '✦', color: '#40a080' },
};

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>加载中...</div>}>
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
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paramProfileId) {
      const p = getProfileById(paramProfileId);
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

    try {
      // Step 1: Get chart data (astrology + bazi)
      const [astroRes, baziRes] = await Promise.all([
        fetch('/api/astrology', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: profile.year, month: profile.month, day: profile.day,
            hour: profile.hour, minute: profile.minute, gender: profile.gender,
            longitude: profile.longitude, latitude: profile.latitude, timezone: profile.timezone,
          }),
        }),
        fetch('/api/bazi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: profile.year, month: profile.month, day: profile.day,
            hour: profile.hour, minute: profile.minute, gender: profile.gender,
            longitude: profile.longitude, latitude: profile.latitude, timezone: profile.timezone,
          }),
        }),
      ]);

      const astroData = await astroRes.json();
      const baziData = await baziRes.json();

      if (!astroRes.ok) throw new Error(astroData.error);
      if (!baziRes.ok) throw new Error(baziData.error);

      setChartLoading(false);
      setLoading(true);

      // Step 2: Stream AI report
      const chartData = {
        profile: { name: profile.name, gender: profile.gender, birthDate: `${profile.year}-${profile.month}-${profile.day}`, birthTime: `${profile.hour}:${profile.minute}`, city: profile.city },
        astrology: astroData.chart,
        bazi: baziData.chart,
      };

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

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-4" style={{ color: 'var(--text-tertiary)' }}>请先创建一个档案</p>
          <Link href="/profile" className="rounded-lg px-4 py-2 text-sm" style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}>前往档案管理</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 pb-24">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <Link href="/chart" className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <span>&larr;</span>
            <span style={{ color: meta.color }}>{meta.icon}</span>
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 500 }}>{meta.title}</span>
          </Link>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {profile.name} · {profile.year}.{profile.month}.{profile.day}
          </div>
        </div>

        {/* Generate button or report content */}
        {!report && !loading && !chartLoading && !error && (
          <div className="flex flex-col items-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ background: `${meta.color}15`, color: meta.color }}>
              {meta.icon}
            </div>
            <p className="mb-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{meta.title}</p>
            <p className="mb-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>AI 将根据你的星盘数据生成专属报告</p>
            <button
              onClick={generateReport}
              className="rounded-xl px-6 py-3 text-sm font-medium transition active:scale-95"
              style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
            >
              生成报告
            </button>
          </div>
        )}

        {chartLoading && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>正在计算星盘数据...</p>
          </div>
        )}

        {loading && !report && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>AI 正在撰写报告...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="mb-4 text-sm" style={{ color: 'var(--error)' }}>{error}</p>
            <button onClick={generateReport} className="rounded-lg px-4 py-2 text-sm" style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}>
              重试
            </button>
          </div>
        )}

        {report && (
          <div ref={contentRef}
            className="prose-chat rounded-xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
            dangerouslySetInnerHTML={{ __html: simpleMarkdown(report) }}
          />
        )}

        {loading && report && (
          <div className="mt-2 text-center">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: 'var(--accent-primary)' }} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Minimal markdown → HTML (no dependency needed) */
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
