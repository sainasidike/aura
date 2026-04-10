'use client';

import Link from 'next/link';

export default function TarotPage() {
  return (
    <div className="min-h-screen px-4 py-6 pb-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center">
          <Link href="/chart" className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            <span>&larr;</span>
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontWeight: 500 }}>塔罗牌</span>
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl" style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)' }}>
            ⊡
          </div>
          <p className="mb-2 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>AI 塔罗解读</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>即将上线，敬请期待</p>
        </div>
      </div>
    </div>
  );
}
