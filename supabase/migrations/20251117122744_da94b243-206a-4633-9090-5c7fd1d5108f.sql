-- Passo 1: Adicionar novo role para admin de obras
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_obras';