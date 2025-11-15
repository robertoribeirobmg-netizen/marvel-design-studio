import { supabase } from '@/integrations/supabase/client';

// Função de retry com backoff exponencial
async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(
        `Tentativa ${attempt}/${maxRetries} falhou para ${operationName}:`,
        error.message
      );
      
      if (attempt < maxRetries) {
        // Backoff exponencial: 1s, 2s, 4s
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

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
        // Criar cooperado automaticamente com retry
        try {
          const tempEmail = `${quadra}.${lote}@temp.cooperativa.com`;
          const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
          
          const newUserData = await retryOperation(
            async () => {
              const { data: sessionData } = await supabase.auth.getSession();
              
              const { data, error } = await supabase.functions.invoke('create-user', {
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

              if (error || !data?.userId) {
                throw new Error(error?.message || 'Erro desconhecido ao criar usuário');
              }

              return data;
            },
            `criar cooperado ${cliente.cliente}`
          );

          profileId = newUserData.userId;
        } catch (error: any) {
          results.errors.push(
            `Erro ao criar cooperado ${cliente.cliente} após 3 tentativas: ${error.message}`
          );
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
        // Criar novo investimento com retry
        try {
          const newInv = await retryOperation(
            async () => {
              const { data, error } = await supabase
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

              if (error) throw error;
              return data;
            },
            `criar investimento para ${cliente.cliente}`
          );

          investimentoId = newInv.id;
        } catch (error: any) {
          results.errors.push(
            `Erro ao criar investimento para ${cliente.cliente} após 3 tentativas: ${error.message}`
          );
          continue;
        }
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
        // Inserir parcelas com retry
        try {
          await retryOperation(
            async () => {
              const { error } = await supabase
                .from('parcelas')
                .insert(parcelasToInsert);

              if (error) throw error;
            },
            `inserir parcelas para ${cliente.cliente}`
          );
        } catch (error: any) {
          results.errors.push(
            `Erro ao inserir parcelas para ${cliente.cliente} após 3 tentativas: ${error.message}`
          );
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
