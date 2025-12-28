import crypto from "node:crypto";

export type PasswordHash = {
  salt: string; // base64
  hash: string; // base64
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validatePasswordStrength(password: string): string | null {
  const trimmed = password.trim();
  if (trimmed.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(trimmed)) return "Password must include at least one letter.";
  if (!/\d/.test(trimmed)) return "Password must include at least one number.";
  return null;
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  const saltBytes = crypto.randomBytes(16);
  const salt = saltBytes.toString("base64");
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      password,
      saltBytes,
      64,
      {
        N: 16384,
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024,
      },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey as Buffer);
      }
    );
  });
  return { salt, hash: derived.toString("base64") };
}

export async function verifyPassword(
  password: string,
  stored: PasswordHash
): Promise<boolean> {
  const saltBytes = Buffer.from(stored.salt, "base64");
  const expected = Buffer.from(stored.hash, "base64");
  const actual = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      password,
      saltBytes,
      expected.length,
      {
        N: 16384,
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024,
      },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey as Buffer);
      }
    );
  });
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}
