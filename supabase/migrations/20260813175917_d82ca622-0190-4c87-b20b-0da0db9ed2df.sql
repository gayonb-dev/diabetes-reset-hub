select public.delete_visitor_session_data('d6848af1-0b7b-426b-a2e2-2936a8b632a0'::uuid);
select public.delete_visitor_session_data('76aba006-2d3b-4699-aeca-0d7585ed1273'::uuid);
delete from public.visitor_sessions where id in ('d6848af1-0b7b-426b-a2e2-2936a8b632a0','76aba006-2d3b-4699-aeca-0d7585ed1273');
delete from public.visitor_profiles where id in ('78fb33a9-edb5-4a13-8267-953c70139fb0','045762b4-ac4b-409d-be06-9885a31bf10c');