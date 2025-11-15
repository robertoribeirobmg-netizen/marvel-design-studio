
-- Correção de Segurança: Adicionar search_path às funções

-- Recriar função normalizar_nome com search_path
CREATE OR REPLACE FUNCTION public.normalizar_nome(nome text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resultado text;
BEGIN
  IF nome IS NULL THEN
    RETURN '';
  END IF;
  
  resultado := UPPER(TRIM(nome));
  
  -- Remover acentos
  resultado := TRANSLATE(resultado,
    'ÁÀÃÂÉÈÊÍÌÎÓÒÕÔÚÙÛÇáàãâéèêíìîóòõôúùûç',
    'AAAAEEEIIIOOOOUUUCaaaaeeeiiioooouuuc'
  );
  
  -- Remover espaços extras
  resultado := REGEXP_REPLACE(resultado, '\s+', ' ', 'g');
  
  RETURN resultado;
END;
$$;

-- Recriar função criar_chave_vinculacao com search_path
CREATE OR REPLACE FUNCTION public.criar_chave_vinculacao(
  nome text,
  quadra text DEFAULT NULL,
  lote text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CONCAT(
    public.normalizar_nome(nome),
    '_',
    COALESCE(UPPER(TRIM(quadra)), 'SEM_QUADRA'),
    '_',
    COALESCE(UPPER(TRIM(lote)), 'SEM_LOTE')
  );
END;
$$;
