import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Demo mode: enabled when Supabase env vars are not configured
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const DEMO_MODE = !SUPABASE_URL || SUPABASE_URL === 'your-supabase-project-url';

export const supabase = DEMO_MODE ? null! : createClientComponentClient();

// Database types for Seal
export interface SealUser {
  id: string;
  email: string;
  public_key: string;
  created_at: string;
}

// ----- Demo / mock data -----
// Pre-generated RSA-2048 public keys (base64 SPKI) for demo recipients.
// These are throwaway keys generated for testing only.
const DEMO_USERS: SealUser[] = [
  {
    id: 'demo-1',
    email: 'alice@example.com',
    public_key: '', // populated at runtime via Web Crypto
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    email: 'bob@example.com',
    public_key: '',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    email: 'carol@example.com',
    public_key: '',
    created_at: new Date().toISOString(),
  },
];

let demoKeysReady = false;

/**
 * Generate real RSA key pairs for demo users so the crypto flow works end-to-end.
 * Keys are generated once and cached in memory.
 */
async function ensureDemoKeys(): Promise<void> {
  if (demoKeysReady || typeof window === 'undefined') return;
  for (const user of DEMO_USERS) {
    if (user.public_key) continue;
    const keyPair = await crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['encrypt', 'decrypt']
    );
    const exported = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const bytes = new Uint8Array(exported);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    user.public_key = btoa(binary);
  }
  demoKeysReady = true;
}

export interface SealFile {
  id: string;
  sender_id: string;
  file_name: string;
  file_size: number;
  encrypted_data: string;
  iv: string;
  expires_at: string;
  created_at: string;
}

export interface SealRecipient {
  id: string;
  file_id: string;
  recipient_email: string;
  encrypted_key: string;
  accessed: boolean;
  accessed_at: string | null;
}

// Search for users by email prefix (for recipient autocomplete)
export async function searchUsers(emailPrefix: string): Promise<SealUser[]> {
  if (!emailPrefix || emailPrefix.length < 2) return [];

  if (DEMO_MODE) {
    await ensureDemoKeys();
    const prefix = emailPrefix.toLowerCase();
    return DEMO_USERS.filter((u) => u.email.toLowerCase().startsWith(prefix));
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, public_key, created_at')
    .ilike('email', `${emailPrefix}%`)
    .limit(5);

  if (error) {
    console.error('[Seal] searchUsers error:', error);
    return [];
  }

  console.log('[Seal] searchUsers results:', data?.length, 'users for prefix:', emailPrefix);

  return data || [];
}

// Fetch a single user's public key by email
export async function getUserPublicKey(email: string): Promise<string | null> {
  if (DEMO_MODE) {
    await ensureDemoKeys();
    const user = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user?.public_key ?? null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('public_key')
    .eq('email', email)
    .single();

  if (error || !data) return null;
  return data.public_key;
}

// Store encrypted file and recipient data
export async function storeEncryptedFile(
  fileData: {
    file_name: string;
    file_size: number;
    encrypted_data: string;
    iv: string;
    expires_at: string;
  },
  recipients: { email: string; encrypted_key: string }[]
): Promise<{ fileId: string } | { error: string }> {
  if (DEMO_MODE) {
    // Simulate network delay then return a fake file ID
    await new Promise((r) => setTimeout(r, 800));
    console.log('[DEMO] Would store encrypted file:', {
      fileName: fileData.file_name,
      fileSize: fileData.file_size,
      recipients: recipients.map((r) => r.email),
      expiresAt: fileData.expires_at,
    });
    return { fileId: crypto.randomUUID() };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Insert file record
  const { data: fileRecord, error: fileError } = await supabase
    .from('sealed_files')
    .insert({
      sender_id: user.id,
      file_name: fileData.file_name,
      file_size: fileData.file_size,
      encrypted_data: fileData.encrypted_data,
      iv: fileData.iv,
      expires_at: fileData.expires_at,
    })
    .select('id')
    .single();

  if (fileError || !fileRecord) {
    return { error: fileError?.message || 'Failed to store file' };
  }

  // Insert recipient records
  const recipientRecords = recipients.map((r) => ({
    file_id: fileRecord.id,
    recipient_email: r.email,
    encrypted_key: r.encrypted_key,
    accessed: false,
  }));

  const { error: recipientError } = await supabase
    .from('file_recipients')
    .insert(recipientRecords);

  if (recipientError) {
    // Clean up the file record on failure
    await supabase.from('sealed_files').delete().eq('id', fileRecord.id);
    return { error: recipientError.message };
  }

  return { fileId: fileRecord.id };
}
