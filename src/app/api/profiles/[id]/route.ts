import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.profile.delete({ where: { id } });
  return Response.json({ ok: true });
}
