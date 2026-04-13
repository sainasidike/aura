'use client';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open, title, message,
  confirmText = '确定', cancelText = '取消',
  destructive = false,
  onConfirm, onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-8 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', zIndex: 200 }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl p-6 animate-scaleIn"
        style={{
          background: 'var(--bg-base)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.12), 0 8px 24px rgba(123,108,184,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <p className="mb-1.5 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition"
            style={{
              background: destructive ? 'linear-gradient(135deg, #e05060, #d04050)' : 'var(--gradient-primary)',
              boxShadow: destructive ? '0 2px 12px rgba(224,80,96,0.25)' : '0 2px 12px rgba(123,108,184,0.25)',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
