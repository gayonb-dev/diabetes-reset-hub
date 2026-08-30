// TEMPORARY Batch 2 closeout verification harness.
//
// Creates, confirms and destroys synthetic verification principals through the
// administrative Auth API. It does NOT change any global Auth setting and never
// sends email (`email_confirm: true` marks the address confirmed directly).
//
// Protected by BATCH2_HARNESS_SECRET. This function is deleted at cleanup.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const HARNESS_SECRET = Deno.env.get("BATCH2_HARNESS_SECRET_V2") ?? Deno.env.get("BATCH2_HARNESS_SECRET")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Spec {
  key: string;
  email: string;
  anchored: boolean;
  admin?: boolean;
  dayOffset?: number;
}

const SPECS: Spec[] = [
  { key: "memberA", email: "batch2-a@example.invalid", anchored: true, dayOffset: 13 },
  { key: "memberB", email: "batch2-b@example.invalid", anchored: true, dayOffset: 13 },
  { key: "memberC", email: "batch2-c@example.invalid", anchored: false },
  { key: "admin", email: "batch2-admin@example.invalid", anchored: true, dayOffset: 13, admin: true },
];

const PASSWORD = "Batch2!Harness-2026-verify";

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function provision() {
  const out: Record<string, unknown> = {};
  for (const spec of SPECS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: PASSWORD,
      email_confirm: true, // confirmed individually; no email is sent
      user_metadata: { first_name: "Batch2", synthetic_fixture: "batch2-closeout" },
    });
    if (error || !data.user) return json({ error: `create ${spec.key}: ${error?.message}` }, 500);
    const id = data.user.id;

    await admin.from("profiles").upsert(
      {
        user_id: id,
        first_name: "Batch2",
        timezone: "America/New_York",
        program_start_date: spec.anchored ? isoDaysAgo(spec.dayOffset ?? 13) : null,
      },
      { onConflict: "user_id" },
    );

    const vp = await admin.from("visitor_profiles").insert({
      user_id: id,
      anonymous_id: crypto.randomUUID(),
      metadata: { onboarded_at: new Date().toISOString(), synthetic_fixture: "batch2-closeout" },
    });
    if (vp.error) return json({ error: `visitor_profiles ${spec.key}: ${vp.error.message}` }, 500);


    if (spec.anchored) {
      const end = new Date();
      end.setUTCDate(end.getUTCDate() + 20);
      const sub = await admin.from("subscriptions").insert({
        user_id: id,
        // Synthetic, clearly-marked identifiers. No Stripe object is created or mutated.
        stripe_subscription_id: `sub_batch2_synth_${spec.key}_${crypto.randomUUID().slice(0, 8)}`,
        stripe_customer_id: `cus_batch2_synth_${spec.key}`,
        status: "active",
        cancel_at_period_end: false,
        current_period_end: end.toISOString(),
      });
      if (sub.error) return json({ error: `subscriptions ${spec.key}: ${sub.error.message}` }, 500);
    }

    if (spec.admin) {
      const ur = await admin.from("user_roles").insert({ user_id: id, role: "admin" });
      if (ur.error) return json({ error: `user_roles ${spec.key}: ${ur.error.message}` }, 500);
    }

    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: sess, error: signErr } = await anon.auth.signInWithPassword({
      email: spec.email,
      password: PASSWORD,
    });
    if (signErr || !sess.session) return json({ error: `signin ${spec.key}: ${signErr?.message}` }, 500);

    out[spec.key] = {
      id,
      email: spec.email,
      access_token: sess.session.access_token,
      refresh_token: sess.session.refresh_token,
      expires_at: sess.session.expires_at,
      session_json: JSON.stringify(sess.session),
    };
  }
  return json({ ok: true, principals: out });
}

async function serviceProbe(userId: string) {
  // service_role is deliberately exempt from the programme-day guard.
  const { data, error } = await admin
    .from("member_progress")
    .insert({ user_id: userId, day_number: 999, notes: "batch2-harness service probe" })
    .select("id")
    .maybeSingle();
  if (error) return json({ service_role_future_day_insert: "REJECTED", error: error.message });
  await admin.from("member_progress").delete().eq("id", data!.id);
  return json({ service_role_future_day_insert: "ACCEPTED", inserted_then_removed: data!.id });
}

async function cleanup(ids: string[], extraDeletes?: Record<string, string[]>) {
  const removed: Record<string, number> = {};
  const tables = [
    "member_progress", "member_daily_progress", "activity_events", "points_ledger",
    "support_tickets", "coaching_interest", "notifications", "user_streaks",
    "user_roles", "subscriptions", "consent_records", "workout_sessions", "deletion_jobs",
    "health_logs", "water_logs", "meal_logs", "qa_submissions",
  ];
  for (const t of tables) {
    const col = ["member_progress", "activity_events", "points_ledger", "support_tickets",
      "coaching_interest", "notifications", "user_streaks", "user_roles", "subscriptions",
      "consent_records", "workout_sessions", "health_logs", "qa_submissions", "deletion_jobs"].includes(t)
      ? "user_id" : "member_id";
    const { data } = await admin.from(t).delete().in(col, ids).select("id");
    removed[t] = data?.length ?? 0;
  }
  const { data: vp } = await admin.from("visitor_profiles").delete().in("user_id", ids).select("id");
  removed["visitor_profiles"] = vp?.length ?? 0;
  const { data: pr } = await admin.from("profiles").delete().in("user_id", ids).select("id");
  removed["profiles"] = pr?.length ?? 0;

  // Extra synthetic rows supplied by the local A/B harness (e.g. community content).
  if (extraDeletes) {
    for (const [table, rowIds] of Object.entries(extraDeletes)) {
      if (!rowIds.length) continue;
      const { data } = await admin.from(table).delete().in("id", rowIds).select("id");
      removed[`extra:${table}`] = data?.length ?? 0;
    }
  }

  const deleted: string[] = [];
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (!error) deleted.push(id);
  }
  const { data: remaining } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  return json({
    removed_rows: removed,
    auth_users_deleted: deleted,
    auth_users_total_remaining: remaining?.users.length ?? null,
    synthetic_remaining: (remaining?.users ?? []).filter((u) =>
      (u.email ?? "").endsWith("@example.invalid")).length,
  });
}

