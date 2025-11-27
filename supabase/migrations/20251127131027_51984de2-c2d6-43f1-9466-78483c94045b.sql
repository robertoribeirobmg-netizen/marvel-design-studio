-- Fix Security Definer Views - Recreate views with SECURITY INVOKER
-- This ensures views respect the querying user's RLS policies

-- Drop and recreate vw_inadimplentes_cohapm with SECURITY INVOKER
DROP VIEW IF EXISTS public.vw_inadimplentes_cohapm;

CREATE VIEW public.vw_inadimplentes_cohapm
WITH (security_invoker = true)
AS
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
    min(p.data_vencimento) AS primeira_parcela_atrasada,
    max(p.data_vencimento) AS ultima_parcela_atrasada,
    count(p.id) AS total_parcelas_em_atraso
FROM compradores_cohapm c
JOIN parcelas_cohapm p ON c.id = p.comprador_id
WHERE p.status = ANY (ARRAY['Atrasado'::text, 'Vencido'::text, 'Em Aberto'::text])
    AND p.data_vencimento < CURRENT_DATE
    AND (p.data_pagamento IS NULL OR p.valor_pago < p.valor_parcela)
GROUP BY c.id, c.nome, c.cpf_cnpj, c.telefone, c.email, c.quadra, c.lote, c.parcelas_atrasadas, c.valor_pendente
ORDER BY c.parcelas_atrasadas DESC, min(p.data_vencimento);

-- Drop and recreate vw_resumo_financeiro_cohapm with SECURITY INVOKER  
DROP VIEW IF EXISTS public.vw_resumo_financeiro_cohapm;

CREATE VIEW public.vw_resumo_financeiro_cohapm
WITH (security_invoker = true)
AS
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
        WHEN c.valor_total_contratos > 0::numeric THEN round((c.valor_pago / c.valor_total_contratos) * 100::numeric, 2)
        ELSE 0::numeric
    END AS percentual_pago,
    count(DISTINCT ct.id) AS contratos_registrados,
    count(DISTINCT p.id) AS parcelas_registradas
FROM compradores_cohapm c
LEFT JOIN contratos_cohapm ct ON c.id = ct.comprador_id
LEFT JOIN parcelas_cohapm p ON c.id = p.comprador_id
GROUP BY c.id, c.nome, c.cpf_cnpj, c.telefone, c.email, c.quadra, c.lote, c.empreendimento, c.profile_id, c.valor_total_contratos, c.valor_pago, c.valor_pendente, c.total_contratos, c.total_parcelas, c.parcelas_pagas, c.parcelas_atrasadas, c.situacao_financeira;

-- Grant appropriate permissions
GRANT SELECT ON public.vw_inadimplentes_cohapm TO authenticated;
GRANT SELECT ON public.vw_resumo_financeiro_cohapm TO authenticated;