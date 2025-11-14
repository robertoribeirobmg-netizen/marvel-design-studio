import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5 // 5 requests per minute (stricter for delete operations)

// Helper function to check rate limit
async function checkRateLimit(supabase: any, identifier: string, endpoint: string) {
  const now = new Date()
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW)
  
  await supabase
    .from('rate_limits')
    .delete()
    .lt('window_start', windowStart.toISOString())
  
  const { data: rateLimit } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .single()
  
  if (rateLimit) {
    if (rateLimit.request_count >= MAX_REQUESTS_PER_WINDOW) {
      return { allowed: false, remaining: 0 }
    }
    
    await supabase
      .from('rate_limits')
      .update({ request_count: rateLimit.request_count + 1 })
      .eq('id', rateLimit.id)
    
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - rateLimit.request_count - 1 }
  } else {
    await supabase
      .from('rate_limits')
      .insert({
        identifier,
        endpoint,
        request_count: 1,
        window_start: now.toISOString()
      })
    
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 }
  }
}

// Helper function to log security events
async function logSecurityEvent(
  supabase: any, 
  eventType: string, 
  req: Request,
  userId?: string,
  details?: any
) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  
  await supabase
    .from('security_logs')
    .insert({
      event_type: eventType,
      user_id: userId || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      endpoint: '/delete-user',
      details: details || {}
    })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the request is from an admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      await logSecurityEvent(supabaseAdmin, 'failed_auth', req, undefined, { 
        error: 'No valid authentication token' 
      })
      throw new Error('Unauthorized')
    }

    // Check rate limit
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimitCheck = await checkRateLimit(supabaseAdmin, ipAddress, '/delete-user')
    
    if (!rateLimitCheck.allowed) {
      await logSecurityEvent(supabaseAdmin, 'rate_limit_exceeded', req, user.id, {
        endpoint: '/delete-user',
        ip: ipAddress
      })
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      )
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      await logSecurityEvent(supabaseAdmin, 'unauthorized_access', req, user.id, {
        attempted_action: 'delete_user',
        reason: 'not_admin'
      })
      throw new Error('Forbidden: Admin access required')
    }

    const { userId } = await req.json()
    
    if (!userId) {
      await logSecurityEvent(supabaseAdmin, 'validation_error', req, user.id, {
        error: 'Missing userId parameter'
      })
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Delete the user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) throw deleteError

    // Log successful deletion
    await logSecurityEvent(supabaseAdmin, 'user_deleted', req, user.id, {
      deleted_user_id: userId
    })

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
