import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, User, Calendar, TrendingUp, FileText, Clock, Filter } from 'lucide-react';
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
  etapas_obra: {
    nome: string;
  };
  profiles: {
    nome_completo: string;
  };
}

export function HistoricoGeralObras() {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCampo, setFiltroCampo] = useState<string>('todos');

  useEffect(() => {
    loadHistorico();
  }, []);

  const loadHistorico = async () => {
    try {
      const { data: historicoData, error: historicoError } = await supabase
        .from('etapas_obra_historico')
        .select('*')
        .order('data_alteracao', { ascending: false })
        .limit(50);

      if (historicoError) throw historicoError;

      // Buscar etapas
      const etapaIds = [...new Set(historicoData?.map(h => h.etapa_id) || [])];
      const { data: etapas } = await supabase
        .from('etapas_obra')
        .select('id, nome')
        .in('id', etapaIds);

      const etapasMap = new Map(etapas?.map(e => [e.id, e.nome]) || []);

      // Buscar nomes dos usuários
      const userIds = [...new Set(historicoData?.map(h => h.alterado_por) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome_completo')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p.nome_completo]) || []);

      const historicoCompleto = (historicoData || []).map(h => ({
        ...h,
        etapas_obra: { nome: etapasMap.get(h.etapa_id) || 'Etapa removida' },
        profiles: { nome_completo: profilesMap.get(h.alterado_por) || 'Admin' }
      }));

      setHistorico(historicoCompleto as HistoricoItem[]);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const historicoFiltrado = filtroCampo === 'todos'
    ? historico
    : historico.filter(h => h.campo_alterado === filtroCampo);

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
    
    if (campo === 'descricao' && valor.length > 50) {
      return valor.substring(0, 50) + '...';
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico Geral de Alterações
            </CardTitle>
            <CardDescription>
              Últimas 50 alterações em todas as etapas
            </CardDescription>
          </div>
          <div className="w-[200px]">
            <Select value={filtroCampo} onValueChange={setFiltroCampo}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os campos</SelectItem>
                <SelectItem value="percentual_concluido">% Concluído</SelectItem>
                <SelectItem value="percentual_planejado">% Planejado</SelectItem>
                <SelectItem value="data_inicio">Data Início</SelectItem>
                <SelectItem value="data_conclusao">Data Conclusão</SelectItem>
                <SelectItem value="descricao">Descrição</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {historicoFiltrado.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma alteração encontrada.</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {historicoFiltrado.map((item, index) => (
                <div key={item.id} className="relative">
                  {index !== historicoFiltrado.length - 1 && (
                    <div className="absolute left-[11px] top-10 bottom-0 w-[2px] bg-border" />
                  )}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        {getIconForCampo(item.campo_alterado)}
                      </div>
                    </div>
                    <Card className="flex-1">
                      <CardContent className="pt-3 pb-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">
                                  {item.etapas_obra?.nome}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {getNomeCampo(item.campo_alterado)}
                                </Badge>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground text-xs">De: </span>
                                  <span className="font-medium line-through opacity-60">
                                    {formatarValor(item.campo_alterado, item.valor_anterior)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Para: </span>
                                  <span className="font-medium text-primary">
                                    {formatarValor(item.campo_alterado, item.valor_novo)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {item.profiles?.nome_completo || 'Admin'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(item.data_alteracao), "dd/MM/yyyy HH:mm", {
                                locale: ptBR,
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
