-- Adicionar coluna para URL do comprovante na tabela parcelas (observacoes já existe)
ALTER TABLE parcelas 
ADD COLUMN IF NOT EXISTS comprovante_url TEXT;

-- Criar bucket para comprovantes de pagamento
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprovantes',
  'comprovantes',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies para bucket de comprovantes
-- Admins podem visualizar todos os comprovantes
CREATE POLICY "Admins podem ver todos os comprovantes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'comprovantes' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins podem fazer upload de comprovantes
CREATE POLICY "Admins podem fazer upload de comprovantes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comprovantes' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins podem atualizar comprovantes
CREATE POLICY "Admins podem atualizar comprovantes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'comprovantes' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins podem deletar comprovantes
CREATE POLICY "Admins podem deletar comprovantes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'comprovantes' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Cooperados podem ver comprovantes das suas próprias parcelas
CREATE POLICY "Cooperados podem ver seus comprovantes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'comprovantes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);