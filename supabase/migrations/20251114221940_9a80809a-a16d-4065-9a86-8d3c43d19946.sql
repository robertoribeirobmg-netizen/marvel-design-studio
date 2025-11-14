-- Create security logs table for tracking security events
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  endpoint TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_security_logs_created_at ON public.security_logs(created_at DESC);
CREATE INDEX idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX idx_security_logs_user_id ON public.security_logs(user_id);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- Create index for efficient lookups
CREATE INDEX idx_rate_limits_identifier_endpoint ON public.rate_limits(identifier, endpoint);
CREATE INDEX idx_rate_limits_window_start ON public.rate_limits(window_start);

-- Enable RLS on both tables
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view security logs"
  ON public.security_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Service role can insert security logs (for edge functions)
CREATE POLICY "Service role can insert security logs"
  ON public.security_logs
  FOR INSERT
  WITH CHECK (true);

-- Service role can manage rate limits
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to clean old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;