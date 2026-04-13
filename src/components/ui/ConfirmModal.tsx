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
      className="fixed inset-0 flex items-center justify-center px-8"
      style={{ background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl p-5"
        style={{ background: 'var(--bg-surface)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <p className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="mb-5 text-sm" style={{ color: 'var(--text-tertiary)' }}>{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition"
            style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition"
            style={{ background: destructive ? '#e05060' : 'var(--accent-primary)' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
