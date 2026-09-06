-- TEST FIXTURE: isolated, disposable PostgreSQL cluster only. Never run on a live project.
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
INSERT INTO public.events(user_id, event_id, event_name, session_id, schema_version, occurred_at)
VALUES (auth.uid(), '00000000-0000-4000-8000-000000000101', 'visit_started', '00000000-0000-4000-8000-000000000201', 2, now()) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO public.events(user_id, event_id, event_name, session_id, schema_version, occurred_at)
VALUES (auth.uid(), '00000000-0000-4000-8000-000000000101', 'visit_started', '00000000-0000-4000-8000-000000000201', 2, now()) ON CONFLICT (event_id) DO NOTHING;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.events) <> 1 THEN RAISE EXCEPTION 'Deduplication failed'; END IF;
  BEGIN
    INSERT INTO public.events(user_id,event_name) VALUES ('00000000-0000-4000-8000-000000000002','page_viewed');
    RAISE EXCEPTION 'Cross-user event write succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.user_profiles SET is_admin = true WHERE id = auth.uid();
    RAISE EXCEPTION 'Privilege escalation succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Admin role cannot be changed by a learner' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.analytics_exclusions(user_id) VALUES (auth.uid());
    RAISE EXCEPTION 'Learner changed exclusions';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SET request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
DO $$ BEGIN IF (SELECT count(*) FROM public.events) <> 0 THEN RAISE EXCEPTION 'Cross-user read succeeded'; END IF; END $$;
RESET ROLE;
SET ROLE service_role;
DO $$ BEGIN IF (SELECT count(*) FROM public.events) <> 1 THEN RAISE EXCEPTION 'Service role report failed'; END IF; END $$;
INSERT INTO public.analytics_exclusions(user_id) VALUES ('00000000-0000-4000-8000-000000000002');
SELECT schema_version, installed_at IS NOT NULL AS has_collection_start FROM public.analytics_settings;
RESET ROLE;
SELECT 'PASS: migration rerun, event deduplication, own-user RLS, private exclusions, admin-flag protection' AS result;
