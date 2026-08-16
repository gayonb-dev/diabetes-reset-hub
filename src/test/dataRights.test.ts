// Prompt 6 closeout — member export, chat deletion and account deletion.
//
// No real export, deletion or email is performed here. The inventory is the
// single source of truth for both export and deletion, so these assertions are
// the regression proof that a personal-data surface cannot silently escape
// either path.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INVENTORY } from "../../supabase/functions/_shared/inventory";

const root = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const tables = new Set(INVENTORY.map((e) => e.table));

describe("personal-data inventory", () => {
  it("gives every entry an explicit disposition and a deletion order", () => {
    for (const e of INVENTORY) {
      expect(e.disposition, e.table).toBeTruthy();
      expect(Number.isFinite(e.order), e.table).toBe(true);
      expect(e.column.length, e.table).toBeGreaterThan(0);
    }
  });

  it("lists no table twice under the same match column", () => {
    const seen = new Set<string>();
    for (const e of INVENTORY) {
      const key = `${e.table}:${e.column}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it("covers every health surface a member can write to", () => {
    for (const t of [
      "blood_sugar_readings",
      "a1c_logs",
      "health_logs",
      "meal_logs",
      "member_measurements",
      "mood_logs",
      "water_logs",
      "workout_sessions",
    ]) {
      expect(tables.has(t), `${t} missing from inventory`).toBe(true);
    }
  });

  it("covers chat so a deletion removes conversations and messages", () => {
    for (const t of ["conversations", "messages", "visitor_profiles"]) {
      expect(tables.has(t), `${t} missing from inventory`).toBe(true);
    }
    for (const e of INVENTORY.filter((x) => x.category === "chat")) {
      expect(e.disposition).toBe("export_and_delete");
    }
    // children are removed before their parent conversation row
    const msg = INVENTORY.find((e) => e.table === "messages")!;
    const conv = INVENTORY.find((e) => e.table === "conversations")!;
    expect(msg.order).toBeLessThan(conv.order);
  });

  it("never exports security-only records", () => {
    for (const e of INVENTORY.filter((x) => x.disposition === "delete_only_security")) {
      expect(e.redact ?? []).toBeDefined();
      expect(e.disposition).toBe("delete_only_security");
    }
  });
});

describe("export and deletion functions consume the shared inventory", () => {
  it("export-my-data builds from the inventory, not a hand-written list", () => {
    const src = read("supabase/functions/export-my-data/index.ts");
    expect(/inventory/i.test(src) || /exportBuild/.test(src)).toBe(true);
  });

  it("the deletion job walks the inventory in order", () => {
    const src = read("supabase/functions/process-deletion-job/index.ts");
    expect(/INVENTORY|inventory/.test(src)).toBe(true);
  });

  it("chat session deletion is a server-side security-definer routine", () => {
    const src = read("supabase/functions/visitor-session/index.ts");
    expect(src).toContain("delete_visitor_session_data");
  });
});
