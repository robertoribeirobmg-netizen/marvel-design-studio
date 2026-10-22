import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, User, Calendar, TrendingUp, FileText, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoricoItem {
  id: string;
  etapa_id: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  alterado_por: string;
  data_alteracao: string;
  observacao: string | null;
  profiles: {
    nome_completo: string;
  };
}

interface HistoricoEtapaObraProps {
  etapaId: string;
  etapaNome: string;
}

export function HistoricoEtapaObra({ etapaId, etapaNome }: HistoricoEtapaObraProps) {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistorico();
  }, [etapaId]);

  const loadHistorico = async () => {
    try {
      const { data: historicoData, error } = await supabase
        .from('etapas_obra_historico')
        .select('*')
        .eq('etapa_id', etapaId)
        .order('data_alteracao', { ascending: false });

      if (error) throw error;

      // Buscar nomes dos usuários
      const userIds = [...new Set(historicoData?.map(h => h.alterado_por) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome_completo')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p.nome_completo]) || []);

      const historicoComNomes = (historicoData || []).map(h => ({
        ...h,
        profiles: { nome_completo: profilesMap.get(h.alterado_por) || 'Admin' }
      }));

      setHistorico(historicoComNomes as HistoricoItem[]);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNomeCampo = (campo: string): string => {
    const campos: Record<string, string> = {
      percentual_concluido: 'Percentual Concluído',
      percentual_planejado: 'Percentual Planejado',
      data_inicio: 'Data de Início',
      data_conclusao: 'Data de Conclusão',
      descricao: 'Descrição',
    };
    return campos[campo] || campo;
  };

  const getIconForCampo = (campo: string) => {
    switch (campo) {
      case 'percentual_concluido':
      case 'percentual_planejado':
        return <TrendingUp className="h-4 w-4 text-primary" />;
      case 'data_inicio':
      case 'data_conclusao':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'descricao':
        return <FileText className="h-4 w-4 text-green-500" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const formatarValor = (campo: string, valor: string | null): string => {
    if (!valor) return '-';
    
    if (campo === 'percentual_concluido' || campo === 'percentual_planejado') {
      return `${valor}%`;
    }
    
    if (campo === 'data_inicio' || campo === 'data_conclusao') {
      try {
        return format(/^\d{4}-\d{2}-\d{2}$/.test(valor) ? parseISO(valor) : new Date(valor), "dd/MM/yyyy", { locale: ptBR });
      } catch {
        return valor;
      }
    }
    
    return valor;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma alteração registrada ainda para esta etapa.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Histórico de Alterações
        </CardTitle>
        <CardDescription>
          {etapaNome} - {historico.length} {historico.length === 1 ? 'alteração' : 'alterações'} registradas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {historico.map((item, index) => (
              <div key={item.id} className="relative">
                {index !== historico.length - 1 && (
                  <div className="absolute left-[11px] top-8 bottom-0 w-[2px] bg-border" />
                )}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      {getIconForCampo(item.campo_alterado)}
                    </div>
                  </div>
                  <Card className="flex-1">
                    <CardContent className="pt-4 pb-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <Badge variant="outline" className="mb-2">
                              {getNomeCampo(item.campo_alterado)}
                            </Badge>
                            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                              <div>
                                <span className="text-muted-foreground">Anterior: </span>
                                <span className="font-medium line-through opacity-60">
                                  {formatarValor(item.campo_alterado, item.valor_anterior)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Novo: </span>
                                <span className="font-medium text-primary">
                                  {formatarValor(item.campo_alterado, item.valor_novo)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.profiles?.nome_completo || 'Admin'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(item.data_alteracao), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        </div>
                        {item.observacao && (
                          <div className="text-sm text-muted-foreground italic mt-2 pt-2 border-t">
                            "{item.observacao}"
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
