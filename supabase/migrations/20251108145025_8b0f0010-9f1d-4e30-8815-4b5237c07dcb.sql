-- Adicionar suporte a vídeos do YouTube na tabela obra_fotos
ALTER TABLE public.obra_fotos
ADD COLUMN video_url text;

-- Permitir que foto_url seja nullable já que agora pode ser foto OU vídeo
ALTER TABLE public.obra_fotos
ALTER COLUMN foto_url DROP NOT NULL;

-- Adicionar constraint para garantir que tenha pelo menos foto_url OU video_url
ALTER TABLE public.obra_fotos
ADD CONSTRAINT foto_ou_video_required CHECK (
  (foto_url IS NOT NULL AND video_url IS NULL) OR
  (video_url IS NOT NULL AND foto_url IS NULL)
);