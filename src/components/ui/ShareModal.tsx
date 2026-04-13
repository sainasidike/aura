'use client';

interface ShareModalProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onCopyText: () => void;
  onSaveImage: () => void;
}

export default function ShareModal({ open, loading, onClose, onCopyText, onSaveImage }: ShareModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl px-5 pb-8 pt-4"
        style={{ background: 'var(--bg-surface)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: 'var(--border-subtle)' }} />
        <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>分享对话</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onCopyText}
            className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm transition"
            style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)', flexShrink: 0 }}>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            <div>
              <p className="font-medium">复制文本</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>复制对话内容到剪贴板</p>
            </div>
          </button>

          <button
            onClick={onSaveImage}
            disabled={loading}
            className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm transition disabled:opacity-50"
            style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)', flexShrink: 0 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
            </svg>
            <div>
              <p className="font-medium">{loading ? '正在生成...' : '保存为图片'}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>生成精美长截图并下载</p>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-xl py-3 text-sm font-medium transition"
          style={{ background: 'var(--bg-base)', color: 'var(--text-tertiary)' }}
        >
          取消
        </button>
      </div>
    </div>
  );
}
