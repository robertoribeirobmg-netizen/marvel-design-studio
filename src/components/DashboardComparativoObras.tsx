import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface EtapaObra {
  id: string;
  nome: string;
  percentual_concluido: number;
  percentual_planejado: number;
  ordem: number;
}

export function DashboardComparativoObras() {
  const [etapas, setEtapas] = useState<EtapaObra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEtapas();
  }, []);

  const loadEtapas = async () => {
    try {
      const { data, error } = await supabase
        .from('etapas_obra')
        .select('id, nome, percentual_concluido, percentual_planejado, ordem')
        .order('ordem');

      if (error) throw error;
      setEtapas(data || []);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Cálculos gerais
  const totalReal = Math.round(
    etapas.reduce((acc, etapa) => acc + etapa.percentual_concluido, 0) / etapas.length
  );

  const totalPlanejado = Math.round(
    etapas.reduce((acc, etapa) => acc + etapa.percentual_planejado, 0) / etapas.length
  );

  const diferenca = totalReal - totalPlanejado;
  const statusGeral = diferenca >= 0 ? 'adiantado' : 'atrasado';

  // Análise por etapa
  const etapasAdiantadas = etapas.filter(e => e.percentual_concluido > e.percentual_planejado);
  const etapasAtrasadas = etapas.filter(e => e.percentual_concluido < e.percentual_planejado);
  const etapasNoPrazo = etapas.filter(e => e.percentual_concluido === e.percentual_planejado);

  // Dados para gráfico de barras
  const chartData = etapas.map(etapa => ({
    nome: etapa.nome.length > 25 ? etapa.nome.substring(0, 25) + '...' : etapa.nome,
    Real: etapa.percentual_concluido,
    Planejado: etapa.percentual_planejado,
    diferenca: etapa.percentual_concluido - etapa.percentual_planejado,
  }));

  // Dados para gráfico de linha (progresso acumulado)
  const progressoAcumulado = etapas.map((etapa, index) => {
    const etapasAteAgora = etapas.slice(0, index + 1);
    const realAcumulado = Math.round(
      etapasAteAgora.reduce((acc, e) => acc + e.percentual_concluido, 0) / etapasAteAgora.length
    );
    const planejadoAcumulado = Math.round(
      etapasAteAgora.reduce((acc, e) => acc + e.percentual_planejado, 0) / etapasAteAgora.length
    );
    
    return {
      etapa: `Etapa ${index + 1}`,
      Real: realAcumulado,
      Planejado: planejadoAcumulado,
    };
  });

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progresso Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{totalReal}%</span>
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <Progress value={totalReal} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progresso Planejado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{totalPlanejado}%</span>
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <Progress value={totalPlanejado} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {Math.abs(diferenca)}%
                </span>
                {statusGeral === 'adiantado' ? (
                  <TrendingUp className="h-6 w-6 text-green-500" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-500" />
                )}
              </div>
              <Badge variant={statusGeral === 'adiantado' ? 'default' : 'destructive'}>
                {statusGeral === 'adiantado' ? 'Adiantado' : 'Atrasado'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análise de Etapas */}
      <Card>
        <CardHeader>
          <CardTitle>Análise por Status</CardTitle>
          <CardDescription>Distribuição das etapas por situação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Adiantadas</span>
              </div>
              <p className="text-3xl font-bold">{etapasAdiantadas.length}</p>
              <p className="text-sm text-muted-foreground">
                {((etapasAdiantadas.length / etapas.length) * 100).toFixed(0)}% do total
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">No Prazo</span>
              </div>
              <p className="text-3xl font-bold">{etapasNoPrazo.length}</p>
              <p className="text-sm text-muted-foreground">
                {((etapasNoPrazo.length / etapas.length) * 100).toFixed(0)}% do total
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="font-semibold">Atrasadas</span>
              </div>
              <p className="text-3xl font-bold">{etapasAtrasadas.length}</p>
              <p className="text-sm text-muted-foreground">
                {((etapasAtrasadas.length / etapas.length) * 100).toFixed(0)}% do total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Barras Comparativo */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação por Etapa</CardTitle>
          <CardDescription>Progresso real vs. planejado em cada etapa</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="nome" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                className="text-xs"
              />
              <YAxis 
                label={{ value: 'Percentual (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="Real" fill="hsl(var(--primary))" name="Real" />
              <Bar dataKey="Planejado" fill="hsl(142 71% 45% / 0.6)" name="Planejado" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Linha - Progresso Acumulado */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso Acumulado</CardTitle>
          <CardDescription>Evolução do progresso médio ao longo das etapas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressoAcumulado}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="etapa" />
              <YAxis 
                label={{ value: 'Percentual (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Real" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                name="Real"
                dot={{ fill: 'hsl(var(--primary))', r: 5 }}
              />
              <Line 
                type="monotone" 
                dataKey="Planejado" 
                stroke="hsl(142 71% 45%)" 
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Planejado"
                dot={{ fill: 'hsl(142 71% 45%)', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detalhamento de Etapas com Maior Diferença */}
      <Card>
        <CardHeader>
          <CardTitle>Etapas com Maior Variação</CardTitle>
          <CardDescription>Etapas com maior diferença entre real e planejado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chartData
              .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca))
              .slice(0, 5)
              .map((etapa, index) => {
                const etapaCompleta = etapas.find(e => 
                  e.nome.startsWith(etapa.nome.replace('...', ''))
                );
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{etapaCompleta?.nome}</span>
                      <Badge 
                        variant={etapa.diferenca >= 0 ? 'default' : 'destructive'}
                        className="ml-2"
                      >
                        {etapa.diferenca > 0 ? '+' : ''}{etapa.diferenca}%
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Real: {etapa.Real}%</span>
                        <span className="text-muted-foreground">Planejado: {etapa.Planejado}%</span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-primary transition-all"
                          style={{ width: `${etapa.Real}%` }}
                        />
                        <div 
                          className="absolute h-full border-2 border-green-500 border-dashed"
                          style={{ width: `${etapa.Planejado}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
