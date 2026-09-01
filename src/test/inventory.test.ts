import { describe, it, expect } from "vitest";
// The real canonical manifest is imported, never mirrored, so evidence and
// runtime cannot drift apart again.
import {
  INVENTORY,
  REFERENCE_TABLES,
  EXPORTABLE,
  DELETABLE,
} from "../../supabase/functions/_shared/inventory.ts";

const byTable = (t: string) => INVENTORY.find((e) => e.table === t);

describe("Prompt 3 inventory classification", () => {
  it("has no table in both the manifest and the reference list", () => {
    for (const e of INVENTORY) expect(REFERENCE_TABLES).not.toContain(e.table);
  });

  it("classifies support_ticket_notes as personal-by-association with parent ownership", () => {
    const notes = byTable("support_ticket_notes")!;
    expect(notes.match).toBe("parent");
    expect(notes.parentTable).toBe("support_tickets");
    expect(notes.parentOwnerColumn).toBe("user_id");
    expect(notes.redact).toEqual(expect.arrayContaining(["body", "author_id"]));
    expect(EXPORTABLE.map((e) => e.table)).toContain("support_ticket_notes");
  });

  it("keeps every member-linked community or messaging surface out of reference_only", () => {
    for (const table of [
      "community_questions", "community_answers", "community_votes", "win_posts",
      "conversations", "messages", "support_ticket_notes", "support_tickets",
    ]) {
      expect(byTable(table)?.disposition).not.toBe("reference_only");
      expect(REFERENCE_TABLES).not.toContain(table);
    }
  });

  it("treats billing_holds as personal, exported redacted, and retained", () => {
    const holds = byTable("billing_holds")!;
    expect(holds.column).toBe("user_id");
    expect(holds.disposition).toBe("export_redacted_and_retain");
    expect(holds.redact).toEqual(expect.arrayContaining(["stripe_dispute_id", "stripe_charge_id"]));
    expect(EXPORTABLE.map((e) => e.table)).toContain("billing_holds");
    expect(DELETABLE.map((e) => e.table)).not.toContain("billing_holds");
  });

  it("treats community_answer_embeddings as personal-by-association removed by cascade", () => {
    const emb = byTable("community_answer_embeddings")!;
    expect(emb.disposition).toBe("cascade_only_not_exported");
    expect(emb.parentTable).toBe("community_answers");
    expect(REFERENCE_TABLES).not.toContain("community_answer_embeddings");
    expect(EXPORTABLE.map((e) => e.table)).not.toContain("community_answer_embeddings");
    expect(DELETABLE.map((e) => e.table)).not.toContain("community_answer_embeddings");
  });

  it("resolves orders only through immutable ownership, never customer_email", () => {
    const orders = byTable("orders")!;
    expect(orders.match).toBe("order_ownership");
    expect(orders.column).toBe("id");
    expect(INVENTORY.some((e) => e.column === "customer_email")).toBe(false);
    expect(INVENTORY.some((e) => (e.match as string) === "customer_email")).toBe(false);
  });

  it("never exports a cascade-only or reference surface", () => {
    for (const e of EXPORTABLE) {
      expect(["export_and_delete", "export_redacted_and_delete", "export_redacted_and_retain"])
        .toContain(e.disposition);
    }
  });
});
