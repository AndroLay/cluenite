import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearInvite, pendingInvite, pendingInviteHref, rememberInvite } from "../src/site/inviteContinuation";

const id = "a1b2c3d4-1234-1234-1234-123456789abc";
const token = "t".repeat(43);
describe("same-tab invitation continuation", () => {
  let storage: Map<string, string>;
  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  it("keeps the bearer out of the continuation URL and clears it after consent", () => {
    rememberInvite(id, token);
    expect(pendingInvite()?.token).toBe(token);
    expect(pendingInviteHref()).toBe(`/coop/invite?invite=${id}`);
    clearInvite();
    expect(pendingInvite()).toBeNull();
  });
  it("rejects stale, future-dated and malformed stored invitations", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-02T00:00:00Z"));
    rememberInvite(id, token);
    vi.advanceTimersByTime(20 * 60 * 1000 + 1);
    expect(pendingInvite()).toBeNull();
    storage.set("cluenite.pending-invite.v1", JSON.stringify({ id, token, savedAt: Date.now() + 1000 }));
    expect(pendingInvite()).toBeNull();
    storage.set("cluenite.pending-invite.v1", JSON.stringify({ id: "https://evil.invalid", token, savedAt: Date.now() }));
    expect(pendingInviteHref()).toBeNull();
    expect(storage.size).toBe(0);
  });
  it("survives disabled storage without throwing or inventing a continuation", () => {
    vi.stubGlobal("sessionStorage", { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } });
    expect(() => rememberInvite(id, token)).not.toThrow();
    expect(pendingInviteHref()).toBeNull();
  });
});
