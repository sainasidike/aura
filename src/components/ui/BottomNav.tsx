"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

const tabs = [
  { path: "/fortune", icon: "☽", label: "运势" },
  { path: "/chat", icon: "✦", label: "AI 占星师", isCenter: true },
  { path: "/chart", icon: "◇", label: "工具" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div
        className="mx-auto flex max-w-[420px] items-center justify-around px-2"
        style={{
          height: 60,
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderTop: "1px solid rgba(123,108,184,0.06)",
          boxShadow: "0 -2px 20px rgba(123,108,184,0.04)",
        }}
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.path || pathname.startsWith(tab.path + "/");

          if (tab.isCenter) {
            return (
              <motion.button
                key={tab.path}
                onClick={() => router.push(tab.path)}
                className="relative flex flex-col items-center"
                style={{ marginTop: -26 }}
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  className="relative flex h-[56px] w-[56px] items-center justify-center rounded-full text-[22px] text-white"
                  style={{
                    background: "var(--gradient-primary)",
                    boxShadow: isActive
                      ? "0 4px 24px rgba(123,108,184,0.40), 0 0 0 4px rgba(123,108,184,0.08)"
                      : "0 4px 16px rgba(123,108,184,0.25)",
                    border: "3px solid rgba(255,255,255,0.9)",
                  }}
                  animate={isActive ? { scale: 1.08 } : { scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  {tab.icon}
                </motion.div>
                <span
                  className="mt-1.5 text-[0.6rem] font-semibold tracking-wide"
                  style={{ color: "var(--accent-primary)" }}
                >
                  {tab.label}
                </span>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className="relative flex flex-col items-center gap-1 px-5 py-2"
              style={{ color: isActive ? "var(--accent-primary)" : "var(--text-tertiary)" }}
              whileTap={{ scale: 0.88 }}
            >
              <motion.span
                className="text-xl"
                animate={isActive ? { scale: 1.12, y: -1 } : { scale: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {tab.icon}
              </motion.span>
              <span
                className="text-[0.6rem] tracking-wide"
                style={{ fontWeight: isActive ? 600 : 400 }}
              >
                {tab.label}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  className="absolute -bottom-0.5 h-1 w-1 rounded-full"
                  style={{ background: "var(--accent-primary)" }}
                  layoutId="navDot"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
