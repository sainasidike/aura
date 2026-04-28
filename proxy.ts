import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || 'fallback_dev_secret');
const COOKIE_NAME = 'aura_token';

const PUBLIC_PATHS = ['/login', '/api/auth', '/admin', '/api/admin'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  // Check auth
  const token = request.cookies.get(COOKIE_NAME)?.value;
  let isAuthed = false;
  if (token) {
    try {
      await jwtVerify(token, SECRET);
      isAuthed = true;
    } catch {
      // Invalid token
    }
  }

  // Logged-in user visiting /login → redirect to home
  if (isPublic && isAuthed && pathname === '/login') {
    return NextResponse.redirect(new URL('/fortune', request.url));
  }

  // Not logged in, not public → redirect to login
  if (!isPublic && !isAuthed) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|icons/|api/|.*\\.(?:png|jpg|svg|ico|webp|woff2?)$).*)'],
};
