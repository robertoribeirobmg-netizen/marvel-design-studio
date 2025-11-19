-- Remove a tabela validation_errors
DROP TABLE IF EXISTS public.validation_errors CASCADE;

-- Remove a função get_validation_error_stats
DROP FUNCTION IF EXISTS public.get_validation_error_stats(interval);

-- Remove a função detect_attack_patterns
DROP FUNCTION IF EXISTS public.detect_attack_patterns(integer, interval);