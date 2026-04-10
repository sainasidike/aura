import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const profiles = await prisma.profile.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return Response.json(profiles);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, gender, year, month, day, hour, minute, city, longitude, latitude, timezone } = body;

  if (!name || !gender || !year || !month || !day || hour === undefined || !city) {
    return Response.json({ error: '缺少必要信息' }, { status: 400 });
  }

  // 如果是第一个档案，设为默认
  const count = await prisma.profile.count();

  const profile = await prisma.profile.create({
    data: {
      name, gender,
      year, month, day, hour,
      minute: minute ?? 0,
      city,
      longitude: longitude ?? 116.40,
      latitude: latitude ?? 39.90,
      timezone: timezone ?? 'Asia/Shanghai',
      isDefault: count === 0,
    },
  });

  return Response.json(profile, { status: 201 });
}
