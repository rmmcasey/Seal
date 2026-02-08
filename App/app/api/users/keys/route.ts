import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { corsHeaders, handleCorsPreFlight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function GET(request: NextRequest) {
  const headers = corsHeaders(request);

  try {
    const auth = await authenticateRequest(request);
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
    }

    // Use service role to get full user metadata
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRole || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500, headers });
    }

    const adminClient = createClient(supabaseUrl, serviceRole);
    const { data: userData, error: fetchError } = await adminClient.auth.admin.getUserById(auth.userId);

    if (fetchError || !userData.user) {
      return NextResponse.json({ error: 'Could not fetch user data' }, { status: 500, headers });
    }

    const meta = userData.user.user_metadata;

    // Check if keys exist
    if (!meta?.public_key || !meta?.encrypted_private_key || !meta?.salt || !meta?.iv) {
      return NextResponse.json({ error: 'Encryption keys not found' }, { status: 404, headers });
    }

    return NextResponse.json({
      keys: {
        publicKey: meta.public_key,
        encryptedPrivateKey: meta.encrypted_private_key,
        salt: meta.salt,
        iv: meta.iv,
      },
    }, { headers });
  } catch (err) {
    console.error('[Seal] Keys API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers });
  }
}
