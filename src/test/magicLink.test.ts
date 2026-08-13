import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  findUserByEmail,
  normalizeEmail,
  PER_PAGE,
  type AdminListUsersClient,
} from "../../supabase/functions/_shared/findUserByEmail";
import { safeNextServer, DEFAULT_NEXT } from "../../supabase/functions/_shared/safeNext";
import { MAGIC_LINK_NEUTRAL_RESPONSE } from "@/lib/authCopy";

const FN = readFileSync("supabase/functions/send-magic-link/index.ts", "utf8");
const EMAIL_SHARED = readFileSync("supabase/functions/_shared/email.ts", "utf8");
const CONFIG_SHARED = readFileSync("supabase/functions/_shared/config.ts", "utf8");

function fakeAdmin(users: Array<{ id: string; email: string }>, opts: { error?: boolean } = {}) {
  const calls: number[] = [];
  const client: AdminListUsersClient = {
    auth: {
      admin: {
        listUsers: async ({ page, perPage }) => {
          calls.push(page);
          if (opts.error) return { error: new Error("boom") };
          const start = (page - 1) * perPage;
          return { data: { users: users.slice(start, start + perPage) } };
        },
      },
    },
  };
  return { client, calls };
}

const manyUsers = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `u${i}`, email: `member${i}@example.com` }));

describe("user-by-email resolver", () => {
  it("finds a user beyond the first 200 records", async () => {
    const users = manyUsers(520);
    const { client, calls } = fakeAdmin(users);
    const found = await findUserByEmail(client, "member515@example.com");
    expect(found).toEqual({ userId: "u515" });
    expect(calls).toEqual([1, 2, 3]);
    expect(PER_PAGE).toBe(200);
  });

  it("returns null when the user does not exist, after exhausting pages", async () => {
    const { client, calls } = fakeAdmin(manyUsers(350));
    expect(await findUserByEmail(client, "nobody@example.com")).toBeNull();
    expect(calls).toEqual([1, 2]);
  });

  it("matches mixed-case and whitespace-padded email", async () => {
    const { client } = fakeAdmin(manyUsers(250));
    expect(await findUserByEmail(client, "  MEMBER240@Example.COM  ")).toEqual({ userId: "u240" });
    expect(normalizeEmail("  A@B.COM ")).toBe("a@b.com");
  });

  it("fails closed (null) on a listing error and rejects empty input", async () => {
    const { client } = fakeAdmin(manyUsers(10), { error: true });
    expect(await findUserByEmail(client, "member1@example.com")).toBeNull();
    const clean = fakeAdmin(manyUsers(10));
    expect(await findUserByEmail(clean.client, "   ")).toBeNull();
  });
});

describe("strict server-side next validation", () => {
  it.each([
    "/app",
    "/app/progress",
    "/app/progress?tab=weight",
    "/app/day/3#notes",
  ])("allows %s", (v) => expect(safeNextServer(v)).toBe(v));

  it("decodes safe encoded paths", () => {
    expect(safeNextServer("%2Fapp%2Fprogress")).toBe("/app/progress");
  });

  it.each([
    "https://evil.com",
    "http://evil.com/app",
    "//evil.com",
    "\\\\evil.com",
    "/\\evil.com",
    "%2F%2Fevil.com",
    "%252F%252Fevil.com",
    "%255Cevil.com",
    "javascript:alert(1)",
    "/javascript:alert(1)",
    "data:text/html,<script>",
    "app/progress",
    "",
    "   ",
    "%E0%A4%A",
    "/app\u0000/x",
  ])("rejects %s → default", (v) => expect(safeNextServer(v)).toBe(DEFAULT_NEXT));

  it("rejects non-string values", () => {
    expect(safeNextServer(undefined)).toBe("/app");
    expect(safeNextServer({ toString: () => "/app" })).toBe("/app");
  });
});

