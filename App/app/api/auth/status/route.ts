import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { corsHeaders, handleCorsPreFlight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function GET(request: NextRequest) {
  const headers = corsHeaders(request);
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return NextResponse.json({ authenticated: false }, { headers });
  }

  return NextResponse.json({
    authenticated: true,
    email: auth.email,
    userId: auth.userId,
  }, { headers });
}
