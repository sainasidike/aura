import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return Response.json({ error: '请输入邮箱和验证码' }, { status: 400 });
    }

    // Dev mode: accept "1234" when no Resend key configured
    const isDevBypass = !process.env.RESEND_API_KEY && code === '1234';

    if (!isDevBypass) {
      const emailCode = await prisma.emailCode.findFirst({
        where: {
          email,
          code,
          used: false,
          expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!emailCode) {
        return Response.json({ error: '验证码错误或已过期' }, { status: 400 });
      }

      await prisma.emailCode.update({
        where: { id: emailCode.id },
        data: { used: true },
      });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          nickname: email.split('@')[0],
        },
      });
    }

    // Log login
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const userAgent = request.headers.get('user-agent') || null;
    await prisma.loginLog.create({
      data: { userId: user.id, ip, userAgent },
    });

    // Create JWT and set cookie
    const token = await createToken(user.id);
    await setAuthCookie(token);

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    });
  } catch (error) {
    console.error('Email verify error:', error);
    return Response.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}
