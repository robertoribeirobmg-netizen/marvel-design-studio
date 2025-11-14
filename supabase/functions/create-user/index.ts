import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10 // 10 requests per minute

// Helper function to check rate limit
async function checkRateLimit(supabase: any, identifier: string, endpoint: string) {
  const now = new Date()
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW)
  
  // Clean up old entries
  await supabase
    .from('rate_limits')
    .delete()
    .lt('window_start', windowStart.toISOString())
  
  // Get current rate limit entry
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
    
    // Update count
    await supabase
      .from('rate_limits')
      .update({ request_count: rateLimit.request_count + 1 })
      .eq('id', rateLimit.id)
    
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - rateLimit.request_count - 1 }
  } else {
    // Create new entry
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
      endpoint: '/create-user',
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
    const rateLimitCheck = await checkRateLimit(supabaseAdmin, ipAddress, '/create-user')
    
    if (!rateLimitCheck.allowed) {
      await logSecurityEvent(supabaseAdmin, 'rate_limit_exceeded', req, user.id, {
        endpoint: '/create-user',
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
        attempted_action: 'create_user',
        reason: 'not_admin'
      })
      throw new Error('Forbidden: Admin access required')
    }

    const requestData = await req.json()
    const { email, password, nome_completo, cpf, telefone, quadra, lote, fase, data_compra } = requestData
    
    // Validate required fields
    if (!email || !password || !nome_completo) {
      await logSecurityEvent(supabaseAdmin, 'validation_error', req, user.id, {
        error: 'Missing required fields',
        provided_fields: Object.keys(requestData)
      })
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, and nome_completo are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    console.log('Received data_compra:', data_compra, 'Type:', typeof data_compra)

    // Check if user already exists with same nome + email + lote
    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id')
      .eq('nome_completo', nome_completo)
      .eq('lote', lote || null)
    
    // Also check email in auth users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const emailMatch = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    // If we find a profile with same nome + lote AND the email matches, it's a duplicate
    if (emailMatch && existingProfiles && existingProfiles.length > 0) {
      const isDuplicate = existingProfiles.some(p => p.user_id === emailMatch.id)
      
      if (isDuplicate) {
        return new Response(
          JSON.stringify({ 
            duplicate: true,
            message: `Usuário com nome ${nome_completo}, email ${email} e lote ${lote || 'não informado'} já existe` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
    }

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome_completo,
        cpf,
        telefone,
        quadra,
        lote,
        fase,
        data_compra
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      
      // Check if it's a duplicate email error from Supabase
      if (createError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({ 
            duplicate: true,
            message: `Usuário com email ${email} já existe` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
      
      throw new Error(`Erro ao criar usuário: ${createError.message}`)
    }

    // Update profile with additional fields
    console.log('Updating profile with data_compra:', data_compra)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        cpf: cpf || null,
        telefone: telefone || null,
        quadra: quadra || null,
        lote: lote || null,
        fase: fase || null,
        data_compra: data_compra || null
      })
      .eq('id', newUser.user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
    } else {
      console.log('Profile updated successfully with data_compra:', data_compra)
    }

    if (createError) throw createError

    // Log successful user creation
    await logSecurityEvent(supabaseAdmin, 'user_created', req, user.id, {
      created_user_id: newUser.user?.id,
      email: email
    })
    
    return new Response(
      JSON.stringify({ user: newUser }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
