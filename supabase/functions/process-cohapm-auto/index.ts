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
      const formData = await req.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        throw new Error("Nenhum arquivo foi enviado");
      }
      
      fileBuffer = new Uint8Array(await file.arrayBuffer());
      console.log(`📄 Arquivo recebido: ${file.name} (${file.size} bytes)`);
    } else {
      const body = await req.json();
      
      if (!body.fileData) {
        throw new Error("Dados do arquivo não encontrados no body da requisição");
      }
      
      const base64Data = body.fileData.split(",")[1] || body.fileData;
      const binaryString = atob(base64Data);
      fileBuffer = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        fileBuffer[i] = binaryString.charCodeAt(i);
      }
      
      console.log(`📄 Arquivo decodificado (${fileBuffer.length} bytes)`);
    }

    console.log("📄 Processando Excel...");

    // Processar Excel
    const workbook = XLSX.read(fileBuffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Total de registros: ${data.length}`);

    // Retornar resposta imediata ANTES de processar
    const response = new Response(
      JSON.stringify({
        success: true,
        message: `Processamento iniciado para ${data.length} registros`,
        info: "O processamento está sendo executado em background.",
        totalRegistros: data.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

    // Processar em background usando EdgeRuntime.waitUntil
    const processInBackground = async () => {
      const stats = {
        total: data.length,
        inseridos: 0,
        atualizados: 0,
        erros: 0,
      };

      // Processar em lotes de 10 para evitar timeout
      const BATCH_SIZE = 10;
      
      for (let batchStart = 0; batchStart < data.length; batchStart += BATCH_SIZE) {
        const batch = data.slice(batchStart, batchStart + BATCH_SIZE);
        const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(data.length / BATCH_SIZE);
        
        console.log(`📦 Lote ${batchNum}/${totalBatches} (${batch.length} registros)`);

        for (const row of batch) {
          try {
            // Extrair dados do Excel
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

          } catch (error: any) {
            console.error(`Erro no registro:`, error.message);
            stats.erros++;
          }
        }

        // Pausa entre lotes para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log("✅ Processamento concluído:", stats);
      return stats;
    };

    // Iniciar processamento em background (não aguardar)
    processInBackground().catch(err => console.error("Erro no background:", err));

    return response;

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
