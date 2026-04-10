"use client";

import { motion } from "framer-motion";
import type { StoredProfile } from "@/lib/storage";

interface Props {
  persons: StoredProfile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export default function PersonSelector({ persons, activeId, onSelect, onAdd }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
      {persons.map((p) => {
        const isActive = p.id === activeId;
        return (
          <motion.button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm"
            style={{
              background: isActive
                ? "linear-gradient(135deg, rgba(123,108,184,0.10), rgba(58,191,182,0.06))"
                : "var(--bg-base)",
              border: `1px solid ${isActive ? "var(--accent-primary)" : "var(--border-subtle)"}`,
              color: isActive ? "var(--accent-primary)" : "var(--text-primary)",
              boxShadow: isActive ? "0 2px 12px rgba(123,108,184,0.12)" : "var(--shadow-sm)",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[0.7rem] text-white"
              style={{ background: "var(--gradient-primary)" }}
            >
              {p.name[0]}
            </div>
            <span>{p.name}</span>
          </motion.button>
        );
      })}
      <motion.button
        onClick={onAdd}
        className="flex shrink-0 items-center gap-1 rounded-full border border-dashed px-4 py-2 text-sm"
        style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}
        whileTap={{ scale: 0.95 }}
      >
        + 添加
      </motion.button>
    </div>
  );
}
