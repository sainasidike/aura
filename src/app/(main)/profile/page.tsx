'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CITIES, searchCity } from '@/lib/cities';
import { getProfiles, addProfile, deleteProfile, type StoredProfile } from '@/lib/storage';

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>加载中...</div>}>
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

  // 根据年月计算当月天数
  const daysInMonth = new Date(form.year, form.month, 0).getDate();
  // 如果当前选择的日超出该月天数，自动修正
  useEffect(() => {
    if (form.day > daysInMonth) {
      setForm(prev => ({ ...prev, day: daysInMonth }));
    }
  }, [form.year, form.month, form.day, daysInMonth]);

  useEffect(() => {
    const ps = getProfiles();
    setProfiles(ps);
    // 如果没有档案或从运势页点击「添加」，自动展开表单
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
    addProfile({
      ...form,
      longitude: cityData?.longitude ?? 116.40,
      latitude: cityData?.latitude ?? 39.90,
      timezone: cityData?.timezone ?? 'Asia/Shanghai',
    });
    setLoading(false);
    // 创建后自动跳转到运势页
    router.push('/fortune');
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`确定删除「${name}」的档案吗？此操作不可撤销。`)) return;
    deleteProfile(id);
    setProfiles(prev => prev.filter(p => p.id !== id));
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    borderColor: 'var(--border-subtle)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm hover:opacity-70 transition"
            style={{ color: 'var(--text-tertiary)' }}
          >
            &larr; 返回
          </Link>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            个人档案
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 transition"
            style={{ background: 'var(--gradient-primary)' }}
          >
            {showForm ? '取消' : '+ 新建'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-2xl border p-6 backdrop-blur space-y-4"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
          >
            <div>
              <label className="mb-1 block text-sm" style={{ color: 'var(--text-secondary)' }}>姓名/备注</label>
              <input
                type="text" required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
                style={inputStyle}
                placeholder="例：张三"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--text-secondary)' }}>性别</label>
                <select
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 focus:border-accent-primary focus:outline-none"
                  style={inputStyle}
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--text-secondary)' }}>出生城市</label>
                <div className="relative">
                  <input
                    type="text"
                    value={showCityDropdown ? citySearch : form.city}
                    onChange={e => { setCitySearch(e.target.value); setShowCityDropdown(true); }}
                    onFocus={() => { setShowCityDropdown(true); setCitySearch(''); }}
                    onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                    placeholder="搜索城市名或省份..."
                    className="w-full rounded-lg border px-3 py-2 focus:border-accent-primary focus:outline-none"
                    style={inputStyle}
                  />
                  {showCityDropdown && (
                    <div
                      className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border shadow-lg"
                      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
                    >
                      {cityResults.length > 0 ? cityResults.map(c => (
                        <button
                          key={c.name}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => { setForm({ ...form, city: c.name }); setCitySearch(''); setShowCityDropdown(false); }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition"
                          style={{ color: 'var(--text-primary)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                          <span>{c.name}</span>
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{c.province}</span>
                        </button>
                      )) : (
                        <div className="px-3 py-3 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          未找到「{citySearch}」，请尝试省份名或其他城市
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--text-secondary)' }}>年</label>
                <input type="number" min={1900} max={2030}
                  value={form.year} onChange={e => setForm({ ...form, year: +e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 focus:border-accent-primary focus:outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--text-secondary)' }}>月</label>
                <select value={form.month} onChange={e => setForm({ ...form, month: +e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 focus:border-accent-primary focus:outline-none"
                  style={inputStyle}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}月</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--text-secondary)' }}>日</label>
                <select value={form.day} onChange={e => setForm({ ...form, day: +e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 focus:border-accent-primary focus:outline-none"
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
                <label className="mb-1 block text-sm" style={{ color: 'var(--text-secondary)' }}>时</label>
                <select value={form.hour} onChange={e => setForm({ ...form, hour: +e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 focus:border-accent-primary focus:outline-none"
                  style={inputStyle}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}时</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--text-secondary)' }}>分</label>
                <select value={form.minute} onChange={e => setForm({ ...form, minute: +e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 focus:border-accent-primary focus:outline-none"
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
              className="w-full rounded-lg py-2.5 font-medium text-white hover:opacity-90 transition disabled:opacity-50"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {loading ? '创建中...' : '创建档案'}
            </button>
          </form>
        )}

        {profiles.length === 0 && !showForm && (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <p className="text-lg mb-2">还没有档案</p>
            <p className="text-sm">点击右上角「新建」开始</p>
          </div>
        )}

        <div className="space-y-3">
          {profiles.map(p => (
            <div
              key={p.id}
              className="rounded-2xl border p-5 backdrop-blur"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {p.year}年{p.month}月{p.day}日 {String(p.hour).padStart(2, '0')}:{String(p.minute).padStart(2, '0')} · {p.city} · {p.gender}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="text-xs hover:opacity-80"
                  style={{ color: 'var(--error)' }}
                >
                  删除
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/chart?profileId=${p.id}`}
                  className="rounded-lg px-3 py-1 text-sm transition hover:opacity-80"
                  style={{ background: 'var(--accent-primary-dim)', color: 'var(--text-primary)' }}
                >
                  排盘分析
                </Link>
                <Link
                  href={`/chat?profileId=${p.id}`}
                  className="rounded-lg px-3 py-1 text-sm transition hover:opacity-80"
                  style={{ background: 'var(--accent-primary-dim)', color: 'var(--text-primary)' }}
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
