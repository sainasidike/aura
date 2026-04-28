'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (step === 'code') codeInputRef.current?.focus();
  }, [step]);

  const sendCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入正确的邮箱地址');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('code');
      setCountdown(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (code.length !== 4) {
      setError('请输入4位验证码');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('aura_user', JSON.stringify(data.user));
      router.replace('/fortune');
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setCode(clean);
  };

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isCodeValid = code.length === 4;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-12 text-center">
          <div className="mb-3 text-4xl font-light" style={{ fontFamily: 'var(--font-display)' }}>
            <span className="gradient-text">Aura</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>AI 智能命理助手</p>
        </div>

        {/* Email Input */}
        <div className="mb-4">
          <div className="flex items-center rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <span className="pl-4 pr-2 text-sm" style={{ color: 'var(--text-quaternary)' }}>@</span>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value.trim()); setError(''); }}
              placeholder="请输入邮箱"
              className="flex-1 bg-transparent px-2 py-3.5 text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
              disabled={step === 'code' && countdown > 0}
              onKeyDown={e => { if (e.key === 'Enter' && step === 'email') sendCode(); }}
              autoComplete="email"
            />
          </div>
        </div>

        {/* Code Input */}
        {step === 'code' && (
          <div className="mb-4 animate-fadeIn">
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <input
                  ref={codeInputRef}
                  type="tel"
                  value={code}
                  onChange={e => handleCodeChange(e.target.value)}
                  placeholder="4位验证码"
                  className="w-full bg-transparent px-4 py-3.5 text-sm tracking-[0.5em] text-center outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  onKeyDown={e => { if (e.key === 'Enter') verify(); }}
                />
              </div>
              <button
                onClick={sendCode}
                disabled={countdown > 0 || loading}
                className="shrink-0 rounded-xl px-4 text-xs font-medium transition-colors"
                style={{
                  background: countdown > 0 ? 'var(--bg-surface)' : 'rgba(123,108,184,0.08)',
                  color: countdown > 0 ? 'var(--text-quaternary)' : 'var(--accent-primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {countdown > 0 ? `${countdown}s` : '重新发送'}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mb-4 text-center text-xs animate-fadeIn" style={{ color: 'var(--error, #e05050)' }}>{error}</p>
        )}

        {/* Submit Button */}
        <button
          onClick={step === 'email' ? sendCode : verify}
          disabled={loading || (step === 'email' && !isEmailValid) || (step === 'code' && !isCodeValid)}
          className="w-full rounded-xl py-3.5 text-sm font-semibold transition-all"
          style={{
            background: loading || (step === 'email' && !isEmailValid) || (step === 'code' && !isCodeValid)
              ? 'var(--bg-surface)' : 'var(--gradient-primary)',
            color: loading || (step === 'email' && !isEmailValid) || (step === 'code' && !isCodeValid)
              ? 'var(--text-quaternary)' : '#fff',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(123,108,184,0.2)',
          }}
        >
          {loading ? '...' : step === 'email' ? '获取验证码' : '登录'}
        </button>

        {/* Dev hint */}
        {step === 'code' && (
          <p className="mt-3 text-center text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
            开发模式：验证码 1234
          </p>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-[11px] leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
          登录即同意《用户协议》和《隐私政策》
        </p>
      </div>
    </div>
  );
}
