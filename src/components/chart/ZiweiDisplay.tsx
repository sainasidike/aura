'use client';

import type { ZiweiChart, TimeStandardization } from '@/types';

export function ZiweiDisplay({ data }: { data: { timeInfo: TimeStandardization; chart: ZiweiChart } }) {
  const { timeInfo, chart } = data;

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4 text-sm" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-4" style={{ color: 'var(--text-secondary)' }}>
          <span>命主: <strong style={{ color: 'var(--text-primary)' }}>{chart.destinyMaster}</strong></span>
          <span>身主: <strong style={{ color: 'var(--text-primary)' }}>{chart.bodyMaster}</strong></span>
          <span>五行局: <strong style={{ color: 'var(--text-primary)' }}>{chart.element}</strong></span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <span>真太阳时: {String(timeInfo.trueSolarTime.hour).padStart(2, '0')}:{String(timeInfo.trueSolarTime.minute).padStart(2, '0')}</span>
          <span>{timeInfo.shichenName}</span>
          {timeInfo.isDST && <span className="rounded px-1.5" style={{ background: 'rgba(192,144,48,0.15)', color: 'var(--warning)' }}>夏令时</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {chart.cells.map((cell, i) => (
          <div key={i} className="rounded-xl p-3"
            style={cell.temples.some(t => t.includes('命宫'))
              ? { border: '1px solid var(--accent-warm-dim)', background: 'rgba(184,150,62,0.05)' }
              : { border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }
            }>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{cell.ground}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cell.temples.join(' / ')}</span>
            </div>
            <div className="mt-2">
              {cell.majorStars.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {cell.majorStars.map((s, j) => (
                    <span key={j} className="rounded px-1.5 py-0.5 text-sm font-medium"
                      style={s.fourInfluence ? { background: 'var(--accent-primary-dim)', color: 'var(--text-primary)' } : { color: 'var(--text-primary)' }}>
                      {s.name}{s.fourInfluence && <span className="ml-0.5 text-xs" style={{ color: 'var(--accent-warm)' }}>{s.fourInfluence}</span>}
                    </span>
                  ))}
                </div>
              ) : <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>无主星</span>}
            </div>
            {cell.minorStars.length > 0 && (
              <div className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{cell.minorStars.map(s => s.name).join(' · ')}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
