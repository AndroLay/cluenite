import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export interface EncryptedSecret {
  readonly ciphertext: string;
  readonly iv: string;
  readonly tag: string;
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(
  token: string,
  key: Buffer,
  purpose: string,
): string {
  return createHmac("sha256", key).update(`${purpose}\0${token}`).digest("hex");
}

export function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

export function deriveCsrfToken(sessionToken: string, key: Buffer): string {
  return createHmac("sha256", key)
    .update(`cluenite-csrf\0${sessionToken}`)
    .digest("base64url");
}

export function encryptSecret(
  value: string,
  key: Buffer,
  associatedData: string,
): EncryptedSecret {
  if (key.byteLength !== 32)
    throw new Error("Token encryption key must be 32 bytes.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(associatedData));
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64url"),
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
  };
}

export function decryptSecret(
  secret: EncryptedSecret,
  key: Buffer,
  associatedData: string,
): string {
  if (key.byteLength !== 32)
    throw new Error("Token encryption key must be 32 bytes.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(secret.iv, "base64url"),
  );
  decipher.setAAD(Buffer.from(associatedData));
  decipher.setAuthTag(Buffer.from(secret.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
