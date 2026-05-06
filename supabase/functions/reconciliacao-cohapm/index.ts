import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompradorCohapm {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  profile_id: string | null;
}

interface Profile {
  id: string;
  nome_completo: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
}

interface Divergencia {
  comprador: CompradorCohapm;
  profile: Profile | null;
  tipo: string;
  issues: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth + admin enforcement
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roleData } = await supabase
      .from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Iniciando reconciliação automática COHAPM");

    // Buscar compradores COHAPM
    const { data: compradores, error: compradoresError } = await supabase
      .from("compradores_cohapm")
      .select("*");

    if (compradoresError) {
      throw new Error(`Erro ao buscar compradores: ${compradoresError.message}`);
    }

    // Buscar profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) {
      throw new Error(`Erro ao buscar profiles: ${profilesError.message}`);
    }

    console.log(`Analisando ${compradores?.length || 0} compradores e ${profiles?.length || 0} profiles`);

    // Analisar divergências
    const divergencias: Divergencia[] = [];

    for (const comprador of compradores || []) {
      let profile = null;
      const issues: string[] = [];
      let tipo = "nao_vinculado";

      if (comprador.profile_id) {
        profile = profiles?.find((p) => p.id === comprador.profile_id) || null;

        if (!profile) {
          tipo = "vinculo_invalido";
          issues.push("Profile vinculado não existe no sistema");
        } else {
          // Verificar divergências nos dados
          const cpfComprador = comprador.cpf_cnpj?.replace(/\D/g, "");
          const cpfProfile = profile.cpf?.replace(/\D/g, "");

          if (cpfComprador && cpfProfile && cpfComprador !== cpfProfile) {
            tipo = "cpf_divergente";
            issues.push(`CPF diferente: COHAPM=${comprador.cpf_cnpj}, Sistema=${profile.cpf}`);
          }

          const nomeCompradorNorm = comprador.nome.toLowerCase().trim();
          const nomeProfileNorm = profile.nome_completo.toLowerCase().trim();

          if (nomeCompradorNorm !== nomeProfileNorm) {
            if (tipo !== "cpf_divergente") tipo = "dados_divergentes";
            issues.push(`Nome diferente: COHAPM="${comprador.nome}", Sistema="${profile.nome_completo}"`);
          }

          if (comprador.email && profile.email && comprador.email.toLowerCase() !== profile.email.toLowerCase()) {
            if (tipo !== "cpf_divergente") tipo = "dados_divergentes";
            issues.push(`Email diferente: COHAPM=${comprador.email}, Sistema=${profile.email}`);
          }

          if (issues.length === 0) {
            tipo = "vinculado";
          }
        }
      } else {
        // Tentar encontrar match automático
        const cpfComprador = comprador.cpf_cnpj?.replace(/\D/g, "");
        if (cpfComprador) {
          const matchPorCpf = profiles?.find((p) => {
            const cpfProfile = p.cpf?.replace(/\D/g, "");
            return cpfProfile === cpfComprador;
          });

          if (matchPorCpf) {
            profile = matchPorCpf;
            tipo = "match_potencial";
            issues.push("CPF encontrado no sistema mas não vinculado");
          }
        }
      }

      if (tipo !== "vinculado" || issues.length > 0) {
        divergencias.push({
          comprador,
          profile,
          tipo,
          issues,
        });
      }
    }

    console.log(`Encontradas ${divergencias.length} divergências`);

    // Salvar resultado na tabela de sincronizações
    const { error: insertError } = await supabase
      .from("sincronizacoes_cohapm")
      .insert({
        total_analisados: compradores?.length || 0,
        divergencias_encontradas: divergencias.length,
        detalhes: {
          divergencias: divergencias.map((d) => ({
            comprador_id: d.comprador.id,
            comprador_nome: d.comprador.nome,
            profile_id: d.profile?.id,
            profile_nome: d.profile?.nome_completo,
            tipo: d.tipo,
            issues: d.issues,
          })),
        },
        status: "concluida",
      });

    if (insertError) {
      throw new Error(`Erro ao salvar sincronização: ${insertError.message}`);
    }

    console.log("Sincronização salva com sucesso");

    return new Response(
      JSON.stringify({
        success: true,
        total_analisados: compradores?.length || 0,
        divergencias_encontradas: divergencias.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro na reconciliação:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
