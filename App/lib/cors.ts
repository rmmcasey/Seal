import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Generate CORS headers for a request.
 * Allows chrome-extension:// origins (extension ID varies per installation)
 * and the seal.email origin for same-site API calls.
 */
export function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const headers: Record<string, string> = {};

  if (origin.startsWith('chrome-extension://') || origin.includes('seal.email')) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  }

  return headers;
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 */
export function handleCorsPreFlight(request: NextRequest): NextResponse {
  return NextResponse.json(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}
