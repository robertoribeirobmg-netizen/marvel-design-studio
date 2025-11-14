import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  Home,
  AlertCircle,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { format, parseISO, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useParcelasData } from '@/hooks/useParcelasData';
import { useAuth } from '@/hooks/useAuth';

// Tipos
interface Parcela {
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
}

interface LoteData {
  quadraLote: string;
  cliente: string;
  parcelas: Parcela[];
  totalContratado: number;
  totalPago: number;
  saldoDevedor: number;
  percentualPago: number;
  parcelasPagas: number;
  parcelasAVencer: number;
  totalParcelas: number;
}

interface ClienteData {
  cliente: string;
  lotes: LoteData[];
  totalContratado: number;
  totalPago: number;
  saldoDevedor: number;
  percentualPago: number;
  totalLotes: number;
  totalParcelas: number;
  parcelasPagas: number;
  parcelasAVencer: number;
}

// Função para processar os dados da planilha
function processarDados(dados: any[]): ClienteData[] {
  const clientesMap = new Map<string, Map<string, Parcela[]>>();
  
  // Agrupar parcelas por cliente e lote
  dados.forEach((linha, index) => {
    const parcela: Parcela = {
      id: `${linha['Quadra/Lote']}-${index}`,
      quadraLote: linha['Quadra/Lote'],
      cliente: linha['Cliente'],
      descricao: linha['Descrição'],
      vencimento: linha['Vencimento'],
      valor: parseFloat(linha['Valor']) || 0,
      situacao: linha['Situação'],
      dataRecebimento: linha['Data Recebimento'],
      desconto: parseInt(linha['Desconto']) || 0,
      juros: parseFloat(linha['Juros']) || 0,
      honorarios: parseInt(linha['Honorarios']) || 0,
      valorPago: typeof linha['Valor Pago'] === 'number' 
        ? linha['Valor Pago'] 
        : parseFloat(linha['Valor Pago']) || 0
    };

    if (!clientesMap.has(parcela.cliente)) {
      clientesMap.set(parcela.cliente, new Map());
    }
    
    const lotesCliente = clientesMap.get(parcela.cliente)!;
    if (!lotesCliente.has(parcela.quadraLote)) {
      lotesCliente.set(parcela.quadraLote, []);
    }
    
    lotesCliente.get(parcela.quadraLote)!.push(parcela);
  });

  // Processar dados por cliente
  const clientes: ClienteData[] = [];
  
  clientesMap.forEach((lotes, nomeCliente) => {
    const lotesData: LoteData[] = [];
    let totalContratadoCliente = 0;
    let totalPagoCliente = 0;
    let totalParcelasCliente = 0;
    let parcelasPagasCliente = 0;
    
    lotes.forEach((parcelas, quadraLote) => {
      const totalContratado = parcelas.reduce((sum, p) => sum + p.valor, 0);
      const totalPago = parcelas
        .filter(p => p.situacao === 'PAGO')
        .reduce((sum, p) => sum + p.valorPago, 0);
      const saldoDevedor = totalContratado - totalPago;
      const parcelasPagas = parcelas.filter(p => p.situacao === 'PAGO').length;
      
      lotesData.push({
        quadraLote,
        cliente: nomeCliente,
        parcelas: parcelas.sort((a, b) => 
          new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()
        ),
        totalContratado,
        totalPago,
        saldoDevedor,
        percentualPago: totalContratado > 0 ? (totalPago / totalContratado) * 100 : 0,
        parcelasPagas,
        parcelasAVencer: parcelas.length - parcelasPagas,
        totalParcelas: parcelas.length
      });
      
      totalContratadoCliente += totalContratado;
      totalPagoCliente += totalPago;
      totalParcelasCliente += parcelas.length;
      parcelasPagasCliente += parcelasPagas;
    });
    
    clientes.push({
      cliente: nomeCliente,
      lotes: lotesData,
      totalContratado: totalContratadoCliente,
      totalPago: totalPagoCliente,
      saldoDevedor: totalContratadoCliente - totalPagoCliente,
      percentualPago: totalContratadoCliente > 0 
        ? (totalPagoCliente / totalContratadoCliente) * 100 
        : 0,
      totalLotes: lotes.size,
      totalParcelas: totalParcelasCliente,
      parcelasPagas: parcelasPagasCliente,
      parcelasAVencer: totalParcelasCliente - parcelasPagasCliente
    });
  });
  
  return clientes.sort((a, b) => a.cliente.localeCompare(b.cliente));
}