describe("auth email is independent of marketing and automation flags", () => {
  it("sendAuthEmail checks only auth_email_enabled", () => {
    const authFn = EMAIL_SHARED.slice(EMAIL_SHARED.indexOf("export async function sendAuthEmail"));
    expect(authFn).toContain("authEmailEnabled");
    expect(authFn).not.toContain("emailAllowed");
    expect(authFn).not.toContain("email_delivery_enabled");
    expect(authFn).not.toContain("marketing_email_enabled");
    expect(authFn).not.toContain("transactional_automation_enabled");
  });

  it("the auth gate defaults to true so a config failure cannot lock members out", () => {
    expect(CONFIG_SHARED).toContain('getConfig<boolean>(admin, "auth_email_enabled", true)');
  });

  it("send-magic-link uses the auth path, not the marketing gate", () => {
    const code = FN.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    expect(code).toContain("sendAuthEmail");
    expect(code).not.toContain("sendGatedEmail");
    expect(code).not.toContain("emailAllowed");
    expect(code).not.toContain("email_delivery_enabled");
  });
});

describe("magic-link configuration migrations", () => {
  const dir = "supabase/migrations";
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");

  it("enables auth email and never turns it off", () => {
    expect(sql).toMatch(/'auth_email_enabled',\s*'true'::jsonb/);
    expect(sql).not.toMatch(/'auth_email_enabled',\s*'false'/);
    expect(sql).not.toMatch(/auth_email_enabled[^\n]*=\s*'false'/);
  });

  it("keeps marketing and automation email off", () => {
    expect(sql).toMatch(/'transactional_automation_enabled',\s*'false'::jsonb/);
    expect(sql).toMatch(/'marketing_email_enabled',\s*'false'::jsonb/);
  });
});

describe("enumeration safety, abuse controls and token handling", () => {
  it("returns one identical neutral body for every accepted request", () => {
    const bodies = FN.match(/JSON\.stringify\(\{ message: [^}]+\}\)/g) ?? [];
    expect(bodies.length).toBeGreaterThan(0);
    expect(new Set(bodies).size).toBe(1);
    expect(FN).toContain(MAGIC_LINK_NEUTRAL_RESPONSE);
  });

  it("never claims unconditionally that an email was sent", () => {
    expect(MAGIC_LINK_NEUTRAL_RESPONSE.startsWith("If an account matches that email")).toBe(true);
    expect(FN).not.toMatch(/temporarily unavailable/i);
  });

  it("does not branch the response on provider failure after a match", () => {
    const tail = FN.slice(FN.indexOf("if (!result.sent)"));
    expect(tail).not.toMatch(/status: (4|5)\d\d/);
  });

  it("applies per-IP, per-hashed-email and duplicate-click limits", () => {
    expect(FN).toContain('scope: "magic_link_ip"');
    expect(FN).toContain('scope: "magic_link_email"');
    expect(FN).toContain('scope: "magic_link_dupe"');
    expect(FN).toMatch(/windowSeconds: 60,\s*limit: 1/);
  });

  it("keys rate limits on a digest, never the raw address", () => {
    expect(FN).toContain("emailDigest");
    expect(FN).toContain("IP_HMAC_KEY");
    expect(FN).not.toMatch(/scope: `e:\$\{cleanEmail\}`/);
  });

  it("preserves the exact-origin check and never trusts a client user id", () => {
    expect(FN).toContain("requireAllowedOrigin");
    expect(FN).toContain("findUserByEmail(sb as never, cleanEmail)");
    expect(FN).not.toMatch(/user_id\s*=\s*body|req\.json\(\)[^;]*user_id/);
  });

  it("preserves the one-time, short-lived, scanner-resistant token_hash exchange", () => {
    expect(FN).toContain("hashed_token");
    expect(FN).toContain("token_hash=");
    expect(FN).toContain("type=magiclink");
    // Replay/expiry are enforced by verifyOtp on the callback, not by a GET link.
    expect(FN).not.toContain("/auth/v1/verify");
  });

  it("logs no raw email, link, token or token hash", () => {
    const logs = FN.match(/console\.(log|warn|error)\([^;]*\);/g) ?? [];
    for (const line of logs) {
      expect(line).not.toMatch(/cleanEmail|loginUrl|tokenHash|linkData|payload/);
    }
  });
});
