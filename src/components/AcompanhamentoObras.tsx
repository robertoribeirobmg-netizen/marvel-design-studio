import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, CheckCircle2, Clock, Edit2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState<Record<string, number>>({});
  const { isAdmin, isAdminObras } = useAuth();

  const canEdit = isAdmin || isAdminObras;

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

  const handleEdit = (etapa: EtapaObra) => {
    setEditingId(etapa.id);
    setEditValue(etapa.percentual_concluido);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue(0);
  };

  const handleSave = async (etapaId: string) => {
    try {
      const { error } = await supabase
        .from('etapas_obra')
        .update({ percentual_concluido: editValue })
        .eq('id', etapaId);

      if (error) throw error;

      setEtapas(prev => prev.map(e => 
        e.id === etapaId ? { ...e, percentual_concluido: editValue } : e
      ));
      toast.success('Progresso atualizado com sucesso!');
      setEditingId(null);
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
      toast.error('Erro ao atualizar progresso');
    }
  };

  const openBulkEdit = () => {
    const values: Record<string, number> = {};
    etapas.forEach(e => {
      values[e.id] = e.percentual_concluido;
    });
    setBulkEditValues(values);
    setShowBulkEdit(true);
  };

  const handleBulkSave = async () => {
    try {
      const updates = Object.entries(bulkEditValues).map(([id, percentual]) => 
        supabase
          .from('etapas_obra')
          .update({ percentual_concluido: percentual })
          .eq('id', id)
      );

      await Promise.all(updates);

      setEtapas(prev => prev.map(e => ({
        ...e,
        percentual_concluido: bulkEditValues[e.id] ?? e.percentual_concluido
      })));

      toast.success('Progresso de todas as etapas atualizado!');
      setShowBulkEdit(false);
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
      toast.error('Erro ao atualizar progresso');
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

  const totalPercentual = etapas.length > 0 
    ? Math.round(etapas.reduce((acc, etapa) => acc + etapa.percentual_concluido, 0) / etapas.length)
    : 0;

  const bulkTotalPercentual = etapas.length > 0
    ? Math.round(Object.values(bulkEditValues).reduce((acc, val) => acc + val, 0) / etapas.length)
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Progresso Geral da Obra
            </CardTitle>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={openBulkEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Editar Progresso
              </Button>
            )}
          </div>
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

      {/* Dialog para edição em massa */}
      <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Progresso das Etapas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Progresso Total Calculado</span>
                <span className="font-bold text-primary">{bulkTotalPercentual}%</span>
              </div>
              <Progress value={bulkTotalPercentual} className="h-3" />
            </div>
            
            <div className="space-y-3">
              {etapas.map((etapa) => (
                <div key={etapa.id} className="flex items-center justify-between gap-4 p-3 bg-card border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{etapa.nome}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={bulkEditValues[etapa.id] ?? 0}
                      onChange={(e) => setBulkEditValues(prev => ({
                        ...prev,
                        [etapa.id]: Math.min(100, Math.max(0, Number(e.target.value)))
                      }))}
                      className="w-20 text-right"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEdit(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <div className="flex justify-between items-center text-sm">
                  <span>Progresso</span>
                  {editingId === etapa.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={editValue}
                        onChange={(e) => setEditValue(Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="w-20 h-8 text-right"
                      />
                      <span>%</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSave(etapa.id)}>
                        <Save className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{etapa.percentual_concluido}%</span>
                      {canEdit && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(etapa)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
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
