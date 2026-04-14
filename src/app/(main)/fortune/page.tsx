"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getProfiles, type StoredProfile } from "@/lib/storage";
import { getGlossaryEntry } from "@/lib/astrology-glossary";
import PersonSelector from "@/components/ui/PersonSelector";
import Link from "next/link";

const PERIODS = [
  { key: "daily", label: "日运", icon: "☀", basis: "行运盘", desc: "今日星象对你的影响" },
  { key: "weekly", label: "周运", icon: "✦", basis: "行运盘", desc: "本周整体运势走向" },
  { key: "monthly", label: "月运", icon: "☽", basis: "月返盘", desc: "本月情感与生活主题" },
  { key: "yearly", label: "年运", icon: "✧", basis: "日返盘", desc: "年度核心运势方向" },
];

const CATEGORIES = [
  { key: "love", marker: "LOVE", label: "爱情", color: "#e8668a", icon: "♥", gradient: "linear-gradient(135deg, rgba(232,102,138,0.10), rgba(232,102,138,0.03))" },
  { key: "career", marker: "CAREER", label: "事业", color: "#5b8def", icon: "◆", gradient: "linear-gradient(135deg, rgba(91,141,239,0.10), rgba(91,141,239,0.03))" },
  { key: "health", marker: "HEALTH", label: "健康", color: "#4bc9a0", icon: "✦", gradient: "linear-gradient(135deg, rgba(75,201,160,0.10), rgba(75,201,160,0.03))" },
  { key: "study", marker: "STUDY", label: "学习", color: "#f0b429", icon: "◈", gradient: "linear-gradient(135deg, rgba(240,180,41,0.10), rgba(240,180,41,0.03))" },
  { key: "social", marker: "SOCIAL", label: "人际", color: "#9b6cb8", icon: "✧", gradient: "linear-gradient(135deg, rgba(155,108,184,0.10), rgba(155,108,184,0.03))" },
];

interface FortuneData {
  date: string;
  period: string;
  chartType?: 'transit' | 'solar_return' | 'lunar_return';
  overall_score: number;
  categories: Record<string, { score: number; aspects: { transit: string; natal: string; type: string; nature: string; orb: number }[] }>;
}

