'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CITIES, searchCity } from '@/lib/cities';
import { getProfiles, addProfile, deleteProfile, setActiveProfileId, type StoredProfile } from '@/lib/storage';

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}><span className="animate-breathe">加载中...</span></div>}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', gender: '男',
    year: 1990, month: 1, day: 1, hour: 12, minute: 0,
    city: '北京',
  });
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState(CITIES.slice(0, 10));
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const daysInMonth = new Date(form.year, form.month, 0).getDate();
  useEffect(() => {
    if (form.day > daysInMonth) {
      setForm(prev => ({ ...prev, day: daysInMonth }));
    }
  }, [form.year, form.month, form.day, daysInMonth]);

  useEffect(() => {
    const ps = getProfiles();
    setProfiles(ps);
    if (ps.length === 0 || searchParams.get('showForm') === 'true') setShowForm(true);
  }, [searchParams]);

  useEffect(() => {
    if (citySearch) {
      setCityResults(searchCity(citySearch));
    } else {
      setCityResults(CITIES.slice(0, 10));
    }
  }, [citySearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const cityData = CITIES.find(c => c.name === form.city);
    const newProfile = addProfile({
      ...form,
      longitude: cityData?.longitude ?? 116.40,
      latitude: cityData?.latitude ?? 39.90,
      timezone: cityData?.timezone ?? 'Asia/Shanghai',
    });
    setActiveProfileId(newProfile.id);
    setLoading(false);
    router.push(`/chat?profileId=${newProfile.id}&firstVisit=true`);
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`确定删除「${name}」的档案吗？此操作不可撤销。`)) return;
    deleteProfile(id);
    setProfiles(prev => prev.filter(p => p.id !== id));
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-base)',
    borderColor: 'var(--border-default)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="min-h-screen px-4 py-6 pb-32">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm transition"
            style={{ color: 'var(--text-tertiary)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            ←
          </Link>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            个人档案
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-full px-4 py-2 text-xs font-semibold text-white transition"
            style={{
              background: showForm ? 'var(--text-tertiary)' : 'var(--gradient-primary)',
              boxShadow: showForm ? 'none' : '0 2px 10px rgba(123,108,184,0.20)',
            }}
          >
            {showForm ? '取消' : '+ 新建'}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="animate-fadeInUp mb-8 rounded-2xl p-6 space-y-4"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div>
              <label className="mb-1.5 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>姓名/备注</label>
              <input
                type="text" required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border px-4 py-2.5 text-sm transition"
                style={inputStyle}
                placeholder="例：张三"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>性别</label>
                <select
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm transition"
                  style={inputStyle}
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
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
                  className="w-full rounded-xl border px-3 py-2.5 text-sm transition"
                  style={inputStyle}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}月</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>日</label>
                <select value={form.day} onChange={e => setForm({ ...form, day: +e.target.value })}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm transition"
                  style={inputStyle}
                >
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
                  className="w-full rounded-xl border px-3 py-2.5 text-sm transition"
                  style={inputStyle}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}时</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>分</label>
                <select value={form.minute} onChange={e => setForm({ ...form, minute: +e.target.value })}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm transition"
                  style={inputStyle}
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}分</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{
                background: 'var(--gradient-primary)',
                boxShadow: '0 4px 16px rgba(123,108,184,0.25)',
              }}
            >
              {loading ? '创建中...' : '创建档案'}
            </button>
          </form>
        )}

        {profiles.length === 0 && !showForm && (
          <div className="flex flex-col items-center gap-3 py-20 animate-fadeIn">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl" style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)' }}>👤</div>
            <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>还没有档案</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>点击右上角「新建」开始</p>
          </div>
        )}

        {/* Profile cards */}
        <div className="stagger-children space-y-3">
          {profiles.map(p => (
            <div
              key={p.id}
              className="rounded-2xl p-5"
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  {p.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="rounded-lg px-2 py-1 text-xs transition"
                      style={{ color: 'var(--error)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(192,80,96,0.08)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    >
                      删除
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {p.year}年{p.month}月{p.day}日 {String(p.hour).padStart(2, '0')}:{String(p.minute).padStart(2, '0')} · {p.city} · {p.gender}
                  </p>
                </div>
              </div>
              <div className="mt-3.5 flex gap-2 pl-14">
                <Link
                  href={`/chart?profileId=${p.id}`}
                  className="rounded-full px-4 py-1.5 text-xs font-medium transition"
                  style={{
                    background: 'var(--accent-primary-dim)',
                    color: 'var(--accent-primary)',
                    border: '1px solid rgba(123,108,184,0.12)',
                  }}
                >
                  排盘分析
                </Link>
                <Link
                  href={`/chat?profileId=${p.id}`}
                  className="rounded-full px-4 py-1.5 text-xs font-medium transition"
                  style={{
                    background: 'var(--accent-secondary-dim)',
                    color: 'var(--accent-secondary)',
                    border: '1px solid rgba(58,191,182,0.12)',
                  }}
                >
                  AI 对话
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
