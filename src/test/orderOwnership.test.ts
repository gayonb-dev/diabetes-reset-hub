import { describe, expect, it } from "vitest";
import {
  assignImmutableOwner,
  normalizeOwnerEmail,
} from "../../supabase/functions/_shared/orderOwnership";

type OrderRow = { id: string; user_id: string | null; customer_email: string | null };

function makeAdmin(opts: {
  order: OrderRow | null;
  users: { id: string; email: string }[];
  /** Simulate a concurrent writer taking ownership between read and write. */
  raceWins?: boolean;
}) {
  const writes: Record<string, unknown>[] = [];
  const admin = {
    from(table: string) {
      expect(table).toBe("orders");
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: opts.order, error: null }) }),
        }),
        update: (values: Record<string, unknown>) => ({
          eq: () => ({
            is: () => ({
              select: async () => {
                if (opts.raceWins) return { data: [], error: null };
                writes.push(values);
                return { data: [{ id: opts.order?.id }], error: null };
              },
            }),
          }),
        }),
      };
    },
    auth: {
      admin: {
        listUsers: async ({ page }: { page: number; perPage: number }) => ({
          data: { users: page === 1 ? opts.users : [] },
          error: null,
        }),
      },
    },
  };
  return { admin: admin as never, writes };
}

describe("normalizeOwnerEmail", () => {
  it("normalises case and whitespace", () => {
    expect(normalizeOwnerEmail("  Member@Example.COM ")).toBe("member@example.com");
  });
  it("rejects non-addresses", () => {
    expect(normalizeOwnerEmail("not-an-email")).toBeNull();
    expect(normalizeOwnerEmail(null)).toBeNull();
    expect(normalizeOwnerEmail(42)).toBeNull();
  });
});

describe("assignImmutableOwner", () => {
  const order: OrderRow = { id: "o1", user_id: null, customer_email: "member@example.com" };
  const users = [{ id: "u1", email: "member@example.com" }];

  it("assigns the resolved account as the immutable owner", async () => {
    const { admin, writes } = makeAdmin({ order, users });
    const r = await assignImmutableOwner(admin, "cs_1", "Member@Example.com");
    expect(r).toMatchObject({ changed: true, reason: "assigned", userId: "u1" });
    expect(writes[0].user_id).toBe("u1");
  });

  it("is replay safe: an owned order is never rewritten", async () => {
    const { admin, writes } = makeAdmin({
      order: { ...order, user_id: "u1" },
      users,
    });
    const r = await assignImmutableOwner(admin, "cs_1", "member@example.com");
    expect(r).toEqual({ changed: false, reason: "already_owned" });
    expect(writes).toHaveLength(0);
  });

  it("is concurrency safe: the losing writer reports no change", async () => {
    const { admin, writes } = makeAdmin({ order, users, raceWins: true });
    const r = await assignImmutableOwner(admin, "cs_1", "member@example.com");
    expect(r).toEqual({ changed: false, reason: "raced" });
    expect(writes).toHaveLength(0);
  });

  it("leaves the order ownerless when no account matches", async () => {
    const { admin, writes } = makeAdmin({ order, users: [] });
    const r = await assignImmutableOwner(admin, "cs_1", "member@example.com");
    expect(r).toEqual({ changed: false, reason: "no_account" });
    expect(writes).toHaveLength(0);
  });

  it("never invents an owner when there is no usable address", async () => {
    const { admin } = makeAdmin({ order: { ...order, customer_email: null }, users });
    const r = await assignImmutableOwner(admin, "cs_1", null);
    expect(r).toEqual({ changed: false, reason: "no_email" });
  });

  it("reports no_order for an unknown session", async () => {
    const { admin } = makeAdmin({ order: null, users });
    const r = await assignImmutableOwner(admin, "cs_missing", "member@example.com");
    expect(r).toEqual({ changed: false, reason: "no_order" });
  });
});
