-- Atualizar categorias da galeria de fotos
-- Primeiro, remover o default e a constraint
ALTER TABLE public.obra_fotos
ALTER COLUMN categoria DROP DEFAULT;

ALTER TABLE public.obra_fotos
DROP CONSTRAINT IF EXISTS foto_ou_video_required;

-- Alterar o tipo de categoria_obra para adicionar as novas categorias
ALTER TYPE categoria_obra RENAME TO categoria_obra_old;

CREATE TYPE categoria_obra AS ENUM (
  '1ª Fase do Muro',
  '2ª Fase do Muro',
  '3ª Fase do Muro',
  'Supressão Vegetal',
  'Terraplanagem',
  'Infraestrutura',
  'Pavimentação',
  'Portaria e Clube',
  'Paisagismo'
);

-- Atualizar a coluna para usar o novo tipo
ALTER TABLE public.obra_fotos
ALTER COLUMN categoria TYPE categoria_obra USING 
  CASE 
    WHEN categoria::text = 'fundacao' THEN '1ª Fase do Muro'::categoria_obra
    WHEN categoria::text = 'estrutura' THEN 'Infraestrutura'::categoria_obra
    WHEN categoria::text = 'acabamento' THEN 'Paisagismo'::categoria_obra
    ELSE '1ª Fase do Muro'::categoria_obra
  END;

-- Remover o tipo antigo
DROP TYPE categoria_obra_old;

-- Adicionar novo default
ALTER TABLE public.obra_fotos
ALTER COLUMN categoria SET DEFAULT '1ª Fase do Muro'::categoria_obra;

-- Recriar a constraint
ALTER TABLE public.obra_fotos
ADD CONSTRAINT foto_ou_video_required CHECK (
  (foto_url IS NOT NULL AND video_url IS NULL) OR
  (video_url IS NOT NULL AND foto_url IS NULL)
);