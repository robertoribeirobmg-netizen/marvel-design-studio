import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { batch } = await req.json();

    if (!batch || !Array.isArray(batch)) {
      throw new Error("Batch de dados inválido");
    }

    console.log(`📦 Processando lote de ${batch.length} registros`);

    const stats = {
      inseridos: 0,
      atualizados: 0,
      erros: 0,
    };

    // Processar cada registro do batch
    for (const row of batch) {
      try {
        const compradorData: any = {
          id: row.id?.toString() || `cohapm_${Date.now()}_${Math.random()}`,
          nome: row.nome || "Sem Nome",
          cpf_cnpj: row.cpf || null,
          grupo: row.grupo || null,
          telefone: row.telefone || null,
          email: row.email || null,
          empreendimento: row.empreendimento || "Residencial La Felicità",
          tipo: row.tipo_classificado || row.tipo_de_cadastro_ || "Comprador",
          tipo_classificado: row.tipo_classificado || row.tipo_de_cadastro_ || "Comprador",
          fonte: "sistema_cohapm",
          data_extracao: new Date().toISOString(),
        };

        // Dados financeiros
        if (row.financeiro_valor_total || row.financeiro_valor_pago) {
          compradorData.valor_total_contratos = parseFloat(row.financeiro_valor_total) || 0;
          compradorData.valor_pago = parseFloat(row.financeiro_valor_pago) || 0;
          compradorData.valor_pendente = parseFloat(row.financeiro_valor_pendente) || 0;
          compradorData.total_contratos = parseInt(row.total_contratos) || 0;
          compradorData.total_parcelas = parseInt(row.total_parcelas) || 0;
          compradorData.parcelas_atrasadas = parseInt(row.financeiro_parcelas_atrasadas) || 0;
          compradorData.situacao_financeira = row.financeiro_situacao || null;
          compradorData.parcelas_pagas = compradorData.total_parcelas - compradorData.parcelas_atrasadas;
        }

        // Verificar se já existe
        const { data: existente } = await supabase
          .from("compradores_cohapm")
          .select("id")
          .eq("id", compradorData.id)
          .maybeSingle();

        if (existente) {
          const { error: updateError } = await supabase
            .from("compradores_cohapm")
            .update(compradorData)
            .eq("id", compradorData.id);

          if (updateError) throw updateError;
          stats.atualizados++;
        } else {
          const { error: insertError } = await supabase
            .from("compradores_cohapm")
            .insert(compradorData);

          if (insertError) throw insertError;
          stats.inseridos++;
        }
      } catch (error: any) {
        console.error(`Erro no registro:`, error.message);
        stats.erros++;
      }
    }

    console.log(`✅ Lote processado:`, stats);

    return new Response(
      JSON.stringify({
        success: true,
        stats,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
