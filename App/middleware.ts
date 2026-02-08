import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Skip auth redirects for API routes — they handle auth internally and return 401
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Protect /dashboard and /viewer — redirect to /login if not authenticated
  if ((req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/viewer')) && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect logged-in users away from /login and /signup
  if ((req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup') && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/viewer/:path*', '/login', '/signup', '/api/:path*'],
};
