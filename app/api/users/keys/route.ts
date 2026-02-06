import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get the current authenticated user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use service role to get full user metadata
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRole || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRole);
    const { data: userData, error: fetchError } = await adminClient.auth.admin.getUserById(user.id);

    if (fetchError || !userData.user) {
      return NextResponse.json({ error: 'Could not fetch user data' }, { status: 500 });
    }

    const meta = userData.user.user_metadata;

    // Check if keys exist
    if (!meta?.public_key || !meta?.encrypted_private_key || !meta?.salt || !meta?.iv) {
      return NextResponse.json({ error: 'Encryption keys not found' }, { status: 404 });
    }

    return NextResponse.json({
      keys: {
        publicKey: meta.public_key,
        encryptedPrivateKey: meta.encrypted_private_key,
        salt: meta.salt,
        iv: meta.iv,
      },
    });
  } catch (err) {
    console.error('[Seal] Keys API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