async function auditWindow() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  return json({
    users: (data?.users ?? []).map((u) => ({
      created_at: u.created_at,
      confirmed_at: u.confirmed_at ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
      synthetic: (u.email ?? "").endsWith("@example.invalid"),
    })),
    total: data?.users.length ?? 0,
  });
}


async function seedOrders(specs: { user_id: string; email: string; own_uid?: boolean }[]) {
  const rows = specs.map((s) => ({
    customer_name: "Batch2 Synthetic",
    customer_email: s.email,
    amount: 2700,
    currency: "usd",
    status: "paid",
    product_name: "SYNTHETIC-BATCH2-VERIFICATION",
    product_id: "synthetic-batch2",
    user_id: s.own_uid ? s.user_id : null,
  }));
  const { data, error } = await admin.from("orders").insert(rows).select("id,customer_email,user_id");
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, orders: data });
}

async function seedOrdersExplicit(rows: Record<string, unknown>[]) {
  const { data, error } = await admin.from("orders").insert(rows).select("id,user_id,subscription_id");
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, orders: data });
}

async function deleteByIds(table: string, ids: string[]) {
  if (!ids.length) return json({ table, removed: 0 });
  const { data, error } = await admin.from(table).delete().in("id", ids).select("id");
  if (error) return json({ table, error: error.message }, 500);
  return json({ table, removed: data?.length ?? 0 });
}

async function deleteByColumn(table: string, column: string, values: string[]) {
  if (!values.length) return json({ table, removed: 0 });
  const { data, error } = await admin.from(table).delete().in(column, values).select("id");
  if (error) return json({ table, error: error.message }, 500);
  return json({ table, removed: data?.length ?? 0 });
}

async function storageProbe(prefixes: string[]) {
  const out: Record<string, number> = {};
  for (const bucket of ["exports", "avatars", "uploads"]) {
    let n = 0;
    for (const p of prefixes) {
      const { data } = await admin.storage.from(bucket).list(p, { limit: 100 });
      n += data?.length ?? 0;
    }
    out[bucket] = n;
  }
  return json({ storage_objects_remaining: out });
}

async function usersExist(ids: string[]) {
  const out: Record<string, boolean> = {};
  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id);
    out[id] = Boolean(data?.user);
  }
  return json({ exists: out });
}

async function cleanupOrders() {
  const { data } = await admin.from("orders").delete()
    .eq("product_id", "synthetic-batch2").select("id");
  return json({ orders_removed: data?.length ?? 0 });
}

async function setDeletionLock(userId: string, state: string) {
  if (state === "clear") {
    await admin.from("deletion_jobs").delete().eq("user_id", userId);
    await admin.from("profiles").update({ deletion_pending: false, deletion_restricted: false })
      .eq("user_id", userId);
    return json({ ok: true, state: "clear" });
  }
  const { data, error } = await admin.from("deletion_jobs").insert({
    user_id: userId, state, identity_verified_at: new Date().toISOString(),
  }).select("id").maybeSingle();
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, job: data?.id, state });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.headers.get("x-harness-secret") !== HARNESS_SECRET) {
    return json({ error: "forbidden" }, 403);
  }
  let body: { action?: string; ids?: string[]; user_id?: string; state?: string; table?: string; column?: string; rows?: Record<string, unknown>[]; extra_deletes?: Record<string, string[]>; specs?: { user_id: string; email: string; own_uid?: boolean }[] } = {};
  try { body = await req.json(); } catch { /* boot smoke sends no body */ }

  switch (body.action) {
    case "provision": return await provision();
    case "service_probe": return await serviceProbe(body.user_id!);
    case "cleanup": return await cleanup(body.ids ?? [], body.extra_deletes ?? {});
    case "cleanup_all_synthetic": {
      const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const ids = (data?.users ?? []).filter((u) => (u.email ?? "").endsWith("@example.invalid")).map((u) => u.id);
      return await cleanup(ids);
    }
    case "audit": return await auditWindow();
    case "clear_locks": {
      const { data } = await admin.from("deletion_jobs").delete().in("user_id", body.ids ?? []).select("id");
      await admin.from("profiles").update({ deletion_pending: false, deletion_restricted: false })
        .in("user_id", body.ids ?? []);
      return json({ deletion_jobs_removed: data?.length ?? 0 });
    }
    case "purge_progress": {
      await admin.from("member_progress").delete().in("user_id", body.ids ?? []);
      await admin.from("member_daily_progress").delete().in("member_id", body.ids ?? []);
      return json({ ok: true });
    }
    case "seed_orders": return await seedOrders(body.specs ?? []);
    case "seed_orders_explicit": return await seedOrdersExplicit(body.rows ?? []);
    case "delete_by_ids": return await deleteByIds(String(body.table), body.ids ?? []);
    case "delete_by_column": return await deleteByColumn(String(body.table), String(body.column), body.ids ?? []);
    case "users_exist": return await usersExist(body.ids ?? []);
    case "storage_probe": return await storageProbe(body.ids ?? []);
    case "cleanup_orders": return await cleanupOrders();
    case "deletion_lock": return await setDeletionLock(body.user_id!, body.state ?? "clear");
    case "ping": return json({ ok: true });
    default: return json({ error: "unknown action" }, 400);
  }
});
