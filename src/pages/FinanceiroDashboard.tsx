import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  Users,
  FileText
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = {
  paga: "#10b981",
  pendente: "#f59e0b",
  atrasada: "#ef4444",
};

export default function FinanceiroDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalReceber: 0,
    totalRecebido: 0,
    parcelasPendentes: 0,
    parcelasAtrasadas: 0,
    taxaAdimplencia: 0,
    ticketMedio: 0,
    contratosAtivos: 0,
    cooperadosAtivos: 0,
  });
  const [fluxoCaixa, setFluxoCaixa] = useState<any[]>([]);
  const [distribuicaoStatus, setDistribuicaoStatus] = useState<any[]>([]);
  const [evolvingList, setEvolvingList] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Buscar contratos ativos
      const { data: contratos, error: contratosError } = await supabase
        .from("contratos_cohapm")
        .select("*")
        .eq("status", "ativo");

      if (contratosError) throw contratosError;

      // Buscar todas as parcelas
      const { data: parcelas, error: parcelasError } = await supabase
        .from("parcelas_cohapm")
        .select("*");

      if (parcelasError) throw parcelasError;

      // Calcular KPIs
      const totalParcelas = parcelas?.length || 0;
      const parcelasPagas = parcelas?.filter(p => p.status === "paga").length || 0;
      const parcelasPendentes = parcelas?.filter(p => p.status === "pendente").length || 0;
      const parcelasAtrasadas = parcelas?.filter(p => p.status === "atrasada").length || 0;

      const totalReceber = parcelas?.reduce((sum, p) => sum + (Number(p.valor_parcela) || 0), 0) || 0;
      const totalRecebido = parcelas?.filter(p => p.status === "paga")
        .reduce((sum, p) => sum + (Number(p.valor_pago) || 0), 0) || 0;

      const taxaAdimplencia = totalParcelas > 0 
        ? ((parcelasPagas / (parcelasPagas + parcelasAtrasadas)) * 100) 
        : 100;

      const contratoIdsUnicos = new Set(parcelas?.map(p => p.contrato_id));
      const compradorIdsUnicos = new Set(parcelas?.map(p => p.comprador_id));

      const ticketMedio = contratos && contratos.length > 0
        ? contratos.reduce((sum, c) => sum + (Number(c.valor_total) || 0), 0) / contratos.length
        : 0;

      setKpis({
        totalReceber,
        totalRecebido,
        parcelasPendentes,
        parcelasAtrasadas,
        taxaAdimplencia,
        ticketMedio,
        contratosAtivos: contratoIdsUnicos.size,
        cooperadosAtivos: compradorIdsUnicos.size,
      });

      // Distribuição por status
      setDistribuicaoStatus([
        { name: "Pagas", value: parcelasPagas, color: COLORS.paga },
        { name: "Pendentes", value: parcelasPendentes, color: COLORS.pendente },
        { name: "Atrasadas", value: parcelasAtrasadas, color: COLORS.atrasada },
      ]);

      // Fluxo de caixa (últimos 6 meses)
      const fluxoData: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const mes = subMonths(new Date(), i);
        const inicioMes = startOfMonth(mes);
        const fimMes = endOfMonth(mes);

        const parcelasMes = parcelas?.filter(p => {
          const dataVenc = new Date(p.data_vencimento || "");
          return dataVenc >= inicioMes && dataVenc <= fimMes;
        }) || [];

        const previsto = parcelasMes.reduce((sum, p) => sum + (Number(p.valor_parcela) || 0), 0);
        const realizado = parcelasMes
          .filter(p => p.status === "paga")
          .reduce((sum, p) => sum + (Number(p.valor_pago) || 0), 0);

        fluxoData.push({
          mes: format(mes, "MMM/yy", { locale: ptBR }),
          previsto: previsto / 1000,
          realizado: realizado / 1000,
        });
      }
      setFluxoCaixa(fluxoData);

      // Aging List (parcelas por tempo de atraso)
      const hoje = new Date();
      const aging = {
        ate30: 0,
        de31a60: 0,
        de61a90: 0,
        mais90: 0,
      };

      parcelas?.filter(p => p.status === "atrasada").forEach(p => {
        const dataVenc = new Date(p.data_vencimento || "");
        const diasAtraso = Math.floor((hoje.getTime() - dataVenc.getTime()) / (1000 * 60 * 60 * 24));

        if (diasAtraso <= 30) aging.ate30++;
        else if (diasAtraso <= 60) aging.de31a60++;
        else if (diasAtraso <= 90) aging.de61a90++;
        else aging.mais90++;
      });

      setEvolvingList([
        { faixa: "Até 30 dias", quantidade: aging.ate30 },
        { faixa: "31 a 60 dias", quantidade: aging.de31a60 },
        { faixa: "61 a 90 dias", quantidade: aging.de61a90 },
        { faixa: "Mais de 90 dias", quantidade: aging.mais90 },
      ]);

    } catch (error: any) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">Carregando dashboard...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <DollarSign className="h-8 w-8" />
          Dashboard Financeiro
        </h1>
        <p className="text-muted-foreground">
          Visão executiva completa do financeiro
        </p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(kpis.totalReceber / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Todas as parcelas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {(kpis.totalRecebido / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((kpis.totalRecebido / kpis.totalReceber) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Adimplência</CardTitle>
            {kpis.taxaAdimplencia >= 90 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.taxaAdimplencia >= 90 ? "text-green-600" : "text-destructive"}`}>
              {kpis.taxaAdimplencia.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Meta: 95%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parcelas Atrasadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {kpis.parcelasAtrasadas}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requer atenção imediata
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Secundários */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.contratosAtivos}</div>
            <p className="text-xs text-muted-foreground mt-1">Em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cooperados Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.cooperadosAtivos}</div>
            <p className="text-xs text-muted-foreground mt-1">Com parcelas ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(kpis.ticketMedio / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">Por contrato</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parcelas Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {kpis.parcelasPendentes}
            </div>
            <p className="text-xs text-muted-foreground mt-1">A vencer</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fluxo de Caixa */}
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Caixa (R$ mil)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fluxoCaixa}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value: any) => `R$ ${value}k`} />
                <Legend />
                <Bar dataKey="previsto" fill="#3b82f6" name="Previsto" />
                <Bar dataKey="realizado" fill="#10b981" name="Realizado" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por Status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Parcelas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribuicaoStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distribuicaoStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Aging List */}
      <Card>
        <CardHeader>
          <CardTitle>Aging List - Parcelas Atrasadas por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={evolvingList} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="faixa" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#ef4444" name="Quantidade" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
