import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { corsHeaders, handleCorsPreFlight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request);

  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers });
  }

  try {
    const { fileId, filename, recipientEmails, expiresAt, senderEmail } = await request.json();

    if (!fileId || !filename || !recipientEmails?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500, headers });
    }

    const adminClient = createClient(supabaseUrl, serviceRole);

    // Insert file record
    const { data: fileRecord, error: fileError } = await adminClient
      .from('sealed_files')
      .insert({
        id: fileId,
        sender_id: auth.userId,
        file_name: filename,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (fileError) {
      console.error('[Seal] File insert error:', fileError);
      return NextResponse.json({ error: 'Failed to save file metadata' }, { status: 500, headers });
    }

    // Insert recipient records
    const recipientRecords = (recipientEmails as string[]).map((email: string) => ({
      file_id: fileRecord.id,
      recipient_email: email.toLowerCase(),
      accessed: false,
    }));

    const { error: recipientError } = await adminClient
      .from('file_recipients')
      .insert(recipientRecords);

    if (recipientError) {
      console.error('[Seal] Recipient insert error:', recipientError);
      await adminClient.from('sealed_files').delete().eq('id', fileRecord.id);
      return NextResponse.json({ error: 'Failed to save recipient data' }, { status: 500, headers });
    }

    return NextResponse.json({ success: true, fileId: fileRecord.id }, { headers });
  } catch (err) {
    console.error('[Seal] Files API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers });
  }
}
