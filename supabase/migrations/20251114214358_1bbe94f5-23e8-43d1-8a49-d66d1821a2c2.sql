-- Criar tabela de renegociações
CREATE TABLE public.renegociacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  investimento_id UUID NOT NULL REFERENCES public.investimentos(id) ON DELETE CASCADE,
  valor_original NUMERIC NOT NULL,
  valor_renegociado NUMERIC NOT NULL,
  numero_parcelas INTEGER NOT NULL,
  valor_parcela NUMERIC NOT NULL,
  taxa_juros NUMERIC DEFAULT 0,
  valor_entrada NUMERIC DEFAULT 0,
  data_renegociacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  criado_por UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para registrar as parcelas originais que foram renegociadas
CREATE TABLE public.parcelas_renegociadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  renegociacao_id UUID NOT NULL REFERENCES public.renegociacoes(id) ON DELETE CASCADE,
  parcela_id UUID NOT NULL REFERENCES public.parcelas(id) ON DELETE CASCADE,
  valor_original NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna nas parcelas para indicar se fazem parte de uma renegociação
ALTER TABLE public.parcelas
ADD COLUMN renegociacao_id UUID REFERENCES public.renegociacoes(id);

-- Habilitar RLS
ALTER TABLE public.renegociacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas_renegociadas ENABLE ROW LEVEL SECURITY;

-- Políticas para renegociacoes
CREATE POLICY "Admins podem ver todas as renegociações"
ON public.renegociacoes
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem inserir renegociações"
ON public.renegociacoes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar renegociações"
ON public.renegociacoes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Cooperados podem ver suas renegociações"
ON public.renegociacoes
FOR SELECT
USING (auth.uid() = user_id);

-- Políticas para parcelas_renegociadas
CREATE POLICY "Admins podem ver parcelas renegociadas"
ON public.parcelas_renegociadas
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem inserir parcelas renegociadas"
ON public.parcelas_renegociadas
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_renegociacoes_updated_at
BEFORE UPDATE ON public.renegociacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para performance
CREATE INDEX idx_renegociacoes_user_id ON public.renegociacoes(user_id);
CREATE INDEX idx_renegociacoes_investimento_id ON public.renegociacoes(investimento_id);
CREATE INDEX idx_parcelas_renegociadas_renegociacao_id ON public.parcelas_renegociadas(renegociacao_id);
CREATE INDEX idx_parcelas_renegociadas_parcela_id ON public.parcelas_renegociadas(parcela_id);
CREATE INDEX idx_parcelas_renegociacao_id ON public.parcelas(renegociacao_id);