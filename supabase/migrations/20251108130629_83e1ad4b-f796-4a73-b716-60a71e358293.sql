-- Criar índice único para evitar duplicação de quadra/lote
-- Primeiro, precisamos permitir NULL em ambos ou ambos preenchidos
CREATE UNIQUE INDEX unique_quadra_lote 
ON public.profiles (quadra, lote) 
WHERE quadra IS NOT NULL AND lote IS NOT NULL;