// P3: canonical personal-data inventory.
//
// Single source of truth shared by export, deletion, retention reporting and
// the staging verification harness. Every public table that can hold personal
// data MUST appear here with an explicit disposition. The verification harness
// re-queries the live catalogs and fails if a personal-data surface exists in
// the database but is absent from this manifest.

export type MatchKind =
  | "user_id"          // column equals auth user id
  | "member_id"        // column equals auth user id, legacy name
  | "author_id"
  | "voter_id"
  | "actor_user_id"
  | "visitor_profile"  // column IN (visitor profile ids bound to the user)
  | "email"            // case-insensitive email match
  | "order_ownership"  // row id IN (orders owned via orders.user_id or a member-owned subscription)
  | "cascade"          // no direct subject key; removed by FK cascade with a member-owned parent
  | "parent";          // column is a FK to parentTable.parentColumn; ownership is inherited

export type Disposition =
  | "export_and_delete"
  | "export_redacted_and_delete" // exported with sensitive columns stripped
  | "delete_only_security"       // never exported: credentials / security records
  | "delete_only_legacy"         // exported as labelled legacy, not valid consent
  | "export_redacted_and_retain" // personal, exported redacted, RETAINED under financial/anti-fraud retention
  | "cascade_only_not_exported"  // personal by association; removed only by FK cascade, never exported
  | "reference_only";            // no personal data, never exported or deleted

export interface InventoryEntry {
  table: string;
  match: MatchKind;
  column: string;
  disposition: Disposition;
  /** Lower runs first during deletion (children before parents). */
  order: number;
  /** Columns stripped before the row enters an export. */
  redact?: string[];
  category: string;
  /** For match === "parent": the parent table and its key/owner columns. */
  parentTable?: string;
  parentColumn?: string;
  parentOwnerColumn?: string;
}

