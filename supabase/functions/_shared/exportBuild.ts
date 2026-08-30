// P3: builds the member export snapshot.
//
// One snapshot feeds both output formats, so the readable ZIP and the
// machine-readable JSON always describe exactly the same data. Prohibited
// fields are stripped here, once, rather than per-format.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EXPORTABLE, INVENTORY, PROHIBITED_EXPORT_COLUMNS } from "./inventory.ts";

export interface Snapshot {
  meta: Record<string, unknown>;
  categories: Record<string, Record<string, unknown>[]>;
}

function scrub(row: Record<string, unknown>, redact: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const lower = k.toLowerCase();
    if (redact.includes(k)) continue;
    if (PROHIBITED_EXPORT_COLUMNS.some((p) => lower === p || lower.endsWith("_" + p))) continue;
    out[k] = v;
  }
  return out;
}

export async function buildSnapshot(
  admin: SupabaseClient,
  userId: string,
  email: string,
): Promise<Snapshot> {
  const { data: vps } = await admin
    .from("visitor_profiles").select("id").eq("user_id", userId);
  const vpIds = (vps ?? []).map((v: { id: string }) => v.id);

  // Parent-owned surfaces need the member's parent keys resolved first.
  const { data: parentTickets } = await admin
    .from("support_tickets").select("id").eq("user_id", userId);
  const ticketIds = (parentTickets ?? []).map((t: { id: string }) => t.id);

  // Orders are claimed ONLY through immutable ownership: orders.user_id, or an
  // order attached to a subscription owned by this member. An order is never
  // claimed from customer_email or from any JWT email claim.
  const { data: subs } = await admin
    .from("subscriptions").select("id").eq("user_id", userId);
  const subIds = (subs ?? []).map((s: { id: string }) => s.id);
  const ownedOrderIds = new Set<string>();
  {
    const { data: byUser } = await admin.from("orders").select("id").eq("user_id", userId);
    for (const o of byUser ?? []) ownedOrderIds.add((o as { id: string }).id);
    if (subIds.length) {
      const { data: bySub } = await admin.from("orders").select("id").in("subscription_id", subIds);
      for (const o of bySub ?? []) ownedOrderIds.add((o as { id: string }).id);
    }
  }
  const orderIds = Array.from(ownedOrderIds);

  const categories: Record<string, Record<string, unknown>[]> = {};
  const coverage: Record<string, number> = {};

  for (const entry of EXPORTABLE) {
    let rows: Record<string, unknown>[] = [];
    const q = admin.from(entry.table).select("*");

    if (entry.match === "visitor_profile") {
      if (vpIds.length) {
        const { data } = await q.in(entry.column, vpIds);
        rows = data ?? [];
      }
    } else if (entry.match === "order_ownership") {
      if (orderIds.length) {
        const { data } = await q.in(entry.column, orderIds);
        rows = data ?? [];
      }
    } else if (entry.match === "email") {
      // Legacy pre-account surfaces whose only subject key is the member's own
      // email (marketing lead / intake records). Never used for commerce rows.
      const { data } = await q.ilike(entry.column, email);
      rows = data ?? [];
    } else if (entry.match === "parent") {
      if (entry.table === "support_ticket_notes" && ticketIds.length) {
        const { data } = await q.in(entry.column, ticketIds);
        rows = (data ?? []).map((r: Record<string, unknown>) => ({
          ...r,
          body_included: false,
          author_id_included: false,
          manual_privacy_review_required: true,
          note: "Internal support note. Raw body and staff identifiers are excluded from automatic export; request manual privacy review if needed.",
        }));
      }
    } else {
      const { data } = await q.eq(entry.column, userId);
      rows = data ?? [];
    }

    categories[entry.table] = rows.map((r) => scrub(r, entry.redact));
    coverage[entry.table] = categories[entry.table].length;
  }

  // Legacy consent: included, labelled, never treated as valid current consent.
  const legacyEntry = INVENTORY.find((e) => e.table === "phi_consent")!;
  let legacy: Record<string, unknown>[] = [];
  {
    const filter = vpIds.length
      ? `user_id.eq.${userId},visitor_profile_id.in.(${vpIds.join(",")})`
      : `user_id.eq.${userId}`;
    const { data } = await admin.from("phi_consent").select("*").or(filter);
    legacy = (data ?? []).map((r: Record<string, unknown>) => ({
      record_type: "legacy_phi_consent",
      valid_as_current_consent: false,
      ...scrub(r, legacyEntry.redact),
    }));
  }
  categories.legacy_phi_consent = legacy;
  coverage.legacy_phi_consent = legacy.length;

  // One timestamp for the whole snapshot, so the ZIP and the JSON built from
  // this snapshot are provably the same generation.
  const generatedAt = new Date().toISOString();
  return {
    meta: {
      exported_at: generatedAt,
      generated_at: generatedAt,
      timestamp_zone: "UTC",
      user_id: userId,
      schema_version: "p3-2",
      units: {
        blood_sugar: "mg/dL",
        a1c: "percent (and mmol/mol where recorded)",
        water: "ounces",
        weight: "as recorded by the member",
        durations: "hours unless the field name says seconds",
      },
      categories_included: Object.keys(categories).sort(),
      row_counts: coverage,
      ownership_basis: {
        orders: "orders.user_id, or an order attached to a subscription owned by this account. customer_email is never used to claim an order.",
        support_ticket_notes: "inherited from the member's own support ticket; note body and staff identifiers excluded.",
      },
      excluded_surfaces: {
        billing_holds_columns: "processor dispute and charge identifiers are redacted; the hold record itself is retained under financial and anti-fraud retention and is not deleted with the account.",
        community_answer_embeddings: "derived search vectors of your community answers; not exported, removed automatically with the answer.",
      },
      notes: [
        "All timestamps are ISO 8601 in UTC.",
        "Raw IP addresses, full user-agent strings, session tokens, device credentials and one-time security tokens are deliberately excluded.",
        "Records labelled legacy_phi_consent are retired history and are not valid current consent for AI processing.",
        "Payment card data is never held by this service and therefore never appears in an export.",
      ],
    },
    categories,
  };
}

export function snapshotReadme(snap: Snapshot): string {
  const lines = [
    "The Diabetes Reset Method — your data export",
    "",
    `Exported at: ${snap.meta.exported_at} (UTC)`,
    "",
    "This archive contains one CSV per category. The file export.json in this",
    "archive holds exactly the same data in machine-readable form.",
    "",
    "Units and conventions:",
    ...Object.entries(snap.meta.units as Record<string, string>).map(([k, v]) => `  - ${k}: ${v}`),
    "",
    "Categories:",
    ...Object.entries(snap.categories).map(([k, v]) => `  - ${k}.csv (${v.length} rows)`),
    "",
    "Excluded on purpose:",
    ...(snap.meta.notes as string[]).map((n) => `  - ${n}`),
    "",
  ];
  return lines.join("\n");
}
