import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: '请输入正确的邮箱地址' }, { status: 400 });
    }

    // Rate limit: 60s per email
    const recent = await prisma.emailCode.findFirst({
      where: { email, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (recent) {
      return Response.json({ error: '请60秒后再试' }, { status: 429 });
    }

    // Daily limit: 10 per email
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await prisma.emailCode.count({
      where: { email, createdAt: { gte: todayStart } },
    });
    if (todayCount >= 10) {
      return Response.json({ error: '今日发送次数已达上限' }, { status: 429 });
    }

    // Generate 4-digit code
    const code = String(Math.floor(1000 + Math.random() * 9000));

    // Save to DB
    await prisma.emailCode.create({
      data: {
        email,
        code,
        expiresAt: new Date(Date.now() + 5 * 60_000), // 5 minutes
      },
    });

    // Send email
    if (resend) {
      await resend.emails.send({
        from: 'Aura <onboarding@resend.dev>',
        to: email,
        subject: `Aura 登录验证码：${code}`,
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #7b6cb8; margin-bottom: 8px;">Aura</h2>
            <p style="color: #666; font-size: 14px;">你的登录验证码是：</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333; margin: 20px 0;">${code}</div>
            <p style="color: #999; font-size: 12px;">验证码 5 分钟内有效，请勿转发给他人。</p>
          </div>
        `,
      });
    } else {
      console.log(`[DEV EMAIL] ${email}: ${code}`);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return Response.json({ error: '发送失败，请稍后重试' }, { status: 500 });
  }
}
