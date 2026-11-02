import { readdir, readFile, stat } from "node:fs/promises";
import console from "node:console";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skipped = new Set([
  ".git",
  ".cache",
  ".local",
  ".playwright-cli",
  ".pnpm-store",
  "node_modules",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
]);
const files = [];
const problems = [];
let links = 0;

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (skipped.has(entry.name) || entry.isSymbolicLink()) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (relative(file) === "apps/demo-video/out") continue;
      if (
        relative(directory) === "docs/reference" &&
        entry.name.startsWith("Cluenite_")
      )
        continue;
      await walk(file);
    } else if (/\.md$/i.test(entry.name)) {
      files.push(file);
    }
  }
}

function withoutFences(source) {
  let fence;
  return source
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (match) {
        if (!fence) fence = match[1];
        else if (match[1][0] === fence[0] && match[1].length >= fence.length)
          fence = undefined;
        return "";
      }
      return fence ? "" : line;
    })
    .join("\n");
}

const anchors = new Map();
async function headingIds(file) {
  if (anchors.has(file)) return anchors.get(file);
  const source = withoutFences(await readFile(file, "utf8"));
  const result = new Set();
  const counts = new Map();
  for (const match of source.matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const slug = match[1]
      .replace(/<[^>]*>/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_\- ]/gu, "")
      .replace(/ /g, "-");
    const count = counts.get(slug) ?? 0;
    counts.set(slug, count + 1);
    result.add(count ? `${slug}-${count}` : slug);
  }
  for (const match of source.matchAll(/\b(?:id|name)=["']([^"']+)["']/g))
    result.add(match[1]);
  anchors.set(file, result);
  return result;
}

function destinations(source) {
  const result = [];
  const plain = withoutFences(source).replace(/`+[^`\n]*`+/g, "");
  const patterns = [
    /!?\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+["'][^\n]*)?\)/g,
    /^ {0,3}\[[^\]\n]+\]:\s*(<[^>\n]+>|\S+)/gm,
    /\b(?:href|src)=["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of plain.matchAll(pattern)) {
      result.push({
        target: match[1].replace(/^<|>$/g, "").replace(/&amp;/g, "&"),
        offset: match.index,
      });
    }
  }
  return { plain, result };
}

await walk(root);
const rootMarkdown = files
  .filter((file) => path.dirname(file) === root)
  .map((file) => path.basename(file))
  .sort();
if (rootMarkdown.join(",") !== "AGENTS.md,README.md") {
  problems.push(
    `Root Markdown must be AGENTS.md and README.md; found ${rootMarkdown.join(", ")}.`,
  );
}

for (const file of files.sort()) {
  const { plain, result } = destinations(await readFile(file, "utf8"));
  for (const { target, offset } of result) {
    if (!target || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) continue;
    links += 1;
    const line = plain.slice(0, offset).split("\n").length;
    const location = `${relative(file)}:${line}`;
    let pathname;
    let fragment;
    try {
      const hash = target.indexOf("#");
      pathname = decodeURIComponent(
        (hash < 0 ? target : target.slice(0, hash)).split("?")[0],
      );
      fragment = hash < 0 ? "" : decodeURIComponent(target.slice(hash + 1));
    } catch {
      problems.push(`${location}: invalid URL encoding in ${target}`);
      continue;
    }
    const resolved = pathname
      ? path.resolve(
          pathname.startsWith("/") ? root : path.dirname(file),
          pathname.replace(/^\//, ""),
        )
      : file;
    if (path.relative(root, resolved).startsWith("..")) {
      problems.push(`${location}: link leaves repository: ${target}`);
      continue;
    }
    try {
      const info = await stat(resolved);
      if (fragment && info.isFile() && /\.md$/i.test(resolved)) {
        if (!(await headingIds(resolved)).has(fragment))
          problems.push(`${location}: missing heading: ${target}`);
      }
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
      problems.push(`${location}: missing target: ${target}`);
    }
  }
}

if (problems.length) {
  console.error(problems.slice(0, 25).join("\n"));
  if (problems.length > 25)
    console.error(`... ${problems.length - 25} more problems.`);
  console.error(`Documentation check failed: ${problems.length} problem(s).`);
  process.exitCode = 1;
} else {
  console.log(
    `Documentation check passed: ${files.length} Markdown files, ${links} local links; root layout valid.`,
  );
}
