import { describe, expect, it, vi } from "vitest";
import {
  deployRender,
  deploymentAllowed,
  SUBMISSION_FREEZE_AT,
} from "../../scripts/deploy-render.mjs";

const sha = "a".repeat(40);
const start = Date.parse("2026-11-02T20:00:00Z");
const env = {
  RENDER_API_KEY: "fixture-secret",
  RENDER_SERVICE_ID: "srv-fixture",
  RENDER_WORKSPACE_ID: "tea-fixture",
  GITHUB_SHA: sha,
  GITHUB_REPOSITORY: "AndroLay/cluenite",
};
function fixture({
  branch = "main",
  head = sha,
  terminal = "live",
  alreadyLive = false,
} = {}) {
  let time = start;
  const urls: string[] = [];
  const mutations: { url: string; body: unknown }[] = [];
  const log = vi.fn();
  const request = vi.fn(async (url: string, options: RequestInit = {}) => {
    urls.push(url);
    if (options.method === "POST")
      mutations.push({
        url,
        body: options.body ? JSON.parse(String(options.body)) : null,
      });
    let data: unknown;
    let status = 200;
    if (url.endsWith("/commits/main")) data = { sha: head };
    else if (url.endsWith("/deploys?limit=10"))
      data = alreadyLive
        ? [{ deploy: { id: "dep-test", status: "live", commit: { id: sha } } }]
        : [];
    else if (url.endsWith("/deploys/dep-test"))
      data = { id: "dep-test", status: terminal, commit: { id: sha } };
    else if (url.endsWith("/deploys") && options.method === "POST")
      data = {
        id: "dep-test",
        status: "build_in_progress",
        commit: { id: sha },
      };
    else if (url.endsWith("/services/srv-fixture"))
      data = {
        ownerId: "tea-fixture",
        repo: "https://github.com/AndroLay/cluenite",
        branch,
        autoDeployTrigger: "off",
        serviceDetails: { url: "https://cluenite-app.onrender.com" },
      };
    else if (url.endsWith("/api/me")) {
      data = {};
      status = 401;
    } else if (url.endsWith("/health/ready")) data = { status: "ready" };
    else data = {};
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  return {
    request,
    mutations,
    urls,
    log,
    now: () => time,
    sleep: async (ms: number) => {
      time += ms;
    },
  };
}

describe("checked main deployment", () => {
  it("freezes at the exact submission deadline", async () => {
    expect(deploymentAllowed(Date.parse(SUBMISSION_FREEZE_AT) - 1)).toBe(true);
    expect(deploymentAllowed(Date.parse(SUBMISSION_FREEZE_AT))).toBe(false);
    const f = fixture();
    await expect(
      deployRender({ ...f, env, now: () => Date.parse(SUBMISSION_FREEZE_AT) }),
    ).rejects.toThrow("frozen");
    expect(f.request).not.toHaveBeenCalled();
  });
  it("reserves enough time before starting a deployment", async () => {
    const f = fixture();
    await expect(
      deployRender({
        ...f,
        env,
        now: () => Date.parse(SUBMISSION_FREEZE_AT) - 16 * 60_000,
      }),
    ).rejects.toThrow("Insufficient time");
    expect(f.request).not.toHaveBeenCalled();
  });
  it("does not verify a deployment that becomes live after the freeze", async () => {
    const f = fixture();
    let time = start;
    await expect(
      deployRender({
        ...f,
        env,
        now: () => time,
        sleep: async () => {
          time = Date.parse(SUBMISSION_FREEZE_AT);
        },
      }),
    ).rejects.toThrow("Submission freeze reached");
    expect(
      f.urls.some((url) =>
        url.startsWith("https://cluenite-app.onrender.com/"),
      ),
    ).toBe(false);
  });
  it("cancels a pending deployment when the freeze arrives during polling", async () => {
    const f = fixture({ terminal: "build_in_progress" });
    let time = start;
    await expect(
      deployRender({
        ...f,
        env,
        now: () => time,
        sleep: async () => {
          time = Date.parse(SUBMISSION_FREEZE_AT);
        },
      }),
    ).rejects.toThrow("Submission freeze reached");
    expect(f.mutations.at(-1)?.url).toMatch(/\/cancel$/);
  });
  it("does not make provider requests without the secret", async () => {
    const f = fixture();
    await expect(
      deployRender({ ...f, env: { ...env, RENDER_API_KEY: "" } }),
    ).rejects.toThrow("GitHub Actions secret");
    expect(f.request).not.toHaveBeenCalled();
  });
  it("rejects a different Render branch", async () => {
    const f = fixture({ branch: "other" });
    await expect(deployRender({ ...f, env })).rejects.toThrow(
      "Render target differs",
    );
    expect(f.mutations).toEqual([]);
  });
  it("skips an older workflow when main has advanced", async () => {
    const f = fixture({ head: "b".repeat(40) });
    expect(await deployRender({ ...f, env })).toMatchObject({
      status: "superseded",
    });
    expect(f.mutations).toEqual([]);
  });
  it("deploys the checked SHA and verifies the live app after Render is ready", async () => {
    const f = fixture();
    expect(await deployRender({ ...f, env })).toMatchObject({
      status: "live",
      commit: sha,
      deployId: "dep-test",
    });
    expect(f.mutations).toEqual([
      {
        url: "https://api.render.com/v1/services/srv-fixture/deploys",
        body: { commitId: sha, clearCache: "do_not_clear" },
      },
    ]);
    expect(f.urls).toContain("https://cluenite-app.onrender.com/health/ready");
    expect(JSON.stringify(f.log.mock.calls)).not.toContain(env.RENDER_API_KEY);
  });
  it("verifies an already-live matching release without creating another deploy", async () => {
    const f = fixture({ alreadyLive: true });
    expect(await deployRender({ ...f, env })).toMatchObject({ status: "live" });
    expect(f.mutations).toEqual([]);
  });
  it("fails on a rejected build without claiming production verification", async () => {
    const f = fixture({ terminal: "build_failed" });
    await expect(deployRender({ ...f, env })).rejects.toThrow("build_failed");
    expect(
      f.urls.some((url) =>
        url.startsWith("https://cluenite-app.onrender.com/"),
      ),
    ).toBe(false);
  });
  it("bounds waiting when a deploy never becomes live", async () => {
    const f = fixture({ terminal: "build_in_progress" });
    await expect(deployRender({ ...f, env })).rejects.toThrow("15 minutes");
    expect(f.mutations).toHaveLength(2);
    expect(f.mutations[1].url).toMatch(/\/deploys\/dep-test\/cancel$/);
  });
});
