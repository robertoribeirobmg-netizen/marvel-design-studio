-- Adicionar campo de percentual planejado às etapas de obra
ALTER TABLE public.etapas_obra
ADD COLUMN percentual_planejado INTEGER NOT NULL DEFAULT 0 CHECK (percentual_planejado >= 0 AND percentual_planejado <= 100);

-- Atualizar percentuais planejados baseado no status atual (exemplo inicial)
UPDATE public.etapas_obra
SET percentual_planejado = CASE
  WHEN nome = 'Avaliação Jurídica da Fazenda DEBY' THEN 100
  WHEN nome = 'Estudos de Implantação do Residencial La Felicità' THEN 100
  WHEN nome = 'Quitação da Fazenda DEBY' THEN 100
  WHEN nome = 'Fechamento da Área 1ª Fase do Muro' THEN 100
  WHEN nome = 'Fechamento da Área 2ª Fase do Muro' THEN 50
  WHEN nome = 'Fechamento da Área 3ª Fase do Muro' THEN 100
  WHEN nome = 'Supressão Vegetal e Limpeza do Terreno' THEN 20
  WHEN nome = 'Terraplanagem' THEN 25
  WHEN nome = 'Infraestrutura (Elétrica, Hidráulica)' THEN 15
  WHEN nome = 'Pavimentação e Vias Internas' THEN 10
  WHEN nome = 'Construção da Portaria e Clube' THEN 10
  WHEN nome = 'Paisagismo e Arborização' THEN 5
  ELSE 0
END;