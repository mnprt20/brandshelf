/**
 * Browser-side PBKDF2 hash using Web Crypto API.
 */
export async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  const salt = saltHex 
    ? hexToBytes(saltHex) 
    : crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: 50000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  return {
    hash: bytesToHex(new Uint8Array(derived)),
    salt: bytesToHex(salt)
  };
}

export async function verifyPassword(password: string, storedHash: string, saltHex: string): Promise<boolean> {
  const result = await hashPassword(password, saltHex);
  return result.hash === storedHash;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
