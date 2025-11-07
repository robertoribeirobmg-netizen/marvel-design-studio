-- Criar enum para categorias de fotos
CREATE TYPE public.categoria_obra AS ENUM ('fundacao', 'estrutura', 'acabamento');

-- Adicionar coluna categoria na tabela obra_fotos
ALTER TABLE public.obra_fotos 
ADD COLUMN categoria public.categoria_obra DEFAULT 'fundacao' NOT NULL;

-- Criar índice para melhorar performance de queries por categoria
CREATE INDEX idx_obra_fotos_categoria ON public.obra_fotos(categoria);