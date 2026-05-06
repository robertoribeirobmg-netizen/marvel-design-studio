
-- Remove any leftover public-role policies on rate_limits (defensive)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='rate_limits'
      AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rate_limits', pol.policyname);
  END LOOP;
END $$;

-- Ensure only service_role policy remains
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits AS PERMISSIVE FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Remove sensitive COHAPM tables from realtime publication to prevent
-- any authenticated user subscribing and receiving PII/financial events.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='compradores_cohapm') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.compradores_cohapm';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='contratos_cohapm') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.contratos_cohapm';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='parcelas_cohapm') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.parcelas_cohapm';
  END IF;
END $$;
