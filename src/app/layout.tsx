import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura - AI 命理",
  description: "AI 驱动的中国传统命理分析 — 八字、紫微斗数、西洋星盘",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
