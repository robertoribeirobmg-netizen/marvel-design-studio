import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ParcelaData {
  id: string;
  quadraLote: string;
  cliente: string;
  descricao: string;
  vencimento: string;
  valor: number;
  situacao: 'PAGO' | 'A Vencer';
  dataRecebimento?: string;
  desconto: number;
  juros: number;
  honorarios: number;
  valorPago: number;
  parcelaId: string;
  userId: string;
}

export function useParcelasData(userId?: string) {
  const [parcelas, setParcelas] = useState<ParcelaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchParcelas = async () => {
    try {
      setIsLoading(true);

      // Buscar investimentos com filtro de usuário se fornecido
      let investimentosQuery = supabase
        .from('investimentos')
        .select(`
          id,
          user_id,
          observacoes
        `);

      if (userId) {
        investimentosQuery = investimentosQuery.eq('user_id', userId);
      }

      const { data: investimentos, error: investimentosError } = await investimentosQuery;

      if (investimentosError) throw investimentosError;

      if (!investimentos || investimentos.length === 0) {
        setParcelas([]);
        setIsLoading(false);
        return;
      }

      const investimentoIds = investimentos.map(inv => inv.id);

      // Buscar parcelas dos investimentos
      const { data: parcelasData, error: parcelasError } = await supabase
        .from('parcelas')
        .select('*')
        .in('investimento_id', investimentoIds)
        .order('data_vencimento', { ascending: true });

      if (parcelasError) throw parcelasError;

      // Buscar perfis dos usuários
      const userIds = [...new Set(investimentos.map(inv => inv.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome_completo, quadra, lote')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Mapear dados para o formato esperado
      const parcelasProcessadas: ParcelaData[] = (parcelasData || []).map(parcela => {
        const investimento = investimentos.find(inv => inv.id === parcela.investimento_id);
        const profile = profiles?.find(p => p.id === investimento?.user_id);

        return {
          id: parcela.id,
          parcelaId: parcela.id,
          userId: investimento?.user_id || '',
          quadraLote: profile?.quadra && profile?.lote 
            ? `${profile.quadra}/${profile.lote}` 
            : 'N/A',
          cliente: profile?.nome_completo || 'Desconhecido',
          descricao: parcela.descricao || `Parcela ${parcela.numero_parcela}`,
          vencimento: parcela.data_vencimento,
          valor: Number(parcela.valor_parcela) || 0,
          situacao: parcela.status === 'pago' ? 'PAGO' : 'A Vencer',
          dataRecebimento: parcela.data_pagamento || undefined,
          desconto: Number(parcela.desconto) || 0,
          juros: Number(parcela.juros) || 0,
          honorarios: Number(parcela.honorarios) || 0,
          valorPago: Number(parcela.valor_pago) || 0
        };
      });

      setParcelas(parcelasProcessadas);
    } catch (error: any) {
      console.error('Erro ao carregar parcelas:', error);
      toast.error('Erro ao carregar dados das parcelas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParcelas();
  }, [userId]);

  const atualizarParcela = async (parcelaId: string, dados: {
    data_pagamento: string;
    valor_pago: number;
    juros: number;
    honorarios: number;
    desconto: number;
  }) => {
    try {
      const { error } = await supabase
        .from('parcelas')
        .update({
          status: 'pago',
          data_pagamento: dados.data_pagamento,
          valor_pago: dados.valor_pago,
          juros: dados.juros,
          honorarios: dados.honorarios,
          desconto: dados.desconto
        })
        .eq('id', parcelaId);

      if (error) throw error;

      toast.success('Parcela atualizada com sucesso!');
      await fetchParcelas();
    } catch (error: any) {
      console.error('Erro ao atualizar parcela:', error);
      toast.error('Erro ao atualizar parcela');
      throw error;
    }
  };

  return {
    parcelas,
    isLoading,
    atualizarParcela,
    refetch: fetchParcelas
  };
}
