import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Simple password protection
  const password = request.headers.get('x-admin-password');
  if (password !== (process.env.ADMIN_PASSWORD || 'aura2026')) {
    return Response.json({ error: '无权访问' }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000);

  const [
    totalUsers,
    todayNewUsers,
    todayLogins,
    weekLogins,
    recentUsers,
    dailyStats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.loginLog.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.loginLog.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        nickname: true,
        createdAt: true,
        _count: { select: { profiles: true } },
      },
    }),
    // Daily new users for last 7 days
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE(created_at AT TIME ZONE 'Asia/Shanghai') as date, COUNT(*) as count
      FROM users
      WHERE created_at >= ${weekAgo}
      GROUP BY DATE(created_at AT TIME ZONE 'Asia/Shanghai')
      ORDER BY date DESC
    `,
  ]);

  return Response.json({
    totalUsers,
    todayNewUsers,
    todayLogins,
    weekLogins,
    dailyStats: dailyStats.map((d: { date: string; count: bigint }) => ({
      date: String(d.date),
      count: Number(d.count),
    })),
    recentUsers: recentUsers.map((u: typeof recentUsers[number]) => ({
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      createdAt: u.createdAt.toISOString(),
      profileCount: u._count.profiles,
    })),
  });
}
