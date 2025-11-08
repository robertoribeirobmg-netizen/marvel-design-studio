import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { read, utils } from 'https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParcelaExcel {
  quadraLote: string;
  cliente: string;
  descricao: string;
  vencimento: string;
  valor: number;
  situacao: string;
  dataRecebimento: string;
  desconto: number;
  juros: number;
  honorarios: number;
  valorPago: number;
}

const parseValorMonetario = (valor: any): number => {
  if (typeof valor === 'number') return valor;
  if (!valor) return 0;
  
  const valorLimpo = valor
    .toString()
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  
  return parseFloat(valorLimpo) || 0;
};

const parseData = (dataStr: any): string | null => {
  if (!dataStr) return null;
  
  try {
    let data: Date;
    
    if (typeof dataStr === 'number') {
      // Excel serial date
      data = new Date((dataStr - 25569) * 86400 * 1000);
    } else if (dataStr.includes('/')) {
      const partes = dataStr.split('/');
      if (partes.length === 3) {
        const [p1, p2, p3] = partes;
        const ano = p3.length === 2 ? (parseInt(p3) > 50 ? '19' + p3 : '20' + p3) : p3;
        data = new Date(`${ano}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`);
        
        if (isNaN(data.getTime())) {
          data = new Date(`${ano}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`);
        }
      } else {
        return null;
      }
    } else {
      data = new Date(dataStr);
    }
    
    if (isNaN(data.getTime())) return null;
    
    return data.toISOString().split('T')[0];
  } catch (error) {
    console.error('Erro ao parsear data:', dataStr, error);
    return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the Excel file from the request
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('Nenhum arquivo foi enviado');
    }

    console.log('Processando arquivo:', file.name);

    // Read the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    console.log('Linhas encontradas:', jsonData.length);

    const linhas = jsonData.slice(1);
    const parcelasExcel: ParcelaExcel[] = [];
    
    for (const linha of linhas) {
      if (!linha[0] || !linha[1]) continue;
      
      parcelasExcel.push({
        quadraLote: linha[0]?.toString().trim() || '',
        cliente: linha[1]?.toString().trim() || '',
        descricao: linha[2]?.toString().trim() || '',
        vencimento: linha[3]?.toString() || '',
        valor: parseValorMonetario(linha[4]),
        situacao: linha[5]?.toString().trim() || '',
        dataRecebimento: linha[6]?.toString() || '',
        desconto: parseValorMonetario(linha[7]),
        juros: parseValorMonetario(linha[8]),
        honorarios: parseValorMonetario(linha[9]),
        valorPago: parseValorMonetario(linha[10]),
      });
    }

    console.log('Parcelas processadas:', parcelasExcel.length);

    // Agrupar por cliente
    const clientesMap = new Map<string, ParcelaExcel[]>();
    
    for (const parcela of parcelasExcel) {
      const clienteKey = `${parcela.cliente}|${parcela.quadraLote}`;
      if (!clientesMap.has(clienteKey)) {
        clientesMap.set(clienteKey, []);
      }
      clientesMap.get(clienteKey)!.push(parcela);
    }

    console.log('Clientes únicos encontrados:', clientesMap.size);

    // Processar cada cliente
    const results = {
      success: 0,
      errors: [] as string[],
      cooperadosDetalhes: [] as any[],
    };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (const [clienteKey, parcelas] of clientesMap.entries()) {
      const [cliente, quadraLote] = clienteKey.split('|');
      const [quadra, lote] = quadraLote.split('/').map(s => s.trim());

      try {
        // Buscar cooperado
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .eq('quadra', quadra)
          .eq('lote', lote)
          .maybeSingle();

        if (profileError) {
          results.errors.push(`Erro ao buscar cooperado ${cliente}: ${profileError.message}`);
          continue;
        }

        let profileId: string;

        if (!profile) {
          // Criar cooperado automaticamente
          const tempEmail = `${quadra}.${lote}@temp.cooperativa.com`;
          const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
          
          const authHeader = req.headers.get('Authorization');
          
          const createResponse = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader || '',
            },
            body: JSON.stringify({
              email: tempEmail,
              password: tempPassword,
              nome: cliente,
              quadra,
              lote,
            }),
          });

          const createData = await createResponse.json();

          if (!createResponse.ok || !createData?.userId) {
            results.errors.push(`Erro ao criar cooperado ${cliente}: ${createData?.error || 'Erro desconhecido'}`);
            continue;
          }

          profileId = createData.userId;
          console.log('Cooperado criado:', cliente, profileId);
        } else {
          profileId = profile.id;
          console.log('Cooperado encontrado:', cliente, profileId);
        }

        // Calcular estatísticas
        const valorTotal = parcelas.reduce((sum, p) => sum + p.valor, 0);
        const numeroParcelas = parcelas.length;
        const valorParcela = numeroParcelas > 0 ? valorTotal / numeroParcelas : 0;
        const primeiraData = parcelas.find(p => p.vencimento)?.vencimento || new Date().toISOString().split('T')[0];

        // Verificar investimento existente
        const { data: existingInv } = await supabase
          .from('investimentos')
          .select('id')
          .eq('user_id', profileId)
          .maybeSingle();

        let investimentoId: string;

        if (existingInv) {
          investimentoId = existingInv.id;
          console.log('Usando investimento existente:', investimentoId);
        } else {
          const { data: newInv, error: invError } = await supabase
            .from('investimentos')
            .insert({
              user_id: profileId,
              valor_total: valorTotal,
              numero_parcelas: numeroParcelas,
              valor_parcela: valorParcela,
              data_inicio: primeiraData,
              observacoes: `Importado automaticamente - ${quadraLote}`,
            })
            .select()
            .single();

          if (invError) {
            results.errors.push(`Erro ao criar investimento para ${cliente}: ${invError.message}`);
            continue;
          }

          investimentoId = newInv.id;
          console.log('Investimento criado:', investimentoId);
        }

        // Inserir parcelas
        const parcelasToInsert = parcelas
          .filter(p => p.vencimento)
          .map((p, idx) => ({
            investimento_id: investimentoId,
            numero_parcela: idx + 1,
            descricao: p.descricao,
            valor_parcela: p.valor,
            data_vencimento: parseData(p.vencimento)!,
            status: p.situacao.toLowerCase() === 'pago' ? 'paga' : 'pendente',
            data_pagamento: parseData(p.dataRecebimento),
            valor_pago: p.valorPago > 0 ? p.valorPago : null,
            desconto: p.desconto,
            juros: p.juros,
            multa: 0,
            honorarios: p.honorarios,
          }));

        if (parcelasToInsert.length > 0) {
          const { error: parcelasError } = await supabase
            .from('parcelas')
            .insert(parcelasToInsert);

          if (parcelasError) {
            results.errors.push(`Erro ao inserir parcelas para ${cliente}: ${parcelasError.message}`);
            continue;
          }

          console.log('Parcelas inseridas:', parcelasToInsert.length);
        }

        // Calcular estatísticas detalhadas
        let parcelasPagas = 0;
        let parcelasVencidas = 0;
        let parcelasAVencer = 0;
        let valorPago = 0;

        for (const p of parcelas) {
          if (p.situacao.toLowerCase() === 'pago') {
            parcelasPagas++;
            valorPago += p.valorPago;
          } else if (p.vencimento) {
            const dataVencimento = new Date(parseData(p.vencimento) || '');
            dataVencimento.setHours(0, 0, 0, 0);
            
            if (dataVencimento < hoje) {
              parcelasVencidas++;
            } else {
              parcelasAVencer++;
            }
          }
        }

        results.cooperadosDetalhes.push({
          cliente,
          quadraLote,
          totalParcelas: parcelas.length,
          parcelasPagas,
          parcelasVencidas,
          parcelasAVencer,
          valorTotal,
          valorPago,
          saldoDevedor: valorTotal - valorPago,
        });

        results.success++;
      } catch (error: any) {
        results.errors.push(`Erro ao processar ${cliente}: ${error.message}`);
        console.error('Erro ao processar cliente:', cliente, error);
      }
    }

    console.log('Importação concluída:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
