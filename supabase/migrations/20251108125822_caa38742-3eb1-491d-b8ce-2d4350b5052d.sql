-- Adicionar novos campos à tabela profiles
ALTER TABLE public.profiles
ADD COLUMN quadra text,
ADD COLUMN lote text,
ADD COLUMN fase text,
ADD COLUMN data_compra date;

-- Adicionar índices para melhor performance nas consultas
CREATE INDEX idx_profiles_quadra ON public.profiles(quadra);
CREATE INDEX idx_profiles_lote ON public.profiles(lote);
CREATE INDEX idx_profiles_fase ON public.profiles(fase);