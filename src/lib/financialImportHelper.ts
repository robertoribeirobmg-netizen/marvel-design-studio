import { supabase } from '@/integrations/supabase/client';

export interface FinancialImportData {
  cliente: string;
  quadraLote: string;
  parcelas: Array<{
    numero: number;
    descricao: string;
    vencimento: string | null;
    valor: number;
    situacao: string;
    dataRecebimento: string | null;
    desconto: number;
    juros: number;
    honorarios: number;
    valorPago: number;
  }>;
}

export async function importFinancialData(data: FinancialImportData[]) {
  const results = {
    success: 0,
    errors: [] as string[],
  };

  for (const cliente of data) {
    try {
      // Buscar ou criar o cooperado pelo quadra/lote
      const [quadra, lote] = cliente.quadraLote.split('/').map(s => s.trim());
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, nome_completo')
        .eq('quadra', quadra)
        .eq('lote', lote)
        .maybeSingle();

      if (profileError) {
        results.errors.push(`Erro ao buscar cooperado ${cliente.cliente}: ${profileError.message}`);
        continue;
      }

      let profileId: string;

      if (!profile) {
        // Criar cooperado automaticamente
        try {
          const tempEmail = `${quadra}.${lote}@temp.cooperativa.com`;
          const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
          
          const { data: sessionData } = await supabase.auth.getSession();
          
          const { data: newUserData, error: createUserError } = await supabase.functions.invoke('create-user', {
            body: {
              email: tempEmail,
              password: tempPassword,
              nome_completo: cliente.cliente,
              quadra,
              lote,
            },
            headers: {
              Authorization: `Bearer ${sessionData.session?.access_token}`,
            },
          });

          if (createUserError || !newUserData?.userId) {
            results.errors.push(
              `Erro ao criar cooperado ${cliente.cliente}: ${createUserError?.message || 'Erro desconhecido'}`
            );
            continue;
          }

          profileId = newUserData.userId;
        } catch (error: any) {
          results.errors.push(`Erro ao criar cooperado ${cliente.cliente}: ${error.message}`);
          continue;
        }
      } else {
        profileId = profile.id;
      }

      // Calcular valor total e número de parcelas
      const valorTotal = cliente.parcelas.reduce((sum, p) => sum + p.valor, 0);
      const numeroParcelas = cliente.parcelas.length;
      const valorParcela = numeroParcelas > 0 ? valorTotal / numeroParcelas : 0;
      
      // Buscar a primeira data de vencimento válida e garantir que seja uma data razoável
      let primeiraData = cliente.parcelas.find(p => p.vencimento)?.vencimento;
      
      // Validar se a data está em um range razoável (entre 1900 e 2100)
      if (primeiraData) {
        const year = parseInt(primeiraData.split('-')[0]);
        if (year < 1900 || year > 2100) {
          primeiraData = null;
        }
      }
      
      // Se não houver data válida, usar data atual
      if (!primeiraData) {
        primeiraData = new Date().toISOString().split('T')[0];
      }

      // Verificar se já existe um investimento para este cooperado
      const { data: existingInv } = await supabase
        .from('investimentos')
        .select('id')
        .eq('user_id', profileId)
        .maybeSingle();

      let investimentoId: string;

      if (existingInv) {
        // Usar investimento existente
        investimentoId = existingInv.id;
      } else {
        // Criar novo investimento
        const { data: newInv, error: invError } = await supabase
          .from('investimentos')
          .insert({
            user_id: profileId,
            valor_total: valorTotal,
            numero_parcelas: numeroParcelas,
            valor_parcela: valorParcela,
            data_inicio: primeiraData,
            observacoes: `Importado automaticamente - ${cliente.quadraLote}`,
          })
          .select()
          .single();

        if (invError) {
          results.errors.push(`Erro ao criar investimento para ${cliente.cliente}: ${invError.message}`);
          continue;
        }

        investimentoId = newInv.id;
      }

      // Inserir parcelas
      const parcelasToInsert = cliente.parcelas
        .filter(p => p.vencimento) // Apenas parcelas com data de vencimento
        .map(p => ({
          investimento_id: investimentoId,
          numero_parcela: p.numero,
          descricao: p.descricao,
          valor_parcela: p.valor,
          data_vencimento: p.vencimento!,
          status: p.situacao.toLowerCase() === 'pago' ? 'paga' : 'pendente',
          data_pagamento: p.dataRecebimento,
          valor_pago: p.valorPago > 0 ? p.valorPago : null,
          desconto: p.desconto,
          juros: p.juros,
          multa: 0, // Não temos multa na planilha, usando honorários como referência
          honorarios: p.honorarios,
        }));

      if (parcelasToInsert.length > 0) {
        const { error: parcelasError } = await supabase
          .from('parcelas')
          .insert(parcelasToInsert);

        if (parcelasError) {
          results.errors.push(`Erro ao inserir parcelas para ${cliente.cliente}: ${parcelasError.message}`);
          continue;
        }
      }

      results.success++;
    } catch (error: any) {
      results.errors.push(`Erro ao processar ${cliente.cliente}: ${error.message}`);
    }
  }

  return results;
}
