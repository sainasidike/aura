"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getProfiles, type StoredProfile } from "@/lib/storage";
import PersonSelector from "@/components/ui/PersonSelector";
import Link from "next/link";

const PERIODS = [
  { key: "daily", label: "日" },
  { key: "weekly", label: "周" },
  { key: "monthly", label: "月" },
  { key: "yearly", label: "年" },
];

const CATEGORIES = [
  { key: "love", marker: "LOVE", label: "爱情", color: "#e8668a", icon: "♥", gradient: "linear-gradient(135deg, rgba(232,102,138,0.08), rgba(232,102,138,0.02))" },
  { key: "career", marker: "CAREER", label: "事业", color: "#5b8def", icon: "◆", gradient: "linear-gradient(135deg, rgba(91,141,239,0.08), rgba(91,141,239,0.02))" },
  { key: "health", marker: "HEALTH", label: "健康", color: "#4bc9a0", icon: "✦", gradient: "linear-gradient(135deg, rgba(75,201,160,0.08), rgba(75,201,160,0.02))" },
  { key: "study", marker: "STUDY", label: "学习", color: "#f0b429", icon: "◈", gradient: "linear-gradient(135deg, rgba(240,180,41,0.08), rgba(240,180,41,0.02))" },
  { key: "social", marker: "SOCIAL", label: "人际", color: "#9b6cb8", icon: "✧", gradient: "linear-gradient(135deg, rgba(155,108,184,0.08), rgba(155,108,184,0.02))" },
];

interface FortuneData {
  date: string;
  period: string;
  overall_score: number;
  categories: Record<string, { score: number; aspects: { transit: string; natal: string; type: string; nature: string; orb: number }[] }>;
}

const NATURE_STYLE: Record<string, { bg: string; text: string }> = {
  "和谐": { bg: "rgba(75,201,160,0.15)", text: "#2da89e" },
  "紧张": { bg: "rgba(232,93,93,0.15)", text: "#e85d5d" },
  "融合": { bg: "rgba(123,108,184,0.15)", text: "#7b6cb8" },
  "对立": { bg: "rgba(232,138,102,0.15)", text: "#e88a66" },
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
  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          return <h4 key={i} className="mt-3 text-[0.8rem] font-bold" style={{ color: "var(--text-primary)" }}>{trimmed.replace(/\*\*/g, "")}</h4>;
        }
        if (trimmed.startsWith("📌")) {
          return <div key={i} className="mt-3 rounded-lg px-3 py-2" style={{ background: "rgba(123,108,184,0.06)", borderLeft: "3px solid var(--accent-primary)" }}><span className="text-xs font-bold" style={{ color: "var(--accent-primary)" }}>{trimmed.replace(/\*\*/g, "")}</span></div>;
        }
        if (trimmed.startsWith("💡")) {
          return <div key={i} className="mt-3 rounded-lg px-3 py-2" style={{ background: "rgba(75,201,160,0.06)", borderLeft: "3px solid #4bc9a0" }}><span className="text-xs font-bold" style={{ color: "#4bc9a0" }}>{trimmed.replace(/\*\*/g, "")}</span></div>;
        }
        if (trimmed.startsWith("⚠️")) {
          return <div key={i} className="mt-3 rounded-lg px-3 py-2" style={{ background: "rgba(232,93,93,0.06)", borderLeft: "3px solid #e85d5d" }}><span className="text-xs font-bold" style={{ color: "#e85d5d" }}>{trimmed.replace(/\*\*/g, "")}</span></div>;
        }
        if (trimmed.startsWith("- ")) {
          return (
            <div key={i} className="flex gap-2 pl-3">
              <span className="mt-0.5 text-[0.6rem]" style={{ color: "var(--text-tertiary)" }}>•</span>
              <p className="flex-1 text-[0.8rem] leading-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-cn-body)" }}>{trimmed.slice(2)}</p>
            </div>
          );
        }
        return <p key={i} className="text-[0.8rem] leading-7" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-cn-body)" }}>{trimmed.replace(/\*\*/g, "")}</p>;
      })}
    </div>
  );
}

