import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Clock, Calendar, Image as ImageIcon, TrendingUp, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimelineItem {
  id: string;
  tipo: 'etapa_inicio' | 'etapa_conclusao' | 'foto' | 'mudanca';
  data: string;
  titulo: string;
  descricao?: string;
  etapaNome?: string;
  percentual?: number;
  fotoUrl?: string;
  categoria?: string;
}

export function TimelineObras() {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    try {
      const items: TimelineItem[] = [];

      // Buscar etapas com datas
      const { data: etapas, error: etapasError } = await supabase
        .from('etapas_obra')
        .select('*')
        .order('ordem');

      if (etapasError) throw etapasError;

      // Adicionar datas de início e conclusão
      etapas?.forEach(etapa => {
        if (etapa.data_inicio) {
          items.push({
            id: `inicio-${etapa.id}`,
            tipo: 'etapa_inicio',
            data: etapa.data_inicio,
            titulo: `Início: ${etapa.nome}`,
            descricao: etapa.descricao,
            etapaNome: etapa.nome,
            percentual: 0,
          });
        }
        if (etapa.data_conclusao && etapa.percentual_concluido === 100) {
          items.push({
            id: `conclusao-${etapa.id}`,
            tipo: 'etapa_conclusao',
            data: etapa.data_conclusao,
            titulo: `Concluído: ${etapa.nome}`,
            descricao: etapa.descricao,
            etapaNome: etapa.nome,
            percentual: 100,
          });
        }
      });

      // Buscar fotos das obras
      const { data: fotos, error: fotosError } = await supabase
        .from('obra_fotos')
        .select('*')
        .order('data_upload', { ascending: false });

      if (fotosError) throw fotosError;

      fotos?.forEach(foto => {
        items.push({
          id: `foto-${foto.id}`,
          tipo: 'foto',
          data: foto.data_upload,
          titulo: foto.titulo,
          descricao: foto.descricao,
          fotoUrl: foto.foto_url,
          categoria: foto.categoria,
        });
      });

      // Buscar mudanças significativas (>20%)
      const { data: historicoData, error: historicoError } = await supabase
        .from('etapas_obra_historico')
        .select('*')
        .eq('campo_alterado', 'percentual_concluido')
        .order('data_alteracao', { ascending: false })
        .limit(20);

      if (historicoError) throw historicoError;

      // Buscar nomes das etapas para o histórico
      const etapaIds = [...new Set(historicoData?.map(h => h.etapa_id) || [])];
      const { data: etapasNomes } = await supabase
        .from('etapas_obra')
        .select('id, nome')
        .in('id', etapaIds);

      const etapasMap = new Map(etapasNomes?.map(e => [e.id, e.nome]) || []);

      historicoData?.forEach(hist => {
        const valorAnterior = parseInt(hist.valor_anterior || '0');
        const valorNovo = parseInt(hist.valor_novo || '0');
        const mudanca = Math.abs(valorNovo - valorAnterior);

        if (mudanca >= 20) {
          items.push({
            id: `mudanca-${hist.id}`,
            tipo: 'mudanca',
            data: hist.data_alteracao,
            titulo: `Progresso Significativo`,
            descricao: hist.observacao || `Avanço de ${mudanca}% na etapa`,
            etapaNome: etapasMap.get(hist.etapa_id) || 'Etapa',
            percentual: valorNovo,
          });
        }
      });

      // Ordenar por data (mais recente primeiro)
      items.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      setTimeline(items);
    } catch (error) {
      console.error('Erro ao carregar timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconForTipo = (tipo: string) => {
    switch (tipo) {
      case 'etapa_inicio':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'etapa_conclusao':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'foto':
        return <ImageIcon className="h-5 w-5 text-purple-500" />;
      case 'mudanca':
        return <TrendingUp className="h-5 w-5 text-orange-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getBadgeForTipo = (tipo: string) => {
    switch (tipo) {
      case 'etapa_inicio':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-300">Início</Badge>;
      case 'etapa_conclusao':
        return <Badge className="bg-green-500">Concluído</Badge>;
      case 'foto':
        return <Badge variant="secondary">Foto</Badge>;
      case 'mudanca':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-300">Progresso</Badge>;
      default:
        return null;
    }
  };

  const handleItemClick = (item: TimelineItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Timeline da Obra
          </CardTitle>
          <CardDescription>
            Acompanhe os principais marcos e momentos da construção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Linha vertical do timeline */}
            <div className="absolute left-[21px] top-0 bottom-0 w-[2px] bg-border" />

            <div className="space-y-6">
              {timeline.map((item, index) => (
                <div key={item.id} className="relative flex gap-4 group">
                  {/* Círculo do marco */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10 transition-transform group-hover:scale-110">
                    {getIconForTipo(item.tipo)}
                  </div>

                  {/* Conteúdo do item */}
                  <Card 
                    className="flex-1 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleItemClick(item)}
                  >
                    <CardContent className="pt-4 pb-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getBadgeForTipo(item.tipo)}
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(item.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </span>
                            </div>
                            <h4 className="font-semibold text-base">{item.titulo}</h4>
                            {item.etapaNome && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.etapaNome}
                              </p>
                            )}
                            {item.descricao && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {item.descricao.length > 100 
                                  ? `${item.descricao.substring(0, 100)}...`
                                  : item.descricao}
                              </p>
                            )}
                          </div>
                          {item.fotoUrl && (
                            <div className="flex-shrink-0">
                              <img
                                src={item.fotoUrl}
                                alt={item.titulo}
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                            </div>
                          )}
                        </div>
                        {item.percentual !== undefined && item.percentual > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            {item.percentual}% concluído
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}

              {timeline.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum marco registrado ainda</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para detalhes do item */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem && getIconForTipo(selectedItem.tipo)}
              {selectedItem?.titulo}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(parseISO(selectedItem.data), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </div>

              {selectedItem.etapaNome && (
                <div>
                  <p className="font-semibold mb-1">Etapa</p>
                  <p className="text-muted-foreground">{selectedItem.etapaNome}</p>
                </div>
              )}

              {selectedItem.descricao && (
                <div>
                  <p className="font-semibold mb-1">Descrição</p>
                  <p className="text-muted-foreground">{selectedItem.descricao}</p>
                </div>
              )}

              {selectedItem.fotoUrl && (
                <div>
                  <p className="font-semibold mb-2">Foto</p>
                  <img
                    src={selectedItem.fotoUrl}
                    alt={selectedItem.titulo}
                    className="w-full rounded-lg"
                  />
                  {selectedItem.categoria && (
                    <Badge variant="secondary" className="mt-2">
                      {selectedItem.categoria === 'fundacao' && 'Fundação'}
                      {selectedItem.categoria === 'estrutura' && 'Estrutura'}
                      {selectedItem.categoria === 'acabamento' && 'Acabamento'}
                    </Badge>
                  )}
                </div>
              )}

              {selectedItem.percentual !== undefined && (
                <div>
                  <p className="font-semibold mb-1">Progresso</p>
                  <p className="text-2xl font-bold text-primary">{selectedItem.percentual}%</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
