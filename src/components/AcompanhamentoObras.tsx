import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EtapaObra {
  id: string;
  nome: string;
  descricao: string | null;
  percentual_concluido: number;
  data_inicio: string | null;
  data_conclusao: string | null;
  ordem: number;
}

export function AcompanhamentoObras() {
  const [etapas, setEtapas] = useState<EtapaObra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEtapas();
  }, []);

  const loadEtapas = async () => {
    try {
      const { data, error } = await supabase
        .from('etapas_obra')
        .select('*')
        .order('ordem');

      if (error) throw error;
      setEtapas(data || []);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (percentual: number) => {
    if (percentual === 100) {
      return <Badge className="bg-green-600">Concluída</Badge>;
    } else if (percentual > 0) {
      return <Badge className="bg-blue-600">Em Andamento</Badge>;
    } else {
      return <Badge variant="secondary">Aguardando</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não definida';
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalPercentual = Math.round(
    etapas.reduce((acc, etapa) => acc + etapa.percentual_concluido, 0) / etapas.length
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Progresso Geral da Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso Total</span>
              <span className="font-bold">{totalPercentual}%</span>
            </div>
            <Progress value={totalPercentual} className="h-4" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {etapas.map((etapa) => (
          <Card key={etapa.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{etapa.nome}</CardTitle>
                  {etapa.descricao && (
                    <p className="text-sm text-muted-foreground">{etapa.descricao}</p>
                  )}
                </div>
                {getStatusBadge(etapa.percentual_concluido)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span className="font-bold">{etapa.percentual_concluido}%</span>
                </div>
                <Progress value={etapa.percentual_concluido} className="h-3" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {etapa.data_inicio && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Início</div>
                      <div>{formatDate(etapa.data_inicio)}</div>
                    </div>
                  </div>
                )}
                {etapa.data_conclusao && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Conclusão</div>
                      <div>{formatDate(etapa.data_conclusao)}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
