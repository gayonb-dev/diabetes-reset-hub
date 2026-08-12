#!/usr/bin/env node
/**
 * Production-release gate (Prompt 4 legal authority).
 *
 * Run this on the production release path BEFORE `vite build --mode production`
 * is shipped:  `npm run release:verify`.
 *
 * It fails (exit 1) when:
 *   1. any unresolved `[[...]]` legal placeholder remains in shipped source, or
 *   2. the preview-only DraftBanner could appear in a production bundle
 *      (its `import.meta.env.MODE !== "production"` guard is missing), or
 *   3. a built dist/ bundle contains the draft banner text or a placeholder.
 *
 * Preview builds are unaffected: they may succeed with placeholders and must
 * keep showing the draft banner.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const failures = [];
// Legal placeholders are authored as [[UPPERCASE LABEL]]. The narrow shape avoids
// false positives on minified bundle code such as `t[[0]]` or CSS calc brackets.
const PLACEHOLDER = /\[\[[A-Z][A-Z0-9 _./|\-]{2,120}\]\]/g;
const BANNER_TEXT = "DRAFT — OWNER AND COUNSEL REVIEW REQUIRED. DO NOT PUBLISH.";

const SKIP_FILES = new Set([
  "src/components/ui/sidebar.tsx", // CSS calc() brackets, not a legal placeholder
  "src/test/legalGates.test.ts",
  "scripts/release-gate.mjs",
]);

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => full.endsWith(e))) out.push(full);
  }
  return out;
}

// 1. Unresolved legal placeholders in shipped source.
const sourceFiles = walk(join(root, "src"), [".ts", ".tsx", ".html"]).concat(
  existsSync(join(root, "index.html")) ? [join(root, "index.html")] : [],
);
const placeholders = [];
for (const file of sourceFiles) {
  const rel = file.replace(`${root}/`, "");
  if (SKIP_FILES.has(rel)) continue;
  const text = readFileSync(file, "utf8");
  text.split("\n").forEach((line, i) => {
    const hits = line.match(PLACEHOLDER);
    if (hits) placeholders.push(`${rel}:${i + 1}  ${hits.join(", ")}`);
  });
}
if (placeholders.length) {
  failures.push(
    `Unresolved legal placeholders (${placeholders.length}):\n` +
      placeholders.map((p) => `    ${p}`).join("\n"),
  );
}

// 2. DraftBanner must be compiled out of production builds.
const bannerPath = join(root, "src/components/landing/DraftBanner.tsx");
if (existsSync(bannerPath)) {
  const banner = readFileSync(bannerPath, "utf8");
  if (!banner.includes('import.meta.env.MODE !== "production"')) {
    failures.push("DraftBanner is missing its production guard and could ship to production.");
  }
} else {
  failures.push("DraftBanner.tsx is missing — the preview review gate is not in place.");
}

// 3. If a build output exists, it must not contain the banner text or a placeholder.
const distFiles = walk(join(root, "dist"), [".js", ".html", ".css"]);
for (const file of distFiles) {
  const text = readFileSync(file, "utf8");
  if (text.includes(BANNER_TEXT)) {
    failures.push(`Draft banner text found in build output: ${file.replace(`${root}/`, "")}`);
  }
  const distHits = text.match(PLACEHOLDER);
  if (distHits) {
    failures.push(
      `Legal placeholder found in build output: ${file.replace(`${root}/`, "")} (${[...new Set(distHits)].slice(0, 5).join(", ")})`,
    );
  }
}

if (failures.length) {
  console.error("\nPRODUCTION RELEASE BLOCKED\n");
  for (const f of failures) console.error(`  - ${f}\n`);
  console.error(
    "Supply the owner fields and counsel approval, then re-run. Do not bypass this gate.\n",
  );
  process.exit(1);
}

console.log("Release gate passed: no unresolved legal placeholders, no draft banner leakage.");
