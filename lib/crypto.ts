/**
 * TypeScript wrapper for seal-crypto.js
 * Provides typed access to the Web Crypto API encryption functions
 */

export interface SealFileResult {
  version: string;
  fileId: string;
  encryptedData: string;
  iv: string;
  recipients: { email: string; encryptedKey: string }[];
  metadata: {
    filename: string;
    mimetype: string;
    size: number;
    timestamp: string;
    expiresAt?: string;
    [key: string]: unknown;
  };
}

export interface DecryptedFile {
  data: ArrayBuffer;
  fileName: string;
  fileType: string;
}

export interface RecipientInput {
  email: string;
  publicKey: string;
}

// Access SealCrypto from the global scope (loaded via <script> tag)
function getSealCrypto() {
  const sc = (window as unknown as Record<string, unknown>).SealCrypto as
    | Record<string, (...args: unknown[]) => unknown>
    | undefined;
  if (!sc) {
    throw new Error(
      'SealCrypto not loaded. Ensure seal-crypto.js is included via <script> tag.'
    );
  }
  return sc;
}

/**
 * Create an encrypted .seal file for multiple recipients
 */
export async function createSealFile(
  file: File,
  recipients: RecipientInput[],
  fileId: string,
  metadata: { expiresAt?: string; [key: string]: unknown }
): Promise<SealFileResult> {
  const sc = getSealCrypto();
  return (await sc.createSealFile(file, recipients, fileId, metadata)) as SealFileResult;
}

/**
 * Decrypt a .seal file for the current user
 */
export async function openSealFile(
  sealFile: SealFileResult,
  userEmail: string,
  userPrivateKeyBase64: string
): Promise<DecryptedFile> {
  const sc = getSealCrypto();
  return (await sc.openSealFile(sealFile, userEmail, userPrivateKeyBase64)) as DecryptedFile;
}

/**
 * Generate an RSA-2048 key pair and export as base64 strings
 */
export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const sc = getSealCrypto();
  const keyPair = (await sc.generateKeyPair()) as CryptoKeyPair;
  const publicKey = (await sc.exportKey(keyPair.publicKey, 'spki')) as string;
  const privateKey = (await sc.exportKey(keyPair.privateKey, 'pkcs8')) as string;
  return { publicKey, privateKey };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
