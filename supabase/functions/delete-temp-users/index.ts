import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verificar autenticação do usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Criar cliente com service role para operações administrativas
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Criar cliente com token do usuário para validar permissões
    const supabaseUser = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Verificar se o usuário é admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { data: roles, error: rolesError } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (rolesError || !roles) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem executar esta ação.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('Buscando usuários com email @temp.cooperativa.com...');

    // Buscar todos os profiles com email @temp.cooperativa.com
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, nome_completo')
      .like('email', '%@temp.cooperativa.com');

    if (profilesError) {
      console.error('Erro ao buscar profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Encontrados ${profiles.length} usuários para deletar`);

    const results = {
      total: profiles.length,
      deletados: 0,
      erros: [] as any[],
      usuarios: [] as any[]
    };

    // Deletar cada usuário
    for (const profile of profiles) {
      try {
        console.log(`Deletando usuário: ${profile.nome_completo} (${profile.email})`);
        
        // Deletar o usuário do auth.users (isso também deleta o profile via cascade)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(profile.id);
        
        if (deleteError) {
          console.error(`Erro ao deletar ${profile.email}:`, deleteError);
          results.erros.push({
            usuario: profile.email,
            erro: deleteError.message
          });
        } else {
          results.deletados++;
          results.usuarios.push({
            nome: profile.nome_completo,
            email: profile.email
          });
          console.log(`✓ Usuário ${profile.email} deletado com sucesso`);
        }
      } catch (err) {
        console.error(`Erro ao processar ${profile.email}:`, err);
        results.erros.push({
          usuario: profile.email,
          erro: err instanceof Error ? err.message : String(err)
        });
      }
    }

    console.log('Processo de exclusão concluído');
    console.log(`Total deletados: ${results.deletados}/${results.total}`);

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
