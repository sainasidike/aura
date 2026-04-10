'use client';

import type { BaziChart, TimeStandardization } from '@/types';

export function BaziDisplay({ data }: { data: { timeInfo: TimeStandardization; chart: BaziChart } }) {
  const { timeInfo, chart } = data;
  const p = chart.fourPillars;

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4 text-sm" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <span>真太阳时: {String(timeInfo.trueSolarTime.hour).padStart(2, '0')}:{String(timeInfo.trueSolarTime.minute).padStart(2, '0')}</span>
          <span style={{ color: 'var(--border-default)' }}>|</span>
          <span>{timeInfo.shichenName}</span>
          <span style={{ color: 'var(--border-default)' }}>|</span>
          <span>修正 {timeInfo.totalCorrection > 0 ? '+' : ''}{Math.round(timeInfo.totalCorrection)}分</span>
          {timeInfo.isDST && <span className="rounded px-1.5 text-xs" style={{ background: 'rgba(192,144,48,0.15)', color: 'var(--warning)' }}>夏令时</span>}
        </div>
        {timeInfo.nearBoundary && <p className="mt-2 text-xs" style={{ color: 'var(--warning)' }}>{timeInfo.boundaryWarning}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead>
            <tr className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              <td className="p-2"></td><td className="p-2">年柱</td><td className="p-2">月柱</td><td className="p-2">日柱</td><td className="p-2">时柱</td>
            </tr>
          </thead>
          <tbody style={{ color: 'var(--text-primary)' }}>
            <tr className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <td className="p-1 text-right">十神</td>
              <td className="p-1">{chart.shiShen.tianGan.year}</td><td className="p-1">{chart.shiShen.tianGan.month}</td><td className="p-1">{chart.shiShen.tianGan.day}</td><td className="p-1">{chart.shiShen.tianGan.time}</td>
            </tr>
            <tr className="text-xl sm:text-2xl font-bold">
              <td className="p-1.5 sm:p-2 text-right text-sm font-normal" style={{ color: 'var(--text-tertiary)' }}>天干</td>
              <td className="p-1.5 sm:p-2">{p.year.gan}</td><td className="p-1.5 sm:p-2">{p.month.gan}</td><td className="p-1.5 sm:p-2" style={{ color: 'var(--accent-warm)' }}>{p.day.gan}</td><td className="p-1.5 sm:p-2">{p.time.gan}</td>
            </tr>
            <tr className="text-xl sm:text-2xl font-bold">
              <td className="p-1.5 sm:p-2 text-right text-sm font-normal" style={{ color: 'var(--text-tertiary)' }}>地支</td>
              <td className="p-1.5 sm:p-2">{p.year.zhi}</td><td className="p-1.5 sm:p-2">{p.month.zhi}</td><td className="p-1.5 sm:p-2">{p.day.zhi}</td><td className="p-1.5 sm:p-2">{p.time.zhi}</td>
            </tr>
            <tr className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <td className="p-1 text-right">藏干</td>
              <td className="p-1">{chart.hideGan.year.join(' ')}</td><td className="p-1">{chart.hideGan.month.join(' ')}</td><td className="p-1">{chart.hideGan.day.join(' ')}</td><td className="p-1">{chart.hideGan.time.join(' ')}</td>
            </tr>
            <tr className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <td className="p-1 text-right">纳音</td>
              <td className="p-1">{chart.nayin.year}</td><td className="p-1">{chart.nayin.month}</td><td className="p-1">{chart.nayin.day}</td><td className="p-1">{chart.nayin.time}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {[['农历', chart.lunarDate], ['生肖', chart.shengXiao], ['命宫', chart.mingGong], ['身宫', chart.shenGong]].map(([label, val]) => (
          <div key={label} className="rounded-xl p-4" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <p style={{ color: 'var(--text-tertiary)' }}>{label}</p>
            <p style={{ color: 'var(--text-primary)' }}>{val}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>大运</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-2">
          {chart.dayun.map((d, i) => (
            <div key={i} className="rounded-lg px-2 py-1.5 text-center" style={{ background: 'var(--bg-hover)' }}>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{d.startAge}岁</p>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{d.ganZhi}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{d.startYear}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
