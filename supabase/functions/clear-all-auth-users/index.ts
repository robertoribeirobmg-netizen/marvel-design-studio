import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Iniciando limpeza completa do banco de dados...');

    // 1. Limpar dados das tabelas
    console.log('Limpando tabelas...');
    
    const tablesToClear = [
      'security_logs',
      'sincronizacoes_cohapm',
      'rate_limits',
      'parcelas_renegociadas',
      'parcelas',
      'renegociacoes',
      'investimentos',
      'etapas_obra_historico',
      'etapas_obra_arquivos',
      'etapas_obra',
      'obra_fotos',
      'parcelas_cohapm',
      'contratos_cohapm',
      'compradores_cohapm',
      'user_roles',
      'profiles'
    ];

    for (const table of tablesToClear) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo
      
      if (error) {
        console.error(`Erro ao limpar tabela ${table}:`, error);
      } else {
        console.log(`Tabela ${table} limpa com sucesso`);
      }
    }

    // 2. Limpar usuários de autenticação
    console.log('Limpando usuários de autenticação...');
    
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    let deletedUsers = 0;
    let userErrors = 0;

    if (users && users.users.length > 0) {
      console.log(`Encontrados ${users.users.length} usuários. Iniciando deleção...`);

      for (const user of users.users) {
        try {
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
          
          if (deleteError) {
            console.error(`Erro ao deletar usuário ${user.id}:`, deleteError);
            userErrors++;
          } else {
            deletedUsers++;
          }
        } catch (error) {
          console.error(`Erro ao deletar usuário ${user.id}:`, error);
          userErrors++;
        }
      }
    }

    console.log(`Limpeza concluída: ${deletedUsers} usuários deletados, ${userErrors} erros`);

    return new Response(
      JSON.stringify({ 
        message: 'Banco de dados limpo com sucesso!',
        deleted: deletedUsers,
        errors: userErrors,
        tablesCleared: tablesToClear.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
