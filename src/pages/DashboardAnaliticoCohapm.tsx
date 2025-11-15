import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, BarChart3, LineChart, PieChart, Calendar } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Sincronizacao {
  id: string;
  data_execucao: string;
  total_analisados: number;
  divergencias_encontradas: number;
  detalhes: any;
  status: string;
}

interface TipoContagem {
  tipo: string;
  count: number;
  label: string;
}

const COLORS = {
  vinculado: "#10b981",
  nao_vinculado: "#6b7280",
  cpf_divergente: "#ef4444",
  dados_divergentes: "#f97316",
  match_potencial: "#3b82f6",
  vinculo_invalido: "#dc2626",
};

const TIPO_LABELS: Record<string, string> = {
  vinculado: "Vinculados",
  nao_vinculado: "Não Vinculados",
  cpf_divergente: "CPF Divergente",
  dados_divergentes: "Dados Divergentes",
  match_potencial: "Match Potencial",
  vinculo_invalido: "Vínculo Inválido",
};

export default function DashboardAnaliticoCohapm() {
  const [sincronizacoes, setSincronizacoes] = useState<Sincronizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<string>("30");
  const { toast } = useToast();

  const fetchSincronizacoes = async () => {
    try {
      setLoading(true);
      const dataInicio = subDays(new Date(), parseInt(periodo));
      
      const { data, error } = await supabase
        .from("sincronizacoes_cohapm")
        .select("*")
        .gte("data_execucao", dataInicio.toISOString())
        .order("data_execucao", { ascending: true });

      if (error) throw error;
      setSincronizacoes(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSincronizacoes();
  }, [periodo]);

  // Análise de evolução temporal
  const evolucaoTemporal = sincronizacoes.map((sync) => ({
    data: format(new Date(sync.data_execucao), "dd/MM", { locale: ptBR }),
    divergencias: sync.divergencias_encontradas,
    analisados: sync.total_analisados,
    taxa: sync.total_analisados > 0 
      ? ((sync.divergencias_encontradas / sync.total_analisados) * 100).toFixed(1)
      : 0,
  }));

  // Análise por tipo de divergência
  const tiposDivergencias: Record<string, number> = {};
  sincronizacoes.forEach((sync) => {
    if (sync.detalhes?.divergencias) {
      sync.detalhes.divergencias.forEach((div: any) => {
        tiposDivergencias[div.tipo] = (tiposDivergencias[div.tipo] || 0) + 1;
      });
    }
  });

  const dadosPizza: TipoContagem[] = Object.entries(tiposDivergencias).map(([tipo, count]) => ({
    tipo,
    count,
    label: TIPO_LABELS[tipo] || tipo,
  }));

  // Estatísticas gerais
  const ultimaSincronizacao = sincronizacoes[sincronizacoes.length - 1];
  const primeiraDoPerido = sincronizacoes[0];
  
  const totalDivergenciasAtual = ultimaSincronizacao?.divergencias_encontradas || 0;
  const totalDivergenciasAnterior = primeiraDoPerido?.divergencias_encontradas || 0;
  const variacao = totalDivergenciasAnterior > 0
    ? ((totalDivergenciasAtual - totalDivergenciasAnterior) / totalDivergenciasAnterior) * 100
    : 0;

  const mediaDivergencias = sincronizacoes.length > 0
    ? sincronizacoes.reduce((acc, sync) => acc + sync.divergencias_encontradas, 0) / sincronizacoes.length
    : 0;

  const taxaResolucao = totalDivergenciasAnterior > 0 && variacao < 0
    ? Math.abs(variacao)
    : 0;

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">Carregando análises...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Dashboard Analítico COHAPM
          </h1>
          <p className="text-muted-foreground">
            Análise detalhada das sincronizações e divergências
          </p>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="15">Últimos 15 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sincronizacoes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Nenhum dado disponível para o período selecionado.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Divergências Atuais
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDivergenciasAtual}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  {variacao > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-destructive" />
                      <span className="text-destructive">+{variacao.toFixed(1)}%</span>
                    </>
                  ) : variacao < 0 ? (
                    <>
                      <TrendingDown className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">{variacao.toFixed(1)}%</span>
                    </>
                  ) : (
                    <span>sem alteração</span>
                  )}
                  <span className="ml-1">vs início do período</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Média de Divergências
                </CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mediaDivergencias.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  por sincronização
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Taxa de Resolução
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taxaResolucao.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  redução no período
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sincronizações
                </CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sincronizacoes.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  no período selecionado
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Evolução Temporal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Evolução de Divergências ao Longo do Tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={evolucaoTemporal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="divergencias"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Divergências"
                  />
                  <Line
                    type="monotone"
                    dataKey="analisados"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Total Analisados"
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Barras - Taxa de Divergência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Taxa de Divergência por Sincronização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={evolucaoTemporal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: any) => `${value}%`} />
                  <Bar dataKey="taxa" fill="#f97316" name="Taxa de Divergência (%)" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Distribuição por Tipo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Distribuição por Tipo de Divergência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={dadosPizza}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {dadosPizza.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.tipo as keyof typeof COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  <h4 className="font-semibold mb-4">Detalhamento por Tipo</h4>
                  {dadosPizza
                    .sort((a, b) => b.count - a.count)
                    .map((item) => (
                      <div key={item.tipo} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[item.tipo as keyof typeof COLORS] }}
                          />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
