
DROP POLICY IF EXISTS "Admins podem atualizar comprovantes" ON storage.objects;
CREATE POLICY "Admins podem atualizar comprovantes"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'comprovantes'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
