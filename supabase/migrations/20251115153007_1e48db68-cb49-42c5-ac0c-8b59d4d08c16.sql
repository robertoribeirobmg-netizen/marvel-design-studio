-- ============================================================================
-- TABELAS PARA DADOS COHAPM - Cooperativa Habitacional
-- Residencial La Felicità - 726 Compradores
-- ============================================================================

-- Tabela principal: COMPRADORES_COHAPM
-- Armazena todos os dados cadastrais dos compradores extraídos do sistema COHAPM
CREATE TABLE IF NOT EXISTS public.compradores_cohapm (
    -- Identificação
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT,
    
    -- Contato
    telefone TEXT,
    email TEXT,
    
    -- Classificação
    grupo TEXT,
    tipo TEXT,
    tipo_classificado TEXT DEFAULT 'Comprador',
    
    -- Empreendimento
    empreendimento TEXT DEFAULT 'Residencial La Felicità',
    
    -- Vinculação com sistema atual (opcional)
    profile_id UUID REFERENCES public.profiles(id),
    
    -- Metadados
    data_extracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fonte TEXT DEFAULT 'sistema_cohapm',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_compradores_cohapm_cpf_cnpj ON public.compradores_cohapm(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_compradores_cohapm_nome ON public.compradores_cohapm USING gin(to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_compradores_cohapm_profile_id ON public.compradores_cohapm(profile_id);

-- Tabela: CONTRATOS_COHAPM
-- Armazena informações de contratos de compra
CREATE TABLE IF NOT EXISTS public.contratos_cohapm (
    id SERIAL PRIMARY KEY,
    comprador_id TEXT REFERENCES public.compradores_cohapm(id),
    
    -- Dados do contrato
    numero_contrato TEXT,
    data_contrato DATE,
    valor_total DECIMAL(15,2),
    valor_entrada DECIMAL(15,2),
    numero_parcelas INTEGER,
    valor_parcela DECIMAL(15,2),
    
    -- Status
    status TEXT,
    situacao TEXT,
    
    -- Lote/Imóvel
    quadra TEXT,
    lote TEXT,
    area_m2 DECIMAL(10,2),
    
    -- Corretor/Imobiliária
    corretor TEXT,
    imobiliaria TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para contratos
CREATE INDEX IF NOT EXISTS idx_contratos_cohapm_comprador_id ON public.contratos_cohapm(comprador_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cohapm_status ON public.contratos_cohapm(status);

-- Tabela: PARCELAS_COHAPM
-- Armazena informações de parcelas dos contratos
CREATE TABLE IF NOT EXISTS public.parcelas_cohapm (
    id SERIAL PRIMARY KEY,
    contrato_id INTEGER REFERENCES public.contratos_cohapm(id),
    comprador_id TEXT REFERENCES public.compradores_cohapm(id),
    
    -- Dados da parcela
    numero_parcela INTEGER,
    data_vencimento DATE,
    valor_parcela DECIMAL(15,2),
    valor_pago DECIMAL(15,2),
    data_pagamento DATE,
    
    -- Status
    status TEXT,
    dias_atraso INTEGER DEFAULT 0,
    
    -- Juros e multas
    valor_juros DECIMAL(15,2) DEFAULT 0,
    valor_multa DECIMAL(15,2) DEFAULT 0,
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para parcelas
CREATE INDEX IF NOT EXISTS idx_parcelas_cohapm_contrato_id ON public.parcelas_cohapm(contrato_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_cohapm_comprador_id ON public.parcelas_cohapm(comprador_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_cohapm_status ON public.parcelas_cohapm(status);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_compradores_cohapm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_compradores_cohapm_timestamp
  BEFORE UPDATE ON public.compradores_cohapm
  FOR EACH ROW
  EXECUTE FUNCTION public.update_compradores_cohapm_updated_at();

-- RLS Policies
ALTER TABLE public.compradores_cohapm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_cohapm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas_cohapm ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os compradores
CREATE POLICY "Admins podem ver todos os compradores COHAPM"
  ON public.compradores_cohapm FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins podem inserir compradores
CREATE POLICY "Admins podem inserir compradores COHAPM"
  ON public.compradores_cohapm FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins podem atualizar compradores
CREATE POLICY "Admins podem atualizar compradores COHAPM"
  ON public.compradores_cohapm FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins podem deletar compradores
CREATE POLICY "Admins podem deletar compradores COHAPM"
  ON public.compradores_cohapm FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas similares para contratos e parcelas
CREATE POLICY "Admins podem gerenciar contratos COHAPM"
  ON public.contratos_cohapm FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem gerenciar parcelas COHAPM"
  ON public.parcelas_cohapm FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));