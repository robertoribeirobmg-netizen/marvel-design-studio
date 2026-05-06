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

    const { tipo, batch } = await req.json();

    if (!tipo || !batch || !Array.isArray(batch)) {
      throw new Error("Dados inválidos");
    }

    console.log(`📦 Processando lote de ${batch.length} registros (${tipo})`);

    const stats = {
      inseridos: 0,
      atualizados: 0,
      erros: 0,
    };

    // Processar baseado no tipo
    if (tipo === 'compradores') {
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
            quadra: row.quadra || null,
            lote: row.lote || null,
          };

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

          // Verificar se comprador já existe
          const { data: existente } = await supabase
            .from("compradores_cohapm")
            .select("id, profile_id")
            .eq("id", compradorData.id)
            .maybeSingle();

          let profileId = existente?.profile_id;

          // Se tem email, criar/vincular profile
          if (compradorData.email && compradorData.nome) {
            let profileExistente = null;
            
            // Se tem CPF, buscar profile pelo CPF
            if (compradorData.cpf_cnpj) {
              const { data } = await supabase
                .from("profiles")
                .select("id")
                .eq("cpf", compradorData.cpf_cnpj)
                .maybeSingle();
              profileExistente = data;
            }
            
            // Se não achou pelo CPF, buscar pelo email
            if (!profileExistente) {
              const { data } = await supabase
                .from("profiles")
                .select("id")
                .eq("email", compradorData.email)
                .maybeSingle();
              profileExistente = data;
            }

            if (profileExistente) {
              profileId = profileExistente.id;
              
              // Atualizar dados do profile
              await supabase
                .from("profiles")
                .update({
                  nome_completo: compradorData.nome,
                  email: compradorData.email,
                  telefone: compradorData.telefone,
                  cpf: compradorData.cpf_cnpj || null,
                  quadra: compradorData.quadra,
                  lote: compradorData.lote,
                  fase: row.fase || null,
                  updated_at: new Date().toISOString()
                })
                .eq("id", profileId);
            } else {
              // Criar novo usuário e profile
              const senha = compradorData.cpf_cnpj 
                ? compradorData.cpf_cnpj.replace(/\D/g, '').substring(0, 4)
                : Math.random().toString().substring(2, 6);
              
              try {
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                  email: compradorData.email,
                  password: senha,
                  email_confirm: true,
                  user_metadata: {
                    nome_completo: compradorData.nome
                  }
                });

                if (authError) throw authError;
                
                if (authData.user) {
                  profileId = authData.user.id;

                  // Criar profile
                  await supabase
                    .from("profiles")
                    .insert({
                      id: profileId,
                      nome_completo: compradorData.nome,
                      email: compradorData.email,
                      cpf: compradorData.cpf_cnpj || null,
                      telefone: compradorData.telefone,
                      quadra: compradorData.quadra,
                      lote: compradorData.lote,
                      fase: row.fase || null,
                      primeira_senha_alterada: false
                    });

                  // Criar user role
                  await supabase
                    .from("user_roles")
                    .insert({
                      user_id: profileId,
                      role: 'cooperado'
                    });

                  console.log(`✅ Usuário criado: ${compradorData.email}`);
                }
              } catch (authError: any) {
                console.error(`Erro ao criar usuário para ${compradorData.email}:`, authError.message);
              }
            }
          }

          // Vincular profile_id ao comprador
          if (profileId) {
            compradorData.profile_id = profileId;
          }

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
          console.error(`Erro no comprador:`, error.message);
          stats.erros++;
        }
      }
    } else if (tipo === 'contratos') {
      for (const row of batch) {
        try {
          const contratoData: any = {
            comprador_id: row.comprador_id?.toString() || null,
            numero_contrato: row.numero_contrato || null,
            numero_ficha: row.numero_ficha || null,
            data_contrato: row.data_contrato ? new Date(row.data_contrato).toISOString().split('T')[0] : null,
            quadra: row.quadra || null,
            lote: row.lote || null,
            area_m2: parseFloat(row.area_m2) || null,
            metragem: parseFloat(row.metragem) || null,
            valor_total: parseFloat(row.valor_total) || null,
            valor_entrada: parseFloat(row.valor_entrada) || null,
            valor_financiado: parseFloat(row.valor_financiado) || null,
            numero_parcelas: parseInt(row.numero_parcelas) || null,
            valor_parcela: parseFloat(row.valor_parcela) || null,
            situacao: row.situacao || null,
            status: row.status || null,
            imobiliaria: row.imobiliaria || null,
            corretor: row.corretor || null,
            observacoes_contrato: row.observacoes || null,
          };

          if (contratoData.comprador_id && contratoData.numero_contrato) {
            const { data: existente } = await supabase
              .from("contratos_cohapm")
              .select("id")
              .eq("comprador_id", contratoData.comprador_id)
              .eq("numero_contrato", contratoData.numero_contrato)
              .maybeSingle();

            if (existente) {
              const { error: updateError } = await supabase
                .from("contratos_cohapm")
                .update(contratoData)
                .eq("id", existente.id);

              if (updateError) throw updateError;
              stats.atualizados++;
            } else {
              const { error: insertError } = await supabase
                .from("contratos_cohapm")
                .insert(contratoData);

              if (insertError) throw insertError;
              stats.inseridos++;
            }
          } else {
            const { error: insertError } = await supabase
              .from("contratos_cohapm")
              .insert(contratoData);

            if (insertError) throw insertError;
            stats.inseridos++;
          }
        } catch (error: any) {
          console.error(`Erro no contrato:`, error.message);
          stats.erros++;
        }
      }
    } else if (tipo === 'parcelas') {
      for (const row of batch) {
        try {
          // Mapear campos do template com nomes alternativos
          const vencimento = row.vencimento_parcela || row.data_vencimento;
          const valorParcela = row.valor_parcela;
          const situacao = row.situacao || row.status;
          const dataRecebimento = row.data_recebimento || row['Data Recebimento'];
          const desconto = row.desconto || row.valor_desconto;
          const juros = row.juros || row.valor_juros;
          const valorPago = row.valor_pago || row['Valor Pago'];

          const parcelaData: any = {
            comprador_id: row.comprador_id?.toString() || null,
            contrato_id: row.contrato_id ? parseInt(row.contrato_id) : null,
            numero_parcela: parseInt(row.numero_parcela) || null,
            valor_parcela: parseFloat(valorParcela) || null,
            valor_original: parseFloat(row.valor_original) || parseFloat(valorParcela) || null,
            data_vencimento: vencimento ? new Date(vencimento).toISOString().split('T')[0] : null,
            data_pagamento: row.data_pagamento ? new Date(row.data_pagamento).toISOString().split('T')[0] : null,
            data_recebimento: dataRecebimento ? new Date(dataRecebimento).toISOString().split('T')[0] : null,
            data_lancamento: row.data_lancamento ? new Date(row.data_lancamento).toISOString().split('T')[0] : null,
            valor_pago: parseFloat(valorPago) || null,
            valor_juros: parseFloat(juros) || 0,
            valor_multa: parseFloat(row.valor_multa) || 0,
            valor_desconto: parseFloat(desconto) || 0,
            valor_total_calculado: parseFloat(row.valor_total_calculado) || null,
            status: situacao || null,
            tipo_parcela: row.tipo_parcela || null,
            situacao: situacao || null,
            dias_atraso: parseInt(row.dias_atraso) || 0,
            forma_pagamento: row.forma_pagamento || null,
            banco: row.banco || null,
            agencia: row.agencia || null,
            conta: row.conta || null,
            periodo_inicio: row.periodo_inicio ? new Date(row.periodo_inicio).toISOString().split('T')[0] : null,
            periodo_fim: row.periodo_fim ? new Date(row.periodo_fim).toISOString().split('T')[0] : null,
            numero_lancamento: row.numero_lancamento || null,
            numero_baixa: row.numero_baixa || null,
            codigo_remessa: row.codigo_remessa || null,
            observacoes_parcela: row.observacoes || null,
          };

          if (parcelaData.comprador_id && parcelaData.numero_parcela) {
            const { data: existente } = await supabase
              .from("parcelas_cohapm")
              .select("id")
              .eq("comprador_id", parcelaData.comprador_id)
              .eq("numero_parcela", parcelaData.numero_parcela)
              .maybeSingle();

            if (existente) {
              const { error: updateError } = await supabase
                .from("parcelas_cohapm")
                .update(parcelaData)
                .eq("id", existente.id);

              if (updateError) throw updateError;
              stats.atualizados++;
            } else {
              const { error: insertError } = await supabase
                .from("parcelas_cohapm")
                .insert(parcelaData);

              if (insertError) throw insertError;
              stats.inseridos++;
            }
          } else {
            const { error: insertError } = await supabase
              .from("parcelas_cohapm")
              .insert(parcelaData);

            if (insertError) throw insertError;
            stats.inseridos++;
          }
        } catch (error: any) {
          console.error(`Erro na parcela:`, error.message);
          stats.erros++;
        }
      }
    }

    console.log(`✅ Lote processado (${tipo}):`, stats);

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
