import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, email, publicKey } = await request.json();

    if (!userId || !email || !publicKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the request comes from the authenticated user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    // Allow if the user is authenticated and matches, OR if they just signed up
    // (session may not be established yet with email confirmation)
    if (user && user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Use service role to bypass RLS for profile insertion
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRole || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRole);

    const { error } = await adminClient.from('profiles').upsert({
      id: userId,
      email: email.toLowerCase(),
      public_key: publicKey,
    });

    if (error) {
      console.error('[Seal] Profile creation error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Seal] Profile API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