export const INVENTORY: InventoryEntry[] = [
  // ---- derived / dependent rows (deleted first) ----
  { table: "meal_swaps", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 10, category: "meals" },
  { table: "community_votes", match: "voter_id", column: "voter_id", disposition: "export_and_delete", order: 10, category: "community" },
  // Derived vector + combined text of a member-authored answer: personal by
  // association, never exported (derived search artefact), and removed by the
  // ON DELETE CASCADE from community_answers / community_questions.
  {
    table: "community_answer_embeddings", match: "cascade", column: "answer_id",
    parentTable: "community_answers", parentColumn: "id", parentOwnerColumn: "author_id",
    disposition: "cascade_only_not_exported", order: 10, category: "community",
  },
  { table: "messages", match: "visitor_profile", column: "visitor_profile_id", disposition: "export_and_delete", order: 11, category: "chat" },
  { table: "visitor_engagement_scores", match: "visitor_profile", column: "visitor_profile_id", disposition: "export_and_delete", order: 11, category: "derived" },
  { table: "phi_access_log", match: "visitor_profile", column: "visitor_profile_id", disposition: "export_and_delete", order: 11, category: "audit" },
  { table: "conversations", match: "visitor_profile", column: "visitor_profile_id", disposition: "export_and_delete", order: 12, category: "chat" },

  // ---- health and program data ----
  { table: "a1c_logs", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 20, category: "health" },
  { table: "blood_sugar_readings", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 20, category: "health" },
  { table: "health_logs", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 20, category: "health" },
  { table: "member_measurements", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 20, category: "health" },
  { table: "mood_logs", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 20, category: "health" },
  { table: "water_logs", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 20, category: "habits" },
  { table: "post_meal_walks", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 20, category: "habits" },
  { table: "mindset_reads", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 20, category: "habits" },
  { table: "snack_logs", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 20, category: "habits" },
  { table: "meal_logs", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 20, category: "meals" },
  { table: "cheat_meals", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 20, category: "meals" },
  { table: "if_fasting_log", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 20, category: "fasting" },
  { table: "meal_plans", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 21, category: "meals" },
  { table: "shopping_lists", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 20, category: "meals" },
  { table: "member_daily_progress", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 20, category: "program" },
  { table: "member_progress", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 20, category: "program" },
  { table: "workout_sessions", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 20, category: "program" },
  { table: "user_badges", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 20, category: "gamification" },
  { table: "user_streaks", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 20, category: "gamification" },

  // ---- community authored content ----
  { table: "community_answers", match: "author_id", column: "author_id", disposition: "export_and_delete", order: 22, category: "community" },
  { table: "win_posts", match: "author_id", column: "author_id", disposition: "export_and_delete", order: 22, category: "community" },
  { table: "community_questions", match: "author_id", column: "author_id", disposition: "export_and_delete", order: 23, category: "community" },
  { table: "qa_submissions", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 22, category: "community" },
  { table: "qa_monthly_usage", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 22, category: "community" },
  { table: "vita_similarity_log", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 22, category: "derived" },
  { table: "activity_events", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 22, category: "derived" },

  // ---- support (Batch 1 Part E) ----
  // Notes are admin-only and tied to a member ticket. They are deleted with the
  // ticket (FK ON DELETE CASCADE) and exported as a neutral reference: the raw
  // body and staff author_id are not placed in the automatic archive.
  {
    table: "support_ticket_notes",
    match: "parent",
    column: "ticket_id",
    parentTable: "support_tickets",
    parentColumn: "id",
    parentOwnerColumn: "user_id",
    disposition: "export_redacted_and_delete",
    order: 23,
    category: "support",
    redact: ["author_id", "body"],
  },
  // Raw user agent is NOT COLLECTED (column removed 2026-08-16); only coarse
  // non-identifying client_platform / client_viewport values are stored.
  { table: "support_tickets", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 24, category: "support" },


  // ---- participation ledger and workout receipts (Batch 1 Parts F, G) ----
  { table: "points_ledger", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 22, category: "gamification" },
  { table: "workout_completion_receipts", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 20, category: "program" },

  // ---- notifications, consent, roles ----
  { table: "notifications", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 24, category: "notifications" },
  { table: "consent_records", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 24, category: "consent" },
  { table: "whatsapp_consent", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 24, category: "consent" },
  { table: "user_roles", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 24, category: "authorization" },
  { table: "oauth_client_grants", match: "member_id", column: "member_id", disposition: "export_and_delete", order: 24, category: "authorization" },
  { table: "coaching_waitlist", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 24, category: "membership" },
  { table: "coaching_interest", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 24, category: "membership" },
  { table: "deletion_requests", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 24, category: "privacy" },

  // ---- commerce ----
  { table: "subscriptions", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 25, category: "commerce" },
  { table: "dunning_attempts", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 25, category: "commerce" },
  // Ownership is resolved ONLY from immutable relationships: orders.user_id or
  // an order attached to a subscription owned by the member. customer_email is
  // never used to claim an order.
  { table: "orders", match: "order_ownership", column: "id", disposition: "export_and_delete", order: 25, category: "commerce" },
  // Dispute / chargeback holds: personal (user_id) but retained under financial
  // and anti-fraud retention. Exported redacted, never deleted with the account.
  {
    table: "billing_holds", match: "user_id", column: "user_id",
    disposition: "export_redacted_and_retain", order: 25, category: "commerce",
    redact: ["stripe_dispute_id", "stripe_charge_id"],
  },
  { table: "intake_submissions", match: "email", column: "email", disposition: "export_and_delete", order: 25, category: "commerce" },
  { table: "challenge_progress", match: "email", column: "email", disposition: "export_and_delete", order: 25, category: "legacy_challenge" },
  { table: "leads", match: "email", column: "email", disposition: "export_and_delete", order: 25, category: "marketing" },

  // ---- devices ----
  {
    table: "dexcom_connections", match: "member_id", column: "member_id",
    disposition: "export_redacted_and_delete", order: 26, category: "devices",
    redact: ["access_token_enc", "refresh_token_enc", "token_iv", "refresh_iv"],
  },

  // ---- security records: deleted, never exported ----
  { table: "reauth_tickets", match: "user_id", column: "user_id", disposition: "delete_only_security", order: 27, category: "security" },
  { table: "export_artifacts", match: "user_id", column: "user_id", disposition: "delete_only_security", order: 28, category: "security" },
  { table: "state_nonces", match: "member_id", column: "member_id", disposition: "delete_only_security", order: 27, category: "security" },
  { table: "product_validation_tokens", match: "member_id", column: "member_id", disposition: "delete_only_security", order: 27, category: "security" },
  { table: "visitor_sessions", match: "user_id", column: "user_id", disposition: "delete_only_security", order: 28, category: "security" },

  // ---- legacy consent: labelled in export, blocked for new writes ----
  { table: "phi_consent", match: "user_id", column: "user_id", disposition: "delete_only_legacy", order: 29, category: "legacy_consent", redact: ["ip_address", "user_agent"] },

  // ---- roots (deleted last, before auth identity) ----
  { table: "visitor_profiles", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 30, category: "identity" },
  { table: "profiles", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 31, category: "identity" },
  { table: "deletion_jobs", match: "user_id", column: "user_id", disposition: "export_and_delete", order: 99, category: "privacy" },
];

/** Public tables that intentionally hold no personal data. */
export const REFERENCE_TABLES = [
  "app_config", "badges", "content_items", "daily_actions", "snack_library",
  "vita_quotes", "rate_limits", "daily_digest", "broadcast_log",
  // Stripe event de-duplication / replay ledger. Keyed by stripe_event_id and
  // object_id only; carries no member column and no FK to any member table.
  "billing_events",
  // Content remediation audit of daily_actions / content_items / vita_quotes
  // copy. Keyed by table_name + record_id of editorial content only.
  "content_containment_log",
];

/** Columns that must never appear in a member export, at any depth. */
export const PROHIBITED_EXPORT_COLUMNS = [
  "access_token_enc", "refresh_token_enc", "token_iv", "refresh_iv",
  "token_hash", "ip_address", "ip_hmac", "user_agent", "user_agent_hash",
  "nonce", "token", "password", "secret", "api_key", "card", "magic_link",
];

export const EXPORTABLE = INVENTORY.filter(
  (e) => e.disposition === "export_and_delete" ||
    e.disposition === "export_redacted_and_delete" ||
    e.disposition === "export_redacted_and_retain",
);

export const DELETABLE = INVENTORY.filter(
  (e) => e.disposition !== "reference_only" &&
    e.disposition !== "cascade_only_not_exported" &&
    e.disposition !== "export_redacted_and_retain",
)
  .slice()
  .sort((a, b) => a.order - b.order);
