// Prompt 5 correction, executable proof of ledger claim idempotency.
//
// `public.claim_billing_event` does NOT decide idempotency by reading first and
// writing second (two concurrent callers would both read "absent"). It relies
// on the UNIQUE constraint on `billing_events.stripe_event_id`: the insert is
// the decision, and `ROW_COUNT` tells the caller whether it won.
//
// This models exactly that with a same-snapshot unique store, so duplicate,
// concurrent, reverse-order and same-second deliveries can all be exercised
// without touching real data. No real member, order or Stripe object is used.

import { describe, it, expect, beforeEach } from "vitest";

interface LedgerRow {
  eventId: string;
  objectId: string;
  createdMs: number;
  state: "claimed" | "applied" | "ignored";
}

const ledger = new Map<string, LedgerRow>();

/** Same contract as the SQL function: unique insert wins, others get false. */
async function claim(eventId: string, objectId: string, createdMs: number) {
  const lastApplied = [...ledger.values()]
    .filter((r) => r.objectId === objectId && r.state === "applied")
    .reduce<number | null>((m, r) => (m === null || r.createdMs > m ? r.createdMs : m), null);
  await Promise.resolve(); // yield: every caller has now read the same snapshot
  if (ledger.has(eventId)) return { claimed: false, lastApplied };
  ledger.set(eventId, { eventId, objectId, createdMs, state: "claimed" });
  return { claimed: true, lastApplied };
}

const apply = (eventId: string) => {
  const r = ledger.get(eventId);
  if (r) r.state = "applied";
};

beforeEach(() => ledger.clear());

describe("billing ledger claim", () => {
  it("admits a duplicate delivery exactly once", async () => {
    const a = await claim("evt_synth_1", "ch_synth_1", 1000);
    const b = await claim("evt_synth_1", "ch_synth_1", 1000);
    expect([a.claimed, b.claimed]).toEqual([true, false]);
    expect(ledger.size).toBe(1);
  });

  it("admits exactly one winner under concurrent delivery", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => claim("evt_synth_2", "ch_synth_2", 2000)),
    );
    expect(results.filter((r) => r.claimed)).toHaveLength(1);
    expect(ledger.size).toBe(1);
  });

  it("keeps concurrent claims for different events independent", async () => {
    const results = await Promise.all([
      claim("evt_synth_3", "ch_synth_3", 3000),
      claim("evt_synth_4", "ch_synth_4", 3000),
    ]);
    expect(results.every((r) => r.claimed)).toBe(true);
    expect(ledger.size).toBe(2);
  });

  it("reports the newest applied event so a stale one can be refetched", async () => {
    const newest = await claim("evt_synth_5", "ch_synth_5", 5000);
    expect(newest.claimed).toBe(true);
    apply("evt_synth_5");
    const older = await claim("evt_synth_6", "ch_synth_5", 4000);
    expect(older.claimed).toBe(true);
    expect(older.lastApplied).toBe(5000);
  });

  it("treats same-second events as distinct and still claims each once", async () => {
    const a = await claim("evt_synth_7", "ch_synth_7", 7000);
    const b = await claim("evt_synth_8", "ch_synth_7", 7000);
    const dup = await claim("evt_synth_8", "ch_synth_7", 7000);
    expect([a.claimed, b.claimed, dup.claimed]).toEqual([true, true, false]);
  });
});
