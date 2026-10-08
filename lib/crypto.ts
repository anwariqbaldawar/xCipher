import { hash, compare } from "bcrypt-ts";

/**
 * Hashes a password using bcrypt-ts, which is Edge-compatible.
 */
export async function hashPassword(password: string): Promise<string> {
  // 12 rounds — the current OWASP recommendation for bcrypt. Existing hashes
  // (10 rounds) still verify: the cost factor is embedded in the hash itself.
  return hash(password, 12);
}

/**
 * Verifies a password against a stored bcrypt hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  
  // Backwards compatibility with the pbkdf2 implementation if we created any
  if (storedHash.startsWith('pbkdf2_sha256')) {
      // Not strictly necessary if we never went to production with PBKDF2, but safe to keep
      return false; // Assuming we only have bcrypt hashes from before
  }
  
  // Use bcrypt-ts to compare against existing bcrypt hashes
  return compare(password, storedHash);
}
