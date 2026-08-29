/**
 * Batch 2 closeout — focused regressions for every change made while executing
 * the approved 24-task matrix, plus the new/changed RLS policies.
 *
 * These are deliberately source-level assertions: the matrix already proved the
 * runtime behaviour in a real browser, and these tests exist so a later edit
 * cannot silently undo the fix without a failing test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("mobile notification entry point", () => {
  const layout = read("src/pages/app/AppLayout.tsx");

  it("renders a bell outside the lg-only sidebar", () => {
    expect(layout).toMatch(/lg:hidden[^]{0,200}<NotificationsBell/);
  });

  it("still renders the desktop sidebar bell", () => {
    expect(layout).toContain('<NotificationsBell variant="dark" />');
  });

  it("imports the shared bell rather than duplicating one", () => {
    const imports = layout.match(/import \{ NotificationsBell \}/g) ?? [];
    expect(imports).toHaveLength(1);
  });
});

describe("fasting page is education-only", () => {
  const fasting = read("src/pages/app/Fasting.tsx");

  it("states there is no questionnaire, screening, timer or scheduler", () => {
    const line = fasting.toLowerCase();
    for (const term of ["questionnaire", "eligibility screening", "timer", "scheduler"]) {
      expect(line).toContain(term);
    }
    expect(fasting).toMatch(/no fasting questionnaire, eligibility screening, timer or scheduler/i);
  });

  it("ships no countdown, interval or scheduling machinery", () => {
    expect(fasting).not.toMatch(/setInterval|setTimeout|countdown|FASTING_SCHEDULING_ENABLED\s*=\s*true/i);
  });
});

describe("community entry point label", () => {
  const ask = read("src/pages/app/Ask.tsx");

  it('labels the community composer "Post to community"', () => {
    expect(ask).toContain("Post to community");
  });

  it('no longer uses the ambiguous "+ Ask" button label', () => {
    expect(ask).not.toMatch(/>\s*\+\s*Ask\s*</);
    expect(ask).not.toContain('"+ Ask"');
  });
});

describe("retired admin panels", () => {
  // Strip comments: the file documents *why* the surfaces were retired.
  const admin = read("src/pages/AdminDashboard.tsx")
    .replace(/\/\*[^]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("has no Intake Forms tab", () => {
    expect(admin).not.toMatch(/Intake Forms/);
  });

  it("has no Challenge Progress tab or Active Challengers stat", () => {
    expect(admin).not.toMatch(/Challenge Progress|Active Challengers/);
  });
});

describe("orders / email RLS migrations are source-controlled and JWT-based", () => {
  const dir = "drizzle/migrations";
  const files = readdirSync(join(process.cwd(), dir)).filter((f) => f.endsWith(".sql"));
  const sqlFor = (needle: string) =>
    files.filter((f) => f.includes(needle)).map((f) => read(join(dir, f))).join("\n");

  const orders = sqlFor("orders_member_read_without_auth_users") + sqlFor("orders_prefer_immutable_ownership");
  const emails = sqlFor("email_policies_use_jwt_not_auth_users");

  it("ships both order migrations and the email-policy migration", () => {
    expect(files).toContain("0002_orders_member_read_without_auth_users.sql");
    expect(files).toContain("0003_email_policies_use_jwt_not_auth_users.sql");
    expect(files).toContain("0004_orders_prefer_immutable_ownership_and_tighten_grants.sql");
  });

  it("never subqueries auth.users from a member policy", () => {
    expect(orders + emails).not.toMatch(/from\s+auth\.users/i);
  });

  it("derives identity from the request JWT only", () => {
    expect(orders).toMatch(/auth\.jwt\(\)\s*->>\s*'email'/);
    expect(emails).toMatch(/auth\.jwt\(\)\s*->>\s*'email'/);
  });

  it("normalises the email comparison on both sides", () => {
    for (const m of (orders + emails).matchAll(/lower\(([^)]+)\)\s*=\s*lower\(/g)) {
      expect(m[0]).toContain("lower(");
    }
    expect(orders).toMatch(/lower\(customer_email\)\s*=\s*lower\(/);
  });

  it("prefers immutable user_id ownership and only falls back to email", () => {
    const latest = read(join(dir, "0004_orders_prefer_immutable_ownership_and_tighten_grants.sql"));
    expect(latest).toMatch(/user_id\s*=\s*auth\.uid\(\)/);
    expect(latest).toMatch(/user_id IS NULL[^]{0,200}customer_email/);
  });

  it("removes member write privileges on billing and retired tables", () => {
    const latest = read(join(dir, "0004_orders_prefer_immutable_ownership_and_tighten_grants.sql"));
    expect(latest).toMatch(/REVOKE INSERT, UPDATE, DELETE[^;]*ON public\.orders FROM authenticated/);
    expect(latest).toMatch(/REVOKE ALL ON public\.orders FROM anon/);
    expect(latest).toMatch(/REVOKE INSERT, UPDATE, DELETE[^;]*ON public\.challenge_progress FROM authenticated/);
  });

  it("keeps admin visibility on the has_role predicate, not the service role", () => {
    expect(orders + emails).not.toMatch(/service_role.*admin/i);
  });
});
