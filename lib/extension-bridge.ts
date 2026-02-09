/**
 * Extension Bridge - Communicate with the Seal Chrome extension.
 *
 * Uses chrome.runtime.sendMessage (externally connectable) to relay
 * auth tokens and other data to the extension's background service worker.
 *
 * The extension ID is discovered dynamically via a ping mechanism.
 * In production, you can hardcode SEAL_EXTENSION_ID for reliability.
 */

// Set this to the published extension ID for production.
// During development, the bridge will attempt discovery via known dev IDs.
const KNOWN_EXTENSION_IDS: string[] = [
  // Add your extension ID here after loading it in Chrome:
  // e.g., 'abcdefghijklmnopqrstuvwxyzabcdef'
];

/**
 * Try to send a message to the Seal extension.
 * Returns the response if the extension is reachable, null otherwise.
 */
async function sendToExtension(message: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  // chrome.runtime is only available in Chrome
  const chromeRuntime = (window as unknown as { chrome?: { runtime?: { sendMessage: (id: string, msg: unknown, callback: (response: unknown) => void) => void } } }).chrome?.runtime;
  if (!chromeRuntime?.sendMessage) return null;

  for (const extensionId of KNOWN_EXTENSION_IDS) {
    try {
      const response = await new Promise<Record<string, unknown> | null>((resolve) => {
        chromeRuntime.sendMessage(extensionId, message, (resp) => {
          // If the extension isn't there, Chrome sets runtime.lastError
          resolve((resp as Record<string, unknown>) || null);
        });
        // Timeout after 2 seconds
        setTimeout(() => resolve(null), 2000);
      });
      if (response) return response;
    } catch {
      // Extension not reachable with this ID
    }
  }

  return null;
}

/**
 * Send the Supabase access token to the extension after login.
 * Fails silently if the extension isn't installed.
 */
export async function relayAuthToExtension(token: string, email: string): Promise<boolean> {
  const response = await sendToExtension({
    type: 'SEAL_AUTH_TOKEN',
    token,
    email,
  });
  return response !== null && (response as { success?: boolean }).success === true;
}

/**
 * Notify the extension that the user logged out.
 */
export async function relayLogoutToExtension(): Promise<void> {
  await sendToExtension({ type: 'SEAL_LOGOUT' });
}

/**
 * Check if the Seal extension is installed.
 */
export async function isExtensionInstalled(): Promise<boolean> {
  const response = await sendToExtension({ type: 'SEAL_PING' });
  return response !== null && (response as { installed?: boolean }).installed === true;
}
