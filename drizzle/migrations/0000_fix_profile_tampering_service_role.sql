CREATE OR REPLACE FUNCTION public.prevent_profile_tampering()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  -- Backend server (service role) or direct DB session without JWT: allow
  IF COALESCE(auth.jwt()->>'role', '') = 'service_role'
     OR current_setting('request.jwt.claims', true) IS NULL
     OR current_setting('request.jwt.claims', true) = '' THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  NEW.cpf := OLD.cpf;
  NEW.email := OLD.email;
  NEW.quadra := OLD.quadra;
  NEW.lote := OLD.lote;
  NEW.fase := OLD.fase;
  NEW.data_compra := OLD.data_compra;
  NEW.nome_completo := OLD.nome_completo;
  NEW.primeira_senha_alterada := COALESCE(NEW.primeira_senha_alterada, OLD.primeira_senha_alterada);
  RETURN NEW;
END;
$function$;