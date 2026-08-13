-- Default privileges had granted the whole table to anon/authenticated.
-- Strip them, then re-grant only the sanitised columns to signed-in users
-- (RLS still limits those rows to admins).
REVOKE ALL ON public.billing_holds FROM anon, authenticated;

GRANT SELECT (id, user_id, order_id, hold_type, dispute_status, review_only,
              opened_at, resolved_at, created_at, updated_at)
  ON public.billing_holds TO authenticated;

REVOKE ALL ON public.admin_billing_holds FROM anon;
GRANT SELECT ON public.admin_billing_holds TO authenticated, service_role;