import { describe, expect, it } from "vitest";
import {
  constantTimeEqual,
  createOpaqueToken,
  decryptSecret,
  deriveCsrfToken,
  encryptSecret,
  hashOpaqueToken,
} from "../../apps/server/src/auth/crypto.js";

describe("backend credential primitives", () => {
  const key = Buffer.alloc(32, 9);

  it("creates unguessable fixed-size tokens and domain-separated hashes", () => {
    const token = createOpaqueToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashOpaqueToken(token, key, "host-session")).not.toBe(
      hashOpaqueToken(token, key, "overlay"),
    );
  });

  it("round-trips AES-GCM secrets and rejects tampered ciphertext", () => {
    const encrypted = encryptSecret(
      "refresh-token-value",
      key,
      "twitch-refresh:1971641",
    );
    expect(decryptSecret(encrypted, key, "twitch-refresh:1971641")).toBe(
      "refresh-token-value",
    );
    expect(() =>
      decryptSecret(
        { ...encrypted, tag: Buffer.alloc(16, 1).toString("base64url") },
        key,
        "twitch-refresh:1971641",
      ),
    ).toThrow();
    expect(() =>
      decryptSecret(encrypted, key, "twitch-access:1971641"),
    ).toThrow();
  });

  it("derives stable CSRF proof and compares state without accepting unequal values", () => {
    const csrf = deriveCsrfToken("host-cookie-token", key);
    expect(
      constantTimeEqual(csrf, deriveCsrfToken("host-cookie-token", key)),
    ).toBe(true);
    expect(
      constantTimeEqual(csrf, deriveCsrfToken("different-cookie-token", key)),
    ).toBe(false);
    expect(constantTimeEqual(csrf, "short")).toBe(false);
  });
});
