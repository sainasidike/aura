"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

const tabs = [
  { path: "/fortune", icon: "☽", label: "运势" },
  { path: "/chat", icon: "✦", label: "AI 占星师", isCenter: true },
  { path: "/chart", icon: "◇", label: "排盘" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div
        className="mx-auto flex max-w-[420px] items-center justify-around px-2 py-2"
        style={{
          height: 56,
          background: "rgba(248,247,252,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid var(--border-subtle)",
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
                style={{ marginTop: -24 }}
                whileTap={{ scale: 0.92 }}
              >
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
                  style={{
                    background: "var(--gradient-primary)",
                    boxShadow: "0 4px 20px rgba(123,108,184,0.35)",
                    border: "3px solid var(--bg-deep)",
                  }}
                  animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  {tab.icon}
                </motion.div>
                <span
                  className="mt-1 text-[0.6rem] font-semibold"
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
              className="flex flex-col items-center gap-1 px-4 py-2"
              style={{ color: isActive ? "var(--accent-primary)" : "var(--text-tertiary)" }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.span
                className="text-xl"
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {tab.icon}
              </motion.span>
              <span
                className="text-[0.6rem] tracking-wide"
                style={{ fontWeight: isActive ? 600 : 400 }}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
