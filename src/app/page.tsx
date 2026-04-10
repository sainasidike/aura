import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-12 text-center">
        <h1 className="mb-2 text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-purple-400 via-pink-300 to-amber-300 bg-clip-text text-transparent">
            Aura
          </span>
        </h1>
        <p className="text-lg text-purple-200/70">AI 命理 · 洞见未来</p>
      </div>

      <div className="grid w-full max-w-md gap-4">
        <Link
          href="/chart"
          className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-purple-400/30 hover:bg-white/10"
        >
          <h2 className="mb-1 text-xl font-semibold text-purple-200 group-hover:text-purple-100">
            排盘分析
          </h2>
          <p className="text-sm text-purple-300/60">
            八字四柱 · 紫微斗数 · 西洋星盘
          </p>
        </Link>

        <Link
          href="/chat"
          className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-purple-400/30 hover:bg-white/10"
        >
          <h2 className="mb-1 text-xl font-semibold text-purple-200 group-hover:text-purple-100">
            AI 对话
          </h2>
          <p className="text-sm text-purple-300/60">
            与 AI 命理师深度交流
          </p>
        </Link>

        <Link
          href="/profile"
          className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-purple-400/30 hover:bg-white/10"
        >
          <h2 className="mb-1 text-xl font-semibold text-purple-200 group-hover:text-purple-100">
            个人档案
          </h2>
          <p className="text-sm text-purple-300/60">
            管理出生信息 · 多档案支持
          </p>
        </Link>
      </div>

      <p className="mt-16 text-xs text-purple-300/30">
        命理分析仅供参考和娱乐
      </p>
    </div>
  );
}
