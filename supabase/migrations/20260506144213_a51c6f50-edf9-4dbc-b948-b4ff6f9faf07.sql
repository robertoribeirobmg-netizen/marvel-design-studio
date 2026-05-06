
-- Revoke EXECUTE on SECURITY DEFINER functions that should not be callable by users
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_compradores_cohapm_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.registrar_historico_etapa_obra() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_tampering() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalizar_nome(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.criar_chave_vinculacao(text, text, text) FROM PUBLIC, anon, authenticated;
-- Keep has_role and is_admin_or_admin_obras executable (used by RLS policies as the calling user)
