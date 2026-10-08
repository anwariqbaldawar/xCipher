import { describe, expect, it } from "vitest";
import {
  base32Decode,
  generateBackupCodes,
  generateTotpSecret,
  otpauthUri,
  totpCode,
  verifyTotp,
} from "@/lib/totp";

// RFC 6238 Appendix B test key: ASCII "12345678901234567890" in base32.
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("totp", () => {
  it("matches the RFC 6238 test vectors (6-digit truncation)", () => {
    // 8-digit vectors from the RFC; 6-digit codes are the same value mod 10^6.
    expect(totpCode(RFC_SECRET, 59_000)).toBe("287082"); // 94287082
    expect(totpCode(RFC_SECRET, 1_111_111_109_000)).toBe("081804"); // 07081804
    expect(totpCode(RFC_SECRET, 1_234_567_890_000)).toBe("005924"); // 89005924
  });

  it("generates base32 secrets that round-trip through the decoder", () => {
    for (let i = 0; i < 25; i++) {
      const secret = generateTotpSecret();
      expect(secret).toMatch(/^[A-Z2-7]{32}$/);
      expect(base32Decode(secret)).toHaveLength(20);
    }
  });

  it("generates unique secrets", () => {
    const secrets = new Set(Array.from({ length: 50 }, () => generateTotpSecret()));
    expect(secrets.size).toBe(50);
  });

  it("accepts the current code and rejects wrong codes", () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const code = totpCode(secret, now);
    expect(verifyTotp(secret, code, 1, now)).toBe(true);
    expect(verifyTotp(secret, "000000", 1, now)).toBe(false);
  });

  it("accepts codes from adjacent time steps within the window", () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const previous = totpCode(secret, now - 30_000);
    const next = totpCode(secret, now + 30_000);
    expect(verifyTotp(secret, previous, 1, now)).toBe(true);
    expect(verifyTotp(secret, next, 1, now)).toBe(true);
    // ...but not beyond the window
    const twoBack = totpCode(secret, now - 60_000);
    if (twoBack !== previous && twoBack !== totpCode(secret, now)) {
      expect(verifyTotp(secret, twoBack, 1, now)).toBe(false);
    }
  });

  it("tolerates whitespace and rejects malformed codes", () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const code = totpCode(secret, now);
    expect(verifyTotp(secret, ` ${code.slice(0, 3)} ${code.slice(3)} `, 1, now)).toBe(true);
    expect(verifyTotp(secret, "12345", 1, now)).toBe(false);
    expect(verifyTotp(secret, "1234567", 1, now)).toBe(false);
    expect(verifyTotp(secret, "abcdef", 1, now)).toBe(false);
  });

  it("generates unique, well-formed backup codes", () => {
    const codes = generateBackupCodes(8);
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const code of codes) {
      expect(code).toMatch(/^[0-9A-F]{10}$/);
    }
  });

  it("builds an otpauth URI with the expected parameters", () => {
    const uri = otpauthUri("JBSWY3DPEHPK3PXP", "editor@xsypher.com");
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain(encodeURIComponent("editor@xsypher.com"));
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(uri).toContain("issuer=xSypher");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});
