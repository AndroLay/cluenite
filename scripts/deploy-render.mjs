import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { setTimeout } from "node:timers";
const { fetch, AbortSignal } = globalThis;
import console from "node:console";

export const SUBMISSION_FREEZE_AT = "2026-11-02T22:00:00Z";
const API = "https://api.render.com/v1/";
const REPOSITORY = "AndroLay/cluenite";
const ORIGIN = "https://cluenite-app.onrender.com";
const WAIT_MS = 8 * 60_000;
const FREEZE_RESERVE_MS = WAIT_MS + 2 * 60_000;
const ACTIVE = new Set([
  "created",
  "queued",
  "build_in_progress",
  "pre_deploy_in_progress",
  "update_in_progress",
]);

export function deploymentAllowed(now = Date.now()) {
  return now < Date.parse(SUBMISSION_FREEZE_AT);
}

/** Deploy only the checked main commit; injected transport/time keep tests offline. */
export async function deployRender({
  env = process.env,
  request = fetch,
  now = Date.now,
  sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
  log = console.log,
} = {}) {
  if (!deploymentAllowed(now()))
    throw new Error(
      "Deployment is frozen for hackathon judging. Keep the submitted project unchanged; develop in a separate copy.",
    );
  if (now() >= Date.parse(SUBMISSION_FREEZE_AT) - FREEZE_RESERVE_MS)
    throw new Error(
      "Insufficient time to finish deployment safely before the hackathon freeze.",
    );
  const sha = env.RENDER_COMMIT_SHA || env.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/.test(sha || ""))
    throw new Error("An exact checked commit SHA is required.");
  if (env.GITHUB_REPOSITORY && env.GITHUB_REPOSITORY !== REPOSITORY)
    throw new Error("Unexpected repository.");
  if (!env.RENDER_API_KEY?.trim())
    throw new Error(
      "RENDER_API_KEY must be stored as a GitHub Actions secret.",
    );
  const serviceId = env.RENDER_SERVICE_ID;
  const ownerId = env.RENDER_WORKSPACE_ID;
  if (
    !/^srv-[a-z0-9]+$/.test(serviceId || "") ||
    !/^tea-[a-z0-9]+$/.test(ownerId || "")
  )
    throw new Error(
      "Render service/workspace variables are missing or invalid.",
    );
  async function api(path, options = {}) {
    const response = await request(API + path, {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${env.RENDER_API_KEY.trim()}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (!response.ok)
      throw new Error(
        `Render request failed (HTTP ${response.status}). Check the service events; no credentials were logged.`,
      );
    return response.json();
  }
  const service = await api(`services/${serviceId}`);
  if (
    service.ownerId !== ownerId ||
    service.repo?.replace(/\.git$/, "") !==
      `https://github.com/${REPOSITORY}` ||
    service.branch !== "main" ||
    service.autoDeployTrigger !== "off" ||
    service.serviceDetails?.url !== ORIGIN
  )
    throw new Error(
      "Render target differs from the approved main service. Automatic platform deploys must remain off.",
    );
  const headResponse = await request(
    `https://api.github.com/repos/${REPOSITORY}/commits/main`,
    {
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Accept: "application/vnd.github+json",
        ...(env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` }
          : {}),
      },
    },
  );
  if (!headResponse.ok)
    throw new Error(
      `Main commit could not be verified (HTTP ${headResponse.status}).`,
    );
  if ((await headResponse.json()).sha !== sha) {
    log("A newer main commit exists; this older release will not deploy.");
    return { status: "superseded", commit: sha };
  }
  const recent = (await api(`services/${serviceId}/deploys?limit=10`)).map(
    (item) => item.deploy || item,
  );
  let deploy = recent.find(
    (item) =>
      item.commit?.id === sha &&
      (item.status === "live" || ACTIVE.has(item.status)),
  );
  if (!deploy && recent.some((item) => ACTIVE.has(item.status)))
    throw new Error(
      "Another Render deploy is running. Wait for it before retrying.",
    );
  if (!deploy) {
    if (now() >= Date.parse(SUBMISSION_FREEZE_AT) - FREEZE_RESERVE_MS)
      throw new Error(
        "Insufficient time before the submission freeze; nothing was started.",
      );
    deploy = await api(`services/${serviceId}/deploys`, {
      method: "POST",
      body: JSON.stringify({ commitId: sha, clearCache: "do_not_clear" }),
    });
  }
  const deadline = now() + WAIT_MS;
  let previousStatus;
  while (true) {
    if (deploy.commit?.id !== sha)
      throw new Error(
        "Render reported a different source commit; stop promotion.",
      );
    if (deploy.status !== previousStatus)
      log(`Render ${deploy.id}: ${deploy.status}`);
    previousStatus = deploy.status;
    if (!deploymentAllowed(now())) {
      if (ACTIVE.has(deploy.status))
        await api(`services/${serviceId}/deploys/${deploy.id}/cancel`, {
          method: "POST",
        });
      throw new Error(
        "Submission freeze reached; pending deployment was canceled. Inspect Render events if it already went live.",
      );
    }
    if (deploy.status === "live") break;
    if (!ACTIVE.has(deploy.status))
      throw new Error(
        `Render deployment ended in ${deploy.status}. The previous live version remains the recovery baseline.`,
      );
    if (now() >= deadline) {
      await api(`services/${serviceId}/deploys/${deploy.id}/cancel`, {
        method: "POST",
      });
      throw new Error(
        "Render deployment did not become live within 8 minutes and was canceled. Inspect its events before retrying.",
      );
    }
    await sleep(15_000);
    deploy = await api(`services/${serviceId}/deploys/${deploy.id}`);
  }
  for (const [path, expected] of [
    ["/health/live", 200],
    ["/health/ready", 200],
    ["/api/cases", 200],
    ["/api/me", 401],
    ["/play", 200],
  ]) {
    const response = await request(ORIGIN + path, {
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status !== expected)
      throw new Error(
        `Production verification failed for ${path} (HTTP ${response.status}).`,
      );
    if (path === "/health/ready" && (await response.json()).status !== "ready")
      throw new Error("Production database is not ready.");
  }
  log(`Verified live commit ${sha} at ${ORIGIN}`);
  return { status: "live", commit: sha, deployId: deploy.id, url: ORIGIN };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (process.argv.includes("--check-window")) {
      const allowed =
        Date.now() < Date.parse(SUBMISSION_FREEZE_AT) - FREEZE_RESERVE_MS;
      if (process.env.GITHUB_OUTPUT)
        await appendFile(process.env.GITHUB_OUTPUT, `allowed=${allowed}\n`);
      console.log(
        allowed
          ? "Deployment window is open."
          : "Deployment is frozen for hackathon judging.",
      );
    } else {
      const result = await deployRender();
      if (process.env.GITHUB_STEP_SUMMARY)
        await appendFile(
          process.env.GITHUB_STEP_SUMMARY,
          `Cluenite deployment: **${result.status}**\n\nCommit: \`${result.commit}\`\n${result.url || ""}\n`,
        );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
