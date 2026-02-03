/**
 * Seal Crypto Library
 * Client-side encryption using Web Crypto API
 * AES-256-GCM for file encryption, RSA-OAEP for key wrapping
 */

(function (global) {
  'use strict';

  const ALGORITHM = 'AES-GCM';
  const KEY_LENGTH = 256;
  const RSA_ALGORITHM = 'RSA-OAEP';
  const RSA_HASH = 'SHA-256';
  const RSA_KEY_SIZE = 2048;

  /**
   * Generate a random AES-256 key for file encryption
   * @returns {Promise<CryptoKey>}
   */
  async function generateFileEncryptionKey() {
    return await crypto.subtle.generateKey(
      { name: ALGORITHM, length: KEY_LENGTH },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt file data with AES-256-GCM
   * @param {ArrayBuffer} fileData - Raw file bytes
   * @param {CryptoKey} aesKey - AES-256 key
   * @returns {Promise<{encryptedData: ArrayBuffer, iv: Uint8Array}>}
   */
  async function encryptFile(fileData, aesKey) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv: iv },
      aesKey,
      fileData
    );
    return { encryptedData, iv };
  }

  /**
   * Decrypt file data with AES-256-GCM
   * @param {ArrayBuffer} encryptedData
   * @param {CryptoKey} aesKey
   * @param {Uint8Array} iv
   * @returns {Promise<ArrayBuffer>}
   */
  async function decryptFile(encryptedData, aesKey, iv) {
    return await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv },
      aesKey,
      encryptedData
    );
  }

  /**
   * Encrypt an AES key with a recipient's RSA public key
   * @param {CryptoKey} aesKey - The file encryption key
   * @param {CryptoKey} recipientPublicKey - RSA-OAEP public key
   * @returns {Promise<ArrayBuffer>} - Encrypted key bytes
   */
  async function encryptKeyForRecipient(aesKey, recipientPublicKey) {
    const rawKey = await crypto.subtle.exportKey('raw', aesKey);
    return await crypto.subtle.encrypt(
      { name: RSA_ALGORITHM },
      recipientPublicKey,
      rawKey
    );
  }

  /**
   * Decrypt an AES key with the user's RSA private key
   * @param {ArrayBuffer} encryptedKey
   * @param {CryptoKey} userPrivateKey - RSA-OAEP private key
   * @returns {Promise<CryptoKey>}
   */
  async function decryptKeyForRecipient(encryptedKey, userPrivateKey) {
    const rawKey = await crypto.subtle.decrypt(
      { name: RSA_ALGORITHM },
      userPrivateKey,
      encryptedKey
    );
    return await crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: ALGORITHM, length: KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Import an RSA public key from base64-encoded SPKI format
   * @param {string} base64Key
   * @returns {Promise<CryptoKey>}
   */
  async function importPublicKey(base64Key) {
    const binaryString = atob(base64Key);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return await crypto.subtle.importKey(
      'spki',
      bytes.buffer,
      { name: RSA_ALGORITHM, hash: RSA_HASH },
      true,
      ['encrypt']
    );
  }

  /**
   * Import an RSA private key from base64-encoded PKCS8 format
   * @param {string} base64Key
   * @returns {Promise<CryptoKey>}
   */
  async function importPrivateKey(base64Key) {
    const binaryString = atob(base64Key);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return await crypto.subtle.importKey(
      'pkcs8',
      bytes.buffer,
      { name: RSA_ALGORITHM, hash: RSA_HASH },
      true,
      ['decrypt']
    );
  }

  /**
   * Generate an RSA-2048 key pair
   * @returns {Promise<CryptoKeyPair>}
   */
  async function generateKeyPair() {
    return await crypto.subtle.generateKey(
      {
        name: RSA_ALGORITHM,
        modulusLength: RSA_KEY_SIZE,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: RSA_HASH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export a CryptoKey to base64 string
   * @param {CryptoKey} key
   * @param {'spki'|'pkcs8'} format
   * @returns {Promise<string>}
   */
  async function exportKey(key, format) {
    const exported = await crypto.subtle.exportKey(format, key);
    const bytes = new Uint8Array(exported);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Helper: ArrayBuffer to base64
  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Helper: base64 to ArrayBuffer
  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Create a .seal file (encrypt file for multiple recipients)
   * @param {File} file - The file to encrypt
   * @param {{email: string, publicKey: string}[]} recipients - Recipients with base64 public keys
   * @param {string} fileId - Unique file identifier
   * @param {object} metadata - Additional metadata (expiration, etc.)
   * @returns {Promise<object>} - The .seal file object
   */
  async function createSealFile(file, recipients, fileId, metadata) {
    // Read file as ArrayBuffer
    const fileData = await file.arrayBuffer();

    // Generate random AES key
    const aesKey = await generateFileEncryptionKey();

    // Encrypt file data
    const { encryptedData, iv } = await encryptFile(fileData, aesKey);

    // Encrypt AES key for each recipient
    const recipientKeys = [];
    for (const recipient of recipients) {
      const publicKey = await importPublicKey(recipient.publicKey);
      const encryptedKey = await encryptKeyForRecipient(aesKey, publicKey);
      recipientKeys.push({
        email: recipient.email,
        encryptedKey: arrayBufferToBase64(encryptedKey),
      });
    }

    return {
      version: 1,
      fileId: fileId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      encryptedData: arrayBufferToBase64(encryptedData),
      iv: arrayBufferToBase64(iv),
      recipients: recipientKeys,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Open a .seal file (decrypt for the current user)
   * @param {object} sealFile - The .seal file object
   * @param {string} userEmail - Current user's email
   * @param {string} userPrivateKeyBase64 - User's base64-encoded private key
   * @returns {Promise<{data: ArrayBuffer, fileName: string, fileType: string}>}
   */
  async function openSealFile(sealFile, userEmail, userPrivateKeyBase64) {
    // Find the recipient entry for this user
    const recipientEntry = sealFile.recipients.find(
      (r) => r.email.toLowerCase() === userEmail.toLowerCase()
    );
    if (!recipientEntry) {
      throw new Error('You are not a recipient of this file');
    }

    // Import user's private key
    const privateKey = await importPrivateKey(userPrivateKeyBase64);

    // Decrypt the AES key
    const encryptedKeyBuffer = base64ToArrayBuffer(recipientEntry.encryptedKey);
    const aesKey = await decryptKeyForRecipient(encryptedKeyBuffer, privateKey);

    // Decrypt the file data
    const encryptedData = base64ToArrayBuffer(sealFile.encryptedData);
    const iv = new Uint8Array(base64ToArrayBuffer(sealFile.iv));
    const decryptedData = await decryptFile(encryptedData, aesKey, iv);

    return {
      data: decryptedData,
      fileName: sealFile.fileName,
      fileType: sealFile.fileType,
    };
  }

  // Export to global scope
  const SealCrypto = {
    generateFileEncryptionKey,
    encryptFile,
    decryptFile,
    encryptKeyForRecipient,
    decryptKeyForRecipient,
    importPublicKey,
    importPrivateKey,
    generateKeyPair,
    exportKey,
    createSealFile,
    openSealFile,
    arrayBufferToBase64,
    base64ToArrayBuffer,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SealCrypto;
  } else {
    global.SealCrypto = SealCrypto;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this);
