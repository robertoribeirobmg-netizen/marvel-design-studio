import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface DashboardFinanceiroProps {
  userId: string;
}

export function DashboardFinanceiro({ userId }: DashboardFinanceiroProps) {
  const [investimento, setInvestimento] = useState<any>(null);
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPago: 0,
    totalPendente: 0,
    parcelasPagas: 0,
    parcelasPendentes: 0,
    percentualPago: 0,
  });

  useEffect(() => {
    loadInvestimento();
  }, [userId]);

  const loadInvestimento = async () => {
    try {
      const { data: invData, error: invError } = await supabase
        .from('investimentos')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (invError) throw invError;
      setInvestimento(invData);

      if (invData) {
        const { data: parcelasData, error: parcelasError } = await supabase
          .from('parcelas')
          .select('*')
          .eq('investimento_id', invData.id)
          .order('numero_parcela');

        if (parcelasError) throw parcelasError;
        setParcelas(parcelasData || []);

        // Calcular estatísticas
        const pagas = parcelasData?.filter(p => p.status === 'paga') || [];
        const pendentes = parcelasData?.filter(p => p.status === 'pendente') || [];
        
        const totalPago = pagas.reduce((sum, p) => sum + (p.valor_pago || 0) + (p.juros || 0) + (p.multa || 0), 0);
        const totalPendente = pendentes.reduce((sum, p) => sum + p.valor_parcela, 0);
        
        setStats({
          totalPago,
          totalPendente,
          parcelasPagas: pagas.length,
          parcelasPendentes: pendentes.length,
          percentualPago: (pagas.length / (parcelasData?.length || 1)) * 100,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    } finally {
      setIsLoading(false);
    }
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

  if (!investimento) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Dashboard Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhum investimento cadastrado ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              R$ {investimento.valor_total.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {investimento.numero_parcelas}x de R$ {investimento.valor_parcela.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              R$ {stats.totalPago.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.parcelasPagas} parcelas pagas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              R$ {stats.totalPendente.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.parcelasPendentes} parcelas pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.percentualPago.toFixed(1)}%
            </p>
            <Progress value={stats.percentualPago} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Informações do Investimento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Detalhes do Investimento
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data de Início
            </p>
            <p className="font-semibold">
              {new Date(investimento.data_inicio).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Número de Parcelas</p>
            <p className="font-semibold">{investimento.numero_parcelas}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Valor da Parcela</p>
            <p className="font-semibold">R$ {investimento.valor_parcela.toFixed(2)}</p>
          </div>
          {investimento.observacoes && (
            <div className="md:col-span-3 space-y-2">
              <p className="text-sm text-muted-foreground">Observações</p>
              <p className="text-sm">{investimento.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Parcelas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Parcelas</CardTitle>
          <CardDescription>
            Acompanhe todas as suas parcelas pagas e pendentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {parcelas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma parcela cadastrada
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Juros/Multa</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead>Valor Pago</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.map((parcela) => {
                    const isVencida = parcela.status === 'pendente' && 
                      new Date(parcela.data_vencimento) < new Date();
                    
                    return (
                      <TableRow key={parcela.id} className={isVencida ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">
                          {parcela.numero_parcela}/{investimento.numero_parcelas}
                        </TableCell>
                        <TableCell>
                          {new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')}
                          {isVencida && (
                            <AlertCircle className="inline-block ml-2 h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>R$ {parcela.valor_parcela.toFixed(2)}</TableCell>
                        <TableCell>
                          {(parcela.juros || 0) > 0 || (parcela.multa || 0) > 0 ? (
                            <span className="text-orange-600">
                              R$ {((parcela.juros || 0) + (parcela.multa || 0)).toFixed(2)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {parcela.data_pagamento 
                            ? new Date(parcela.data_pagamento).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {parcela.valor_pago ? (
                            <span className="text-green-600 font-semibold">
                              R$ {parcela.valor_pago.toFixed(2)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={parcela.status === 'paga' ? 'default' : isVencida ? 'destructive' : 'secondary'}
                          >
                            {parcela.status === 'paga' ? 'Paga' : isVencida ? 'Vencida' : 'Pendente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}