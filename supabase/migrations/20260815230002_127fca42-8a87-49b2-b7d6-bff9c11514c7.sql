DELETE FROM public.visitor_sessions WHERE created_at > now() - interval '20 minutes';
DELETE FROM public.visitor_profiles vp WHERE vp.created_at > now() - interval '20 minutes' AND vp.user_id IS NULL;