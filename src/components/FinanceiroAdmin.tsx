import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertCircle, Search, FileText, Check, X, Users, TrendingUp, Receipt, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { RenegociacaoDividas } from './RenegociacaoDividas';

interface CooperadoFinanceiro {
  id: string;
  nome_completo: string;
  quadra: string | null;
  lote: string | null;
  investimento: any;
  parcelas: any[];
  totalParcelas: number;
  parcelasPagas: number;
  parcelasPendentes: number;
  parcelasVencidas: number;
  diasMaximoAtraso: number;
  valorTotal: number;
  valorPago: number;
  saldoDevedor: number;
}

export function FinanceiroAdmin() {
  const [cooperados, setCooperados] = useState<CooperadoFinanceiro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCooperado, setSelectedCooperado] = useState<CooperadoFinanceiro | null>(null);
  const [showParcelasDialog, setShowParcelasDialog] = useState(false);
  const [showRenegociacaoDialog, setShowRenegociacaoDialog] = useState(false);
  const [processandoBaixa, setProcessandoBaixa] = useState(false);

  useEffect(() => {
    loadDadosFinanceiros();
  }, []);

  const loadDadosFinanceiros = async () => {
    try {
      setIsLoading(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('nome_completo');

      if (profilesError) throw profilesError;

      const { data: investimentos, error: invError } = await supabase
        .from('investimentos')
        .select('*');

      if (invError) throw invError;

      const { data: parcelas, error: parcelasError } = await supabase
        .from('parcelas')
        .select('*')
        .neq('status', 'renegociada');

      if (parcelasError) throw parcelasError;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const cooperadosData: CooperadoFinanceiro[] = profiles.map(profile => {
        const investimento = investimentos?.find(inv => inv.user_id === profile.id);
        const parcelasCooperado = parcelas?.filter(p => p.investimento_id === investimento?.id) || [];
        
        const pagas = parcelasCooperado.filter(p => p.status === 'paga');
        const pendentes = parcelasCooperado.filter(p => p.status === 'pendente');
        const vencidas = parcelasCooperado.filter(p => {
          if (p.status !== 'pendente') return false;
          const dataVenc = new Date(p.data_vencimento);
          dataVenc.setHours(0, 0, 0, 0);
          return dataVenc < hoje;
        });

        let diasMaximoAtraso = 0;
        vencidas.forEach(parcela => {
          const dataVenc = new Date(parcela.data_vencimento);
          dataVenc.setHours(0, 0, 0, 0);
          const diasAtraso = Math.floor((hoje.getTime() - dataVenc.getTime()) / (1000 * 60 * 60 * 24));
          if (diasAtraso > diasMaximoAtraso) {
            diasMaximoAtraso = diasAtraso;
          }
        });

        const valorTotal = investimento?.valor_total || 0;
        const valorPago = pagas.reduce((sum, p) => sum + (Number(p.valor_pago) || 0), 0);
        const saldoDevedor = valorTotal - valorPago;

        return {
          id: profile.id,
          nome_completo: profile.nome_completo,
          quadra: profile.quadra,
          lote: profile.lote,
          investimento,
          parcelas: parcelasCooperado,
          totalParcelas: parcelasCooperado.length,
          parcelasPagas: pagas.length,
          parcelasPendentes: pendentes.length,
          parcelasVencidas: vencidas.length,
          diasMaximoAtraso,
          valorTotal,
          valorPago,
          saldoDevedor,
        };
      });

      setCooperados(cooperadosData);
    } catch (error: any) {
      console.error('Erro ao carregar dados financeiros:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setIsLoading(false);
    }
  };

  const cooperadosFiltrados = useMemo(() => {
    return cooperados.filter(c => 
      c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.quadra && c.quadra.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.lote && c.lote.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [cooperados, searchTerm]);

  const stats = useMemo(() => {
    const totalCooperados = cooperados.length;
    const cooperadosComInvestimento = cooperados.filter(c => c.investimento).length;
    const cooperadosSemInvestimento = totalCooperados - cooperadosComInvestimento;
    const inadimplentes = cooperados.filter(c => c.parcelasVencidas > 0).length;
    
    const inadimplencia30 = cooperados.filter(c => c.diasMaximoAtraso >= 30 && c.diasMaximoAtraso < 60).length;
    const inadimplencia60 = cooperados.filter(c => c.diasMaximoAtraso >= 60 && c.diasMaximoAtraso < 80).length;
    const inadimplencia80 = cooperados.filter(c => c.diasMaximoAtraso >= 80 && c.diasMaximoAtraso < 85).length;
    const inadimplencia85 = cooperados.filter(c => c.diasMaximoAtraso >= 85 && c.diasMaximoAtraso < 89).length;
    const inadimplencia89 = cooperados.filter(c => c.diasMaximoAtraso >= 89 && c.diasMaximoAtraso < 90).length;
    const inadimplencia90 = cooperados.filter(c => c.diasMaximoAtraso >= 90).length;

    const valorTotalReceber = cooperados.reduce((sum, c) => sum + c.saldoDevedor, 0);
    const valorTotalRecebido = cooperados.reduce((sum, c) => sum + c.valorPago, 0);

    return {
      totalCooperados,
      cooperadosComInvestimento,
      cooperadosSemInvestimento,
      inadimplentes,
      inadimplencia30,
      inadimplencia60,
      inadimplencia80,
      inadimplencia85,
      inadimplencia89,
      inadimplencia90,
      valorTotalReceber,
      valorTotalRecebido,
    };
  }, [cooperados]);

  const darBaixaParcela = async (parcelaId: string) => {
    try {
      setProcessandoBaixa(true);
      
      const parcela = selectedCooperado?.parcelas.find(p => p.id === parcelaId);
      if (!parcela) {
        toast.error('Parcela não encontrada');
        return;
      }

      const { error } = await supabase
        .from('parcelas')
        .update({
          status: 'paga',
          data_pagamento: new Date().toISOString().split('T')[0],
          valor_pago: parcela.valor_parcela,
        })
        .eq('id', parcelaId);

      if (error) throw error;

      toast.success('Baixa registrada com sucesso');
      await loadDadosFinanceiros();
      
      if (selectedCooperado) {
        const cooperadoAtualizado = cooperados.find(c => c.id === selectedCooperado.id);
        if (cooperadoAtualizado) {
          setSelectedCooperado(cooperadoAtualizado);
        }
      }
    } catch (error: any) {
      console.error('Erro ao dar baixa:', error);
      toast.error('Erro ao dar baixa na parcela');
    } finally {
      setProcessandoBaixa(false);
    }
  };

  const reverterBaixaParcela = async (parcelaId: string) => {
    try {
      setProcessandoBaixa(true);

      const { error } = await supabase
        .from('parcelas')
        .update({
          status: 'pendente',
          data_pagamento: null,
          valor_pago: null,
        })
        .eq('id', parcelaId);

      if (error) throw error;

      toast.success('Baixa revertida com sucesso');
      await loadDadosFinanceiros();
      
      if (selectedCooperado) {
        const cooperadoAtualizado = cooperados.find(c => c.id === selectedCooperado.id);
        if (cooperadoAtualizado) {
          setSelectedCooperado(cooperadoAtualizado);
        }
      }
    } catch (error: any) {
      console.error('Erro ao reverter baixa:', error);
      toast.error('Erro ao reverter baixa da parcela');
    } finally {
      setProcessandoBaixa(false);
    }
  };

  const getAlertColor = (diasAtraso: number) => {
    if (diasAtraso >= 90) return 'destructive';
    if (diasAtraso >= 85) return 'destructive';
    if (diasAtraso >= 60) return 'destructive';
    if (diasAtraso >= 30) return 'default';
    return 'secondary';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard de Estatísticas */}
      
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Cooperados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalCooperados}</p>
            <div className="flex gap-2 mt-2 text-xs">
              <Badge variant="secondary">{stats.cooperadosComInvestimento} com investimento</Badge>
              {stats.cooperadosSemInvestimento > 0 && (
                <Badge variant="outline" className="border-orange-500 text-orange-500">
                  {stats.cooperadosSemInvestimento} sem investimento
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Inadimplência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.inadimplentes}</p>
            <div className="flex flex-col gap-1 mt-2 text-xs">
              {stats.inadimplencia30 > 0 && (
                <Badge variant="default">
                  Atraso +30 dias: {stats.inadimplencia30}
                </Badge>
              )}
              {stats.inadimplencia60 > 0 && (
                <Badge variant="default">
                  Atraso +60 dias: {stats.inadimplencia60}
                </Badge>
              )}
              {stats.inadimplencia80 > 0 && (
                <Badge variant="default">
                  Atraso +80 dias: {stats.inadimplencia80}
                </Badge>
              )}
               {stats.inadimplencia85 > 0 && (
                <Badge variant="destructive">
                  Atraso +85 dias: {stats.inadimplencia85}
                </Badge>
              )}
              {stats.inadimplencia89 > 0 && (
                <Badge variant="destructive">
                  Atraso +89 dias: {stats.inadimplencia89}
                </Badge>
              )}
              {stats.inadimplencia90 > 0 && (
                <Badge variant="destructive">
                  Atraso +90 dias: {stats.inadimplencia90}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              R$ {stats.valorTotalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <Badge variant="outline" className="mt-2 text-xs border-green-500 text-green-500">
              {((stats.valorTotalRecebido / stats.valorTotalReceber) * 100).toFixed(2)}% recebido
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Total Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              R$ {stats.valorTotalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <Badge variant="outline" className="mt-2 text-xs border-blue-500 text-blue-500">
              {((stats.valorTotalRecebido / (stats.valorTotalReceber + stats.valorTotalRecebido)) * 100).toFixed(2)}% do total
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Filtro e Tabela de Cooperados */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Financeiros dos Cooperados</CardTitle>
          <CardDescription>
            Visualize e gerencie as informações financeiras dos cooperados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              type="search"
              placeholder="Buscar cooperado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Quadra</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Total Parcelas</TableHead>
                  <TableHead className="text-right">Pagas</TableHead>
                  <TableHead className="text-right">Pendentes</TableHead>
                  <TableHead className="text-right">Vencidas</TableHead>
                  <TableHead className="text-right">Saldo Devedor</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cooperadosFiltrados.map(cooperado => (
                  <TableRow key={cooperado.id}>
                    <TableCell>{cooperado.nome_completo}</TableCell>
                    <TableCell>{cooperado.quadra || '-'}</TableCell>
                    <TableCell>{cooperado.lote || '-'}</TableCell>
                    <TableCell className="text-right">{cooperado.totalParcelas}</TableCell>
                    <TableCell className="text-right">{cooperado.parcelasPagas}</TableCell>
                    <TableCell className="text-right">{cooperado.parcelasPendentes}</TableCell>
                    <TableCell className="text-right">
                      {cooperado.parcelasVencidas > 0 ? (
                        <Badge variant={getAlertColor(cooperado.diasMaximoAtraso)}>
                          {cooperado.parcelasVencidas}
                        </Badge>
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {cooperado.saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCooperado(cooperado);
                            setShowParcelasDialog(true);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Ver Parcelas
                        </Button>
                        {cooperado.parcelasVencidas > 0 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedCooperado(cooperado);
                              setShowRenegociacaoDialog(true);
                            }}
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Renegociar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {cooperadosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Nenhum cooperado encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog de Parcelas */}
      <Dialog open={showParcelasDialog} onOpenChange={setShowParcelasDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Parcelas - {selectedCooperado?.nome_completo}
            </DialogTitle>
            <DialogDescription>
              Visualize as parcelas do cooperado e registre o pagamento.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCooperado?.parcelas.map(parcela => (
                  <TableRow key={parcela.id}>
                    <TableCell>{parcela.numero_parcela}</TableCell>
                    <TableCell>{parcela.descricao}</TableCell>
                    <TableCell className="text-right">
                      R$ {Number(parcela.valor_parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(parcela.data_vencimento), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {parcela.status === 'paga' ? (
                        <Badge variant="success">
                          Paga em {format(new Date(parcela.data_pagamento), 'dd/MM/yyyy')}
                        </Badge>
                      ) : parcela.status === 'pendente' ? (
                        new Date(parcela.data_vencimento) < new Date() ? (
                          <Badge variant="destructive">Vencida</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )
                      ) : (
                        <Badge>{parcela.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {parcela.status === 'pendente' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => darBaixaParcela(parcela.id)}
                          disabled={processandoBaixa}
                        >
                          {processandoBaixa ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Dando Baixa...
                            </>
                          ) : (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Dar Baixa
                            </>
                          )}
                        </Button>
                      )}
                      {parcela.status === 'paga' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => reverterBaixaParcela(parcela.id)}
                          disabled={processandoBaixa}
                        >
                          {processandoBaixa ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Revertendo...
                            </>
                          ) : (
                            <>
                              <X className="mr-2 h-4 w-4" />
                              Reverter Baixa
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {selectedCooperado?.parcelas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Nenhuma parcela encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowParcelasDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedCooperado && (
        <RenegociacaoDividas
          cooperado={selectedCooperado}
          open={showRenegociacaoDialog}
          onOpenChange={setShowRenegociacaoDialog}
          onSuccess={() => {
            loadDadosFinanceiros();
            setShowRenegociacaoDialog(false);
          }}
        />
      )}
    </div>
  );
}
