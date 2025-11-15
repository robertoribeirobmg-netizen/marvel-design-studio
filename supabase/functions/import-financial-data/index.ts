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

    const { parcelasPorCliente } = await req.json();

    if (!parcelasPorCliente || Object.keys(parcelasPorCliente).length === 0) {
      throw new Error('Nenhum dado fornecido');
    }

    console.log(`Processando ${Object.keys(parcelasPorCliente).length} clientes`);

    // Buscar todos os perfis
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('*');

    if (profilesError) throw profilesError;

    let investimentosCriados = 0;
    let parcelasCriadas = 0;
    const erros: string[] = [];

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

      // Criar parcelas
      for (let i = 0; i < parcelas.length; i++) {
        const p = parcelas[i];
        const dataVencimento = parseExcelDate(p.vencimento);
        const dataPagamento = p.dataRecebimento ? parseExcelDate(p.dataRecebimento) : null;
        const status = p.situacao === 'PAGO' ? 'paga' : 'pendente';

        const { error: parcelaError } = await supabaseClient
          .from('parcelas')
          .insert({
            investimento_id: investimentoId,
            numero_parcela: i + 1,
            valor_parcela: p.valor,
            data_vencimento: dataVencimento,
            data_pagamento: dataPagamento,
            valor_pago: p.valorPago > 0 ? p.valorPago : null,
            status: status,
            descricao: p.descricao,
            desconto: p.desconto > 0 ? p.desconto : null,
            juros: p.juros > 0 ? p.juros : null,
            honorarios: p.honorarios > 0 ? p.honorarios : null,
            observacoes: dataPagamento ? `Pago em ${dataPagamento}` : null
          });

        if (parcelaError) {
          console.error(`Erro ao criar parcela ${i + 1} para ${nomeCliente}:`, parcelaError);
          erros.push(`Erro parcela ${i + 1} de ${nomeCliente}: ${parcelaError.message}`);
        } else {
          parcelasCriadas++;
        }
      }
    }

    console.log(`Importação concluída: ${investimentosCriados} investimentos, ${parcelasCriadas} parcelas`);

    return new Response(
      JSON.stringify({
        success: true,
        investimentosCriados,
        parcelasCriadas,
        totalClientes: Object.keys(parcelasPorCliente).length,
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
