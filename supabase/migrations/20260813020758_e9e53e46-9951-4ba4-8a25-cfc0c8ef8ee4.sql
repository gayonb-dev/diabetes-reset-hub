INSERT INTO public.app_config (key, value, description) VALUES
  ('auth_email_enabled', 'true'::jsonb, 'Magic-link sign-in email. Required core feature: must remain true.'),
  ('transactional_automation_enabled', 'false'::jsonb, 'Automated member email (reminders, check-ins, digests). Off.'),
  ('marketing_email_enabled', 'false'::jsonb, 'Marketing/campaign email. Off.')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;