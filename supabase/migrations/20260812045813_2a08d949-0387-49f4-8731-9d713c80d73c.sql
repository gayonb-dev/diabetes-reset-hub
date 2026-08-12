INSERT INTO public.app_config (key, value, description) VALUES
  ('ai_health_enabled', 'false'::jsonb,
   'Server AI-health gate. Defaults false. Requires processor/DPA approval before enabling.'),
  ('email_delivery_enabled', 'false'::jsonb,
   'Outbound email. Enable only after Resend production domain verification is confirmed.'),
  ('email_test_allowlist', '[]'::jsonb,
   'Explicitly approved test recipients. Must stay empty in production.'),
  ('dexcom_enabled', 'false'::jsonb,
   'Dexcom integration. MUST remain false: DEL-25 is BLOCKED and untested.'),
  ('stripe_mode', '"live"'::jsonb,
   'Stripe mode for this environment.'),
  ('retention_mode', '"report_only"'::jsonb,
   'Retention worker reports counts and purges nothing. Report-only until approved.'),
  ('stripe_deletion_enabled', 'false'::jsonb,
   'Account-deletion Stripe cancellation. MUST remain false until live-mode Stripe webhook validation passes. Separate owner approval required.')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description;

INSERT INTO public.app_config (key, value, description) VALUES
  ('phi_notice_version', '"2026-08-07.1"'::jsonb,
   'Current privacy notice version for consent capture. Bump when the notice changes.')
ON CONFLICT (key) DO UPDATE
  SET description = EXCLUDED.description;