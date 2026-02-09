import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { corsHeaders, handleCorsPreFlight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  const headers = corsHeaders(request);

  // Require authentication
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  }

  const email = decodeURIComponent(params.email).toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400, headers });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500, headers });
  }

  const adminClient = createClient(supabaseUrl, serviceRole);
  const { data, error } = await adminClient
    .from('profiles')
    .select('public_key')
    .eq('email', email)
    .single();

  if (error || !data?.public_key) {
    return NextResponse.json({ error: 'User not found' }, { status: 404, headers });
  }

  return NextResponse.json({ publicKey: data.public_key }, { headers });
}