/** 根据周期生成缓存粒度 key */
function periodCacheKey(period: string, dateStr: string): string {
  const d = new Date(dateStr);
  switch (period) {
    case 'weekly': {
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${week}`;
    }
    case 'monthly': return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    case 'yearly': return `${d.getFullYear()}`;
    default: return dateStr; // daily
  }
}

const NATURE_STYLE: Record<string, { bg: string; text: string }> = {
  "和谐": { bg: "rgba(75,201,160,0.12)", text: "#2da89e" },
  "紧张": { bg: "rgba(232,93,93,0.12)", text: "#e85d5d" },
  "融合": { bg: "rgba(123,108,184,0.12)", text: "#7b6cb8" },
  "对立": { bg: "rgba(232,138,102,0.12)", text: "#e88a66" },
};

function parseInterpretations(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const keys = ["LOVE", "CAREER", "HEALTH", "STUDY", "SOCIAL"];
  for (let i = 0; i < keys.length; i++) {
    const marker = `---${keys[i]}---`;
    const startIdx = text.indexOf(marker);
    if (startIdx === -1) continue;
    const contentStart = startIdx + marker.length;
    let endIdx = text.length;
    for (let j = i + 1; j < keys.length; j++) {
      const nextMarker = `---${keys[j]}---`;
      const nextIdx = text.indexOf(nextMarker);
      if (nextIdx !== -1) { endIdx = nextIdx; break; }
    }
    result[keys[i].toLowerCase()] = text.slice(contentStart, endIdx).trim();
  }
  return result;
}

function InterpretationText({ text }: { text: string }) {
  // Merge all lines into a single continuous paragraph
  const merged = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.replace(/\*\*/g, ""))
    .join(" ");

  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{
        background: "rgba(123,108,184,0.04)",
        borderLeft: "3px solid var(--accent-primary)",
      }}
    >
      <p
        className="text-[0.8rem] leading-7"
        style={{ color: "var(--text-secondary)", fontFamily: "var(--font-cn-body)" }}
      >
        {merged}
      </p>
    </div>
  );
}

export default function FortunePage() {
  const [persons, setPersons] = useState<StoredProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [period, setPeriod] = useState<string | null>("daily");
  const [fortune, setFortune] = useState<FortuneData | null>(null);
  const [loading, setLoading] = useState(false);
  const [interpretations, setInterpretations] = useState<Record<string, string>>({});
  const [interpreting, setInterpreting] = useState(false);
  const [interpretDone, setInterpretDone] = useState(false);
  const [aspectPopup, setAspectPopup] = useState<{ transit: string; natal: string; type: string; nature: string; orb: number; rect: DOMRect } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  useEffect(() => {
    const ps = getProfiles();
    setPersons(ps);
    if (ps.length > 0) setActiveId(ps[0].id);
  }, []);

  const activePerson = persons.find(p => p.id === activeId) ?? null;

  // 切换档案时重置所有状态
  useEffect(() => {
    setFortune(null);
    setInterpretations({});
    setInterpretDone(false);
    abortRef.current?.abort();
  }, [activeId]);

  const now = new Date();
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    const dayOfWeek = now.getDay() || 7;
    d.setDate(now.getDate() - dayOfWeek + 1 + i);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(now);
  const dayNames = ["一", "二", "三", "四", "五", "六", "日"];
  const dateStr = selectedDate.toISOString().slice(0, 10);

  // 切换运势类型
  const handlePeriodChange = useCallback((newPeriod: string) => {
    abortRef.current?.abort();
    setFortune(null);
    setInterpretations({});
    setInterpretDone(false);
    setPeriod(newPeriod);
  }, []);

  const fetchFortune = useCallback(async () => {
    if (!activePerson || !period) return;
    const pck = periodCacheKey(period, dateStr);
    const cacheKey = `fortune_${activePerson.id}_${period}_${pck}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setFortune(JSON.parse(cached)); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: activePerson.year, month: activePerson.month, day: activePerson.day,
          hour: activePerson.hour, minute: activePerson.minute,
          gender: activePerson.gender, longitude: activePerson.longitude,
          latitude: activePerson.latitude, timezone: activePerson.timezone,
          period, targetDate: dateStr,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFortune(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [activePerson, period, dateStr]);

  useEffect(() => { fetchFortune(); }, [fetchFortune]);

  // AI 解读（fortune 数据就绪后自动触发）
  useEffect(() => {
    if (!fortune || !activePerson || !period) return;
    const pck = periodCacheKey(period, dateStr);
    const interpKey = `interp_${activePerson.id}_${period}_${pck}`;
    const cached = localStorage.getItem(interpKey);
    if (cached) {
      try { setInterpretations(JSON.parse(cached)); setInterpretDone(true); return; } catch { /* ignore */ }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setInterpreting(true);
    setInterpretDone(false);
    setInterpretations({});

    (async () => {
      try {
        const res = await fetch('/api/fortune/interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: activePerson.year, month: activePerson.month, day: activePerson.day,
            hour: activePerson.hour, minute: activePerson.minute,
            gender: activePerson.gender, longitude: activePerson.longitude,
            latitude: activePerson.latitude, timezone: activePerson.timezone,
            period, targetDate: dateStr,
          }),
          signal: controller.signal,
        });

        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let buffer = '';
        let rawText = '';

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
              if (parsed.content) {
                rawText += parsed.content;
                setInterpretations(parseInterpretations(rawText));
              }
            } catch { /* skip */ }
          }
        }

        const final = parseInterpretations(rawText);
        if (Object.keys(final).length > 0) {
          localStorage.setItem(interpKey, JSON.stringify(final));
        }
        setInterpretDone(true);
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== 'AbortError') console.error(e);
      } finally {
        setInterpreting(false);
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fortune, activePerson?.id, period, dateStr]);

  const dateLabel =
    period === "daily" ? `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`
    : period === "weekly" ? `${now.getFullYear()}年第${Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)}周`
    : period === "monthly" ? `${now.getFullYear()}年${now.getMonth() + 1}月`
    : period === "yearly" ? `${now.getFullYear()}年`
    : '';

  if (!activePerson) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-4 gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl text-3xl" style={{ background: 'var(--accent-primary-dim)' }}>☽</div>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>请先添加个人档案</p>
        <Link
          href="/profile"
          className="rounded-full px-6 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 16px rgba(123,108,184,0.25)" }}
        >
          创建档案
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-24 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-light gradient-text" style={{ fontFamily: "var(--font-display)" }}>
          ☽ 运势解读
        </h1>
        <motion.button
          onClick={() => router.push("/profile")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs"
          style={{
            background: "var(--bg-base)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-tertiary)",
            boxShadow: "var(--shadow-sm)",
          }}
          whileTap={{ scale: 0.9 }}
        >
          👤
        </motion.button>
      </div>

      {/* Person selector */}
      <PersonSelector
        persons={persons}
        activeId={activeId}
        onSelect={setActiveId}
        onAdd={() => router.push("/profile?showForm=true")}
      />

      {/* ─── 运势内容 ─── */}
      {period && (
        <>
          {/* Period tabs */}
          <div
            className="mb-4 inline-flex self-start rounded-full p-[3px]"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            {PERIODS.map((p) => (
              <motion.button
                key={p.key}
                onClick={() => handlePeriodChange(p.key)}
                className="rounded-full px-4 py-2 text-xs font-medium"
                style={{
                  background: period === p.key ? "var(--gradient-primary)" : "transparent",
                  color: period === p.key ? "white" : "var(--text-tertiary)",
                  boxShadow: period === p.key ? "0 2px 8px rgba(123,108,184,0.20)" : "none",
                }}
                whileTap={{ scale: 0.95 }}
              >
                {p.label}
              </motion.button>
            ))}
          </div>

          {/* Date selector (daily mode) */}
          <AnimatePresence>
            {period === "daily" && (
              <motion.div
                className="mb-5 flex gap-1.5"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                {weekDates.map((d, i) => {
                  const isToday = d.toDateString() === now.toDateString();
                  const isSelected = d.toDateString() === selectedDate.toDateString();
                  return (
                    <motion.button
                      key={i}
                      onClick={() => setSelectedDate(d)}
                      className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5"
                      style={{
                        background: isSelected ? "var(--gradient-primary)" : "var(--bg-surface)",
                        border: `1px solid ${isSelected ? "transparent" : "var(--border-subtle)"}`,
                        boxShadow: isSelected ? "0 4px 12px rgba(123,108,184,0.20)" : "none",
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="text-[0.6rem] font-medium" style={{ color: isSelected ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)" }}>{dayNames[i]}</span>
                      <span className="text-sm font-semibold" style={{ color: isSelected ? "white" : "var(--text-primary)" }}>{d.getDate()}</span>
                      {isToday && !isSelected && <div className="h-1 w-1 rounded-full" style={{ background: "var(--accent-primary)" }} />}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Date label + chart type */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{dateLabel}</span>
            {fortune?.chartType && (
              <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-medium" style={{ background: "var(--accent-primary-dim)", color: "var(--accent-primary)" }}>
                {fortune.chartType === 'transit' ? '行运盘' : fortune.chartType === 'solar_return' ? '日返盘' : '月返盘'}
              </span>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <motion.div
              className="flex flex-1 flex-col items-center justify-center gap-3 py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="animate-breathe">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg" style={{ background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)' }}>☽</div>
              </div>
              <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>正在计算运势...</span>
            </motion.div>
          )}

          {/* Fortune content */}
          {!loading && fortune && (
            <div className="space-y-5">
              {/* Overall score + bar chart */}
              <motion.div
                className="flex items-center gap-6 rounded-2xl p-5"
                style={{
                  background: "var(--gradient-card)",
                  border: "1px solid var(--border-subtle)",
                  boxShadow: "var(--shadow-md)",
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex flex-col items-center">
                  <motion.span
                    className="text-5xl font-bold gradient-text"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                  >
                    {fortune.overall_score}
                  </motion.span>
                  <span className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>综合分</span>
                </div>
                <div className="flex flex-1 items-end justify-around gap-2">
                  {CATEGORIES.map((cat, idx) => {
                    const score = fortune.categories[cat.key]?.score ?? 50;
                    return (
                      <div key={cat.key} className="flex flex-col items-center gap-1">
                        <span className="text-[0.6rem] font-bold" style={{ color: cat.color }}>{score}</span>
                        <motion.div
                          className="w-7 rounded-md"
                          style={{ background: `linear-gradient(180deg, ${cat.color}, ${cat.color}88)` }}
                          initial={{ height: 0 }}
                          animate={{ height: (score / 100) * 60 }}
                          transition={{ duration: 0.6, delay: 0.1 + idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                        />
                        <span className="text-[0.55rem] font-medium" style={{ color: "var(--text-tertiary)" }}>{cat.label}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Category detail cards */}
              {CATEGORIES.map((cat, idx) => {
                const data = fortune.categories[cat.key];
                if (!data) return null;
                const interp = interpretations[cat.key] || "";
                const hasContent = interp.length > 0;
                const isWaiting = interpreting && !hasContent;

                return (
                  <motion.div
                    key={cat.key}
                    className="overflow-hidden rounded-2xl"
                    style={{
                      background: "var(--bg-base)",
                      border: "1px solid var(--border-subtle)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06, duration: 0.35 }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: cat.gradient }}>
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                        style={{ background: `${cat.color}18`, color: cat.color }}
                      >
                        {cat.icon}
                      </div>
                      <span className="flex-1 text-sm font-bold" style={{ color: "var(--text-primary)" }}>{cat.label}运势</span>
                      <div className="flex items-center gap-1 rounded-full px-3 py-1" style={{ background: `${cat.color}12` }}>
                        <span className="text-sm font-bold" style={{ color: cat.color }}>{data.score}</span>
                        <span className="text-[0.6rem]" style={{ color: cat.color, opacity: 0.7 }}>分</span>
                      </div>
                    </div>

                    {data.aspects && data.aspects.length > 0 && (
                      <div className="px-4 pt-3">
                        <div className="mb-2 text-[0.65rem] font-semibold tracking-wide" style={{ color: "var(--text-tertiary)" }}>
                          {fortune.chartType === 'solar_return' ? '日返盘相位' : fortune.chartType === 'lunar_return' ? '月返盘相位' : '行运相位影响'}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {data.aspects.map((asp, i) => {
                            const ns = NATURE_STYLE[asp.nature] || { bg: "rgba(128,128,128,0.08)", text: "#888" };
                            return (
                              <button key={i}
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6rem] font-medium transition active:scale-95"
                                style={{ background: ns.bg, color: ns.text, border: 'none', cursor: 'pointer' }}
                                onClick={(e) => {
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setAspectPopup({ transit: asp.transit, natal: asp.natal, type: asp.type, nature: asp.nature, orb: asp.orb, rect });
                                }}
                              >
                                <span>{asp.transit}</span>
                                <span className="font-bold">{asp.type}</span>
                                <span>{asp.natal}</span>
                                <span className="opacity-50">{asp.orb}°</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="px-4 pb-4 pt-3">
                      {hasContent ? (
                        <InterpretationText text={interp} />
                      ) : isWaiting ? (
                        <div
                          className="flex items-center gap-2 rounded-xl py-4 px-3 animate-shimmer"
                          style={{ background: "rgba(123,108,184,0.04)" }}
                        >
                          <span className="text-xs" style={{ color: "var(--accent-primary)" }}>✨ AI 正在生成{cat.label}运势解读...</span>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}

              {interpretDone && (
                <motion.p className="text-center text-[0.65rem] py-3" style={{ color: "var(--text-tertiary)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  以上解读基于占星学和命理学传统，仅供参考和娱乐
                </motion.p>
              )}
            </div>
          )}

          {!loading && !fortune && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>运势数据加载失败</p>
              <motion.button
                onClick={fetchFortune}
                className="rounded-full px-6 py-2.5 text-xs font-semibold text-white"
                style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 16px rgba(123,108,184,0.25)" }}
                whileTap={{ scale: 0.95 }}
              >
                重试
              </motion.button>
            </div>
          )}
        </>
      )}

      {/* 行运相位解释弹窗 */}
      <TransitAspectPopup data={aspectPopup} onClose={() => setAspectPopup(null)} />
    </div>
  );
}

// ── 行运相位解释弹窗组件 ──

function TransitAspectPopup({ data, onClose }: {
  data: { transit: string; natal: string; type: string; nature: string; orb: number; rect: DOMRect } | null;
  onClose: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!data) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [data, onClose]);

  useEffect(() => {
    if (!data) { setPos({}); return; }
    const raf = requestAnimationFrame(() => {
      const popup = popupRef.current;
      const popupHeight = popup?.offsetHeight || 300;
      const popupWidth = Math.min(340, window.innerWidth - 24);
      const margin = 12;
      let left = data.rect.left + data.rect.width / 2 - popupWidth / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));
      const spaceBelow = window.innerHeight - data.rect.bottom;
      let top: number;
      if (spaceBelow >= popupHeight + margin) {
        top = data.rect.bottom + margin;
      } else if (data.rect.top >= popupHeight + margin) {
        top = data.rect.top - popupHeight - margin;
      } else {
        top = Math.max(margin, window.innerHeight - popupHeight - margin);
      }
      setPos({ position: 'fixed' as const, top: `${top}px`, left: `${left}px`, width: `${popupWidth}px` });
    });
    return () => cancelAnimationFrame(raf);
  }, [data]);

  if (!data) return null;

  const transitPlanet = data.transit.replace(/^行运/, '');
  const natalPlanet = data.natal.replace(/^本命/, '');
  const transitEntry = getGlossaryEntry(transitPlanet);
  const natalEntry = getGlossaryEntry(natalPlanet);
  const aspectEntry = getGlossaryEntry(data.type);

  const ns = NATURE_STYLE[data.nature] || { bg: 'rgba(128,128,128,0.08)', text: '#888' };
  const natureLabel = data.nature === '和谐' ? '和谐相位，带来助力与顺畅' : data.nature === '紧张' ? '紧张相位，带来挑战与成长动力' : data.nature === '融合' ? '融合相位，能量合一强化' : '对立相位，需要平衡与整合';

  return (
    <div className="fixed inset-0 animate-fadeIn" style={{ zIndex: 300, background: 'rgba(0,0,0,0.2)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={popupRef} style={{
        ...pos, maxWidth: 340, borderRadius: 16,
        background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.25)', padding: '16px 18px 14px',
        visibility: pos.top ? 'visible' : 'hidden',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{data.transit}</span>
          <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: ns.bg, color: ns.text }}>{data.type}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{data.natal}</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>容许度 {data.orb}°</span>
        </div>

        <div className="rounded-xl px-3 py-2 mb-3" style={{ background: ns.bg }}>
          <p style={{ fontSize: 12, color: ns.text, fontWeight: 600, margin: 0 }}>
            {data.nature} · {natureLabel}
          </p>
          {aspectEntry && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0', lineHeight: 1.5 }}>
              {aspectEntry.brief}
            </p>
          )}
        </div>

        {transitEntry && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{transitEntry.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>行运{transitEntry.term}</span>
              <span className="rounded-full px-2 py-0.5 text-[0.6rem]" style={{ background: '#c084fc18', color: '#c084fc' }}>行星</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.55 }}>{transitEntry.brief}</p>
          </div>
        )}

        {natalEntry && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{natalEntry.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>本命{natalEntry.term}</span>
              <span className="rounded-full px-2 py-0.5 text-[0.6rem]" style={{ background: '#c084fc18', color: '#c084fc' }}>行星</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.55 }}>{natalEntry.brief}</p>
          </div>
        )}
      </div>
    </div>
  );
}
