'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CITIES, searchCity } from '@/lib/cities';
import { getProfiles, addProfile, deleteProfile, type StoredProfile } from '@/lib/storage';

export default function ProfilePage() {
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', gender: '男',
    year: 1990, month: 1, day: 1, hour: 12, minute: 0,
    city: '北京',
  });
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState(CITIES.slice(0, 10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setProfiles(getProfiles());
  }, []);

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
    const profile = addProfile({
      ...form,
      longitude: cityData?.longitude ?? 116.40,
      latitude: cityData?.latitude ?? 39.90,
      timezone: cityData?.timezone ?? 'Asia/Shanghai',
    });
    setProfiles(prev => [profile, ...prev]);
    setShowForm(false);
    setForm({ name: '', gender: '男', year: 1990, month: 1, day: 1, hour: 12, minute: 0, city: '北京' });
    setLoading(false);
  };

  const handleDelete = (id: string) => {
    deleteProfile(id);
    setProfiles(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-purple-300/60 hover:text-purple-200 text-sm">&larr; 返回</Link>
          <h1 className="text-xl font-semibold text-purple-100">个人档案</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-medium hover:bg-purple-500 transition"
          >
            {showForm ? '取消' : '+ 新建'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur space-y-4">
            <div>
              <label className="mb-1 block text-sm text-purple-300">姓名/备注</label>
              <input
                type="text" required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-purple-400 focus:outline-none"
                placeholder="例：张三"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm text-purple-300">性别</label>
                <select
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-purple-300">出生城市</label>
                <div className="relative">
                  <input
                    type="text"
                    value={citySearch || form.city}
                    onChange={e => setCitySearch(e.target.value)}
                    onFocus={() => setCitySearch('')}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                  />
                  {citySearch !== '' && (
                    <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-white/10 bg-gray-900">
                      {cityResults.map(c => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => { setForm({ ...form, city: c.name }); setCitySearch(''); }}
                          className="block w-full px-3 py-1.5 text-left text-sm text-white hover:bg-white/10"
                        >
                          {c.name} <span className="text-white/40">{c.province}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm text-purple-300">年</label>
                <input type="number" min={1900} max={2030}
                  value={form.year} onChange={e => setForm({ ...form, year: +e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-purple-300">月</label>
                <select value={form.month} onChange={e => setForm({ ...form, month: +e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}月</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-purple-300">日</label>
                <select value={form.day} onChange={e => setForm({ ...form, day: +e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                >
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}日</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-purple-300">时</label>
                <select value={form.hour} onChange={e => setForm({ ...form, hour: +e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}时</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-purple-300">分</label>
                <select value={form.minute} onChange={e => setForm({ ...form, minute: +e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-purple-400 focus:outline-none"
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}分</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full rounded-lg bg-purple-600 py-2.5 font-medium hover:bg-purple-500 transition disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建档案'}
            </button>
          </form>
        )}

        {profiles.length === 0 && !showForm && (
          <div className="text-center py-16 text-purple-300/40">
            <p className="text-lg mb-2">还没有档案</p>
            <p className="text-sm">点击右上角「新建」开始</p>
          </div>
        )}

        <div className="space-y-3">
          {profiles.map(p => (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-purple-100">{p.name}</h3>
                  <p className="mt-1 text-sm text-purple-300/60">
                    {p.year}年{p.month}月{p.day}日 {String(p.hour).padStart(2, '0')}:{String(p.minute).padStart(2, '0')} · {p.city} · {p.gender}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs text-red-400/60 hover:text-red-400"
                >
                  删除
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/chart?profileId=${p.id}`}
                  className="rounded-lg bg-purple-600/30 px-3 py-1 text-sm text-purple-200 hover:bg-purple-600/50 transition"
                >
                  排盘分析
                </Link>
                <Link
                  href={`/chat?profileId=${p.id}`}
                  className="rounded-lg bg-purple-600/30 px-3 py-1 text-sm text-purple-200 hover:bg-purple-600/50 transition"
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
