-- Local disposable database only; run after insights-bootstrap and both migrations.
SET ROLE service_role;
INSERT INTO public.analytics_assessments(id,user_id,protocol,checkpoint,form)
VALUES ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','de-check-v1',0,'a');
INSERT INTO public.analytics_changes(title,hypothesis,shipped_at,window_days,metric)
VALUES ('Fixture','A smaller first lesson improves completion.',now(),7,'completion');
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.analytics_assessments) <> 1 THEN RAISE EXCEPTION 'Own assessment read failed'; END IF;
  BEGIN
    UPDATE public.analytics_assessments SET reading_correct = 6;
    RAISE EXCEPTION 'Learner changed a score';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.analytics_acquisition(user_id,source,method,captured_at,new_account)
    VALUES (auth.uid(),'google','tag',now(),true);
    RAISE EXCEPTION 'Learner bypassed attribution endpoint';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM * FROM public.analytics_changes;
    RAISE EXCEPTION 'Learner read private change log';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
DO $$ BEGIN IF (SELECT count(*) FROM public.analytics_assessments) <> 0 THEN RAISE EXCEPTION 'Cross-account assessment read'; END IF; END $$;
SET ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM * FROM public.analytics_assessments;
    RAISE EXCEPTION 'Anonymous assessment read';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'PASS: own-user reads, protected scores, protected attribution, private change log' AS result;
