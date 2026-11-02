import { afterEach, describe, expect, it, vi } from "vitest";
import { Q01_GALLERY_SHADOW, M01_MISSING_TROPHY } from "../../packages/cases/src/index.js";
import { createRound, toRoundSnapshot } from "../../packages/engine/src/index.js";
import { launchSession, newSessionLaunch } from "../../apps/web/src/site/sessionLaunch";

const snapshot = toRoundSnapshot(createRound(Q01_GALLERY_SHADOW, { sessionId: "new-gallery", source: "live" }), 0, null, "READY");
const accepted = { code: "ACCEPTED_NEW", reason: null, message: "Round stopped.", missing: [], revision: 2 };
afterEach(() => vi.unstubAllGlobals());

function transport(responses: (Response | Error)[]) {
  const calls: { path: string; key: string | undefined }[] = [];
  vi.stubGlobal("fetch", async (path: string, options: RequestInit) => {
    calls.push({ path, key: (options.headers as Record<string, string>)["Idempotency-Key"] });
    expect((options.headers as Record<string, string>)["X-CSRF-Token"]).toBe("fixture-csrf");
    const next = responses.shift();
    if (next instanceof Error) throw next;
    if (!next) throw new Error("Unexpected request");
    return next;
  });
  return calls;
}

describe("switching hosted cases", () => {
  it("waits for an accepted stop before creating the selected case", async () => {
    const calls = transport([Response.json({ result: accepted }), Response.json({ snapshot })]);
    const attempt = newSessionLaunch(Q01_GALLERY_SHADOW.id, "old-festival");
    expect((await launchSession(attempt, "fixture-csrf")).sessionId).toBe("new-gallery");
    expect(calls.map(call => call.path)).toEqual(["/api/sessions/old-festival/stop", "/api/sessions"]);
    expect(calls[0].key).not.toBe(calls[1].key);
  });

  it.each([401, 403, 429, 503])("does not create when stop returns HTTP %s", async status => {
    const calls = transport([Response.json({ error: "request_failed" }, { status })]);
    await expect(launchSession(newSessionLaunch(Q01_GALLERY_SHADOW.id, "old-festival"), "fixture-csrf")).rejects.toMatchObject({ status });
    expect(calls).toHaveLength(1);
  });

  it("does not mistake a successful HTTP response for an accepted stop", async () => {
    const calls = transport([Response.json({ result: { ...accepted, code: "NOT_AVAILABLE", reason: "UNKNOWN_TARGET" } })]);
    await expect(launchSession(newSessionLaunch(Q01_GALLERY_SHADOW.id, "old-festival"), "fixture-csrf")).rejects.toMatchObject({ code: "case_stop_not_accepted" });
    expect(calls).toHaveLength(1);
  });

  it("retries a lost stop response with the original stop key", async () => {
    const calls = transport([new Error("lost response"), Response.json({ result: { ...accepted, code: "ACCEPTED_ALREADY_KNOWN" } }), Response.json({ snapshot })]);
    const attempt = newSessionLaunch(Q01_GALLERY_SHADOW.id, "old-festival");
    await expect(launchSession(attempt, "fixture-csrf")).rejects.toMatchObject({ status: 0 });
    expect(attempt.stopConfirmed).toBe(false);
    await launchSession(attempt, "fixture-csrf");
    expect(calls.map(call => call.path)).toEqual(["/api/sessions/old-festival/stop", "/api/sessions/old-festival/stop", "/api/sessions"]);
    expect(calls[0].key).toBe(calls[1].key);
  });

  it("retries a lost creation with the original create key and no second stop", async () => {
    const calls = transport([Response.json({ result: accepted }), new Error("lost response"), Response.json({ snapshot })]);
    const attempt = newSessionLaunch(Q01_GALLERY_SHADOW.id, "old-festival");
    await expect(launchSession(attempt, "fixture-csrf")).rejects.toMatchObject({ status: 0 });
    expect(attempt.stopConfirmed).toBe(true);
    await launchSession(attempt, "fixture-csrf");
    expect(calls.map(call => call.path)).toEqual(["/api/sessions/old-festival/stop", "/api/sessions", "/api/sessions"]);
    expect(calls[1].key).toBe(calls[2].key);
  });

  it("rejects an incomplete or wrong-case creation response", async () => {
    transport([Response.json({ snapshot: { sessionId: "incomplete" } }), Response.json({ snapshot: { ...snapshot, caseId: M01_MISSING_TROPHY.id } })]);
    const attempt = newSessionLaunch(Q01_GALLERY_SHADOW.id);
    await expect(launchSession(attempt, "fixture-csrf")).rejects.toMatchObject({ code: "response_incomplete" });
    await expect(launchSession(attempt, "fixture-csrf")).rejects.toMatchObject({ code: "response_incomplete" });
  });

  it("does not report a replayed terminal session as a newly playable case", async () => {
    transport([Response.json({ snapshot: { ...snapshot, phase: "CANCELLED" } })]);
    await expect(launchSession(newSessionLaunch(Q01_GALLERY_SHADOW.id), "fixture-csrf")).rejects.toMatchObject({ code: "case_launch_ended" });
  });
});
