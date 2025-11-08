import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Home, Calendar, MapPin, FileText, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { generateCooperadosReport } from '@/lib/pdfGenerator';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardCooperadosProps {
  cooperados: any[];
}

export function DashboardCooperados({ cooperados }: DashboardCooperadosProps) {
  // Estatísticas gerais
  const totalCooperados = cooperados.length;
  const cooperadosComLote = cooperados.filter(c => c.quadra && c.lote).length;
  const cooperadosSemLote = totalCooperados - cooperadosComLote;

  // Cooperados por fase
  const cooperadosPorFase = cooperados.reduce((acc: Record<string, number>, c) => {
    const fase = c.fase || 'Sem fase';
    acc[fase] = (acc[fase] || 0) + 1;
    return acc;
  }, {});

  const fasesSorted = Object.entries(cooperadosPorFase)
    .sort(([a], [b]) => {
      if (a === 'Sem fase') return 1;
      if (b === 'Sem fase') return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

  // Cooperados por quadra
  const cooperadosPorQuadra = cooperados.reduce((acc: Record<string, number>, c) => {
    const quadra = c.quadra || 'Sem quadra';
    acc[quadra] = (acc[quadra] || 0) + 1;
    return acc;
  }, {});

  const quadrasSorted = Object.entries(cooperadosPorQuadra)
    .sort(([a], [b]) => {
      if (a === 'Sem quadra') return 1;
      if (b === 'Sem quadra') return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

  // Cooperados cadastrados nos últimos 30 dias
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const cooperadosRecentes = cooperados.filter(c => {
    const dataCadastro = new Date(c.data_cadastro);
    return dataCadastro >= trintaDiasAtras;
  }).length;

  // Cooperados com data de compra definida
  const cooperadosComDataCompra = cooperados.filter(c => c.data_compra).length;

  // Dados para o gráfico de evolução temporal
  const cadastrosPorMes = cooperados.reduce((acc: Record<string, number>, c) => {
    if (c.data_cadastro) {
      const data = new Date(c.data_cadastro);
      const mesAno = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
      acc[mesAno] = (acc[mesAno] || 0) + 1;
    }
    return acc;
  }, {});

  // Criar array ordenado por data e calcular acumulado
  const dadosGrafico = Object.entries(cadastrosPorMes)
    .map(([mesAno, count]) => {
      const [mes, ano] = mesAno.split('/');
      return {
        mesAno,
        count: Number(count),
        sortKey: `${ano}-${mes}`,
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .reduce((acc: any[], item, index) => {
      const acumulado = index === 0 ? item.count : acc[index - 1].acumulado + item.count;
      acc.push({
        mes: item.mesAno,
        cadastros: item.count,
        acumulado,
      });
      return acc;
    }, []);

  // Dados para o gráfico comparativo de quadras ao longo do tempo
  const cadastrosPorQuadraEMes = cooperados.reduce((acc: Record<string, Record<string, number>>, c) => {
    if (c.data_cadastro && c.quadra) {
      const data = new Date(c.data_cadastro);
      const mesAno = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
      const quadra = c.quadra;
      
      if (!acc[quadra]) {
        acc[quadra] = {};
      }
      acc[quadra][mesAno] = (acc[quadra][mesAno] || 0) + 1;
    }
    return acc;
  }, {});

  // Obter todas as datas únicas e ordenar
  const todasAsDatas = new Set<string>();
  Object.values(cadastrosPorQuadraEMes).forEach(quadraData => {
    Object.keys(quadraData).forEach(mesAno => todasAsDatas.add(mesAno));
  });
  
  const datasOrdenadas = Array.from(todasAsDatas)
    .map(mesAno => {
      const [mes, ano] = mesAno.split('/');
      return { mesAno, sortKey: `${ano}-${mes}` };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(d => d.mesAno);

  // Top 5 quadras com mais cooperados
  const topQuadras = Object.entries(cooperadosPorQuadra)
    .filter(([quadra]) => quadra !== 'Sem quadra')
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 5)
    .map(([quadra]) => quadra);

  // Cores para as quadras
  const coresQuadras = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(142, 76%, 36%)', // green
    'hsl(262, 83%, 58%)', // purple
    'hsl(346, 77%, 50%)', // red
  ];

  // Criar dados do gráfico comparativo com acumulado por quadra
  const dadosGraficoQuadras = datasOrdenadas.map(mesAno => {
    const dataPoint: any = { mes: mesAno };
    
    topQuadras.forEach((quadra, index) => {
      // Calcular acumulado até este mês
      const mesIndex = datasOrdenadas.indexOf(mesAno);
      const acumulado = datasOrdenadas.slice(0, mesIndex + 1).reduce((sum, mes) => {
        return sum + (cadastrosPorQuadraEMes[quadra]?.[mes] || 0);
      }, 0);
      
      dataPoint[`Quadra ${quadra}`] = acumulado;
    });
    
    return dataPoint;
  });

  const handleGeneratePDF = () => {
    try {
      const estatisticas = {
        totalCooperados,
        cooperadosComLote,
        cooperadosSemLote,
        cooperadosRecentes,
        cooperadosComDataCompra,
        cooperadosPorFase,
        cooperadosPorQuadra,
      };
      
      generateCooperadosReport(cooperados, estatisticas);
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar relatório PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Botão de exportar PDF */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Cooperados</h2>
          <p className="text-muted-foreground">Visão geral e estatísticas</p>
        </div>
        <Button onClick={handleGeneratePDF} className="gap-2">
          <FileText className="h-4 w-4" />
          Gerar Relatório PDF
        </Button>
      </div>
      {/* Cards de estatísticas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cooperados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCooperados}</div>
            <p className="text-xs text-muted-foreground">
              {cooperadosRecentes} cadastrados nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Lote Definido</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cooperadosComLote}</div>
            <p className="text-xs text-muted-foreground">
              {cooperadosSemLote} ainda sem lote
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fases Ativas</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(cooperadosPorFase).filter(f => f !== 'Sem fase').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {cooperadosPorFase['Sem fase'] || 0} cooperados sem fase
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Data de Compra</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cooperadosComDataCompra}</div>
            <p className="text-xs text-muted-foreground">
              {totalCooperados - cooperadosComDataCompra} sem data definida
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de evolução temporal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução de Cadastros ao Longo do Tempo
          </CardTitle>
          <CardDescription>
            Cadastros mensais e total acumulado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dadosGrafico.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="mes" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cadastros" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Cadastros no mês"
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="acumulado" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  name="Total acumulado"
                  dot={{ fill: 'hsl(var(--accent))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum dado de cadastro disponível
            </p>
          )}
        </CardContent>
      </Card>

      {/* Gráfico comparativo de evolução por quadra */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Evolução Comparativa por Quadra
          </CardTitle>
          <CardDescription>
            Crescimento acumulado das top 5 quadras ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dadosGraficoQuadras.length > 0 && topQuadras.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={dadosGraficoQuadras}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="mes" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  />
                  {topQuadras.map((quadra, index) => (
                    <Line 
                      key={quadra}
                      type="monotone" 
                      dataKey={`Quadra ${quadra}`}
                      stroke={coresQuadras[index]}
                      strokeWidth={2}
                      name={`Quadra ${quadra}`}
                      dot={{ fill: coresQuadras[index] }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 flex flex-wrap gap-3 justify-center">
                {topQuadras.map((quadra, index) => (
                  <div key={quadra} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: coresQuadras[index] }}
                    />
                    <span className="text-xs text-muted-foreground">
                      Quadra {quadra}: {cooperadosPorQuadra[quadra]} cooperados
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum dado de quadra disponível para comparação
            </p>
          )}
        </CardContent>
      </Card>

      {/* Distribuição por fase e quadra */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Fase</CardTitle>
            <CardDescription>
              Quantidade de cooperados em cada fase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fasesSorted.length > 0 ? (
                fasesSorted.map(([fase, count]) => (
                  <div key={fase} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={fase === 'Sem fase' ? 'outline' : 'secondary'}>
                        {fase}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all"
                          style={{ width: `${(Number(count) / totalCooperados) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {String(count)} ({Math.round((Number(count) / totalCooperados) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum dado disponível
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Quadra</CardTitle>
            <CardDescription>
              Quantidade de cooperados em cada quadra
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quadrasSorted.length > 0 ? (
                quadrasSorted.slice(0, 10).map(([quadra, count]) => (
                  <div key={quadra} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={quadra === 'Sem quadra' ? 'outline' : 'secondary'}>
                        {quadra === 'Sem quadra' ? quadra : `Quadra ${quadra}`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all"
                          style={{ width: `${(Number(count) / totalCooperados) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {String(count)} ({Math.round((Number(count) / totalCooperados) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum dado disponível
                </p>
              )}
              {quadrasSorted.length > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Mostrando 10 de {quadrasSorted.length} quadras
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
