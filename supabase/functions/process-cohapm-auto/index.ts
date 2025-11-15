import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

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

    console.log("🚀 Iniciando processamento automático COHAPM");

    // Receber o arquivo do body da requisição
    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Uint8Array;

    if (contentType.includes("multipart/form-data")) {
      // Se o arquivo foi enviado via form-data
      const formData = await req.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        throw new Error("Nenhum arquivo foi enviado");
      }
      
      fileBuffer = new Uint8Array(await file.arrayBuffer());
      console.log(`📄 Arquivo recebido: ${file.name} (${file.size} bytes)`);
    } else {
      // Se o arquivo foi enviado como JSON base64
      const body = await req.json();
      
      if (!body.fileData) {
        throw new Error("Dados do arquivo não encontrados no body da requisição");
      }
      
      // Decodificar base64
      const base64Data = body.fileData.split(",")[1] || body.fileData;
      const binaryString = atob(base64Data);
      fileBuffer = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        fileBuffer[i] = binaryString.charCodeAt(i);
      }
      
      console.log(`📄 Arquivo decodificado (${fileBuffer.length} bytes)`);
    }

    console.log("📄 Arquivo carregado, processando...");

    // Processar Excel
    const workbook = XLSX.read(fileBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Total de registros: ${data.length}`);

    // Estatísticas
    const stats = {
      total: data.length,
      inseridos: 0,
      atualizados: 0,
      erros: 0,
      vinculados: 0,
      detalhes: [] as any[],
    };

    // Processar cada comprador
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Extrair dados do Excel
        const compradorData: any = {
          id: row.id?.toString() || `cohapm_${i + 1}`,
          nome: row.nome || "Sem Nome",
          cpf_cnpj: row.cpf || null,
          grupo: row.grupo || null,
          telefone: row.telefone || null,
          email: row.email || null,
          empreendimento: row.empreendimento || "Residencial La Felicità",
          tipo: row.tipo_classificado || row.tipo_de_cadastro_ || "Comprador",
          tipo_classificado: row.tipo_classificado || row.tipo_de_cadastro_ || "Comprador",
          fonte: "sistema_cohapm",
          imobiliaria: row.imobiliaria || null,
          corretor: row.corretor || null,
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
          
          // Calcular parcelas pagas
          compradorData.parcelas_pagas = compradorData.total_parcelas - compradorData.parcelas_atrasadas;
        }

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
        } else {
          // Inserir
          const { error: insertError } = await supabase
            .from("compradores_cohapm")
            .insert(compradorData);

          if (insertError) throw insertError;
          stats.inseridos++;
        }

        // Tentar vincular com profile existente
        if (compradorData.cpf_cnpj) {
          const cpfLimpo = compradorData.cpf_cnpj.replace(/\D/g, "");
          if (cpfLimpo) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, quadra, lote")
              .eq("cpf", cpfLimpo)
              .maybeSingle();

            if (profile) {
              await supabase
                .from("compradores_cohapm")
                .update({ 
                  profile_id: profile.id,
                  quadra: profile.quadra || compradorData.quadra,
                  lote: profile.lote || compradorData.lote,
                })
                .eq("id", compradorData.id);
              
              stats.vinculados++;
              console.log(`✅ Vinculado: ${compradorData.nome}`);
            }
          }
        }

        // Log de progresso
        if ((i + 1) % 50 === 0) {
          console.log(`📈 Processados: ${i + 1}/${data.length}`);
        }

      } catch (error: any) {
        console.error(`❌ Erro ao processar ${row.nome}:`, error.message);
        stats.erros++;
        stats.detalhes.push({
          nome: row.nome,
          erro: error.message,
        });
      }
    }

    console.log("✅ Processamento concluído!");
    console.log(`📊 Inseridos: ${stats.inseridos}`);
    console.log(`📊 Atualizados: ${stats.atualizados}`);
    console.log(`🔗 Vinculados: ${stats.vinculados}`);
    console.log(`❌ Erros: ${stats.erros}`);

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        message: `Processamento concluído: ${stats.inseridos} inseridos, ${stats.atualizados} atualizados, ${stats.vinculados} vinculados, ${stats.erros} erros`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("❌ Erro no processamento:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
