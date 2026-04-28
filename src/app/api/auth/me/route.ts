import { getAuthUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return Response.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, nickname: true },
  });

  if (!user) {
    return Response.json({ user: null }, { status: 401 });
  }

  return Response.json({ user });
}
