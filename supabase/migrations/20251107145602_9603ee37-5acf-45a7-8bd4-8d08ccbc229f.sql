-- Criar tabela de investimentos
CREATE TABLE public.investimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor_total DECIMAL(12,2) NOT NULL,
  numero_parcelas INTEGER NOT NULL,
  valor_parcela DECIMAL(12,2) NOT NULL,
  data_inicio DATE NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de parcelas
CREATE TABLE public.parcelas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investimento_id UUID NOT NULL REFERENCES public.investimentos(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor_parcela DECIMAL(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  valor_pago DECIMAL(12,2),
  juros DECIMAL(12,2) DEFAULT 0,
  multa DECIMAL(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('paga', 'pendente')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(investimento_id, numero_parcela)
);

-- Habilitar RLS
ALTER TABLE public.investimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;

-- Políticas para investimentos
CREATE POLICY "Usuários podem ver seus próprios investimentos"
ON public.investimentos
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todos os investimentos"
ON public.investimentos
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem inserir investimentos"
ON public.investimentos
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar investimentos"
ON public.investimentos
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar investimentos"
ON public.investimentos
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para parcelas
CREATE POLICY "Usuários podem ver parcelas dos seus investimentos"
ON public.parcelas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.investimentos
    WHERE investimentos.id = parcelas.investimento_id
    AND investimentos.user_id = auth.uid()
  )
);

CREATE POLICY "Admins podem ver todas as parcelas"
ON public.parcelas
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem inserir parcelas"
ON public.parcelas
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar parcelas"
ON public.parcelas
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar parcelas"
ON public.parcelas
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar trigger para updated_at em investimentos
CREATE TRIGGER update_investimentos_updated_at
BEFORE UPDATE ON public.investimentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar trigger para updated_at em parcelas
CREATE TRIGGER update_parcelas_updated_at
BEFORE UPDATE ON public.parcelas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();