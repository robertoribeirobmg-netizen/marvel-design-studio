import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Calculator, FileText, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RenegociacaoDividasProps {
  cooperado: {
    id: string;
    nome_completo: string;
    investimento: any;
    parcelas: any[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RenegociacaoDividas({ cooperado, open, onOpenChange, onSuccess }: RenegociacaoDividasProps) {
  const [selectedParcelas, setSelectedParcelas] = useState<string[]>([]);
  const [numeroParcelas, setNumeroParcelas] = useState(6);
  const [taxaJuros, setTaxaJuros] = useState(0);
  const [valorEntrada, setValorEntrada] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  const [processando, setProcessando] = useState(false);

  // Filtrar apenas parcelas vencidas e pendentes
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const parcelasVencidas = cooperado.parcelas.filter(p => {
    if (p.status !== 'pendente') return false;
    const dataVenc = new Date(p.data_vencimento);
    dataVenc.setHours(0, 0, 0, 0);
    return dataVenc < hoje;
  });

  // Calcular valores
  const valorTotalSelecionado = parcelasVencidas
    .filter(p => selectedParcelas.includes(p.id))
    .reduce((sum, p) => sum + Number(p.valor_parcela), 0);

  const valorComJuros = valorTotalSelecionado * (1 + taxaJuros / 100);
  const valorFinanciado = valorComJuros - valorEntrada;
  const valorParcelaRenegociacao = numeroParcelas > 0 ? valorFinanciado / numeroParcelas : 0;

  const toggleParcela = (parcelaId: string) => {
    setSelectedParcelas(prev =>
      prev.includes(parcelaId)
        ? prev.filter(id => id !== parcelaId)
        : [...prev, parcelaId]
    );
  };

  const toggleAll = () => {
    if (selectedParcelas.length === parcelasVencidas.length) {
      setSelectedParcelas([]);
    } else {
      setSelectedParcelas(parcelasVencidas.map(p => p.id));
    }
  };

  const handleRenegociar = async () => {
    if (selectedParcelas.length === 0) {
      toast.error('Selecione pelo menos uma parcela para renegociar');
      return;
    }

    if (numeroParcelas < 1) {
      toast.error('O número de parcelas deve ser maior que zero');
      return;
    }

    try {
      setProcessando(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Criar registro de renegociação
      const { data: renegociacao, error: renegociacaoError } = await supabase
        .from('renegociacoes')
        .insert({
          user_id: cooperado.id,
          investimento_id: cooperado.investimento.id,
          valor_original: valorTotalSelecionado,
          valor_renegociado: valorComJuros,
          numero_parcelas: numeroParcelas,
          valor_parcela: valorParcelaRenegociacao,
          taxa_juros: taxaJuros,
          valor_entrada: valorEntrada,
          observacoes,
          criado_por: user.id,
        })
        .select()
        .single();

      if (renegociacaoError) throw renegociacaoError;

      // 2. Registrar parcelas originais como renegociadas
      const parcelasRenegociadas = selectedParcelas.map(parcelaId => {
        const parcela = parcelasVencidas.find(p => p.id === parcelaId);
        return {
          renegociacao_id: renegociacao.id,
          parcela_id: parcelaId,
          valor_original: Number(parcela.valor_parcela),
        };
      });

      const { error: parcelasRenegociadasError } = await supabase
        .from('parcelas_renegociadas')
        .insert(parcelasRenegociadas);

      if (parcelasRenegociadasError) throw parcelasRenegociadasError;

      // 3. Atualizar status das parcelas originais para 'renegociada'
      const { error: updateParcelasError } = await supabase
        .from('parcelas')
        .update({ status: 'renegociada' })
        .in('id', selectedParcelas);

      if (updateParcelasError) throw updateParcelasError;

      // 4. Criar novas parcelas da renegociação
      const dataInicio = new Date();
      dataInicio.setMonth(dataInicio.getMonth() + 1); // Primeira parcela no próximo mês

      const novasParcelas = [];
      for (let i = 0; i < numeroParcelas; i++) {
        const dataVencimento = new Date(dataInicio);
        dataVencimento.setMonth(dataVencimento.getMonth() + i);

        novasParcelas.push({
          investimento_id: cooperado.investimento.id,
          numero_parcela: i + 1,
          descricao: `Renegociação ${format(new Date(), 'dd/MM/yyyy')} - Parcela ${i + 1}/${numeroParcelas}`,
          valor_parcela: valorParcelaRenegociacao,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          status: 'pendente',
          renegociacao_id: renegociacao.id,
        });
      }

      const { error: novasParcelasError } = await supabase
        .from('parcelas')
        .insert(novasParcelas);

      if (novasParcelasError) throw novasParcelasError;

      toast.success('Renegociação realizada com sucesso!');
      onSuccess();
      onOpenChange(false);
      
      // Resetar form
      setSelectedParcelas([]);
      setNumeroParcelas(6);
      setTaxaJuros(0);
      setValorEntrada(0);
      setObservacoes('');
    } catch (error: any) {
      console.error('Erro ao processar renegociação:', error);
      toast.error('Erro ao processar renegociação: ' + error.message);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Renegociação de Dívidas - {cooperado.nome_completo}
          </DialogTitle>
          <DialogDescription>
            Selecione as parcelas vencidas para renegociar e defina as condições do novo parcelamento
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Coluna 1: Seleção de Parcelas */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Parcelas Vencidas</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAll}
                  >
                    {selectedParcelas.length === parcelasVencidas.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </Button>
                </CardTitle>
                <CardDescription>
                  {parcelasVencidas.length} parcela(s) vencida(s) disponível(is)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {parcelasVencidas.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhuma parcela vencida para renegociar
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {parcelasVencidas.map(parcela => {
                        const dataVenc = new Date(parcela.data_vencimento);
                        dataVenc.setHours(0, 0, 0, 0);
                        const diasAtraso = Math.floor((hoje.getTime() - dataVenc.getTime()) / (1000 * 60 * 60 * 24));

                        return (
                          <div
                            key={parcela.id}
                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleParcela(parcela.id)}
                          >
                            <Checkbox
                              checked={selectedParcelas.includes(parcela.id)}
                              onCheckedChange={() => toggleParcela(parcela.id)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">Parcela {parcela.numero_parcela}</span>
                                <span className="font-bold text-primary">
                                  R$ {Number(parcela.valor_parcela).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  Venc: {format(new Date(parcela.data_vencimento), 'dd/MM/yyyy')}
                                </span>
                                <Badge variant="destructive" className="text-xs">
                                  {diasAtraso} dias de atraso
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Coluna 2: Condições de Renegociação */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Condições da Renegociação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numeroParcelas">Número de Parcelas</Label>
                    <Input
                      id="numeroParcelas"
                      type="number"
                      min="1"
                      max="60"
                      value={numeroParcelas}
                      onChange={(e) => setNumeroParcelas(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxaJuros">Taxa de Juros (%)</Label>
                    <Input
                      id="taxaJuros"
                      type="number"
                      min="0"
                      step="0.1"
                      value={taxaJuros}
                      onChange={(e) => setTaxaJuros(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorEntrada">Valor de Entrada (R$)</Label>
                  <Input
                    id="valorEntrada"
                    type="number"
                    min="0"
                    step="0.01"
                    value={valorEntrada}
                    onChange={(e) => setValorEntrada(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Detalhes da negociação, desconto aplicado, etc..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Resumo da Renegociação */}
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Resumo da Renegociação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Parcelas Selecionadas:</span>
                  <span className="font-semibold">{selectedParcelas.length}</span>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Valor Original:</span>
                  <span className="font-semibold">
                    R$ {valorTotalSelecionado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {taxaJuros > 0 && (
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-muted-foreground">Juros ({taxaJuros}%):</span>
                    <span className="font-semibold text-orange-600">
                      + R$ {(valorComJuros - valorTotalSelecionado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Valor com Juros:</span>
                  <span className="font-semibold">
                    R$ {valorComJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {valorEntrada > 0 && (
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm text-muted-foreground">Entrada:</span>
                    <span className="font-semibold text-green-600">
                      - R$ {valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Valor Financiado:</span>
                  <span className="font-semibold text-primary">
                    R$ {valorFinanciado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold">Valor da Parcela:</span>
                  <span className="text-xl font-bold text-primary">
                    {numeroParcelas}x R$ {valorParcelaRenegociacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {selectedParcelas.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        As {selectedParcelas.length} parcelas selecionadas serão marcadas como "renegociadas" e {numeroParcelas} novas parcelas serão criadas.
                        {valorEntrada > 0 && ' A entrada deverá ser paga imediatamente.'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRenegociar}
            disabled={selectedParcelas.length === 0 || processando}
          >
            {processando ? 'Processando...' : 'Confirmar Renegociação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
