import { TOTP, Secret } from "otpauth";
import crypto from "crypto";

// ============================================
// TOTP Configuration
// ============================================
const TOTP_ISSUER = "Setu Chat";
const TOTP_ALGORITHM = "SHA1";
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // seconds
const TOTP_WINDOW = 1; // accept ±1 window (±30s) for clock drift

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// ============================================
// Secret Encryption / Decryption
// ============================================

function getEncryptionKey(): Buffer {
  const key = process.env.TOTP_ENCRYPTION_KEY;
  if (!key || key.length < 64) {
    throw new Error(
      "TOTP_ENCRYPTION_KEY must be set (64 hex chars = 32 bytes). " +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(key, "hex");
}

/**
 * Encrypt a TOTP secret for safe storage in the database.
 * Returns a string in the format: iv:authTag:ciphertext (all hex-encoded).
 */
export function encryptSecret(plainSecret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(plainSecret, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a TOTP secret from the database.
 */
export function decryptSecret(encryptedData: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, ciphertext] = encryptedData.split(":");

  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// ============================================
// TOTP Generation & Verification
// ============================================

/**
 * Generate a new TOTP secret.
 * Returns the raw base32 secret string.
 */
export function generateTotpSecret(): string {
  const secret = new Secret({ size: 20 });
  return secret.base32;
}

/**
 * Generate the OTP Auth URI for QR code scanning.
 * This URI is what authenticator apps (Google Authenticator, Authy, etc.) use.
 */
export function generateTotpUri(secret: string, userEmail: string): string {
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    label: userEmail,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: Secret.fromBase32(secret),
  });

  return totp.toString();
}

/**
 * Verify a TOTP code against a secret.
 * Returns the time delta (0 = current window, ±1 = adjacent windows) if valid,
 * or null if invalid.
 */
export function verifyTotpCode(
  secret: string,
  code: string
): number | null {
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token: code, window: TOTP_WINDOW });
  return delta;
}

// ============================================
// Backup Codes
// ============================================

const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8; // 8 alphanumeric chars

/**
 * Generate a set of backup codes.
 * Returns both the plain codes (to show to user once) and hashed versions (to store).
 */
export function generateBackupCodes(): {
  plainCodes: string[];
  hashedCodes: string[];
} {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    // Generate random 8-char alphanumeric code, formatted as XXXX-XXXX
    const bytes = crypto.randomBytes(5); // 5 bytes = 10 hex chars, we take 8
    const code = bytes
      .toString("hex")
      .toUpperCase()
      .slice(0, BACKUP_CODE_LENGTH);
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;

    plainCodes.push(formatted);
    hashedCodes.push(hashBackupCode(formatted));
  }

  return { plainCodes, hashedCodes };
}

/**
 * Hash a backup code for secure storage.
 * Uses SHA-256 — fast enough since backup codes have high entropy.
 */
export function hashBackupCode(code: string): string {
  const normalized = code.replace(/-/g, "").toUpperCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Verify a backup code against stored hashed codes.
 * Returns the index of the matching code, or -1 if not found.
 */
export function verifyBackupCode(
  inputCode: string,
  hashedCodes: string[]
): number {
  const inputHash = hashBackupCode(inputCode);
  return hashedCodes.findIndex((hash) => hash === inputHash);
}

// ============================================
// Rate Limiting (In-Memory)
// ============================================

interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check and update rate limit for TOTP verification attempts.
 * Returns { allowed: boolean, remainingAttempts: number, retryAfterMs?: number }
 */
export function checkTotpRateLimit(userId: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterMs?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, val] of rateLimitStore) {
      if (val.resetAt <= now) rateLimitStore.delete(key);
    }
  }

  if (!entry || entry.resetAt <= now) {
    // First attempt or window expired — reset
    rateLimitStore.set(userId, { attempts: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.attempts += 1;
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - entry.attempts };
}

/**
 * Reset rate limit for a user (e.g., after successful verification).
 */
export function resetTotpRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
}
