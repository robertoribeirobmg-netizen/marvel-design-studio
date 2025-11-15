-- Habilitar Realtime para tabelas COHAPM
-- Garantir que as tabelas tenham REPLICA IDENTITY FULL para capturar todas as mudanças
ALTER TABLE public.compradores_cohapm REPLICA IDENTITY FULL;
ALTER TABLE public.contratos_cohapm REPLICA IDENTITY FULL;
ALTER TABLE public.parcelas_cohapm REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação do Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.compradores_cohapm;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contratos_cohapm;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parcelas_cohapm;