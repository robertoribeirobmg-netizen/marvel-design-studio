-- Adicionar novo tipo de usuário 'executivo_vendas' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'executivo_vendas';