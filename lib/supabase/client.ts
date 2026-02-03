import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const supabase = createClientComponentClient();

// Database types for Seal
export interface SealUser {
  id: string;
  email: string;
  public_key: string;
  created_at: string;
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

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, public_key, created_at')
    .ilike('email', `${emailPrefix}%`)
    .limit(5);

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return data || [];
}

// Fetch a single user's public key by email
export async function getUserPublicKey(email: string): Promise<string | null> {
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
