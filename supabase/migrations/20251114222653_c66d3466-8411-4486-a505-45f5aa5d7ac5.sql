-- Create validation errors analytics table
CREATE TABLE IF NOT EXISTS public.validation_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  field_name TEXT NOT NULL,
  validation_rule TEXT NOT NULL,
  error_message TEXT NOT NULL,
  attempted_value TEXT,
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_validation_errors_created_at ON public.validation_errors(created_at DESC);
CREATE INDEX idx_validation_errors_endpoint ON public.validation_errors(endpoint);
CREATE INDEX idx_validation_errors_field ON public.validation_errors(field_name);
CREATE INDEX idx_validation_errors_rule ON public.validation_errors(validation_rule);
CREATE INDEX idx_validation_errors_ip ON public.validation_errors(ip_address);

-- Enable RLS
ALTER TABLE public.validation_errors ENABLE ROW LEVEL SECURITY;

-- Only admins can view validation errors
CREATE POLICY "Admins can view validation errors"
  ON public.validation_errors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Service role can insert validation errors (for edge functions)
CREATE POLICY "Service role can insert validation errors"
  ON public.validation_errors
  FOR INSERT
  WITH CHECK (true);

-- Function to get validation error statistics
CREATE OR REPLACE FUNCTION public.get_validation_error_stats(
  time_period INTERVAL DEFAULT '7 days'
)
RETURNS TABLE (
  field_name TEXT,
  validation_rule TEXT,
  error_count BIGINT,
  unique_ips BIGINT,
  last_occurrence TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    field_name,
    validation_rule,
    COUNT(*) as error_count,
    COUNT(DISTINCT ip_address) as unique_ips,
    MAX(created_at) as last_occurrence
  FROM public.validation_errors
  WHERE created_at > now() - time_period
  GROUP BY field_name, validation_rule
  ORDER BY error_count DESC
$$;

-- Function to detect potential attack patterns
CREATE OR REPLACE FUNCTION public.detect_attack_patterns(
  threshold INTEGER DEFAULT 10,
  time_window INTERVAL DEFAULT '1 hour'
)
RETURNS TABLE (
  ip_address TEXT,
  error_count BIGINT,
  distinct_endpoints INTEGER,
  distinct_fields INTEGER,
  first_attempt TIMESTAMPTZ,
  last_attempt TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ip_address,
    COUNT(*) as error_count,
    COUNT(DISTINCT endpoint) as distinct_endpoints,
    COUNT(DISTINCT field_name) as distinct_fields,
    MIN(created_at) as first_attempt,
    MAX(created_at) as last_attempt
  FROM public.validation_errors
  WHERE created_at > now() - time_window
  GROUP BY ip_address
  HAVING COUNT(*) >= threshold
  ORDER BY error_count DESC
$$;