// Componente principal
export default function ClienteDashboard() {
  const { user } = useAuth();
  const { parcelas, isLoading } = useParcelasData(user?.id);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [loteExpandido, setLoteExpandido] = useState<string>('');
  const [filtroSituacao, setFiltroSituacao] = useState<'TODOS' | 'PAGO' | 'A Vencer'>('TODOS');
  
  const clientesProcessados = useMemo(() => {
    // Transformar parcelas do hook para o formato esperado
    const dadosFormatados = parcelas.map((p, index) => ({
      'Quadra/Lote': p.quadraLote,
      'Cliente': p.cliente,
      'Descrição': p.descricao,
      'Vencimento': p.vencimento,
      'Valor': p.valor,
      'Situação': p.situacao,
      'Data Recebimento': p.dataRecebimento,
      'Desconto': p.desconto,
      'Juros': p.juros,
      'Honorarios': p.honorarios,
      'Valor Pago': p.valorPago
    }));
    return processarDados(dadosFormatados);
  }, [parcelas]);
  
  const cliente = clientesProcessados.find(c => c.cliente === clienteSelecionado);
  
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
  
  const getStatusColor = (situacao: string, vencimento: string) => {
    if (situacao === 'PAGO') return 'bg-green-100 text-green-800 border-green-200';
    
    const hoje = new Date();
    const dataVenc = new Date(vencimento);
    
    if (isBefore(dataVenc, hoje)) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };
  
  const getStatusText = (situacao: string, vencimento: string) => {
    if (situacao === 'PAGO') return 'Pago';
    
    const hoje = new Date();
    const dataVenc = new Date(vencimento);
    
    if (isBefore(dataVenc, hoje)) {
      return 'Vencido';
    }
    
    return 'A Vencer';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Carregando suas informações...</p>
        </div>
      </div>
    );
  }

  if (!clienteSelecionado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Portal do Cooperado
            </h1>
            <p className="text-gray-600">
              Selecione seu nome para visualizar suas informações
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesProcessados.map((c) => (
              <Card 
                key={c.cliente}
                className="cursor-pointer hover:shadow-xl transition-all duration-200 border-0 shadow-lg"
                onClick={() => setClienteSelecionado(c.cliente)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 mb-1">
                        {c.cliente}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {c.totalLotes} {c.totalLotes === 1 ? 'lote' : 'lotes'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Home className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progresso</span>
                      <span className="font-semibold text-emerald-600">
                        {c.percentualPago.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={c.percentualPago} className="h-2" />
                    
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Pago</span>
                        <span className="font-semibold">
                          {formatarMoeda(c.totalPago)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Saldo Devedor</span>
                        <span className="font-semibold text-blue-600">
                          {formatarMoeda(c.saldoDevedor)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard do cliente selecionado
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setClienteSelecionado('')}
            className="mb-4"
          >
            ← Voltar
          </Button>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {cliente?.cliente}
          </h1>
          <p className="text-gray-600">
            {cliente?.totalLotes} {cliente?.totalLotes === 1 ? 'lote' : 'lotes'} • {cliente?.totalParcelas} parcelas
          </p>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-emerald-100 text-sm mb-1">Total Pago</p>
                  <p className="text-3xl font-bold">
                    {formatarMoeda(cliente?.totalPago || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm text-emerald-100">
                {cliente?.parcelasPagas} de {cliente?.totalParcelas} parcelas
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Saldo Devedor</p>
                  <p className="text-3xl font-bold">
                    {formatarMoeda(cliente?.saldoDevedor || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm text-blue-100">
                {cliente?.parcelasAVencer} parcelas a vencer
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total Contratado</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatarMoeda(cliente?.totalContratado || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Valor total dos lotes
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Progresso</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    {cliente?.percentualPago.toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <Progress value={cliente?.percentualPago || 0} className="h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Lotes */}
        <div className="space-y-6">
          {cliente?.lotes.map((lote) => (
            <Card key={lote.quadraLote} className="border-0 shadow-lg">
              <CardHeader 
                className="cursor-pointer bg-gradient-to-r from-gray-50 to-white"
                onClick={() => setLoteExpandido(
                  loteExpandido === lote.quadraLote ? '' : lote.quadraLote
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Home className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">
                          Lote {lote.quadraLote}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          {lote.totalParcelas} parcelas • {lote.parcelasPagas} pagas
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Progresso</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {lote.percentualPago.toFixed(1)}%
                      </p>
                    </div>
                    
                    {loteExpandido === lote.quadraLote ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                <Progress value={lote.percentualPago} className="h-2 mt-4" />
                
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-sm text-gray-600">Total Contratado</p>
                    <p className="font-semibold text-gray-900">
                      {formatarMoeda(lote.totalContratado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Pago</p>
                    <p className="font-semibold text-emerald-600">
                      {formatarMoeda(lote.totalPago)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Saldo Devedor</p>
                    <p className="font-semibold text-blue-600">
                      {formatarMoeda(lote.saldoDevedor)}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {loteExpandido === lote.quadraLote && (
                <CardContent className="p-6">
                  {/* Filtros */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      size="sm"
                      variant={filtroSituacao === 'TODOS' ? 'default' : 'outline'}
                      onClick={() => setFiltroSituacao('TODOS')}
                    >
                      Todas
                    </Button>
                    <Button
                      size="sm"
                      variant={filtroSituacao === 'PAGO' ? 'default' : 'outline'}
                      onClick={() => setFiltroSituacao('PAGO')}
                    >
                      Pagas
                    </Button>
                    <Button
                      size="sm"
                      variant={filtroSituacao === 'A Vencer' ? 'default' : 'outline'}
                      onClick={() => setFiltroSituacao('A Vencer')}
                    >
                      A Vencer
                    </Button>
                  </div>

                  {/* Tabela de Parcelas */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Descrição
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Vencimento
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                            Valor
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                            Situação
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            Data Pagamento
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                            Valor Pago
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lote.parcelas
                          .filter(p => 
                            filtroSituacao === 'TODOS' || p.situacao === filtroSituacao
                          )
                          .map((parcela) => (
                          <tr 
                            key={parcela.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 px-4 text-sm">
                              {parcela.descricao}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {formatarData(parcela.vencimento)}
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-medium">
                              {formatarMoeda(parcela.valor)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge 
                                className={`${getStatusColor(parcela.situacao, parcela.vencimento)} border`}
                              >
                                {getStatusText(parcela.situacao, parcela.vencimento)}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {parcela.dataRecebimento 
                                ? formatarData(parcela.dataRecebimento)
                                : '-'
                              }
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-semibold text-emerald-600">
                              {parcela.situacao === 'PAGO' 
                                ? formatarMoeda(parcela.valorPago)
                                : '-'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
