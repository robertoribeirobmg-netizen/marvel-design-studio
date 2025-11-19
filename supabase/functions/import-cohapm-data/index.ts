import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompradorRow {
  id: string;
  nome: string;
  cpf?: string;
  grupo?: string;
  telefone?: string;
  email?: string;
  empreendimento?: string;
  quadra?: string;
  lote?: string;
  total_contratos?: number;
  total_parcelas?: number;
  financeiro_valor_total?: number;
  financeiro_valor_pago?: number;
  financeiro_valor_pendente?: number;
  financeiro_parcelas_atrasadas?: number;
  financeiro_situacao?: string;
  imobiliaria?: string;
  corretor?: string;
  tipo_classificado?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Iniciando importação de dados COHAPM");

    // Obter arquivo do body
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new Error("Arquivo não fornecido");
    }

    console.log(`Processando arquivo: ${file.name}`);

    // Ler arquivo Excel
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: CompradorRow[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Total de registros no Excel: ${data.length}`);

    // Estatísticas
    const stats = {
      total: data.length,
      inseridos: 0,
      atualizados: 0,
      erros: 0,
      detalhes: [] as any[],
    };

    // Processar cada comprador
    for (const row of data) {
      try {
        // Normalizar dados
        const compradorData = {
          id: row.id?.toString() || crypto.randomUUID(),
          nome: row.nome || "Sem Nome",
          cpf_cnpj: row.cpf || null,
          grupo: row.grupo || null,
          telefone: row.telefone || null,
          email: row.email || null,
          empreendimento: row.empreendimento || "Residencial La Felicità",
          quadra: row.quadra || null,
          lote: row.lote || null,
          tipo: row.tipo_classificado || "Comprador",
          tipo_classificado: row.tipo_classificado || "Comprador",
          fonte: "sistema_cohapm",
          imobiliaria: row.imobiliaria || null,
          corretor: row.corretor || null,
          
          // Dados financeiros
          valor_total_contratos: row.financeiro_valor_total || 0,
          valor_pago: row.financeiro_valor_pago || 0,
          valor_pendente: row.financeiro_valor_pendente || 0,
          total_contratos: row.total_contratos || 0,
          total_parcelas: row.total_parcelas || 0,
          parcelas_atrasadas: row.financeiro_parcelas_atrasadas || 0,
          situacao_financeira: row.financeiro_situacao || null,
          
          data_extracao: new Date().toISOString(),
        };

        // Verificar se já existe
        const { data: existente } = await supabase
          .from("compradores_cohapm")
          .select("id")
          .eq("id", compradorData.id)
          .maybeSingle();

        if (existente) {
          // Atualizar
          const { error: updateError } = await supabase
            .from("compradores_cohapm")
            .update(compradorData)
            .eq("id", compradorData.id);

          if (updateError) throw updateError;
          stats.atualizados++;
          console.log(`Atualizado: ${compradorData.nome}`);
        } else {
          // Inserir
          const { error: insertError } = await supabase
            .from("compradores_cohapm")
            .insert(compradorData);

          if (insertError) throw insertError;
          stats.inseridos++;
          console.log(`Inserido: ${compradorData.nome}`);
        }

        // Tentar vincular com profile existente ou criar novo (por CPF)
        if (compradorData.cpf_cnpj) {
          const cpfLimpo = compradorData.cpf_cnpj.replace(/\D/g, "");
          if (cpfLimpo && cpfLimpo.length >= 11) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("cpf", cpfLimpo)
              .maybeSingle();

            if (profile) {
              // Vincular ao profile existente
              await supabase
                .from("compradores_cohapm")
                .update({ profile_id: profile.id })
                .eq("id", compradorData.id);
              
              console.log(`Vinculado ao profile existente: ${compradorData.nome}`);
            } else if (compradorData.email && compradorData.nome) {
              // Criar novo usuário cooperado se tiver email e nome
              try {
                const { data: newProfile, error: createError } = await supabase
                  .rpc("create_profile_with_temp_password", {
                    p_email: compradorData.email,
                    p_nome: compradorData.nome,
                    p_cpf: cpfLimpo,
                    p_quadra: compradorData.quadra || null,
                    p_lote: compradorData.lote || null,
                  });

                if (createError) {
                  console.error(`Erro ao criar usuário para ${compradorData.nome}:`, createError.message);
                } else if (newProfile) {
                  // Vincular ao novo profile criado
                  await supabase
                    .from("compradores_cohapm")
                    .update({ profile_id: newProfile })
                    .eq("id", compradorData.id);
                  
                  console.log(`Novo usuário cooperado criado e vinculado: ${compradorData.nome}`);
                }
              } catch (createErr: any) {
                console.error(`Erro ao criar usuário para ${compradorData.nome}:`, createErr.message);
              }
            }
          }
        }

      } catch (error: any) {
        console.error(`Erro ao processar ${row.nome}:`, error.message);
        stats.erros++;
        stats.detalhes.push({
          nome: row.nome,
          erro: error.message,
        });
      }
    }

    console.log("Importação concluída:", stats);

    return new Response(
      JSON.stringify({
        success: true,
        stats,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro na importação:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
