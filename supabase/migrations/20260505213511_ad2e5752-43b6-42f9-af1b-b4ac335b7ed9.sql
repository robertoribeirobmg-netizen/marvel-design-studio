
-- 1. security_logs: restringir INSERT a service_role
DROP POLICY IF EXISTS "Service role can insert security logs" ON public.security_logs;
CREATE POLICY "Service role can insert security logs"
ON public.security_logs FOR INSERT TO service_role
WITH CHECK (true);

-- 2. sincronizacoes_cohapm: restringir INSERT a service_role
DROP POLICY IF EXISTS "System can insert synchronizations" ON public.sincronizacoes_cohapm;
CREATE POLICY "System can insert synchronizations"
ON public.sincronizacoes_cohapm FOR INSERT TO service_role
WITH CHECK (true);

-- 3. rate_limits: restringir ALL a service_role
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 4. Revogar EXECUTE em SECURITY DEFINER de anon/authenticated
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_profile_with_temp_password(text, text, text, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_profile_email() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_compradores_cohapm_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.registrar_historico_etapa_obra() FROM anon, authenticated, public;

-- has_role e is_admin_or_admin_obras precisam ser executáveis por authenticated (usadas em RLS)
-- mas não por anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_admin_obras(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_admin_obras(uuid) TO authenticated;

-- normalizar_nome e criar_chave_vinculacao são utilitárias (IMMUTABLE) — restringir
REVOKE EXECUTE ON FUNCTION public.normalizar_nome(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.criar_chave_vinculacao(text, text, text) FROM anon, public;
