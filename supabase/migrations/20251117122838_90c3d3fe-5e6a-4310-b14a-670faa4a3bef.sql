-- Passo 2: Criar função para verificar se é admin ou admin_obras
CREATE OR REPLACE FUNCTION public.is_admin_or_admin_obras(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'admin_obras')
  )
$$;

-- Atualizar políticas RLS para etapas_obra
DROP POLICY IF EXISTS "Admins podem inserir etapas" ON public.etapas_obra;
DROP POLICY IF EXISTS "Admins podem atualizar etapas" ON public.etapas_obra;
DROP POLICY IF EXISTS "Admins podem deletar etapas" ON public.etapas_obra;

CREATE POLICY "Admins podem inserir etapas" 
ON public.etapas_obra 
FOR INSERT 
WITH CHECK (public.is_admin_or_admin_obras(auth.uid()));

CREATE POLICY "Admins podem atualizar etapas" 
ON public.etapas_obra 
FOR UPDATE 
USING (public.is_admin_or_admin_obras(auth.uid()));

CREATE POLICY "Admins podem deletar etapas" 
ON public.etapas_obra 
FOR DELETE 
USING (public.is_admin_or_admin_obras(auth.uid()));

-- Atualizar políticas RLS para etapas_obra_arquivos
DROP POLICY IF EXISTS "Admins podem inserir arquivos" ON public.etapas_obra_arquivos;
DROP POLICY IF EXISTS "Admins podem atualizar arquivos" ON public.etapas_obra_arquivos;
DROP POLICY IF EXISTS "Admins podem deletar arquivos" ON public.etapas_obra_arquivos;

CREATE POLICY "Admins podem inserir arquivos" 
ON public.etapas_obra_arquivos 
FOR INSERT 
WITH CHECK (public.is_admin_or_admin_obras(auth.uid()));

CREATE POLICY "Admins podem atualizar arquivos" 
ON public.etapas_obra_arquivos 
FOR UPDATE 
USING (public.is_admin_or_admin_obras(auth.uid()));

CREATE POLICY "Admins podem deletar arquivos" 
ON public.etapas_obra_arquivos 
FOR DELETE 
USING (public.is_admin_or_admin_obras(auth.uid()));

-- Atualizar políticas RLS para etapas_obra_historico
DROP POLICY IF EXISTS "Apenas admins podem inserir histórico" ON public.etapas_obra_historico;

CREATE POLICY "Apenas admins podem inserir histórico" 
ON public.etapas_obra_historico 
FOR INSERT 
WITH CHECK (public.is_admin_or_admin_obras(auth.uid()));

-- Atualizar políticas RLS para obra_fotos
DROP POLICY IF EXISTS "Apenas admins podem inserir fotos" ON public.obra_fotos;
DROP POLICY IF EXISTS "Apenas admins podem deletar fotos" ON public.obra_fotos;

CREATE POLICY "Apenas admins podem inserir fotos" 
ON public.obra_fotos 
FOR INSERT 
WITH CHECK (public.is_admin_or_admin_obras(auth.uid()));

CREATE POLICY "Apenas admins podem deletar fotos" 
ON public.obra_fotos 
FOR DELETE 
USING (public.is_admin_or_admin_obras(auth.uid()));