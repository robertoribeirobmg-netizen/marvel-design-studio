-- Criar bucket para fotos da obra
INSERT INTO storage.buckets (id, name, public)
VALUES ('obra-fotos', 'obra-fotos', true);

-- Criar tabela para metadados das fotos
CREATE TABLE public.obra_fotos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  foto_url TEXT NOT NULL,
  data_upload TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.obra_fotos ENABLE ROW LEVEL SECURITY;

-- Policies para obra_fotos
CREATE POLICY "Todos podem ver fotos"
ON public.obra_fotos
FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem inserir fotos"
ON public.obra_fotos
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Apenas admins podem deletar fotos"
ON public.obra_fotos
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies para storage
CREATE POLICY "Todos podem ver fotos da obra"
ON storage.objects
FOR SELECT
USING (bucket_id = 'obra-fotos');

CREATE POLICY "Admins podem fazer upload de fotos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'obra-fotos' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins podem deletar fotos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'obra-fotos' AND (SELECT has_role(auth.uid(), 'admin'::app_role)));