export default function FortunePage() {
  const [persons, setPersons] = useState<StoredProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [period, setPeriod] = useState("daily");
  const [fortune, setFortune] = useState<FortuneData | null>(null);
  const [loading, setLoading] = useState(false);
  const [interpretations, setInterpretations] = useState<Record<string, string>>({});
  const [interpreting, setInterpreting] = useState(false);
  const [interpretDone, setInterpretDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  useEffect(() => {
    const ps = getProfiles();
    setPersons(ps);
    if (ps.length > 0) setActiveId(ps[0].id);
  }, []);

  const activePerson = persons.find(p => p.id === activeId) ?? null;

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

  const fetchFortune = useCallback(async () => {
    if (!activePerson) return;
    const cacheKey = `fortune_${activePerson.id}_${period}_${dateStr}`;
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

  // AI 解读
  useEffect(() => {
    if (!fortune || !activePerson) return;
    const interpKey = `interp_${activePerson.id}_${period}_${dateStr}`;
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
    : `${now.getFullYear()}年`;

  if (!activePerson) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-4 gap-4">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>请先添加个人档案</p>
        <Link
          href="/profile"
          className="rounded-full px-6 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--gradient-primary)" }}
        >
          创建档案
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-6 pb-24 pt-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-light gradient-text" style={{ fontFamily: "var(--font-display)" }}>
          ☽ 运势解读
        </h1>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => router.push("/profile")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}
            whileTap={{ scale: 0.9 }}
          >
            👤
          </motion.button>
        </div>
      </div>

      {/* Person selector */}
      <PersonSelector
        persons={persons}
        activeId={activeId}
        onSelect={setActiveId}
        onAdd={() => router.push("/profile?showForm=true")}
      />

      {/* Period tabs */}
      <div
        className="mb-4 inline-flex self-start rounded-full p-[3px]"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
      >
        {PERIODS.map((p) => (
          <motion.button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className="rounded-full px-5 py-2 text-xs font-medium"
            style={{
              background: period === p.key ? "var(--gradient-primary)" : "transparent",
              color: period === p.key ? "white" : "var(--text-tertiary)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            {p.label}
          </motion.button>
        ))}
      </div>

      {/* Date selector (daily mode) */}
      {period === "daily" && (
        <div className="mb-5 flex gap-1.5">
          {weekDates.map((d, i) => {
            const isToday = d.toDateString() === now.toDateString();
            const isSelected = d.toDateString() === selectedDate.toDateString();
            return (
              <motion.button
                key={i}
                onClick={() => setSelectedDate(d)}
                className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2"
                style={{
                  background: isSelected ? "var(--gradient-primary)" : "var(--bg-surface)",
                  border: `1px solid ${isSelected ? "transparent" : "var(--border-subtle)"}`,
                }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-[0.6rem]" style={{ color: isSelected ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)" }}>{dayNames[i]}</span>
                <span className="text-sm font-semibold" style={{ color: isSelected ? "white" : "var(--text-primary)" }}>{d.getDate()}</span>
                {isToday && !isSelected && <div className="h-1 w-1 rounded-full" style={{ background: "var(--accent-primary)" }} />}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Date label */}
      <div className="mb-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{dateLabel}</div>

      {/* Loading */}
      {loading && (
        <motion.div className="flex flex-1 items-center justify-center py-20" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <span className="text-sm gradient-text">正在计算运势...</span>
        </motion.div>
      )}

      {/* Fortune content */}
      {!loading && fortune && (
        <div className="space-y-5">
          {/* Overall score + bar chart */}
          <div
            className="flex items-center gap-6 rounded-2xl p-5"
            style={{ background: "var(--gradient-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-card)" }}
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
              {CATEGORIES.map((cat) => {
                const score = fortune.categories[cat.key]?.score ?? 50;
                return (
                  <div key={cat.key} className="flex flex-col items-center gap-1">
                    <span className="text-[0.6rem] font-semibold" style={{ color: cat.color }}>{score}</span>
                    <motion.div
                      className="w-6 rounded-t-md"
                      style={{ background: cat.color, opacity: 0.8 }}
                      initial={{ height: 0 }}
                      animate={{ height: (score / 100) * 60 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    />
                    <span className="text-[0.55rem]" style={{ color: "var(--text-tertiary)" }}>{cat.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

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
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-sm)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <div className="flex items-center gap-3 px-4 py-3" style={{ background: cat.gradient }}>
                  <span style={{ color: cat.color, fontSize: "18px" }}>{cat.icon}</span>
                  <span className="flex-1 text-sm font-bold" style={{ color: "var(--text-primary)" }}>{cat.label}运势</span>
                  <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: `${cat.color}15` }}>
                    <span className="text-sm font-bold" style={{ color: cat.color }}>{data.score}</span>
                    <span className="text-[0.6rem]" style={{ color: cat.color, opacity: 0.7 }}>分</span>
                  </div>
                </div>

                {data.aspects && data.aspects.length > 0 && (
                  <div className="px-4 pt-3">
                    <div className="mb-2 text-[0.65rem] font-semibold" style={{ color: "var(--text-tertiary)" }}>行运相位影响</div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.aspects.map((asp, i) => {
                        const ns = NATURE_STYLE[asp.nature] || { bg: "rgba(128,128,128,0.1)", text: "#888" };
                        return (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6rem] font-medium" style={{ background: ns.bg, color: ns.text }}>
                            <span>{asp.transit}</span>
                            <span className="font-bold">{asp.type}</span>
                            <span>{asp.natal}</span>
                            <span className="opacity-60">{asp.orb}°</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="px-4 pb-4 pt-3">
                  {hasContent ? (
                    <InterpretationText text={interp} />
                  ) : isWaiting ? (
                    <motion.div
                      className="flex items-center gap-2 rounded-xl py-4 px-3"
                      style={{ background: "rgba(123,108,184,0.04)" }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <span className="text-xs" style={{ color: "var(--accent-primary)" }}>✨ AI 正在生成{cat.label}运势解读...</span>
                    </motion.div>
                  ) : null}
                </div>
              </motion.div>
            );
          })}

          {interpretDone && (
            <motion.p className="text-center text-[0.65rem] py-2" style={{ color: "var(--text-tertiary)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              以上解读基于占星学和命理学传统，仅供参考和娱乐
            </motion.p>
          )}
        </div>
      )}

      {!loading && !fortune && persons.length > 0 && (
        <div className="flex flex-1 flex-col items-center justify-center py-20">
          <p className="mb-3 text-sm" style={{ color: "var(--text-tertiary)" }}>运势数据加载失败</p>
          <motion.button onClick={fetchFortune} className="rounded-full px-5 py-2 text-xs font-semibold text-white" style={{ background: "var(--gradient-primary)" }} whileTap={{ scale: 0.95 }}>
            重试
          </motion.button>
        </div>
      )}
    </div>
  );
}
