import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      throw new Error('Forbidden: Admin access required')
    }

    const { email, password, nome_completo, cpf, telefone, quadra, lote, fase, data_compra } = await req.json()
    
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

    return new Response(
      JSON.stringify({ user: newUser }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
