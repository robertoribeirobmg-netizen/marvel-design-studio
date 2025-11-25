-- Restaurar profiles e roles para usuários existentes
-- Criar profiles para todos os usuários auth que não têm profile
INSERT INTO public.profiles (id, nome_completo, email, data_cadastro, updated_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'nome_completo', 'Usuário Admin'),
  u.email,
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Atribuir role de admin para todos os usuários existentes
-- (você pode ajustar depois quem deve ser admin)
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  'admin'::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL;
