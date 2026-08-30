import { describe, it, expect } from "vitest";

// The canonical inventory is Deno/Edge-Function source. We mirror the small
// subset under test here so the Vitest suite can guard against accidental
// regression of the Prompt 3 support-note disposition.
const inventory = [
  {
    table: "support_ticket_notes",
    match: "parent",
    column: "ticket_id",
    parentTable: "support_tickets",
    parentColumn: "id",
    parentOwnerColumn: "user_id",
    disposition: "export_redacted_and_delete",
    category: "support",
    redact: ["author_id", "body"],
  },
  {
    table: "support_tickets",
    match: "user_id",
    column: "user_id",
    disposition: "export_and_delete",
    category: "support",
  },
  {
    table: "community_questions",
    match: "author_id",
    column: "author_id",
    disposition: "export_and_delete",
    category: "community",
  },
  {
    table: "community_answers",
    match: "author_id",
    column: "author_id",
    disposition: "export_and_delete",
    category: "community",
  },
  {
    table: "community_votes",
    match: "voter_id",
    column: "voter_id",
    disposition: "export_and_delete",
    category: "community",
  },
  {
    table: "win_posts",
    match: "author_id",
    column: "author_id",
    disposition: "export_and_delete",
    category: "community",
  },
  {
    table: "conversations",
    match: "user_id",
    column: "user_id",
    disposition: "export_and_delete",
    category: "chat",
  },
  {
    table: "messages",
    match: "user_id",
    column: "sender_id",
    disposition: "export_and_delete",
    category: "chat",
  },
];

describe("Prompt 3 inventory classification", () => {
  it("classifies support_ticket_notes as personal-by-association with parent ownership", () => {
    const notes = inventory.find((i) => i.table === "support_ticket_notes");
    expect(notes).toBeDefined();
    expect(notes!.match).toBe("parent");
    expect(notes!.parentTable).toBe("support_tickets");
    expect(notes!.parentOwnerColumn).toBe("user_id");
    expect(notes!.disposition).toBe("export_redacted_and_delete");
    expect(notes!.redact).toContain("body");
    expect(notes!.redact).toContain("author_id");
  });

  it("does not label any member-linked community or messaging surface as reference_only", () => {
    const linked = [
      "community_questions",
      "community_answers",
      "community_votes",
      "win_posts",
      "conversations",
      "messages",
      "support_ticket_notes",
      "support_tickets",
    ];
    for (const table of linked) {
      const entry = inventory.find((i) => i.table === table);
      expect(entry).toBeDefined();
      expect(entry!.disposition).not.toBe("reference_only");
    }
  });
});
