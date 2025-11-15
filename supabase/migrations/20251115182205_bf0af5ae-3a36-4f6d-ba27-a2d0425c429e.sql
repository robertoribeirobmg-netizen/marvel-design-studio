
-- ============================================================================
-- MIGRAÇÃO: Estrutura COHAPM Integrada
-- Adapta tabelas existentes para receber dados completos COHAPM
-- ============================================================================

-- Adicionar campos na tabela compradores_cohapm
ALTER TABLE public.compradores_cohapm
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS telefone2 text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS profissao text,
  ADD COLUMN IF NOT EXISTS nacionalidade text,
  ADD COLUMN IF NOT EXISTS naturalidade text,
  ADD COLUMN IF NOT EXISTS nome_conjuge text,
  ADD COLUMN IF NOT EXISTS cpf_conjuge text,
  ADD COLUMN IF NOT EXISTS rg_conjuge text,
  ADD COLUMN IF NOT EXISTS quadra text,
  ADD COLUMN IF NOT EXISTS lote text,
  ADD COLUMN IF NOT EXISTS status_contrato text,
  ADD COLUMN IF NOT EXISTS data_venda timestamp with time zone,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS valor_total_contratos numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_pago numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_pendente numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_contratos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_parcelas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parcelas_pagas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parcelas_atrasadas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS situacao_financeira text;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_compradores_cohapm_quadra_lote 
  ON public.compradores_cohapm(quadra, lote);
CREATE INDEX IF NOT EXISTS idx_compradores_cohapm_situacao 
  ON public.compradores_cohapm(situacao_financeira);
CREATE INDEX IF NOT EXISTS idx_compradores_cohapm_profile 
  ON public.compradores_cohapm(profile_id);

-- Adicionar campos na tabela contratos_cohapm
ALTER TABLE public.contratos_cohapm
  ADD COLUMN IF NOT EXISTS numero_ficha text,
  ADD COLUMN IF NOT EXISTS valor_financiado numeric(15,2),
  ADD COLUMN IF NOT EXISTS metragem numeric(10,2),
  ADD COLUMN IF NOT EXISTS observacoes_contrato text;

-- Adicionar campos na tabela parcelas_cohapm  
ALTER TABLE public.parcelas_cohapm
  ADD COLUMN IF NOT EXISTS numero_lancamento text,
  ADD COLUMN IF NOT EXISTS numero_baixa text,
  ADD COLUMN IF NOT EXISTS codigo_remessa text,
  ADD COLUMN IF NOT EXISTS data_lancamento date,
  ADD COLUMN IF NOT EXISTS data_recebimento date,
  ADD COLUMN IF NOT EXISTS valor_original numeric(15,2),
  ADD COLUMN IF NOT EXISTS valor_total_calculado numeric(15,2),
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS banco text,
  ADD COLUMN IF NOT EXISTS agencia text,
  ADD COLUMN IF NOT EXISTS conta text,
  ADD COLUMN IF NOT EXISTS observacoes_parcela text,
  ADD COLUMN IF NOT EXISTS periodo_inicio date,
  ADD COLUMN IF NOT EXISTS periodo_fim date;

-- Criar função para normalizar nomes (sem acentos)
CREATE OR REPLACE FUNCTION public.normalizar_nome(nome text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
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

-- Criar função para criar chave de vinculação única
CREATE OR REPLACE FUNCTION public.criar_chave_vinculacao(
  nome text,
  quadra text DEFAULT NULL,
  lote text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
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

-- Criar view para resumo financeiro por comprador
CREATE OR REPLACE VIEW public.vw_resumo_financeiro_cohapm AS
SELECT 
  c.id,
  c.nome,
  c.cpf_cnpj,
  c.telefone,
  c.email,
  c.quadra,
  c.lote,
  c.empreendimento,
  c.profile_id,
  c.valor_total_contratos,
  c.valor_pago,
  c.valor_pendente,
  c.total_contratos,
  c.total_parcelas,
  c.parcelas_pagas,
  c.parcelas_atrasadas,
  c.situacao_financeira,
  CASE 
    WHEN c.valor_total_contratos > 0 THEN
      ROUND((c.valor_pago / c.valor_total_contratos * 100)::numeric, 2)
    ELSE 0
  END AS percentual_pago,
  COUNT(DISTINCT ct.id) AS contratos_registrados,
  COUNT(DISTINCT p.id) AS parcelas_registradas
FROM public.compradores_cohapm c
LEFT JOIN public.contratos_cohapm ct ON c.id = ct.comprador_id
LEFT JOIN public.parcelas_cohapm p ON c.id = p.comprador_id
GROUP BY c.id, c.nome, c.cpf_cnpj, c.telefone, c.email, c.quadra, c.lote,
         c.empreendimento, c.profile_id, c.valor_total_contratos, c.valor_pago,
         c.valor_pendente, c.total_contratos, c.total_parcelas, c.parcelas_pagas,
         c.parcelas_atrasadas, c.situacao_financeira;

-- Criar view para inadimplentes COHAPM
CREATE OR REPLACE VIEW public.vw_inadimplentes_cohapm AS
SELECT 
  c.id,
  c.nome,
  c.cpf_cnpj,
  c.telefone,
  c.email,
  c.quadra,
  c.lote,
  c.parcelas_atrasadas,
  c.valor_pendente,
  MIN(p.data_vencimento) AS primeira_parcela_atrasada,
  MAX(p.data_vencimento) AS ultima_parcela_atrasada,
  COUNT(p.id) AS total_parcelas_em_atraso
FROM public.compradores_cohapm c
INNER JOIN public.parcelas_cohapm p ON c.id = p.comprador_id
WHERE p.status IN ('Atrasado', 'Vencido', 'Em Aberto')
  AND p.data_vencimento < CURRENT_DATE
  AND (p.data_pagamento IS NULL OR p.valor_pago < p.valor_parcela)
GROUP BY c.id, c.nome, c.cpf_cnpj, c.telefone, c.email, c.quadra, 
         c.lote, c.parcelas_atrasadas, c.valor_pendente
ORDER BY c.parcelas_atrasadas DESC, primeira_parcela_atrasada ASC;

-- Comentários nas tabelas
COMMENT ON COLUMN public.compradores_cohapm.quadra IS 'Quadra do lote do cooperado';
COMMENT ON COLUMN public.compradores_cohapm.lote IS 'Número do lote do cooperado';
COMMENT ON COLUMN public.compradores_cohapm.valor_total_contratos IS 'Soma de todos os contratos';
COMMENT ON COLUMN public.compradores_cohapm.situacao_financeira IS 'Em dia, Atrasado, Inadimplente, etc';
