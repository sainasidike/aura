'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { ALL_CARDS, drawRandomCards, numberToCard, getCardImageUrl, type TarotCard } from '@/lib/tarot-data';
import { matchSpread, getAllSpreads, type TarotSpread } from '@/lib/tarot-spreads';

// ─── Types ───

interface DrawnCard {
  card: TarotCard;
  isReversed: boolean;
  position: string;
  positionMeaning: string;
  flipped: boolean;
}

type Step = 'question' | 'spread' | 'draw' | 'reading';

// ─── Preset questions ───

const PRESET_QUESTIONS = [
  { emoji: '💕', text: '我的感情运势如何？', color: '#e8668a' },
  { emoji: '💼', text: '近期事业发展会顺利吗？', color: '#5b8def' },
  { emoji: '📚', text: '学业考试能否通过？', color: '#f0b429' },
  { emoji: '🏥', text: '健康状况需要注意什么？', color: '#4bc9a0' },
  { emoji: '💰', text: '这个月财运如何？', color: '#c88050' },
  { emoji: '🔮', text: '目前的困境该怎么办？', color: '#9b6cb8' },
];

// ─── Card back SVG pattern ───

function CardBack({ size = 'normal' }: { size?: 'normal' | 'small' }) {
  const w = size === 'small' ? 60 : 80;
  const h = size === 'small' ? 90 : 120;
  return (
    <div
      className="flex items-center justify-center rounded-xl"
      style={{
        width: w, height: h,
        background: 'linear-gradient(135deg, #2a1f4e, #1a1235)',
        border: '2px solid rgba(180,160,240,0.3)',
        boxShadow: '0 4px 20px rgba(80,60,160,0.25), inset 0 0 30px rgba(123,108,184,0.1)',
      }}
    >
      <div
        className="flex items-center justify-center rounded-lg"
        style={{
          width: w - 12, height: h - 12,
          border: '1px solid rgba(180,160,240,0.2)',
          background: 'radial-gradient(circle, rgba(123,108,184,0.15) 0%, transparent 70%)',
        }}
      >
        <span className="text-lg" style={{ color: 'rgba(180,160,240,0.6)' }}>✦</span>
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function TarotPage() {
  const [step, setStep] = useState<Step>('question');
  const [question, setQuestion] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [spread, setSpread] = useState<TarotSpread | null>(null);
  const [allSpreads] = useState(getAllSpreads());
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [drawMethod, setDrawMethod] = useState<'random' | 'number'>('random');
  const [numberInput, setNumberInput] = useState('');
  const [numberError, setNumberError] = useState('');
  const [reading, setReading] = useState('');
  const [readingLoading, setReadingLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [flipping, setFlipping] = useState(false);

  const readingRef = useRef<HTMLDivElement>(null);

  // Auto-scroll reading
  useEffect(() => {
    if (readingRef.current && readingLoading) {
      readingRef.current.scrollTop = readingRef.current.scrollHeight;
    }
  }, [reading, readingLoading]);

  // ─── Step 1: Select question ───
  const handleSelectQuestion = (q: string) => {
    setQuestion(q);
    setCustomInput(q);
    const matched = matchSpread(q);
    setSpread(matched);
    setStep('spread');
  };

  const handleCustomQuestion = () => {
    if (!customInput.trim()) return;
    handleSelectQuestion(customInput.trim());
  };

  // ─── Step 2: Confirm spread ───
  const handleConfirmSpread = () => {
    setStep('draw');
  };

  const handleChangeSpread = (s: TarotSpread) => {
    setSpread(s);
  };

  // ─── Step 3: Draw cards ───
  const handleRandomDraw = () => {
    if (!spread) return;
    const cards = drawRandomCards(spread.cardCount);
    const drawn: DrawnCard[] = cards.map((card, i) => ({
      card,
      isReversed: Math.random() < 0.5,
      position: spread.positions[i].name,
      positionMeaning: spread.positions[i].meaning,
      flipped: false,
    }));
    setDrawnCards(drawn);
    animateFlip(drawn);
  };

  const handleNumberDraw = () => {
    if (!spread) return;
    setNumberError('');

    const nums = numberInput.split(/[,，、\s]+/).map(s => s.trim()).filter(Boolean);
    if (nums.length !== spread.cardCount) {
      setNumberError(`请输入 ${spread.cardCount} 个数字（当前输入了 ${nums.length} 个）`);
      return;
    }

    const parsed = nums.map(n => parseInt(n, 10));
    if (parsed.some(isNaN)) {
      setNumberError('请输入有效的数字');
      return;
    }

    // Check duplicates after modulo
    const cardIds = parsed.map(n => ((n - 1) % 78 + 78) % 78 + 1);
    if (new Set(cardIds).size !== cardIds.length) {
      setNumberError('数字映射到了相同的牌，请更换数字');
      return;
    }

    const cards = parsed.map(n => numberToCard(n));
    const drawn: DrawnCard[] = cards.map((card, i) => ({
      card,
      isReversed: Math.random() < 0.5,
      position: spread.positions[i].name,
      positionMeaning: spread.positions[i].meaning,
      flipped: false,
    }));
    setDrawnCards(drawn);
    animateFlip(drawn);
  };

  const animateFlip = (drawn: DrawnCard[]) => {
    setFlipping(true);
    drawn.forEach((_, i) => {
      setTimeout(() => {
        setDrawnCards(prev => {
          const updated = [...prev];
          if (updated[i]) updated[i] = { ...updated[i], flipped: true };
          return updated;
        });
        if (i === drawn.length - 1) {
          setTimeout(() => setFlipping(false), 400);
        }
      }, 600 + i * 500);
    });
  };

  // ─── Step 4: Get AI reading ───
  const handleGetReading = async () => {
    if (!spread || drawnCards.length === 0) return;
    setStep('reading');
    setReadingLoading(true);
    setReading('');

    try {
      const res = await fetch('/api/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          cards: drawnCards.map(d => ({
            name: d.card.name,
            nameEn: d.card.nameEn,
            position: d.position,
            positionMeaning: d.positionMeaning,
            isReversed: d.isReversed,
            upright: d.card.upright,
            reversed: d.card.reversed,
            uprightDesc: d.card.uprightDesc,
            reversedDesc: d.card.reversedDesc,
          })),
          spread: { name: spread.name, description: spread.description },
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) setReading(prev => prev + parsed.content);
          } catch { /* skip */ }
        }
      }
    } catch {
      setReading('解读生成失败，请重试。');
    }
    setReadingLoading(false);
  };

  // ─── Reset ───
  const handleReset = () => {
    setStep('question');
    setQuestion('');
    setCustomInput('');
    setSpread(null);
    setDrawnCards([]);
    setDrawMethod('random');
    setNumberInput('');
    setNumberError('');
    setReading('');
    setReadingLoading(false);
    setExpandedCard(null);
    setFlipping(false);
  };

  // ═══ RENDER ═══

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        background: 'linear-gradient(180deg, #0f0a1e 0%, #1a1235 30%, #1e1540 60%, #150f2e 100%)',
        color: '#e8e0f8',
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-20 px-5 py-4" style={{ background: 'rgba(15,10,30,0.85)', backdropFilter: 'blur(16px)' }}>
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/chart" className="flex items-center gap-2 text-sm" style={{ color: 'rgba(180,160,240,0.6)' }}>
            <span>←</span>
            <span>返回</span>
          </Link>
          <h1 className="text-base font-semibold tracking-wide" style={{ color: 'rgba(200,180,255,0.9)', fontFamily: 'var(--font-display)' }}>
            ✦ 塔罗占卜
          </h1>
          {step !== 'question' && (
            <button onClick={handleReset} className="text-xs" style={{ color: 'rgba(180,160,240,0.5)' }}>
              重新开始
            </button>
          )}
          {step === 'question' && <div style={{ width: 52 }} />}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5">
        {/* ═══ Step indicator ═══ */}
        <div className="mb-6 flex items-center justify-center gap-2 pt-2">
          {(['question', 'spread', 'draw', 'reading'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={{
                  background: step === s ? 'linear-gradient(135deg, #7b6cb8, #9b8ed8)' : 'rgba(123,108,184,0.15)',
                  color: step === s ? '#fff' : 'rgba(180,160,240,0.4)',
                  boxShadow: step === s ? '0 0 16px rgba(123,108,184,0.4)' : 'none',
                }}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <div className="h-px w-6" style={{ background: 'rgba(123,108,184,0.15)' }} />
              )}
            </div>
          ))}
        </div>

        {/* ═══ STEP 1: Question ═══ */}
        {step === 'question' && (
          <div className="animate-fadeIn">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(123,108,184,0.2), rgba(180,160,240,0.1))', border: '1px solid rgba(180,160,240,0.15)' }}>
                🔮
              </div>
              <h2 className="mb-1 text-lg font-semibold" style={{ color: 'rgba(220,200,255,0.9)' }}>你想占卜什么？</h2>
              <p className="text-xs" style={{ color: 'rgba(180,160,240,0.5)' }}>选择下方问题或输入你的问题</p>
            </div>

            {/* Preset questions */}
            <div className="stagger-children mb-6 space-y-2.5">
              {PRESET_QUESTIONS.map((pq, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectQuestion(pq.text)}
                  className="flex w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left text-sm transition-all active:scale-[0.98]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(180,160,240,0.1)',
                  }}
                >
                  <span className="text-lg">{pq.emoji}</span>
                  <span style={{ color: 'rgba(220,200,255,0.85)' }}>{pq.text}</span>
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div className="flex gap-2.5">
              <input
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustomQuestion()}
                placeholder="输入你的问题..."
                className="flex-1 rounded-2xl px-4 py-3 text-sm transition"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(180,160,240,0.15)',
                  color: '#e8e0f8',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleCustomQuestion}
                disabled={!customInput.trim()}
                className="rounded-2xl px-5 py-3 text-sm font-medium transition disabled:opacity-30"
                style={{
                  background: 'linear-gradient(135deg, #7b6cb8, #9b8ed8)',
                  color: '#fff',
                  boxShadow: '0 4px 16px rgba(123,108,184,0.3)',
                }}
              >
                开始
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Spread selection ═══ */}
        {step === 'spread' && spread && (
          <div className="animate-fadeIn">
            {/* Question display */}
            <div className="mb-6 rounded-2xl px-4 py-3" style={{ background: 'rgba(123,108,184,0.1)', border: '1px solid rgba(180,160,240,0.12)' }}>
              <p className="text-xs" style={{ color: 'rgba(180,160,240,0.5)' }}>你的问题</p>
              <p className="mt-1 text-sm font-medium" style={{ color: 'rgba(220,200,255,0.9)' }}>{question}</p>
            </div>

            {/* Recommended spread */}
            <p className="mb-3 text-xs font-medium tracking-wide" style={{ color: 'rgba(180,160,240,0.5)' }}>推荐牌阵</p>
            <div
              className="mb-4 rounded-2xl p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(123,108,184,0.15), rgba(123,108,184,0.05))',
                border: '1px solid rgba(123,108,184,0.25)',
                boxShadow: '0 0 24px rgba(123,108,184,0.1)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm"
                  style={{ background: 'rgba(123,108,184,0.2)', color: 'rgba(200,180,255,0.8)' }}>
                  {spread.cardCount}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'rgba(220,200,255,0.9)' }}>{spread.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(180,160,240,0.5)' }}>{spread.description}</p>
                </div>
              </div>
              {/* Position labels */}
              <div className="mt-3 flex flex-wrap gap-2">
                {spread.positions.map((p, i) => (
                  <span key={i} className="rounded-full px-3 py-1 text-xs"
                    style={{ background: 'rgba(180,160,240,0.1)', color: 'rgba(200,180,255,0.7)' }}>
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Other spreads */}
            <p className="mb-3 text-xs font-medium tracking-wide" style={{ color: 'rgba(180,160,240,0.4)' }}>或选择其他牌阵</p>
            <div className="mb-6 grid grid-cols-2 gap-2">
              {allSpreads.filter(s => s.id !== spread.id).map(s => (
                <button
                  key={s.id}
                  onClick={() => handleChangeSpread(s)}
                  className="rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.97]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,160,240,0.08)' }}
                >
                  <p className="text-xs font-medium" style={{ color: 'rgba(200,180,255,0.7)' }}>{s.name}</p>
                  <p className="mt-0.5 text-[0.65rem]" style={{ color: 'rgba(180,160,240,0.35)' }}>{s.cardCount}张 · {s.description}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handleConfirmSpread}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold transition active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #7b6cb8, #9b8ed8)',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(123,108,184,0.35)',
              }}
            >
              确认牌阵 · 准备抽牌
            </button>
          </div>
        )}

        {/* ═══ STEP 3: Draw ═══ */}
        {step === 'draw' && spread && (
          <div className="animate-fadeIn">
            {/* Question + spread summary */}
            <div className="mb-5 rounded-2xl px-4 py-3" style={{ background: 'rgba(123,108,184,0.08)', border: '1px solid rgba(180,160,240,0.1)' }}>
              <p className="text-xs" style={{ color: 'rgba(180,160,240,0.5)' }}>{question}</p>
              <p className="mt-0.5 text-xs font-medium" style={{ color: 'rgba(200,180,255,0.6)' }}>{spread.name} · {spread.cardCount}张牌</p>
            </div>

            {/* Card positions placeholder / drawn cards */}
            <div className="mb-6">
              {drawnCards.length === 0 ? (
                /* Placeholder positions */
                <div className="flex flex-wrap justify-center gap-4">
                  {spread.positions.map((p, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <CardBack />
                      <span className="text-xs font-medium" style={{ color: 'rgba(180,160,240,0.5)' }}>{p.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                /* Drawn cards */
                <div className="flex flex-wrap justify-center gap-4">
                  {drawnCards.map((dc, i) => (
                    <div key={i} className="flex flex-col items-center gap-2" style={{ perspective: '600px' }}>
                      <div
                        className="transition-all"
                        style={{
                          width: 80, height: 120,
                          transformStyle: 'preserve-3d',
                          transform: dc.flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        {/* Card back */}
                        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                          <CardBack />
                        </div>
                        {/* Card front */}
                        <div
                          className="absolute inset-0 flex flex-col items-center justify-center rounded-xl overflow-hidden"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            background: dc.isReversed
                              ? 'linear-gradient(135deg, #2a1a3e, #1e1035)'
                              : 'linear-gradient(135deg, #1e1540, #2a1f4e)',
                            border: `2px solid ${dc.isReversed ? 'rgba(200,120,160,0.4)' : 'rgba(180,200,240,0.4)'}`,
                            boxShadow: `0 4px 20px ${dc.isReversed ? 'rgba(200,120,160,0.2)' : 'rgba(123,108,184,0.25)'}`,
                          }}
                          onClick={() => setExpandedCard(expandedCard === i ? null : i)}
                        >
                          <img
                            src={getCardImageUrl(dc.card)}
                            alt={dc.card.name}
                            className="h-full w-full object-cover"
                            style={{ transform: dc.isReversed ? 'rotate(180deg)' : 'none' }}
                            loading="lazy"
                          />
                          <div className="absolute bottom-0 left-0 right-0 p-1 text-center" style={{ background: 'linear-gradient(transparent, rgba(15,10,30,0.85))' }}>
                            <p className="text-[0.55rem] font-bold leading-tight" style={{ color: 'rgba(220,200,255,0.9)' }}>
                              {dc.card.name}
                            </p>
                            <span className="text-[0.5rem]" style={{ color: dc.isReversed ? '#d08cbc' : '#9b8ed8' }}>
                              {dc.isReversed ? '逆位' : '正位'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-medium" style={{ color: dc.flipped ? 'rgba(200,180,255,0.7)' : 'rgba(180,160,240,0.5)' }}>{dc.position}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expanded card detail */}
            {expandedCard !== null && drawnCards[expandedCard]?.flipped && (
              <div
                className="mb-5 rounded-2xl p-4 animate-fadeIn"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,160,240,0.12)' }}
                onClick={() => setExpandedCard(null)}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={getCardImageUrl(drawnCards[expandedCard].card)}
                    alt={drawnCards[expandedCard].card.name}
                    className="h-20 w-14 flex-shrink-0 rounded-lg object-cover"
                    style={{ transform: drawnCards[expandedCard].isReversed ? 'rotate(180deg)' : 'none' }}
                    loading="lazy"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: 'rgba(220,200,255,0.9)' }}>
                      {drawnCards[expandedCard].card.name}
                      <span className="ml-2 text-xs font-normal" style={{ color: drawnCards[expandedCard].isReversed ? '#d08cbc' : '#9b8ed8' }}>
                        {drawnCards[expandedCard].isReversed ? '逆位' : '正位'}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: 'rgba(180,160,240,0.5)' }}>
                      {drawnCards[expandedCard].card.nameEn} · {drawnCards[expandedCard].position}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: 'rgba(200,180,255,0.6)' }}>
                      <span className="font-semibold" style={{ color: 'rgba(200,180,255,0.8)' }}>关键词：</span>
                      {drawnCards[expandedCard].isReversed ? drawnCards[expandedCard].card.reversed : drawnCards[expandedCard].card.upright}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: 'rgba(200,180,255,0.6)' }}>
                      {drawnCards[expandedCard].isReversed ? drawnCards[expandedCard].card.reversedDesc : drawnCards[expandedCard].card.uprightDesc}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Draw controls */}
            {drawnCards.length === 0 && (
              <>
                {/* Draw method toggle */}
                <div className="mb-4 flex rounded-full p-[3px]" style={{ background: 'rgba(123,108,184,0.1)' }}>
                  <button
                    onClick={() => setDrawMethod('random')}
                    className="flex-1 rounded-full py-2.5 text-xs font-medium transition"
                    style={{
                      background: drawMethod === 'random' ? 'linear-gradient(135deg, #7b6cb8, #9b8ed8)' : 'transparent',
                      color: drawMethod === 'random' ? '#fff' : 'rgba(180,160,240,0.5)',
                    }}
                  >
                    随机抽牌
                  </button>
                  <button
                    onClick={() => setDrawMethod('number')}
                    className="flex-1 rounded-full py-2.5 text-xs font-medium transition"
                    style={{
                      background: drawMethod === 'number' ? 'linear-gradient(135deg, #7b6cb8, #9b8ed8)' : 'transparent',
                      color: drawMethod === 'number' ? '#fff' : 'rgba(180,160,240,0.5)',
                    }}
                  >
                    数字选牌
                  </button>
                </div>

                {drawMethod === 'random' ? (
                  <button
                    onClick={handleRandomDraw}
                    className="w-full rounded-2xl py-4 text-sm font-semibold transition active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #7b6cb8, #9b8ed8, #5ed8cf)',
                      color: '#fff',
                      boxShadow: '0 4px 24px rgba(123,108,184,0.4)',
                    }}
                  >
                    ✦ 开始抽牌
                  </button>
                ) : (
                  <div>
                    <p className="mb-2 text-xs" style={{ color: 'rgba(180,160,240,0.5)' }}>
                      输入 {spread.cardCount} 个数字（1-78），用逗号分隔
                    </p>
                    <div className="flex gap-2.5">
                      <input
                        value={numberInput}
                        onChange={e => { setNumberInput(e.target.value); setNumberError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleNumberDraw()}
                        placeholder={`例：${Array.from({ length: spread.cardCount }, (_, i) => i * 11 + 7).join(',')}`}
                        className="flex-1 rounded-2xl px-4 py-3 text-sm transition"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: `1px solid ${numberError ? 'rgba(224,80,96,0.4)' : 'rgba(180,160,240,0.15)'}`,
                          color: '#e8e0f8',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={handleNumberDraw}
                        disabled={!numberInput.trim()}
                        className="rounded-2xl px-5 py-3 text-sm font-medium transition disabled:opacity-30"
                        style={{
                          background: 'linear-gradient(135deg, #7b6cb8, #9b8ed8)',
                          color: '#fff',
                        }}
                      >
                        抽牌
                      </button>
                    </div>
                    {numberError && (
                      <p className="mt-2 text-xs" style={{ color: '#e88a8a' }}>{numberError}</p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* After cards are drawn and flipped */}
            {drawnCards.length > 0 && drawnCards.every(c => c.flipped) && !flipping && (
              <div className="animate-fadeIn">
                <button
                  onClick={handleGetReading}
                  className="mt-2 w-full rounded-2xl py-4 text-sm font-semibold transition active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #7b6cb8, #9b8ed8, #5ed8cf)',
                    color: '#fff',
                    boxShadow: '0 4px 24px rgba(123,108,184,0.4)',
                  }}
                >
                  ✦ AI 深度解读
                </button>
                <p className="mt-2 text-center text-xs" style={{ color: 'rgba(180,160,240,0.3)' }}>
                  点击牌面可查看单张牌的基本含义
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 4: Reading ═══ */}
        {step === 'reading' && (
          <div className="animate-fadeIn">
            {/* Question + drawn cards mini display */}
            <div className="mb-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(123,108,184,0.08)', border: '1px solid rgba(180,160,240,0.1)' }}>
              <p className="text-xs" style={{ color: 'rgba(180,160,240,0.5)' }}>{question}</p>
              <div className="mt-2 flex gap-3">
                {drawnCards.map((dc, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="flex h-12 w-9 items-center justify-center rounded-md text-sm"
                      style={{
                        background: dc.isReversed ? 'rgba(200,120,160,0.15)' : 'rgba(123,108,184,0.15)',
                        border: `1px solid ${dc.isReversed ? 'rgba(200,120,160,0.25)' : 'rgba(180,160,240,0.25)'}`,
                      }}
                    >
                      <img
                        src={getCardImageUrl(dc.card)}
                        alt={dc.card.name}
                        className="h-full w-full rounded-sm object-cover"
                        style={{ transform: dc.isReversed ? 'rotate(180deg)' : 'none' }}
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[0.55rem]" style={{ color: 'rgba(180,160,240,0.5)' }}>{dc.position}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reading content */}
            <div
              ref={readingRef}
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(180,160,240,0.1)',
                minHeight: 200,
              }}
            >
              {reading ? (
                <div className="prose-chat tarot-prose">
                  <ReactMarkdown>{reading}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <div className="animate-breathe text-xl">✦</div>
                  <p className="text-xs" style={{ color: 'rgba(180,160,240,0.5)' }}>AI 占卜师正在解读牌面...</p>
                </div>
              )}

              {readingLoading && reading && (
                <div className="mt-2 flex justify-center">
                  <span className="inline-block h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: '#9b8ed8' }} />
                </div>
              )}
            </div>

            {/* Actions after reading */}
            {!readingLoading && reading && (
              <div className="mt-4 flex gap-3 animate-fadeIn">
                <button
                  onClick={handleReset}
                  className="flex-1 rounded-2xl py-3 text-sm font-medium transition"
                  style={{ background: 'rgba(123,108,184,0.12)', color: 'rgba(200,180,255,0.7)', border: '1px solid rgba(180,160,240,0.12)' }}
                >
                  重新占卜
                </button>
              </div>
            )}

            {/* Disclaimer */}
            {!readingLoading && reading && (
              <p className="mt-4 text-center text-[0.65rem]" style={{ color: 'rgba(180,160,240,0.25)' }}>
                ✦ 塔罗占卜仅供参考和娱乐，不应作为重大决策的唯一依据
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tarot-specific prose overrides */}
      <style jsx global>{`
        .tarot-prose { color: rgba(220,200,255,0.75); }
        .tarot-prose h3 { color: rgba(220,200,255,0.95) !important; margin-top: 1.2rem; }
        .tarot-prose strong { color: rgba(200,180,255,0.9) !important; }
        .tarot-prose li::marker { color: rgba(155,142,216,0.6) !important; }
      `}</style>
    </div>
  );
}
