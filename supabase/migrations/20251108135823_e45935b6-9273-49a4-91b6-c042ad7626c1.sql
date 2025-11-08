-- Criar tabela de etapas de obras
CREATE TABLE public.etapas_obra (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  percentual_concluido INTEGER NOT NULL DEFAULT 0 CHECK (percentual_concluido >= 0 AND percentual_concluido <= 100),
  data_inicio DATE,
  data_conclusao DATE,
  ordem INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de arquivos/mídia das etapas
CREATE TABLE public.etapas_obra_arquivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id UUID NOT NULL REFERENCES public.etapas_obra(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('foto', 'video', 'pdf', 'texto')),
  titulo TEXT NOT NULL,
  descricao TEXT,
  arquivo_url TEXT,
  conteudo_texto TEXT,
  data_upload TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.etapas_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_obra_arquivos ENABLE ROW LEVEL SECURITY;

-- Políticas para etapas_obra
CREATE POLICY "Todos podem ver etapas de obra"
ON public.etapas_obra
FOR SELECT
USING (true);

CREATE POLICY "Admins podem inserir etapas"
ON public.etapas_obra
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar etapas"
ON public.etapas_obra
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar etapas"
ON public.etapas_obra
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para etapas_obra_arquivos
CREATE POLICY "Todos podem ver arquivos de etapas"
ON public.etapas_obra_arquivos
FOR SELECT
USING (true);

CREATE POLICY "Admins podem inserir arquivos"
ON public.etapas_obra_arquivos
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar arquivos"
ON public.etapas_obra_arquivos
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar arquivos"
ON public.etapas_obra_arquivos
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_etapas_obra_updated_at
BEFORE UPDATE ON public.etapas_obra
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir etapas iniciais
INSERT INTO public.etapas_obra (nome, descricao, percentual_concluido, data_conclusao, ordem) VALUES
('Avaliação Jurídica da Fazenda DEBY', 'Análise e avaliação jurídica completa da propriedade', 100, CURRENT_DATE, 1),
('Estudos de Implantação do Residencial La Felicità', 'Estudos técnicos e projetos de implantação', 100, CURRENT_DATE, 2),
('Quitação da Fazenda DEBY', 'Processo de quitação financeira da propriedade', 100, CURRENT_DATE, 3),
('Fechamento da Área 1ª Fase do Muro', 'Construção do muro de fechamento - primeira fase', 100, CURRENT_DATE, 4),
('Fechamento da Área 2ª Fase do Muro', 'Construção do muro de fechamento - segunda fase', 30, NULL, 5),
('Fechamento da Área 3ª Fase do Muro', 'Construção do muro de fechamento - terceira fase', 100, CURRENT_DATE, 6),
('Supressão Vegetal e Limpeza do Terreno', 'Remoção de vegetação e preparação inicial do terreno', 0, NULL, 7),
('Terraplanagem', 'Nivelamento e preparação do terreno', 0, NULL, 8),
('Infraestrutura (Elétrica, Hidráulica)', 'Instalação de redes elétricas e hidráulicas', 2, NULL, 9),
('Pavimentação e Vias Internas', 'Construção de ruas e vias de acesso internas', 5, NULL, 10),
('Construção da Portaria e Clube', 'Edificação da estrutura de entrada e área de lazer', 5, NULL, 11),
('Paisagismo e Arborização', 'Projeto paisagístico e plantio de árvores', 0, NULL, 12);

-- Atualizar data de início específica
UPDATE public.etapas_obra 
SET data_inicio = '2025-12-10'
WHERE nome = 'Supressão Vegetal e Limpeza do Terreno';