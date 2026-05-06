
-- ============================================================
-- Sprint 1 — Hardening final (anti-tampering, FK, bucket, defs)
-- ============================================================

-- 1) Trigger anti-tampering em profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o caller for admin, permite qualquer alteração
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Cooperado não pode alterar campos sensíveis: reverte ao OLD
  NEW.cpf := OLD.cpf;
  NEW.email := OLD.email;
  NEW.quadra := OLD.quadra;
  NEW.lote := OLD.lote;
  NEW.fase := OLD.fase;
  NEW.data_compra := OLD.data_compra;
  NEW.nome_completo := OLD.nome_completo;
  NEW.primeira_senha_alterada := COALESCE(NEW.primeira_senha_alterada, OLD.primeira_senha_alterada);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_tampering_trigger ON public.profiles;
CREATE TRIGGER prevent_profile_tampering_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_tampering();

-- 2) FK obra_fotos.uploaded_by => ON DELETE SET NULL
ALTER TABLE public.obra_fotos ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE public.obra_fotos DROP CONSTRAINT IF EXISTS obra_fotos_uploaded_by_fkey;
ALTER TABLE public.obra_fotos
  ADD CONSTRAINT obra_fotos_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3) Hardening bucket obra-fotos: limite + mime types
UPDATE storage.buckets
SET file_size_limit = 52428800, -- 50 MB
    allowed_mime_types = ARRAY[
      'image/jpeg','image/png','image/webp','image/gif',
      'video/mp4','video/webm','video/quicktime',
      'application/pdf'
    ]
WHERE id = 'obra-fotos';

-- 4) Restringir LIST do bucket público obra-fotos
-- Render via URL pública continua funcionando (bucket public=true bypassa RLS no GET)
DROP POLICY IF EXISTS "Todos podem ver fotos da obra" ON storage.objects;
CREATE POLICY "Admins podem listar fotos da obra"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'obra-fotos' AND public.is_admin_or_admin_obras(auth.uid())
);

-- 5) Revogar EXECUTE de SECURITY DEFINER sensíveis
REVOKE EXECUTE ON FUNCTION public.create_profile_with_temp_password(text,text,text,text,text) FROM PUBLIC, anon, authenticated;

-- 6) Substituir geração de senha fraca (CPF) por senha aleatória segura
CREATE OR REPLACE FUNCTION public.create_profile_with_temp_password(
  p_email text,
  p_nome text,
  p_cpf text,
  p_quadra text DEFAULT NULL::text,
  p_lote text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_temp_password TEXT;
BEGIN
  -- Apenas admin/service_role pode invocar (defesa em profundidade)
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  -- Senha aleatória segura: 24 chars base64url
  v_temp_password := encode(gen_random_bytes(18), 'base64');
  v_temp_password := replace(replace(replace(v_temp_password, '/', '_'), '+', '-'), '=', '');

  INSERT INTO auth.users (
    email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, raw_app_meta_data, created_at, updated_at
  ) VALUES (
    p_email, crypt(v_temp_password, gen_salt('bf')), NOW(),
    jsonb_build_object('nome_completo', p_nome, 'must_change_password', true),
    '{"provider":"email","providers":["email"]}'::jsonb, NOW(), NOW()
  )
  RETURNING id INTO v_user_id;

  INSERT INTO public.profiles (id, nome_completo, email, cpf, quadra, lote, primeira_senha_alterada)
  VALUES (v_user_id, p_nome, p_email, p_cpf, p_quadra, p_lote, FALSE);

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'cooperado');

  RETURN v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_profile_with_temp_password(text,text,text,text,text) FROM PUBLIC, anon, authenticated;
