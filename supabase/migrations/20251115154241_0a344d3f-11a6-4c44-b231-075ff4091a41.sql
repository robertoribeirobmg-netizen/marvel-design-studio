-- Criar tabela para histórico de sincronizações COHAPM
CREATE TABLE IF NOT EXISTS public.sincronizacoes_cohapm (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_execucao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_analisados INTEGER NOT NULL DEFAULT 0,
  divergencias_encontradas INTEGER NOT NULL DEFAULT 0,
  detalhes JSONB,
  status TEXT NOT NULL DEFAULT 'concluida',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sincronizacoes_cohapm ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all synchronizations
CREATE POLICY "Admins can view all synchronizations"
ON public.sincronizacoes_cohapm
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create policy for system to insert synchronizations
CREATE POLICY "System can insert synchronizations"
ON public.sincronizacoes_cohapm
FOR INSERT
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_sincronizacoes_cohapm_data ON public.sincronizacoes_cohapm(data_execucao DESC);