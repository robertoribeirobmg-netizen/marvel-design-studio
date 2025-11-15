import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ArrecadacaoMensal {
  mes: string;
  arrecadado: number;
  previsto: number;
}

interface InadimplenciaQuadra {
  quadra: string;
  total_inadimplentes: number;
  valor_pendente: number;
  percentual: number;
}

interface ProjecaoReceita {
  mes: string;
  projecao_otimista: number;
  projecao_realista: number;
  projecao_pessimista: number;
}

interface EstatisticasGerais {
  total_compradores: number;
  total_arrecadado: number;
  total_pendente: number;
  taxa_inadimplencia: number;
  tendencia_mes: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', '#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

export function DashboardVisualCOHAPM() {
  const [loading, setLoading] = useState(true);
  const [arrecadacaoData, setArrecadacaoData] = useState<ArrecadacaoMensal[]>([]);
  const [inadimplenciaData, setInadimplenciaData] = useState<InadimplenciaQuadra[]>([]);
  const [projecaoData, setProjecaoData] = useState<ProjecaoReceita[]>([]);
  const [stats, setStats] = useState<EstatisticasGerais>({
    total_compradores: 0,
    total_arrecadado: 0,
    total_pendente: 0,
    taxa_inadimplencia: 0,
    tendencia_mes: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Buscar dados de resumo financeiro
      const { data: resumoData, error: resumoError } = await supabase
        .from('vw_resumo_financeiro_cohapm')
        .select('*');

      if (resumoError) throw resumoError;

      // Buscar parcelas para análise temporal
      const { data: parcelasData, error: parcelasError } = await supabase
        .from('parcelas_cohapm')
        .select('*')
        .order('data_vencimento', { ascending: true });

      if (parcelasError) throw parcelasError;

      // Processar estatísticas gerais
      const totalCompradores = resumoData?.length || 0;
      const totalArrecadado = resumoData?.reduce((sum, item) => sum + (item.valor_pago || 0), 0) || 0;
      const totalPendente = resumoData?.reduce((sum, item) => sum + (item.valor_pendente || 0), 0) || 0;
      const inadimplentes = resumoData?.filter(item => item.situacao_financeira === 'inadimplente').length || 0;
      const taxaInadimplencia = totalCompradores > 0 ? (inadimplentes / totalCompradores) * 100 : 0;

      setStats({
        total_compradores: totalCompradores,
        total_arrecadado: totalArrecadado,
        total_pendente: totalPendente,
        taxa_inadimplencia: taxaInadimplencia,
        tendencia_mes: 5.2 // Simulado
      });

      // Processar arrecadação mensal
      const arrecadacaoPorMes = processarArrecadacaoMensal(parcelasData || []);
      setArrecadacaoData(arrecadacaoPorMes);

      // Processar inadimplência por quadra
      const inadimplenciaPorQuadra = processarInadimplenciaPorQuadra(resumoData || []);
      setInadimplenciaData(inadimplenciaPorQuadra);

      // Processar projeções
      const projecoes = gerarProjecoes(arrecadacaoPorMes);
      setProjecaoData(projecoes);

    } catch (error: any) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const processarArrecadacaoMensal = (parcelas: any[]): ArrecadacaoMensal[] => {
    const mesesMap = new Map<string, { arrecadado: number; previsto: number }>();

    parcelas.forEach(parcela => {
      if (parcela.data_vencimento) {
        const data = new Date(parcela.data_vencimento);
        const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        const atual = mesesMap.get(mesAno) || { arrecadado: 0, previsto: 0 };
        atual.previsto += parcela.valor_parcela || 0;
        
        if (parcela.status === 'pago' || parcela.data_pagamento) {
          atual.arrecadado += parcela.valor_pago || parcela.valor_parcela || 0;
        }
        
        mesesMap.set(mesAno, atual);
      }
    });

    return Array.from(mesesMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([mes, valores]) => ({
        mes: formatarMesAno(mes),
        arrecadado: valores.arrecadado,
        previsto: valores.previsto
      }));
  };

  const processarInadimplenciaPorQuadra = (resumo: any[]): InadimplenciaQuadra[] => {
    const quadrasMap = new Map<string, { total: number; valor: number }>();

    resumo.forEach(item => {
      if (item.situacao_financeira === 'inadimplente' && item.quadra) {
        const atual = quadrasMap.get(item.quadra) || { total: 0, valor: 0 };
        atual.total += 1;
        atual.valor += item.valor_pendente || 0;
        quadrasMap.set(item.quadra, atual);
      }
    });

    const total = Array.from(quadrasMap.values()).reduce((sum, item) => sum + item.total, 0);

    return Array.from(quadrasMap.entries())
      .map(([quadra, dados]) => ({
        quadra,
        total_inadimplentes: dados.total,
        valor_pendente: dados.valor,
        percentual: total > 0 ? (dados.total / total) * 100 : 0
      }))
      .sort((a, b) => b.total_inadimplentes - a.total_inadimplentes)
      .slice(0, 10);
  };

  const gerarProjecoes = (historico: ArrecadacaoMensal[]): ProjecaoReceita[] => {
    if (historico.length === 0) return [];

    const ultimoValor = historico[historico.length - 1]?.arrecadado || 0;
    const mediaArrecadacao = historico.reduce((sum, item) => sum + item.arrecadado, 0) / historico.length;
    const tendencia = historico.length > 1 
      ? (historico[historico.length - 1]?.arrecadado - historico[0]?.arrecadado) / historico.length
      : 0;

    const projecoes: ProjecaoReceita[] = [];
    const mesesFuturos = 6;

    for (let i = 1; i <= mesesFuturos; i++) {
      const baseProjecao = ultimoValor + (tendencia * i);
      projecoes.push({
        mes: `Mês +${i}`,
        projecao_otimista: baseProjecao * 1.15,
        projecao_realista: baseProjecao,
        projecao_pessimista: baseProjecao * 0.85
      });
    }

    return projecoes;
  };

  const formatarMesAno = (mesAno: string): string => {
    const [ano, mes] = mesAno.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mes) - 1]}/${ano.slice(2)}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Arrecadado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.total_arrecadado)}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +{stats.tendencia_mes.toFixed(1)}% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.total_pendente)}</div>
            <p className="text-xs text-muted-foreground">
              A receber de {stats.total_compradores} compradores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Inadimplência</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.taxa_inadimplencia.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.taxa_inadimplencia / 100) * stats.total_compradores)} inadimplentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Compradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_compradores}</div>
            <p className="text-xs text-muted-foreground">
              Clientes ativos no sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Principais */}
      <Tabs defaultValue="arrecadacao" className="space-y-4">
        <TabsList>
          <TabsTrigger value="arrecadacao">Arrecadação</TabsTrigger>
          <TabsTrigger value="inadimplencia">Inadimplência</TabsTrigger>
          <TabsTrigger value="projecoes">Projeções</TabsTrigger>
        </TabsList>

        <TabsContent value="arrecadacao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Arrecadação Mensal</CardTitle>
              <CardDescription>
                Comparativo entre valores arrecadados e previstos nos últimos 12 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={arrecadacaoData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar dataKey="previsto" fill="hsl(var(--muted))" name="Previsto" />
                  <Bar dataKey="arrecadado" fill="hsl(var(--primary))" name="Arrecadado" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inadimplencia" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Inadimplência por Quadra</CardTitle>
                <CardDescription>
                  Top 10 quadras com maior número de inadimplentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={inadimplenciaData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="quadra" type="category" className="text-xs" width={60} />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === "total_inadimplentes") return [value, "Inadimplentes"];
                        return [formatCurrency(value), "Valor Pendente"];
                      }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Bar dataKey="total_inadimplentes" fill="hsl(var(--destructive))" name="Inadimplentes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Inadimplência</CardTitle>
                <CardDescription>
                  Percentual de inadimplentes por quadra
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={inadimplenciaData.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ quadra, percentual }) => `${quadra}: ${percentual.toFixed(1)}%`}
                      outerRadius={100}
                      fill="hsl(var(--primary))"
                      dataKey="total_inadimplentes"
                    >
                      {inadimplenciaData.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value, "Inadimplentes"]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projecoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Projeções de Receita</CardTitle>
              <CardDescription>
                Estimativas de arrecadação para os próximos 6 meses com cenários otimista, realista e pessimista
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={projecaoData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="projecao_otimista" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    fillOpacity={0.3}
                    name="Cenário Otimista (+15%)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="projecao_realista" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.3}
                    name="Cenário Realista"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="projecao_pessimista" 
                    stroke="#ff8042" 
                    fill="#ff8042" 
                    fillOpacity={0.3}
                    name="Cenário Pessimista (-15%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
