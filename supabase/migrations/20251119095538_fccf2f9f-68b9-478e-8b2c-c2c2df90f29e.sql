-- Adicionar política UPDATE para obra_fotos para admins e admin_obras
CREATE POLICY "Admins podem atualizar fotos"
ON public.obra_fotos
FOR UPDATE
USING (is_admin_or_admin_obras(auth.uid()));