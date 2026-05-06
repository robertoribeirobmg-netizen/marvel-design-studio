import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParcelaData {
  quadraLote: string;
  cliente: string;
  descricao: string;
  vencimento: string;
  valor: number;
  situacao: string;
  dataRecebimento: string | null;
  desconto: number;
  juros: number;
  honorarios: number;
  valorPago: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Auth + admin enforcement
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roleData } = await supabaseClient
      .from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { parcelasPorCliente, dryRun = false } = await req.json();

    if (!parcelasPorCliente || Object.keys(parcelasPorCliente).length === 0) {
      throw new Error('Nenhum dado fornecido');
    }

    console.log(`${dryRun ? 'Analisando' : 'Processando'} ${Object.keys(parcelasPorCliente).length} clientes`);

    // Buscar todos os perfis
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('*');

    if (profilesError) throw profilesError;

    let investimentosCriados = 0;
    let parcelasCriadas = 0;
    let parcelasAtualizadas = 0;
    const erros: string[] = [];
    const conflitos: any[] = [];
    const novasParcelas: any[] = [];

    // Processar cada cliente
    for (const [nomeCliente, parcelas] of Object.entries(parcelasPorCliente) as [string, ParcelaData[]][]) {
      // Encontrar o perfil correspondente
      const profile = profiles?.find(p => 
        p.nome_completo.toUpperCase().trim() === nomeCliente
      );

      if (!profile) {
        console.log(`Perfil não encontrado para: ${nomeCliente}`);
        erros.push(`Perfil não encontrado: ${nomeCliente}`);
        continue;
      }

      // Atualizar quadra/lote do perfil se necessário
      const primeiraParce = parcelas[0];
      const [quadra, lote] = primeiraParce.quadraLote.split('/').map(s => s.trim());
      
      if (quadra && lote) {
        await supabaseClient
          .from('profiles')
          .update({ quadra, lote })
          .eq('id', profile.id);
      }

      // Calcular totais
      const valorTotal = parcelas.reduce((sum, p) => sum + p.valor, 0);
      const numeroParcelas = parcelas.length;
      const valorParcela = valorTotal / numeroParcelas;
      const dataInicio = parseExcelDate(parcelas[0].vencimento);

      // Verificar se já existe investimento
      const { data: existingInv } = await supabaseClient
        .from('investimentos')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      let investimentoId: string;

      if (existingInv) {
        investimentoId = existingInv.id;
        console.log(`Usando investimento existente para ${nomeCliente}`);
      } else {
        // Criar investimento
        const { data: novoInvestimento, error: invError } = await supabaseClient
          .from('investimentos')
          .insert({
            user_id: profile.id,
            valor_total: valorTotal,
            numero_parcelas: numeroParcelas,
            valor_parcela: valorParcela,
            data_inicio: dataInicio,
            observacoes: `Importado automaticamente em ${new Date().toLocaleDateString('pt-BR')}`
          })
          .select()
          .single();

        if (invError) {
          console.error(`Erro ao criar investimento para ${nomeCliente}:`, invError);
          erros.push(`Erro investimento ${nomeCliente}: ${invError.message}`);
          continue;
        }

        investimentoId = novoInvestimento.id;
        investimentosCriados++;
        console.log(`Investimento criado para ${nomeCliente}`);
      }

      // Criar ou atualizar parcelas
      for (let i = 0; i < parcelas.length; i++) {
        const p = parcelas[i];
        const numeroParcela = i + 1;

        const dataVencimento = parseExcelDate(p.vencimento);
        const dataPagamento = p.dataRecebimento ? parseExcelDate(p.dataRecebimento) : null;
        const status = p.situacao === 'PAGO' ? 'paga' : 'pendente';

        const parcelaData = {
          investimento_id: investimentoId,
          numero_parcela: numeroParcela,
          valor_parcela: p.valor,
          data_vencimento: dataVencimento,
          data_pagamento: dataPagamento,
          valor_pago: p.valorPago > 0 ? p.valorPago : null,
          status: status,
          descricao: p.descricao,
          desconto: p.desconto > 0 ? p.desconto : null,
          juros: p.juros > 0 ? p.juros : null,
          honorarios: p.honorarios > 0 ? p.honorarios : null,
          observacoes: dataPagamento ? `Atualizado em ${new Date().toLocaleDateString('pt-BR')}` : null
        };

        // Verificar se a parcela já existe
        const { data: existingParcela } = await supabaseClient
          .from('parcelas')
          .select('*')
          .eq('investimento_id', investimentoId)
          .eq('numero_parcela', numeroParcela)
          .maybeSingle();

        if (existingParcela) {
          // Detectar mudanças
          const mudancas = [];
          if (existingParcela.valor_parcela !== p.valor) mudancas.push('valor');
          if (existingParcela.status !== status) mudancas.push('status');
          if (existingParcela.data_vencimento !== dataVencimento) mudancas.push('vencimento');
          if (existingParcela.data_pagamento !== dataPagamento) mudancas.push('pagamento');
          
          if (dryRun) {
            // Modo análise: apenas registrar conflito
            conflitos.push({
              cliente: nomeCliente,
              numeroParcela,
              valorAnterior: existingParcela.valor_parcela,
              valorNovo: p.valor,
              statusAnterior: existingParcela.status,
              statusNovo: status,
              dataVencimentoAnterior: existingParcela.data_vencimento,
              dataVencimentoNovo: dataVencimento,
              dataPagamentoAnterior: existingParcela.data_pagamento,
              dataPagamentoNovo: dataPagamento,
              mudancas
            });
          } else {
            // Modo importação: atualizar
            const { error: updateError } = await supabaseClient
              .from('parcelas')
              .update(parcelaData)
              .eq('id', existingParcela.id);

            if (updateError) {
              console.error(`Erro ao atualizar parcela ${numeroParcela} para ${nomeCliente}:`, updateError);
              erros.push(`Erro ao atualizar parcela ${numeroParcela} de ${nomeCliente}: ${updateError.message}`);
            } else {
              parcelasAtualizadas++;
              console.log(`Parcela ${numeroParcela} atualizada para ${nomeCliente}`);
            }
          }
        } else {
          if (dryRun) {
            // Modo análise: apenas registrar nova parcela
            novasParcelas.push({
              cliente: nomeCliente,
              numeroParcela,
              valor: p.valor,
              status,
              dataVencimento,
              dataPagamento,
              descricao: p.descricao
            });
          } else {
            // Modo importação: criar
            const { error: insertError } = await supabaseClient
              .from('parcelas')
              .insert(parcelaData);

            if (insertError) {
              console.error(`Erro ao criar parcela ${numeroParcela} para ${nomeCliente}:`, insertError);
              erros.push(`Erro parcela ${numeroParcela} de ${nomeCliente}: ${insertError.message}`);
            } else {
              parcelasCriadas++;
              console.log(`Parcela ${numeroParcela} criada para ${nomeCliente}`);
            }
          }
        }
      }
    }

    console.log(`${dryRun ? 'Análise' : 'Importação'} concluída: ${investimentosCriados} investimentos, ${parcelasCriadas} parcelas criadas, ${parcelasAtualizadas} parcelas atualizadas`);

    return new Response(
      JSON.stringify({
        success: true,
        investimentosCriados,
        parcelasCriadas,
        parcelasAtualizadas,
        totalClientes: Object.keys(parcelasPorCliente).length,
        conflitos: dryRun ? conflitos : undefined,
        novasParcelas: dryRun ? novasParcelas : undefined,
        erros: erros.length > 0 ? erros : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro na importação:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function parseExcelDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Tenta vários formatos
  // Formato: M/D/YY ou M/D/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    let year = parts[2];
    
    // Se ano tem 2 dígitos, adicionar 20
    if (year.length === 2) {
      year = '20' + year;
    }
    
    return `${year}-${month}-${day}`;
  }
  
  return new Date().toISOString().split('T')[0];
}
