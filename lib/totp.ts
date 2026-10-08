import { createHmac, randomBytes } from "node:crypto";

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

/**
 * Verifies a user-supplied code, accepting codes from `window` steps before
 * and after the current one (±30s by default) to absorb clock drift between
 * the phone and the server.
 */
export function verifyTotp(
  secret: string,
  code: string,
  window: number = 1,
  timestampMs: number = Date.now(),
): boolean {
  const clean = code.replace(/\s+/g, "");
  if (!new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(clean)) return false;
  for (let i = -window; i <= window; i++) {
    const candidate = totpCode(secret, timestampMs + i * TOTP_STEP_SECONDS * 1000);
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
