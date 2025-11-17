-- Adicionar campos faltantes na tabela parcelas_cohapm
ALTER TABLE parcelas_cohapm 
ADD COLUMN IF NOT EXISTS tipo_parcela TEXT,
ADD COLUMN IF NOT EXISTS situacao TEXT;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_parcelas_cohapm_tipo ON parcelas_cohapm(tipo_parcela);
CREATE INDEX IF NOT EXISTS idx_parcelas_cohapm_situacao ON parcelas_cohapm(situacao);
CREATE INDEX IF NOT EXISTS idx_parcelas_cohapm_comprador_data ON parcelas_cohapm(comprador_id, data_vencimento);

-- Comentários para documentação
COMMENT ON COLUMN parcelas_cohapm.tipo_parcela IS 'Tipo de parcela: entrada, intermediaria, parcela mensal';
COMMENT ON COLUMN parcelas_cohapm.situacao IS 'Situação da parcela: paga, pendente, atrasada';