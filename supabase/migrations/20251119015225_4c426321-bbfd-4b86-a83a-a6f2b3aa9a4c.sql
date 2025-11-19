-- Garantir que a tabela compradores_cohapm tem todas as colunas necessárias
-- Adicionar coluna data_compra se não existir (para dados cadastrais)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'compradores_cohapm' AND column_name = 'valor_lote'
  ) THEN
    ALTER TABLE compradores_cohapm ADD COLUMN valor_lote NUMERIC;
  END IF;
END $$;

-- Adicionar índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_compradores_profile_id ON compradores_cohapm(profile_id);
CREATE INDEX IF NOT EXISTS idx_contratos_comprador_id ON contratos_cohapm(comprador_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_comprador_id ON parcelas_cohapm(comprador_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_data_vencimento ON parcelas_cohapm(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_parcelas_situacao ON parcelas_cohapm(situacao);

-- Atualizar a função que cria perfis para incluir senha inicial
CREATE OR REPLACE FUNCTION public.create_profile_with_temp_password(
  p_email TEXT,
  p_nome TEXT,
  p_cpf TEXT,
  p_quadra TEXT DEFAULT NULL,
  p_lote TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_temp_password TEXT;
BEGIN
  -- Gerar senha temporária (4 primeiros dígitos do CPF)
  v_temp_password := SUBSTRING(REGEXP_REPLACE(p_cpf, '[^0-9]', '', 'g'), 1, 4);
  
  -- Criar usuário no auth
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    p_email,
    crypt(v_temp_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('nome_completo', p_nome),
    '{"provider":"email","providers":["email"]}'::jsonb,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;
  
  -- Criar perfil
  INSERT INTO public.profiles (
    id,
    nome_completo,
    email,
    cpf,
    quadra,
    lote,
    primeira_senha_alterada
  )
  VALUES (
    v_user_id,
    p_nome,
    p_email,
    p_cpf,
    p_quadra,
    p_lote,
    FALSE
  );
  
  -- Atribuir role de cooperado
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'cooperado');
  
  RETURN v_user_id;
END;
$$;