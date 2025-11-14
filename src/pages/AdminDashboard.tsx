import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  Search,
  Filter,
  Download,
  Upload,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { useParcelasData, ParcelaData } from '@/hooks/useParcelasData';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DadosBaixa {
  dataPagamento: string;
  valorPago: number;
  juros: number;
  honorarios: number;
  desconto: number;
}

export default function AdminDashboard() {
  const { parcelas: dados, isLoading, atualizarParcela, refetch } = useParcelasData();
  const [parcelaSelecionada, setParcelaSelecionada] = useState<ParcelaData | null>(null);
  const [modalBaixaAberto, setModalBaixaAberto] = useState(false);
  const [dadosBaixa, setDadosBaixa] = useState<DadosBaixa>({
    dataPagamento: format(new Date(), 'yyyy-MM-dd'),
    valorPago: 0,
    juros: 0,
    honorarios: 0,
    desconto: 0
  });
  
  // Filtros
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroLote, setFiltroLote] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<'TODOS' | 'PAGO' | 'A Vencer' | 'VENCIDO'>('A Vencer');

  // Buscar dados de renegociações
  const { data: renegociacoes = [] } = useQuery({
    queryKey: ['renegociacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renegociacoes')
        .select('*')
        .order('data_renegociacao', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });
  
  // Processar arquivo Excel (Legacy - não recomendado)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    toast.info('Use o sistema de banco de dados para gerenciar parcelas');
  };
  
  // Exportar dados atualizados
  const handleExportarDados = () => {
    const ws = XLSX.utils.json_to_sheet(dados.map(d => ({
      'Quadra/Lote': d.quadraLote,
      'Cliente': d.cliente,
      'Descrição': d.descricao,
      'Vencimento': d.vencimento,
      'Valor': d.valor,
      'Situação': d.situacao,
      'Data Recebimento': d.dataRecebimento || '',
      'Desconto': d.desconto,
      'Juros': d.juros,
      'Honorarios': d.honorarios,
      'Valor Pago': d.valorPago
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Parcelas');
    XLSX.writeFile(wb, `La_Felicita_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Arquivo exportado com sucesso!');
  };
  
  // Abrir modal de baixa
  const abrirModalBaixa = (parcela: ParcelaData) => {
    setParcelaSelecionada(parcela);
    setDadosBaixa({
      dataPagamento: format(new Date(), 'yyyy-MM-dd'),
      valorPago: parcela.valor,
      juros: 0,
      honorarios: 0,
      desconto: 0
    });
    setModalBaixaAberto(true);
  };
  
  // Estornar pagamento
  const estornarPagamento = async (parcela: ParcelaData) => {
    if (!confirm('Deseja realmente estornar este pagamento?')) return;
    
    try {
      await atualizarParcela(parcela.parcelaId, {
        data_pagamento: '',
        valor_pago: 0,
        juros: 0,
        honorarios: 0,
        desconto: 0
      });
      toast.success('Pagamento estornado com sucesso!');
    } catch (error) {
      // Error já tratado no hook
    }
  };

  // Dar baixa em parcela
  const handleDarBaixa = async () => {
    if (!parcelaSelecionada) return;

    try {
      await atualizarParcela(parcelaSelecionada.parcelaId, {
        data_pagamento: dadosBaixa.dataPagamento,
        valor_pago: dadosBaixa.valorPago,
        juros: dadosBaixa.juros,
        honorarios: dadosBaixa.honorarios,
        desconto: dadosBaixa.desconto
      });

      setModalBaixaAberto(false);
      setParcelaSelecionada(null);
    } catch (error) {
      // Error já tratado no hook
    }
  };
  
  // Filtrar parcelas
  const parcelasFiltradas = useMemo(() => {
    return dados.filter(p => {
      const matchCliente = !filtroCliente || 
        p.cliente.toLowerCase().includes(filtroCliente.toLowerCase());
      const matchLote = !filtroLote || 
        p.quadraLote.toLowerCase().includes(filtroLote.toLowerCase());
      
      let matchSituacao = true;
      if (filtroSituacao === 'PAGO') {
        matchSituacao = p.situacao === 'PAGO';
      } else if (filtroSituacao === 'A Vencer') {
        matchSituacao = p.situacao === 'A Vencer' && 
          new Date(p.vencimento) >= new Date();
      } else if (filtroSituacao === 'VENCIDO') {
        matchSituacao = p.situacao === 'A Vencer' && 
          new Date(p.vencimento) < new Date();
      }
      
      return matchCliente && matchLote && matchSituacao;
    }).sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
  }, [dados, filtroCliente, filtroLote, filtroSituacao]);
  
  // Estatísticas
  const stats = useMemo(() => {
    const totalContratado = dados.reduce((sum, p) => sum + p.valor, 0);
    const totalPago = dados
      .filter(p => p.situacao === 'PAGO')
      .reduce((sum, p) => sum + p.valorPago, 0);
    const totalVencido = dados
      .filter(p => p.situacao === 'A Vencer' && new Date(p.vencimento) < new Date())
      .reduce((sum, p) => sum + p.valor, 0);
    const totalAVencer = dados
      .filter(p => p.situacao === 'A Vencer' && new Date(p.vencimento) >= new Date())
      .reduce((sum, p) => sum + p.valor, 0);
    
    return {
      totalContratado,
      totalPago,
      totalVencido,
      totalAVencer,
      saldoDevedor: totalContratado - totalPago,
      percentualPago: totalContratado > 0 ? (totalPago / totalContratado) * 100 : 0,
      parcelasPagas: dados.filter(p => p.situacao === 'PAGO').length,
      parcelasVencidas: dados.filter(p => 
        p.situacao === 'A Vencer' && new Date(p.vencimento) < new Date()
      ).length,
      parcelasAVencer: dados.filter(p => 
        p.situacao === 'A Vencer' && new Date(p.vencimento) >= new Date()
      ).length
    };
  }, [dados]);

  // Dados para gráficos de evolução
  const chartData = useMemo(() => {
    const hoje = new Date();
    const mesesPassados = eachMonthOfInterval({
      start: subMonths(hoje, 11),
      end: hoje
    });

    const dadosPorMes = mesesPassados.map(mes => {
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);

      const parcelasDoMes = dados.filter(p => {
        const dataPagamento = p.dataRecebimento ? new Date(p.dataRecebimento) : null;
        return dataPagamento && dataPagamento >= inicioMes && dataPagamento <= fimMes;
      });

      const parcelasVencidasNoMes = dados.filter(p => {
        const dataVencimento = new Date(p.vencimento);
        return dataVencimento >= inicioMes && 
               dataVencimento <= fimMes && 
               p.situacao !== 'PAGO' &&
               dataVencimento < hoje;
      });

      const totalPagoNoMes = parcelasDoMes.reduce((sum, p) => sum + p.valorPago, 0);
      const totalVencidoNoMes = parcelasVencidasNoMes.reduce((sum, p) => sum + p.valor, 0);
      const totalVencimentoNoMes = dados.filter(p => {
        const dataVencimento = new Date(p.vencimento);
        return dataVencimento >= inicioMes && dataVencimento <= fimMes;
      }).reduce((sum, p) => sum + p.valor, 0);

      const taxaInadimplencia = totalVencimentoNoMes > 0 
        ? (totalVencidoNoMes / totalVencimentoNoMes) * 100 
        : 0;

      return {
        mes: format(mes, 'MMM/yy', { locale: ptBR }),
        pagamentos: totalPagoNoMes,
        inadimplencia: taxaInadimplencia
      };
    });

    return dadosPorMes;
  }, [dados]);

  // Dados para gráfico de renegociações
  const chartDataRenegociacoes = useMemo(() => {
    const hoje = new Date();
    const mesesPassados = eachMonthOfInterval({
      start: subMonths(hoje, 11),
      end: hoje
    });

    const dadosPorMes = mesesPassados.map(mes => {
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);

      const renegociacoesDoMes = renegociacoes.filter(r => {
        const dataRenegociacao = new Date(r.data_renegociacao);
        return dataRenegociacao >= inicioMes && dataRenegociacao <= fimMes;
      });

      const quantidadeRenegociacoes = renegociacoesDoMes.length;
      const valorTotalRenegociado = renegociacoesDoMes.reduce((sum, r) => sum + Number(r.valor_renegociado), 0);

      return {
        mes: format(mes, 'MMM/yy', { locale: ptBR }),
        quantidade: quantidadeRenegociacoes,
        valor: valorTotalRenegociado
      };
    });

    return dadosPorMes;
  }, [renegociacoes]);

  // Dados para gráfico comparativo de inadimplência vs renegociações
  const chartDataComparativo = useMemo(() => {
    const hoje = new Date();
    const mesesPassados = eachMonthOfInterval({
      start: subMonths(hoje, 11),
      end: hoje
    });

    const dadosPorMes = mesesPassados.map(mes => {
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);

      // Taxa de inadimplência
      const parcelasVencidasNoMes = dados.filter(p => {
        const dataVencimento = new Date(p.vencimento);
        return dataVencimento >= inicioMes && 
               dataVencimento <= fimMes && 
               p.situacao !== 'PAGO' &&
               dataVencimento < hoje;
      });

      const totalVencidoNoMes = parcelasVencidasNoMes.reduce((sum, p) => sum + p.valor, 0);
      const totalVencimentoNoMes = dados.filter(p => {
        const dataVencimento = new Date(p.vencimento);
        return dataVencimento >= inicioMes && dataVencimento <= fimMes;
      }).reduce((sum, p) => sum + p.valor, 0);

      const taxaInadimplencia = totalVencimentoNoMes > 0 
        ? (totalVencidoNoMes / totalVencimentoNoMes) * 100 
        : 0;

      // Renegociações
      const renegociacoesDoMes = renegociacoes.filter(r => {
        const dataRenegociacao = new Date(r.data_renegociacao);
        return dataRenegociacao >= inicioMes && dataRenegociacao <= fimMes;
      });

      const quantidadeRenegociacoes = renegociacoesDoMes.length;

      return {
        mes: format(mes, 'MMM/yy', { locale: ptBR }),
        inadimplencia: taxaInadimplencia,
        renegociacoes: quantidadeRenegociacoes
      };
    });

    return dadosPorMes;
  }, [dados, renegociacoes]);
  
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };
  
  const formatarData = (data: string) => {
    try {
      return format(parseISO(data), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return '-';
    }
  };
  
  const getStatusColor = (parcela: ParcelaData) => {
    if (parcela.situacao === 'PAGO') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    
    const hoje = new Date();
    const dataVenc = new Date(parcela.vencimento);
    
    if (dataVenc < hoje) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };
  
  const getStatusText = (parcela: ParcelaData) => {
    if (parcela.situacao === 'PAGO') return 'Pago';
    
    const hoje = new Date();
    const dataVenc = new Date(parcela.vencimento);
    
    if (dataVenc < hoje) return 'Vencido';
    return 'A Vencer';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Painel Administrativo
              </h1>
              <p className="text-gray-600">
                Gerenciamento de Parcelas - La Felicità
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Importar Planilha
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {dados.length > 0 && (
                <Button
                  onClick={handleExportarDados}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4" />
                  Exportar Dados
                </Button>
              )}
            </div>
          </div>
          
          {dados.length === 0 && (
            <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
              <CardContent className="p-12 text-center">
                <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nenhuma planilha carregada
                </h3>
                <p className="text-gray-600 mb-6">
                  Faça upload da planilha do Excel para começar a gerenciar as parcelas
                </p>
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Selecionar Arquivo
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {dados.length > 0 && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Total Pago</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatarMoeda(stats.totalPago)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {stats.parcelasPagas} parcelas pagas
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Parcelas Vencidas</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatarMoeda(stats.totalVencido)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {stats.parcelasVencidas} parcelas vencidas
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-gray-600 text-sm mb-1">A Vencer</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatarMoeda(stats.totalAVencer)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {stats.parcelasAVencer} parcelas futuras
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Saldo Devedor</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatarMoeda(stats.saldoDevedor)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {stats.percentualPago.toFixed(1)}% pago
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos de Evolução */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Gráfico de Pagamentos */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Evolução de Pagamentos
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Valores pagos nos últimos 12 meses
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      pagamentos: {
                        label: 'Pagamentos',
                        color: 'hsl(var(--chart-1))',
                      },
                    }}
                    className="h-[300px]"
                  >
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="mes" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => 
                          new Intl.NumberFormat('pt-BR', {
                            notation: 'compact',
                            style: 'currency',
                            currency: 'BRL'
                          }).format(value)
                        }
                      />
                      <ChartTooltip 
                        content={
                          <ChartTooltipContent 
                            formatter={(value) => 
                              new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(value as number)
                            }
                          />
                        }
                      />
                      <Line 
                        type="monotone" 
                        dataKey="pagamentos" 
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-1))' }}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Inadimplência */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Taxa de Inadimplência
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Percentual de inadimplência nos últimos 12 meses
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      inadimplencia: {
                        label: 'Inadimplência',
                        color: 'hsl(var(--chart-2))',
                      },
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="mes" 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <ChartTooltip 
                        content={
                          <ChartTooltipContent 
                            formatter={(value) => `${(value as number).toFixed(1)}%`}
                          />
                        }
                      />
                      <Bar 
                        dataKey="inadimplencia" 
                        fill="hsl(var(--chart-2))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Renegociações */}
            <Card className="border-0 shadow-lg mb-8">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Evolução de Renegociações
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Quantidade e valor de renegociações nos últimos 12 meses
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    quantidade: {
                      label: 'Quantidade',
                      color: 'hsl(var(--chart-3))',
                    },
                    valor: {
                      label: 'Valor Total',
                      color: 'hsl(var(--chart-4))',
                    },
                  }}
                  className="h-[300px]"
                >
                  <BarChart data={chartDataRenegociacoes}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="mes" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      yAxisId="left"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      label={{ value: 'Quantidade', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => 
                        new Intl.NumberFormat('pt-BR', {
                          notation: 'compact',
                          style: 'currency',
                          currency: 'BRL'
                        }).format(value)
                      }
                    />
                    <ChartTooltip 
                      content={
                        <ChartTooltipContent 
                          formatter={(value, name) => {
                            if (name === 'valor') {
                              return new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(value as number);
                            }
                            return value;
                          }}
                        />
                      }
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="quantidade" 
                      fill="hsl(var(--chart-3))"
                      radius={[4, 4, 0, 0]}
                      name="Quantidade"
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="valor" 
                      fill="hsl(var(--chart-4))"
                      radius={[4, 4, 0, 0]}
                      name="Valor Total"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Gráfico Comparativo: Inadimplência vs Renegociações */}
            <Card className="border-0 shadow-lg mb-8">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Inadimplência vs Renegociações
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Relação entre taxa de inadimplência e volume de renegociações
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    inadimplencia: {
                      label: 'Taxa de Inadimplência (%)',
                      color: 'hsl(var(--chart-2))',
                    },
                    renegociacoes: {
                      label: 'Renegociações',
                      color: 'hsl(var(--chart-3))',
                    },
                  }}
                  className="h-[300px]"
                >
                  <LineChart data={chartDataComparativo}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="mes" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      yAxisId="left"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <ChartTooltip 
                      content={
                        <ChartTooltipContent 
                          formatter={(value, name) => {
                            if (name === 'inadimplencia') {
                              return `${(value as number).toFixed(1)}%`;
                            }
                            return `${value} acordos`;
                          }}
                        />
                      }
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="inadimplencia" 
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-2))' }}
                      name="Taxa de Inadimplência (%)"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="renegociacoes" 
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-3))' }}
                      name="Renegociações"
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Filtros */}
            <Card className="border-0 shadow-lg mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="filtro-cliente">Cliente</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="filtro-cliente"
                        placeholder="Buscar cliente..."
                        value={filtroCliente}
                        onChange={(e) => setFiltroCliente(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="filtro-lote">Lote</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="filtro-lote"
                        placeholder="Buscar lote..."
                        value={filtroLote}
                        onChange={(e) => setFiltroLote(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="filtro-situacao">Situação</Label>
                    <Select
                      value={filtroSituacao}
                      onValueChange={(value: any) => setFiltroSituacao(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todas</SelectItem>
                        <SelectItem value="PAGO">Pagas</SelectItem>
                        <SelectItem value="A Vencer">A Vencer</SelectItem>
                        <SelectItem value="VENCIDO">Vencidas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFiltroCliente('');
                        setFiltroLote('');
                        setFiltroSituacao('TODOS');
                      }}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Mostrando <span className="font-semibold text-gray-900">{parcelasFiltradas.length}</span> de <span className="font-semibold text-gray-900">{dados.length}</span> parcelas
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Parcelas */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                          Lote
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                          Cliente
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                          Descrição
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                          Vencimento
                        </th>
                        <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">
                          Valor
                        </th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700">
                          Situação
                        </th>
                        <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parcelasFiltradas.map((parcela) => (
                        <tr 
                          key={parcela.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-6 text-sm font-medium">
                            {parcela.quadraLote}
                          </td>
                          <td className="py-4 px-6 text-sm">
                            {parcela.cliente}
                          </td>
                          <td className="py-4 px-6 text-sm">
                            {parcela.descricao}
                          </td>
                          <td className="py-4 px-6 text-sm">
                            {formatarData(parcela.vencimento)}
                          </td>
                          <td className="py-4 px-6 text-sm text-right font-medium">
                            {formatarMoeda(parcela.valor)}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <Badge className={`${getStatusColor(parcela)} border`}>
                              {getStatusText(parcela)}
                            </Badge>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {parcela.situacao === 'A Vencer' ? (
                              <Button
                                size="sm"
                                onClick={() => abrirModalBaixa(parcela)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Dar Baixa
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => estornarPagamento(parcela)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Estornar
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Modal de Baixa */}
      <Dialog open={modalBaixaAberto} onOpenChange={setModalBaixaAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dar Baixa na Parcela</DialogTitle>
          </DialogHeader>
          
          {parcelaSelecionada && (
            <div className="space-y-6">
              {/* Informações da Parcela */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cliente:</span>
                  <span className="text-sm font-semibold">{parcelaSelecionada.cliente}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Lote:</span>
                  <span className="text-sm font-semibold">{parcelaSelecionada.quadraLote}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Descrição:</span>
                  <span className="text-sm font-semibold">{parcelaSelecionada.descricao}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Vencimento:</span>
                  <span className="text-sm font-semibold">
                    {formatarData(parcelaSelecionada.vencimento)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Valor Original:</span>
                  <span className="text-sm font-semibold">
                    {formatarMoeda(parcelaSelecionada.valor)}
                  </span>
                </div>
              </div>

              {/* Formulário de Baixa */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data-pagamento">Data do Pagamento *</Label>
                  <Input
                    id="data-pagamento"
                    type="date"
                    value={dadosBaixa.dataPagamento}
                    onChange={(e) => setDadosBaixa({
                      ...dadosBaixa,
                      dataPagamento: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="valor-pago">Valor Pago *</Label>
                  <Input
                    id="valor-pago"
                    type="number"
                    step="0.01"
                    value={dadosBaixa.valorPago}
                    onChange={(e) => setDadosBaixa({
                      ...dadosBaixa,
                      valorPago: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="juros">Juros (R$)</Label>
                  <Input
                    id="juros"
                    type="number"
                    step="0.01"
                    value={dadosBaixa.juros}
                    onChange={(e) => setDadosBaixa({
                      ...dadosBaixa,
                      juros: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="honorarios">Honorários (R$)</Label>
                  <Input
                    id="honorarios"
                    type="number"
                    step="0.01"
                    value={dadosBaixa.honorarios}
                    onChange={(e) => setDadosBaixa({
                      ...dadosBaixa,
                      honorarios: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="desconto">Desconto (R$)</Label>
                  <Input
                    id="desconto"
                    type="number"
                    step="0.01"
                    value={dadosBaixa.desconto}
                    onChange={(e) => setDadosBaixa({
                      ...dadosBaixa,
                      desconto: parseFloat(e.target.value) || 0
                    })}
                  />
                </div>
              </div>

              {/* Total */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-emerald-900">
                    Valor Total com Acréscimos/Descontos:
                  </span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {formatarMoeda(
                      dadosBaixa.valorPago + 
                      dadosBaixa.juros + 
                      dadosBaixa.honorarios - 
                      dadosBaixa.desconto
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalBaixaAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDarBaixa}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar Baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
