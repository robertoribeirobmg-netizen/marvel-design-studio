-- Criar tabela para armazenar o progresso geral da obra (manual)
CREATE TABLE public.progresso_geral_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  percentual integer NOT NULL DEFAULT 0 CHECK (percentual >= 0 AND percentual <= 100),
  observacoes text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.progresso_geral_obra ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Todos podem ver o progresso geral"
ON public.progresso_geral_obra
FOR SELECT
USING (true);

CREATE POLICY "Admins podem atualizar progresso geral"
ON public.progresso_geral_obra
FOR UPDATE
USING (is_admin_or_admin_obras(auth.uid()));

CREATE POLICY "Admins podem inserir progresso geral"
ON public.progresso_geral_obra
FOR INSERT
WITH CHECK (is_admin_or_admin_obras(auth.uid()));

-- Inserir registro inicial
INSERT INTO public.progresso_geral_obra (percentual, observacoes)
VALUES (0, 'Progresso inicial');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_progresso_geral_obra_updated_at
BEFORE UPDATE ON public.progresso_geral_obra
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();