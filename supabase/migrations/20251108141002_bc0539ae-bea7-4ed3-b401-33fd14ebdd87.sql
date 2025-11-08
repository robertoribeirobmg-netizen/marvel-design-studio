-- Criar tabela de histórico de mudanças nas etapas de obras
CREATE TABLE public.etapas_obra_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id UUID NOT NULL REFERENCES public.etapas_obra(id) ON DELETE CASCADE,
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  alterado_por UUID NOT NULL REFERENCES auth.users(id),
  data_alteracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.etapas_obra_historico ENABLE ROW LEVEL SECURITY;

-- Políticas para histórico
CREATE POLICY "Todos podem ver histórico"
ON public.etapas_obra_historico
FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem inserir histórico"
ON public.etapas_obra_historico
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Criar função para registrar mudanças automaticamente
CREATE OR REPLACE FUNCTION public.registrar_historico_etapa_obra()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Registrar mudança no percentual concluído
  IF OLD.percentual_concluido IS DISTINCT FROM NEW.percentual_concluido THEN
    INSERT INTO public.etapas_obra_historico (
      etapa_id,
      campo_alterado,
      valor_anterior,
      valor_novo,
      alterado_por
    ) VALUES (
      NEW.id,
      'percentual_concluido',
      OLD.percentual_concluido::TEXT,
      NEW.percentual_concluido::TEXT,
      auth.uid()
    );
  END IF;

  -- Registrar mudança no percentual planejado
  IF OLD.percentual_planejado IS DISTINCT FROM NEW.percentual_planejado THEN
    INSERT INTO public.etapas_obra_historico (
      etapa_id,
      campo_alterado,
      valor_anterior,
      valor_novo,
      alterado_por
    ) VALUES (
      NEW.id,
      'percentual_planejado',
      OLD.percentual_planejado::TEXT,
      NEW.percentual_planejado::TEXT,
      auth.uid()
    );
  END IF;

  -- Registrar mudança na data de início
  IF OLD.data_inicio IS DISTINCT FROM NEW.data_inicio THEN
    INSERT INTO public.etapas_obra_historico (
      etapa_id,
      campo_alterado,
      valor_anterior,
      valor_novo,
      alterado_por
    ) VALUES (
      NEW.id,
      'data_inicio',
      OLD.data_inicio::TEXT,
      NEW.data_inicio::TEXT,
      auth.uid()
    );
  END IF;

  -- Registrar mudança na data de conclusão
  IF OLD.data_conclusao IS DISTINCT FROM NEW.data_conclusao THEN
    INSERT INTO public.etapas_obra_historico (
      etapa_id,
      campo_alterado,
      valor_anterior,
      valor_novo,
      alterado_por
    ) VALUES (
      NEW.id,
      'data_conclusao',
      OLD.data_conclusao::TEXT,
      NEW.data_conclusao::TEXT,
      auth.uid()
    );
  END IF;

  -- Registrar mudança na descrição
  IF OLD.descricao IS DISTINCT FROM NEW.descricao THEN
    INSERT INTO public.etapas_obra_historico (
      etapa_id,
      campo_alterado,
      valor_anterior,
      valor_novo,
      alterado_por
    ) VALUES (
      NEW.id,
      'descricao',
      COALESCE(OLD.descricao, 'Nenhuma'),
      COALESCE(NEW.descricao, 'Nenhuma'),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger para capturar mudanças
CREATE TRIGGER trigger_historico_etapa_obra
AFTER UPDATE ON public.etapas_obra
FOR EACH ROW
EXECUTE FUNCTION public.registrar_historico_etapa_obra();

-- Criar índices para melhor performance
CREATE INDEX idx_etapas_obra_historico_etapa_id ON public.etapas_obra_historico(etapa_id);
CREATE INDEX idx_etapas_obra_historico_data ON public.etapas_obra_historico(data_alteracao DESC);