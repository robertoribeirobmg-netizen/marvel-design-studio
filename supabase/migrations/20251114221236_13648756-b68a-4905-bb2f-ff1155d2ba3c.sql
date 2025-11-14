-- Adicionar coluna email na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Criar trigger para atualizar o email do profile quando o usuário for criado/atualizado
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar o email no profile quando o email do auth.users mudar
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para sincronizar email
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();

-- Sincronizar emails existentes
UPDATE public.profiles p
SET email = (
  SELECT au.email 
  FROM auth.users au 
  WHERE au.id = p.id
)
WHERE p.email IS NULL;