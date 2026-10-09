import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

// ─────────────────────────────────────────────────────────────────────────────
// TOTP (RFC 6238) helpers for two-factor authentication.
//
// Implemented on node:crypto instead of an otp library on purpose: HMAC-SHA1
// TOTP is ~40 lines, has no dependencies, and the only operations needed are
// createHmac + randomBytes. The base32 encoding matches what Google
// Authenticator, Authy, 1Password and every other TOTP app expects.
// ─────────────────────────────────────────────────────────────────────────────

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

/** Generates a 20-byte (160-bit) secret, base32-encoded (32 chars). */
export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Decodes a base32 secret (padding and whitespace tolerated) to raw bytes. */
export function base32Decode(secret: string): Buffer {
  const clean = secret.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error("Invalid base32 character in TOTP secret");
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Computes the TOTP code for a point in time (defaults to now). */
export function totpCode(
  secret: string,
  timestampMs: number = Date.now(),
  stepSeconds: number = TOTP_STEP_SECONDS,
  digits: number = TOTP_DIGITS,
): string {
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, "0");
}

function getTotpEncryptionKey(): Buffer | null {
  const rawKey =
    process.env.TOTP_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET;
  if (!rawKey) return null;
  return createHash("sha256").update(rawKey).digest();
}

/**
 * Encrypts a TOTP secret before storing it at rest using AES-256-GCM.
 * Falls back to plaintext only when no application secret is configured.
 */
export function encryptTotpSecret(secret: string): string {
  if (secret.startsWith("enc:v1:")) return secret;
  const key = getTotpEncryptionKey();
  if (!key) return secret;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts an encrypted TOTP secret (`enc:v1:...`), or returns legacy
 * plaintext secrets unchanged so existing accounts never break.
 */
export function decryptTotpSecret(stored: string): string {
  if (!stored.startsWith("enc:v1:")) return stored;
  const key = getTotpEncryptionKey();
  if (!key) {
    throw new Error("TOTP encryption key is required to decrypt stored 2FA secret.");
  }
  const parts = stored.split(":");
  if (parts.length !== 5) {
    throw new Error("Malformed encrypted TOTP secret.");
  }
  const iv = Buffer.from(parts[2], "hex");
  const tag = Buffer.from(parts[3], "hex");
  const ciphertext = Buffer.from(parts[4], "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** One-way SHA-256 hash for single-use backup codes stored in the database. */
export function hashBackupCode(code: string): string {
  const normalized = code.replace(/\s+/g, "").toUpperCase();
  if (normalized.startsWith("SHA256:")) return code;
  const digest = createHash("sha256").update(normalized).digest("hex");
  return `sha256:${digest}`;
}

/**
 * Verifies a backup code against either a hashed (`sha256:...`) entry or a
 * legacy plaintext entry (backward-compatible dual-read).
 */
export function matchesBackupCode(stored: string, candidate: string): boolean {
  const normalized = candidate.replace(/\s+/g, "").toUpperCase();
  if (!normalized) return false;
  if (stored.startsWith("sha256:")) {
    const expected = Buffer.from(stored, "utf8");
    const actual = Buffer.from(hashBackupCode(normalized), "utf8");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
  const expectedPlain = Buffer.from(stored.replace(/\s+/g, "").toUpperCase(), "utf8");
  const actualPlain = Buffer.from(normalized, "utf8");
  return expectedPlain.length === actualPlain.length && timingSafeEqual(expectedPlain, actualPlain);
}

/**
 * Verifies a user-supplied code, accepting codes from `window` steps before
 * and after the current one (±30s by default) to absorb clock drift between
 * the phone and the server. Transparently handles both encrypted and legacy
 * plaintext secrets.
 */
export function verifyTotp(
  secret: string,
  code: string,
  window: number = 1,
  timestampMs: number = Date.now(),
): boolean {
  const clean = code.replace(/\s+/g, "");
  if (!new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(clean)) return false;
  const rawSecret = decryptTotpSecret(secret);
  for (let i = -window; i <= window; i++) {
    const candidate = totpCode(rawSecret, timestampMs + i * TOTP_STEP_SECONDS * 1000);
    if (candidate === clean) return true;
  }
  return false;
}

/** Generates single-use backup codes (hex, uppercase) shown once at setup. */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(randomBytes(5).toString("hex").toUpperCase());
  }
  return codes;
}

/** Builds the otpauth:// URI every authenticator app can import (QR or manual). */
export function otpauthUri(
  secret: string,
  accountEmail: string,
  issuer: string = "xSypher",
): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
