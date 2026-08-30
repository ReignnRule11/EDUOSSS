import { createHmac, randomBytes } from "crypto";

import { hashToken } from "./auth.utils";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// ---------------------------------------------------------------
// Base32 (RFC 4648)
// ---------------------------------------------------------------

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
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

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// ---------------------------------------------------------------
// TOTP (RFC 6238 / HOTP RFC 4226)
// ---------------------------------------------------------------

function hotp(secretBuffer: Buffer, counter: number, digits: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = createHmac("sha1", secretBuffer).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (binary % 10 ** digits).toString().padStart(digits, "0");
}

export interface TotpOptions {
  windowSeconds?: number;
  digits?: number;
}

export function generateTotp(
  secret: string,
  options: TotpOptions = {},
): string {
  const { windowSeconds = 30, digits = 6 } = options;
  const counter = Math.floor(Date.now() / 1000 / windowSeconds);
  return hotp(base32Decode(secret), counter, digits);
}

/**
 * Verifies a TOTP code allowing the configured number of adjacent time steps.
 * Used for both login verification and enrolling/confirming MFA.
 */
export function verifyTotp(
  secret: string,
  code: string,
  options: TotpOptions & { clockSkewSteps?: number } = {},
): boolean {
  const { windowSeconds = 30, digits = 6, clockSkewSteps = 1 } = options;
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d+$/.test(normalized)) return false;

  const secretBuffer = base32Decode(secret);
  const currentCounter = Math.floor(Date.now() / 1000 / windowSeconds);

  for (let step = -clockSkewSteps; step <= clockSkewSteps; step++) {
    const candidate = hotp(secretBuffer, currentCounter + step, digits);
    if (candidate === normalized) return true;
  }
  return false;
}

// ---------------------------------------------------------------
// Enrollment helpers
// ---------------------------------------------------------------

/** Generates a random 160-bit base32 secret suitable for TOTP. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function buildOtpauthUrl(options: {
  secret: string;
  accountName: string;
  issuer: string;
}): string {
  const label = encodeURIComponent(`${options.issuer}:${options.accountName}`);
  const params = new URLSearchParams({
    secret: options.secret,
    issuer: options.issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ---------------------------------------------------------------
// Backup codes
// ---------------------------------------------------------------

/** Formats a single backup code for display, e.g. `ABCD-EFGH-12AB`. */
export function formatBackupCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(6)
      .toString("base64")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 10)
      .toUpperCase();
    codes.push(formatBackupCode(raw));
  }
  return codes;
}

export function hashBackupCode(code: string): string {
  return hashToken(code.replace(/-/g, "").toUpperCase());
}

/** Verifies a plaintext backup code against a list of stored hashes. */
export function verifyBackupCode(
  code: string,
  storedHashes: string[],
): boolean {
  const hash = hashBackupCode(code);
  return storedHashes.includes(hash);
}
