'use client';

import { useEffect, useRef, useCallback, useState, useLayoutEffect } from 'react';
import type { GlossaryEntry } from '@/lib/astrology-glossary';

interface GlossaryPopupProps {
  entry: GlossaryEntry | null;
  anchorRect: DOMRect | null;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<GlossaryEntry['category'], string> = {
  sign: '星座',
  planet: '行星',
  house: '宫位',
  aspect: '相位',
  concept: '概念',
};

const CATEGORY_COLORS: Record<GlossaryEntry['category'], string> = {
  sign: 'var(--accent-primary)',
  planet: '#c084fc',       // soft purple
  house: '#60a5fa',        // soft blue
  aspect: '#f59e0b',       // warm amber
  concept: '#34d399',      // soft green
};

export default function GlossaryPopup({ entry, anchorRect, onClose }: GlossaryPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<React.CSSProperties>({});

  // Close on click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  // Close on Escape key
  useEffect(() => {
    if (!entry) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entry, onClose]);

  // Compute position after popup is rendered and has actual dimensions
  useLayoutEffect(() => {
    if (!entry || !anchorRect) { setPos({}); return; }

    // Wait one frame so popup has rendered and we can measure it
    const raf = requestAnimationFrame(() => {
      const popup = popupRef.current;
      const popupHeight = popup?.offsetHeight || 280;
      const popupWidth = Math.min(320, window.innerWidth - 24);
      const margin = 12;

      // Horizontal: center on anchor, clamp to viewport
      let left = anchorRect.left + anchorRect.width / 2 - popupWidth / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));

      // Vertical: prefer below anchor (more natural on mobile); fall back to above
      const spaceAbove = anchorRect.top;
      const spaceBelow = window.innerHeight - anchorRect.bottom;

      let top: number;
      if (spaceBelow >= popupHeight + margin) {
        top = anchorRect.bottom + margin;
      } else if (spaceAbove >= popupHeight + margin) {
        top = anchorRect.top - popupHeight - margin;
      } else {
        // Neither side has enough room — pin to bottom of viewport with scroll
        top = Math.max(margin, window.innerHeight - popupHeight - margin);
      }

      setPos({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${popupWidth}px`,
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [entry, anchorRect]);

  if (!entry) return null;

  const accentColor = CATEGORY_COLORS[entry.category];

  return (
    <div
      className="fixed inset-0 animate-fadeIn"
      style={{ zIndex: 300, background: 'rgba(0,0,0,0.2)' }}
      onClick={handleBackdropClick}
    >
      <div
        ref={popupRef}
        className="glossary-popup"
        style={{
          ...pos,
          maxWidth: 320,
          borderRadius: 16,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.12)',
          padding: '16px 18px 14px',
          animation: 'glossaryFadeIn 0.2s ease-out',
          overflow: 'hidden',
          // Start invisible until position is calculated
          visibility: pos.top ? 'visible' : 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header: Icon + Term + Category Pill ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>{entry.icon}</span>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'var(--text-primary)',
              flex: 1,
            }}
          >
            {entry.term}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: accentColor,
              background: `${accentColor}18`,
              padding: '3px 8px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
            }}
          >
            {CATEGORY_LABELS[entry.category]}
          </span>
        </div>

        {/* ── Sign metadata: element, modality, ruler ── */}
        {entry.category === 'sign' && (entry.element || entry.modality || entry.ruler) && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {entry.element && (
              <Tag label={`${getElementEmoji(entry.element)} ${entry.element}`} />
            )}
            {entry.modality && <Tag label={entry.modality} />}
            {entry.ruler && <Tag label={`守护: ${entry.ruler}`} />}
          </div>
        )}

        {/* ── Brief ── */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
            margin: '0 0 8px',
          }}
        >
          {entry.brief}
        </p>

        {/* ── Detail ── */}
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.65,
            color: 'var(--text-tertiary)',
            margin: '0 0 12px',
          }}
        >
          {entry.detail}
        </p>

        {/* ── Keywords ── */}
        {entry.keywords.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {entry.keywords.map((kw) => (
              <span
                key={kw}
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  padding: '2px 7px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Inline animation keyframes ── */}
      <style>{`
        @keyframes glossaryFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// ── Small metadata tag ──

function Tag({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        color: 'var(--text-secondary)',
        background: 'var(--bg-base)',
        border: '1px solid var(--border-default)',
        padding: '2px 8px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

// ── Element emoji helper ──

function getElementEmoji(element: string): string {
  switch (element) {
    case '火': return '🔥';
    case '土': return '🌍';
    case '风': return '💨';
    case '水': return '💧';
    default: return '';
  }
}
