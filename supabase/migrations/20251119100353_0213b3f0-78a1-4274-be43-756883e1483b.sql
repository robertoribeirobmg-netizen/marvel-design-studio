-- Adicionar política SELECT para obra_fotos para executivos de vendas
CREATE POLICY "Executivos de vendas podem ver fotos"
ON public.obra_fotos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'executivo_vendas'
  )
);

-- Adicionar política SELECT para etapas_obra para executivos de vendas
CREATE POLICY "Executivos de vendas podem ver etapas"
ON public.etapas_obra
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'executivo_vendas'
  )
);

-- Adicionar política SELECT para etapas_obra_arquivos para executivos de vendas
CREATE POLICY "Executivos de vendas podem ver arquivos"
ON public.etapas_obra_arquivos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'executivo_vendas'
  )
);

-- Adicionar política SELECT para etapas_obra_historico para executivos de vendas
CREATE POLICY "Executivos de vendas podem ver histórico"
ON public.etapas_obra_historico
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'executivo_vendas'
  )
);