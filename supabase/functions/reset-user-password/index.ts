import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

// Rate limiting check
async function checkRateLimit(supabase: any, identifier: string, endpoint: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW).toISOString();
  
  const { data: existingRequests } = await supabase
    .from('rate_limits')
    .select('request_count, window_start')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart)
    .single();

  if (existingRequests) {
    if (existingRequests.request_count >= MAX_REQUESTS_PER_WINDOW) {
      return false;
    }
    await supabase
      .from('rate_limits')
      .update({ request_count: existingRequests.request_count + 1 })
      .eq('identifier', identifier)
      .eq('endpoint', endpoint);
  } else {
    await supabase
      .from('rate_limits')
      .insert({
        identifier,
        endpoint,
        request_count: 1,
        window_start: new Date().toISOString(),
      });
  }

  return true;
}

// Log security events
async function logSecurityEvent(
  supabase: any,
  eventType: string,
  req: Request,
  userId?: string,
  details?: any
) {
  try {
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await supabase.from('security_logs').insert({
      event_type: eventType,
      user_id: userId || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      endpoint: '/reset-user-password',
      details: details || null,
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // SECURITY: Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logSecurityEvent(supabaseAdmin, 'password_reset_unauthorized', req, undefined, {
        reason: 'Missing authorization header'
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      await logSecurityEvent(supabaseAdmin, 'password_reset_invalid_token', req, undefined, {
        reason: 'Invalid or expired token'
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou expirado' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // SECURITY: Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      await logSecurityEvent(supabaseAdmin, 'password_reset_forbidden', req, user.id, {
        reason: 'User is not an admin'
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Acesso negado: apenas administradores podem redefinir senhas' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    // SECURITY: Rate limiting
    const ipAddress = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    
    const isWithinRateLimit = await checkRateLimit(
      supabaseAdmin,
      ipAddress,
      '/reset-user-password'
    );

    if (!isWithinRateLimit) {
      await logSecurityEvent(supabaseAdmin, 'password_reset_rate_limited', req, user.id, {
        reason: 'Too many requests'
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Muitas requisições. Tente novamente em 1 minuto.' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429,
        }
      );
    }

    // Parse request body
    const { userId, newPassword } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId é obrigatório' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'newPassword é obrigatório' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // SECURITY: Validate password strength
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Senha deve ter pelo menos 6 caracteres' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // SECURITY: Prevent admin from resetting their own password via this endpoint
    // (they should use the normal password change flow)
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Use a opção de alterar sua própria senha' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Update user password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error("Error updating password:", error);
      await logSecurityEvent(supabaseAdmin, 'password_reset_failed', req, user.id, {
        target_user_id: userId,
        error: error.message
      });
      return new Response(
        JSON.stringify({ success: false, error: error.message || 'Erro ao alterar senha' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Also update primeira_senha_alterada to false so user knows to change it
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ primeira_senha_alterada: false })
      .eq("id", userId);

    if (profileError) {
      console.warn("Could not update profile:", profileError);
    }

    // Log successful password reset
    await logSecurityEvent(supabaseAdmin, 'password_reset_success', req, user.id, {
      target_user_id: userId,
      admin_email: user.email
    });

    console.log(`Password reset successfully for user: ${userId} by admin: ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Senha alterada com sucesso" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in reset-user-password:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro ao alterar senha" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
