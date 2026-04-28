'use client';

import { useState, useEffect } from 'react';

interface Stats {
  totalUsers: number;
  todayNewUsers: number;
  todayLogins: number;
  weekLogins: number;
  dailyStats: { date: string; count: number }[];
  recentUsers: {
    id: string;
    email: string;
    nickname: string;
    createdAt: string;
    profileCount: number;
  }[];
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = async (pwd: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-password': pwd },
      });
      if (!res.ok) throw new Error('密码错误');
      const data = await res.json();
      setStats(data);
      setAuthed(true);
      localStorage.setItem('aura_admin_pwd', pwd);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // Auto-login with saved password
  useEffect(() => {
    const saved = localStorage.getItem('aura_admin_pwd');
    if (saved) fetchStats(saved);
  }, []);

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6" style={{ background: '#0a0a0f' }}>
        <div className="w-full max-w-xs">
          <h1 className="mb-6 text-center text-lg font-semibold text-white">Aura Admin</h1>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="管理密码"
            className="mb-3 w-full rounded-lg bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
            onKeyDown={e => { if (e.key === 'Enter') fetchStats(password); }}
          />
          {error && <p className="mb-3 text-center text-xs text-red-400">{error}</p>}
          <button
            onClick={() => fetchStats(password)}
            disabled={loading || !password}
            className="w-full rounded-lg bg-purple-600 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-40"
          >
            {loading ? '...' : '进入'}
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen px-4 py-6 pb-12" style={{ background: '#0a0a0f', color: '#e0e0e8' }}>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Aura Dashboard</h1>
          <button
            onClick={() => { localStorage.removeItem('aura_admin_pwd'); setAuthed(false); setStats(null); }}
            className="text-xs text-white/40 hover:text-white/60"
          >退出</button>
        </div>

        {/* Stat Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="总用户" value={stats.totalUsers} />
          <StatCard label="今日新增" value={stats.todayNewUsers} highlight />
          <StatCard label="今日登录" value={stats.todayLogins} />
          <StatCard label="7日登录" value={stats.weekLogins} />
        </div>

        {/* Daily Chart (simple bar) */}
        {stats.dailyStats.length > 0 && (
          <div className="mb-6 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <h2 className="mb-3 text-xs font-medium text-white/50">近7日新增用户</h2>
            <div className="flex items-end gap-2" style={{ height: 80 }}>
              {stats.dailyStats.slice().reverse().map(d => {
                const max = Math.max(...stats.dailyStats.map(x => x.count), 1);
                const h = Math.max((d.count / max) * 60, 4);
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-white/50">{d.count}</span>
                    <div className="w-full rounded-t" style={{ height: h, background: 'linear-gradient(180deg, #9070d0, #7060b0)' }} />
                    <span className="text-[9px] text-white/30">{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* User List */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="px-4 py-3 text-xs font-medium text-white/50">最近注册用户</div>
          <div className="divide-y divide-white/5">
            {stats.recentUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium">{u.nickname}</span>
                  <span className="ml-2 text-xs text-white/40">{u.email}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-white/30">
                    {new Date(u.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                  </span>
                  <span className="ml-2 text-[10px] text-white/20">{u.profileCount}个档案</span>
                </div>
              </div>
            ))}
            {stats.recentUsers.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-white/30">暂无用户</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="text-[11px] text-white/40">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: highlight ? '#a080e0' : '#e0e0e8' }}>
        {value}
      </div>
    </div>
  );
}
