#!/usr/bin/env node
/**
 * Production-release gate (Prompt 4 final authority).
 *
 * Run on the production release path BEFORE publishing: `npm run release:verify`.
 * Preview builds are intentionally unaffected — they may keep placeholders and
 * must keep showing the draft banner.
 *
 * It fails (exit 1) when any of the following is true:
 *   1. src/config/legal.ts entity_status is not "active", or any required legal
 *      identity field is missing or still a [[PLACEHOLDER]].
 *   2. Any unresolved [[...]] legal placeholder remains in shipped source.
 *   3. The preview-only DraftBanner is missing its production guard.
 *   4. A built dist/ bundle contains the draft banner text, a placeholder,
 *      the payment screenshot fixture, or any test-only payment bypass.
 *   5. A professional legal approval is claimed anywhere in shipped source.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const failures = [];
const PLACEHOLDER = /\[\[[A-Z][A-Z0-9 _./|\-]{2,120}\]\]/g;
const BANNER_TEXT =
  "Draft legal information — UK company registration and owner review must be completed before publication.";
const FIXTURE_TOKENS = ["state_fixture", "readDevFixture", "devPaymentFixture"];
const FALSE_APPROVAL =
  /(reviewed|approved|certified)\s+by\s+(our\s+)?(counsel|lawyers?|solicitors?|attorneys?)|legally\s+approved|HIPAA[- ]compliant/i;

const SKIP_FILES = new Set([
  "src/components/ui/sidebar.tsx",
  "src/test/legalGates.test.ts",
  "src/test/productionBundle.test.ts",
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

// 1. Legal identity completeness (parsed from the typed config source).
const legalPath = join(root, "src/config/legal.ts");
if (!existsSync(legalPath)) {
  failures.push("src/config/legal.ts is missing — the legal identity source of truth is absent.");
} else {
  const legalSrc = readFileSync(legalPath, "utf8");
  const read = (key) => {
    const m = legalSrc.match(new RegExp(`${key}:\\s*\\n?\\s*"([^"]*)"`));
    return m ? m[1] : "";
  };
  if (read("entity_status") !== "active") {
    failures.push('Legal identity entity_status is not "active" (UK company not incorporated yet).');
  }
  for (const key of [
    "registered_company_name",
    "company_number",
    "registered_jurisdiction",
    "registered_office_address",
    "owner_review_date",
    "governing_law_text",
    "ico_fee_assessment_status",
    "ico_fee_assessment_date",
  ]) {
    const value = read(key);
    if (!value.trim() || /\[\[.+\]\]/.test(value)) {
      failures.push(`Legal identity field "${key}" is missing or unresolved.`);
    }
  }
}

// 2. Unresolved legal placeholders in shipped source + 5. false legal approval.
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
    if (FALSE_APPROVAL.test(line)) {
      failures.push(`Unsupported legal-approval claim in ${rel}:${i + 1}`);
    }
  });
}
if (placeholders.length) {
  failures.push(
    `Unresolved legal placeholders (${placeholders.length}):\n` +
      placeholders.map((p) => `    ${p}`).join("\n"),
  );
}

// 3. DraftBanner must be compiled out of production builds.
const bannerPath = join(root, "src/components/landing/DraftBanner.tsx");
if (existsSync(bannerPath)) {
  const banner = readFileSync(bannerPath, "utf8");
  if (!banner.includes('import.meta.env.MODE !== "production"')) {
    failures.push("DraftBanner is missing its production guard and could ship to production.");
  }
} else {
  failures.push("DraftBanner.tsx is missing — the preview review gate is not in place.");
}

// 4. Build output must not contain banner text, placeholders or payment fixtures.
const distFiles = walk(join(root, "dist"), [".js", ".html", ".css"]);
for (const file of distFiles) {
  const rel = file.replace(`${root}/`, "");
  const text = readFileSync(file, "utf8");
  if (text.includes(BANNER_TEXT)) failures.push(`Draft banner text found in build output: ${rel}`);
  const distHits = text.match(PLACEHOLDER);
  if (distHits) {
    failures.push(
      `Legal placeholder found in build output: ${rel} (${[...new Set(distHits)].slice(0, 5).join(", ")})`,
    );
  }
  for (const token of FIXTURE_TOKENS) {
    if (text.includes(token)) {
      failures.push(`Test-only payment bypass token "${token}" found in build output: ${rel}`);
    }
  }
}

if (failures.length) {
  console.error("\nPRODUCTION RELEASE BLOCKED\n");
  for (const f of failures) console.error(`  - ${f}\n`);
  console.error(
    "Complete the UK company registration values and the owner review, then re-run. Do not bypass this gate.\n",
  );
  process.exit(1);
}

console.log("Release gate passed: legal identity complete, no placeholders, no fixture leakage.");
