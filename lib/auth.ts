import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  email?: string;
}

/**
 * Authenticate a request using either:
 * 1. Bearer token in Authorization header (Chrome extension)
 * 2. Supabase session cookies (website)
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  // Try Bearer token first (extension sends this)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return authenticateWithToken(token);
  }

  // Fall back to cookie-based auth (website)
  return authenticateWithCookies();
}

async function authenticateWithToken(token: string): Promise<AuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { authenticated: false };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    userId: user.id,
    email: user.email,
  };
}

async function authenticateWithCookies(): Promise<AuthResult> {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      userId: user.id,
      email: user.email,
    };
  } catch {
    return { authenticated: false };
  }
}
