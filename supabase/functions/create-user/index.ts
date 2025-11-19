import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation schema for user creation
const createUserSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email deve ter no máximo 255 caracteres')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(100, 'Senha deve ter no máximo 100 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  nome_completo: z.string()
    .trim()
    .min(1, 'Nome completo é obrigatório')
    .max(200, 'Nome completo deve ter no máximo 200 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
  role: z.enum(['cooperado', 'admin', 'admin_obras']).default('cooperado'),
  cpf: z.union([
    z.string().regex(/^\d{11}$/, 'CPF deve conter exatamente 11 dígitos'),
    z.null(),
    z.undefined()
  ]).optional(),
  telefone: z.union([
    z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido (formato: +5511999999999)').max(20),
    z.null(),
    z.undefined()
  ]).optional(),
  quadra: z.union([
    z.string().trim().max(50, 'Quadra deve ter no máximo 50 caracteres'),
    z.null(),
    z.undefined()
  ]).optional(),
  lote: z.union([
    z.string().trim().max(50, 'Lote deve ter no máximo 50 caracteres'),
    z.null(),
    z.undefined()
  ]).optional(),
  fase: z.union([
    z.string().trim().max(100, 'Fase deve ter no máximo 100 caracteres'),
    z.null(),
    z.undefined()
  ]).optional(),
  data_compra: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de compra deve estar no formato YYYY-MM-DD'),
    z.null(),
    z.undefined()
  ]).optional()
})

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

// Helper function to log validation errors for analytics
async function logValidationError(
  supabase: any,
  req: Request,
  endpoint: string,
  fieldName: string,
  validationRule: string,
  errorMessage: string,
  attemptedValue?: any,
  userId?: string
) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  
  // Sanitize attempted value - don't store sensitive data
  let sanitizedValue = attemptedValue
  if (fieldName === 'password') {
    sanitizedValue = '***REDACTED***'
  } else if (attemptedValue && typeof attemptedValue === 'string' && attemptedValue.length > 200) {
    sanitizedValue = attemptedValue.substring(0, 200) + '...[truncated]'
  }
  
  await supabase
    .from('validation_errors')
    .insert({
      endpoint,
      field_name: fieldName,
      validation_rule: validationRule,
      error_message: errorMessage,
      attempted_value: sanitizedValue ? String(sanitizedValue) : null,
      user_id: userId || null,
      ip_address: ipAddress,
      user_agent: userAgent
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
    
    console.log('Dados recebidos:', JSON.stringify(requestData, null, 2))
    
    // Pre-process data: convert empty strings to null for optional fields
    const preprocessedData = {
      ...requestData,
      cpf: requestData.cpf && requestData.cpf.trim() !== '' ? requestData.cpf : null,
      telefone: requestData.telefone && requestData.telefone.trim() !== '' ? requestData.telefone : null,
      quadra: requestData.quadra && requestData.quadra.trim() !== '' ? requestData.quadra : null,
      lote: requestData.lote && requestData.lote.trim() !== '' ? requestData.lote : null,
      fase: requestData.fase && requestData.fase.trim() !== '' ? requestData.fase : null,
      data_compra: requestData.data_compra && requestData.data_compra.trim() !== '' ? requestData.data_compra : null,
    }
    
    console.log('Dados preprocessados:', JSON.stringify(preprocessedData, null, 2))
    
    // Validate input data with Zod
    const validationResult = createUserSchema.safeParse(preprocessedData)
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
      
      // Log each validation error for analytics
      for (const issue of validationResult.error.issues) {
        const fieldName = issue.path.join('.')
        const attemptedValue = fieldName.split('.').reduce((obj, key) => obj?.[key], requestData as any)
        
        await logValidationError(
          supabaseAdmin,
          req,
          '/create-user',
          fieldName,
          issue.code,
          issue.message,
          attemptedValue,
          user.id
        )
      }
      
      await logSecurityEvent(supabaseAdmin, 'validation_error', req, user.id, {
        error: 'Input validation failed',
        validation_errors: errors
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'Dados inválidos',
          details: errors 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    const { email, password, nome_completo, role, cpf, telefone, quadra, lote, fase, data_compra } = validationResult.data
    
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

    // Update user role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: role })
      .eq('user_id', newUser.user.id)

    if (roleError) {
      console.error('Error updating user role:', roleError)
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
