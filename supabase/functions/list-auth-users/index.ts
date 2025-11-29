import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if user is admin
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado - apenas admins' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // List all auth users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      throw listError
    }

    // Get all profiles
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, nome_completo, email')

    const profileIds = new Set(profiles?.map(p => p.id) || [])

    // Map users and check orphan status
    const usersWithStatus = authUsers.users.map(u => {
      const hasProfile = profileIds.has(u.id)
      const profile = profiles?.find(p => p.id === u.id)
      
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        has_profile: hasProfile,
        profile_name: profile?.nome_completo || null,
        is_orphan: !hasProfile,
        metadata: u.user_metadata
      }
    })

    // Sort: orphans first, then by email
    usersWithStatus.sort((a, b) => {
      if (a.is_orphan && !b.is_orphan) return -1
      if (!a.is_orphan && b.is_orphan) return 1
      return (a.email || '').localeCompare(b.email || '')
    })

    const summary = {
      total_auth_users: authUsers.users.length,
      total_profiles: profiles?.length || 0,
      orphan_users: usersWithStatus.filter(u => u.is_orphan).length,
      active_users: usersWithStatus.filter(u => !u.is_orphan).length
    }

    return new Response(
      JSON.stringify({ users: usersWithStatus, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error listing auth users:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
