import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCMTypes,
} from "node:crypto";

const ALGO: CipherGCMTypes = "aes-256-gcm";
const IV_LEN = 12; // 96-bit nonce — recommended for GCM
const TAG_LEN = 16; // 128-bit auth tag

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("ENCRYPTION_KEY is not set");
  }
  if (hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext string with AES-256-GCM.
 * Returns base64-encoded `iv:authTag:ciphertext` (all base64-url-safe components joined by ":").
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

/**
 * Reverses encrypt(). Throws if the payload is malformed or auth check fails.
 */
export function decrypt(payload: string): string {
  const key = getKey();
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext payload");
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(dataB64, "base64");
  if (iv.length !== IV_LEN) throw new Error("Invalid IV length");
  if (authTag.length !== TAG_LEN) throw new Error("Invalid auth tag length");

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/**
 * Returns a masked version like `sk-...XXXX` showing only the last 4 chars.
 */
export function maskKey(plaintext: string): string {
  if (!plaintext) return "";
  const tail = plaintext.slice(-4);
  const prefix = plaintext.startsWith("sk-")
    ? "sk-"
    : plaintext.slice(0, 3);
  return `${prefix}...${tail}`;
}
