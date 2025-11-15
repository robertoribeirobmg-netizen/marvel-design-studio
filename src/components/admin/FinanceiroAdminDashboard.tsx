import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, DollarSign, Users, AlertCircle, TrendingUp, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface CompradorCOHAPM {
  id: string;
  nome: string;
  cpf_cnpj: string;
  telefone: string;
  email: string;
  quadra: string;
  lote: string;
  empreendimento: string;
  profile_id: string | null;
  valor_total_contratos: number;
  valor_pago: number;
  valor_pendente: number;
  total_contratos: number;
  total_parcelas: number;
  parcelas_pagas: number;
  parcelas_atrasadas: number;
  situacao_financeira: string;
  percentual_pago: number;
}

export function FinanceiroAdminDashboard() {
  const [compradores, setCompradores] = useState<CompradorCOHAPM[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todos');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Buscar compradores COHAPM com dados consolidados
      const { data, error } = await supabase
        .from('vw_resumo_financeiro_cohapm')
        .select('*')
        .order('nome');

      if (error) throw error;

      setCompradores(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar compradores
  const compradoresFiltrados = compradores.filter(c => {
    const matchSearch = 
      c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf_cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.quadra?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lote?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchSituacao = 
      filtroSituacao === 'todos' ||
      (filtroSituacao === 'inadimplente' && c.parcelas_atrasadas > 0) ||
      (filtroSituacao === 'em_dia' && c.parcelas_atrasadas === 0 && c.valor_pendente > 0) ||
      (filtroSituacao === 'quitado' && c.valor_pendente === 0);

    return matchSearch && matchSituacao;
  });

  // Estatísticas gerais
  const stats = {
    totalCompradores: compradores.length,
    totalContratos: compradores.reduce((sum, c) => sum + (c.total_contratos || 0), 0),
    valorTotal: compradores.reduce((sum, c) => sum + (c.valor_total_contratos || 0), 0),
    valorPago: compradores.reduce((sum, c) => sum + (c.valor_pago || 0), 0),
    valorPendente: compradores.reduce((sum, c) => sum + (c.valor_pendente || 0), 0),
    inadimplentes: compradores.filter(c => c.parcelas_atrasadas > 0).length,
    emDia: compradores.filter(c => c.parcelas_atrasadas === 0 && c.valor_pendente > 0).length,
    quitados: compradores.filter(c => c.valor_pendente === 0).length,
  };

  const getStatusBadge = (comprador: CompradorCOHAPM) => {
    if (comprador.parcelas_atrasadas > 0) {
      return <Badge variant="destructive">Inadimplente ({comprador.parcelas_atrasadas})</Badge>;
    }
    if (comprador.valor_pendente === 0) {
      return <Badge variant="default" className="bg-green-600">Quitado</Badge>;
    }
    return <Badge variant="secondary">Em Dia</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gestão Financeira COHAPM</h2>
        <p className="text-muted-foreground">
          Visualize e gerencie dados financeiros dos {stats.totalCompradores} compradores
        </p>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Compradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompradores}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalContratos} contratos ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.valorTotal)}</div>
            <p className="text-xs text-muted-foreground">
              Em contratos COHAPM
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Recebido</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.valorPago)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.valorTotal > 0 ? ((stats.valorPago / stats.valorTotal) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.valorPendente)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inadimplentes} inadimplentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Análise */}
      <Tabs defaultValue="todos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="todos" onClick={() => setFiltroSituacao('todos')}>
            Todos ({stats.totalCompradores})
          </TabsTrigger>
          <TabsTrigger value="em_dia" onClick={() => setFiltroSituacao('em_dia')}>
            Em Dia ({stats.emDia})
          </TabsTrigger>
          <TabsTrigger value="inadimplente" onClick={() => setFiltroSituacao('inadimplente')}>
            Inadimplentes ({stats.inadimplentes})
          </TabsTrigger>
          <TabsTrigger value="quitado" onClick={() => setFiltroSituacao('quitado')}>
            Quitados ({stats.quitados})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filtroSituacao} className="space-y-4">
          {/* Busca */}
          <Card>
            <CardHeader>
              <CardTitle>Buscar Comprador</CardTitle>
              <CardDescription>
                Pesquise por nome, CPF, quadra ou lote
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Compradores */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Compradores</CardTitle>
              <CardDescription>
                {compradoresFiltrados.length} {compradoresFiltrados.length === 1 ? 'comprador encontrado' : 'compradores encontrados'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Quadra/Lote</TableHead>
                      <TableHead>Contratos</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Valor Pago</TableHead>
                      <TableHead>Valor Pendente</TableHead>
                      <TableHead>Parcelas</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compradoresFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          Nenhum comprador encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      compradoresFiltrados.map((comprador) => (
                        <TableRow key={comprador.id}>
                          <TableCell className="font-medium">{comprador.nome}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {comprador.cpf_cnpj || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {comprador.quadra && comprador.lote
                                  ? `${comprador.quadra}-${comprador.lote}`
                                  : '-'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {comprador.total_contratos || 0}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(comprador.valor_total_contratos)}
                          </TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {formatCurrency(comprador.valor_pago)}
                          </TableCell>
                          <TableCell className="text-orange-600 font-medium">
                            {formatCurrency(comprador.valor_pendente)}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="space-y-1">
                              <div>{comprador.parcelas_pagas || 0}/{comprador.total_parcelas || 0} pagas</div>
                              {comprador.parcelas_atrasadas > 0 && (
                                <div className="text-red-600 font-medium">
                                  {comprador.parcelas_atrasadas} atrasadas
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(comprador)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
