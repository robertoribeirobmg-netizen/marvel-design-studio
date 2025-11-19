import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, DollarSign, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ParcelaFinanceira {
  comprador_id: string;
  comprador_nome: string;
  comprador_telefone: string;
  comprador_email: string;
  comprador_quadra: string;
  comprador_lote: string;
  comprador_grupo: string;
  comprador_empreendimento: string;
  comprador_tipo_classificado: string;
  contrato_id: number;
  contrato_data: string;
  contrato_area_m2: number;
  contrato_valor_total: number;
  parcela_id: number;
  tipo_parcela: string;
  numero_parcela: number;
  vencimento_parcela: string;
  valor_parcela: number;
  situacao: string;
  data_recebimento: string | null;
  desconto: number;
  juros: number;
  valor_pago: number | null;
}

export function FinanceiroAdminDashboard() {
  const [parcelas, setParcelas] = useState<ParcelaFinanceira[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const { data: parcelasData, error: parcelasError } = await supabase
        .from('parcelas_cohapm')
        .select(`
          id,
          numero_parcela,
          data_vencimento,
          valor_parcela,
          situacao,
          data_recebimento,
          valor_desconto,
          valor_juros,
          valor_pago,
          tipo_parcela,
          contrato_id,
          comprador_id
        `)
        .order('data_vencimento', { ascending: false });

      if (parcelasError) throw parcelasError;

      if (!parcelasData || parcelasData.length === 0) {
        setParcelas([]);
        setIsLoading(false);
        return;
      }

      const compradorIds = [...new Set(parcelasData.map(p => p.comprador_id).filter(Boolean))];
      const { data: compradoresData, error: compradoresError } = await supabase
        .from('compradores_cohapm')
        .select('id, nome, telefone, email, quadra, lote, grupo, empreendimento, tipo_classificado')
        .in('id', compradorIds);

      if (compradoresError) throw compradoresError;

      const contratoIds = [...new Set(parcelasData.map(p => p.contrato_id).filter(Boolean))];
      const { data: contratosData, error: contratosError } = await supabase
        .from('contratos_cohapm')
        .select('id, data_contrato, area_m2, valor_total')
        .in('id', contratoIds);

      if (contratosError) throw contratosError;

      const parcelasCompletas = parcelasData.map(parcela => {
        const comprador = compradoresData?.find(c => c.id === parcela.comprador_id);
        const contrato = contratosData?.find(c => c.id === parcela.contrato_id);

        return {
          comprador_id: parcela.comprador_id || '',
          comprador_nome: comprador?.nome || 'N/A',
          comprador_telefone: comprador?.telefone || 'N/A',
          comprador_email: comprador?.email || 'N/A',
          comprador_quadra: comprador?.quadra || 'N/A',
          comprador_lote: comprador?.lote || 'N/A',
          comprador_grupo: comprador?.grupo || 'N/A',
          comprador_empreendimento: comprador?.empreendimento || 'N/A',
          comprador_tipo_classificado: comprador?.tipo_classificado || 'N/A',
          contrato_id: parcela.contrato_id || 0,
          contrato_data: contrato?.data_contrato || 'N/A',
          contrato_area_m2: contrato?.area_m2 || 0,
          contrato_valor_total: contrato?.valor_total || 0,
          parcela_id: parcela.id,
          tipo_parcela: parcela.tipo_parcela || 'N/A',
          numero_parcela: parcela.numero_parcela || 0,
          vencimento_parcela: parcela.data_vencimento || 'N/A',
          valor_parcela: parcela.valor_parcela || 0,
          situacao: parcela.situacao || 'N/A',
          data_recebimento: parcela.data_recebimento || null,
          desconto: parcela.valor_desconto || 0,
          juros: parcela.valor_juros || 0,
          valor_pago: parcela.valor_pago || null,
        };
      });

      setParcelas(parcelasCompletas);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setIsLoading(false);
    }
  };

  const parcelasFiltradas = parcelas.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    return (
      p.comprador_nome?.toLowerCase().includes(searchLower) ||
      p.comprador_email?.toLowerCase().includes(searchLower) ||
      p.comprador_telefone?.toLowerCase().includes(searchLower) ||
      p.comprador_quadra?.toLowerCase().includes(searchLower) ||
      p.comprador_lote?.toLowerCase().includes(searchLower)
    );
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const stats = {
    totalParcelas: parcelas.length,
    valorTotal: parcelas.reduce((sum, p) => sum + (p.valor_parcela || 0), 0),
    valorPago: parcelas.reduce((sum, p) => sum + (p.valor_pago || 0), 0),
    
    parcelasPagas: parcelas.filter(p => p.situacao === 'PAGO').length,
    pagamentosRealizados: parcelas.reduce((sum, p) => 
      p.situacao === 'PAGO' ? sum + (p.valor_pago || 0) : sum, 0
    ),
    
    parcelasAVencer: parcelas.filter(p => {
      if (p.situacao === 'PAGO') return false;
      const vencimento = new Date(p.vencimento_parcela);
      return vencimento >= hoje;
    }).length,
    valorAVencer: parcelas.reduce((sum, p) => {
      if (p.situacao === 'PAGO') return sum;
      const vencimento = new Date(p.vencimento_parcela);
      return vencimento >= hoje ? sum + (p.valor_parcela || 0) : sum;
    }, 0),
    
    parcelasVencidas: parcelas.filter(p => {
      if (p.situacao === 'PAGO') return false;
      const vencimento = new Date(p.vencimento_parcela);
      return vencimento < hoje;
    }).length,
    valorVencido: parcelas.reduce((sum, p) => {
      if (p.situacao === 'PAGO') return sum;
      const vencimento = new Date(p.vencimento_parcela);
      return vencimento < hoje ? sum + (p.valor_parcela || 0) : sum;
    }, 0),
    
    saldoDevedor: parcelas.reduce((sum, p) => {
      if (p.situacao === 'PAGO') return sum;
      return sum + (p.valor_parcela || 0);
    }, 0),
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  const handleExportar = () => {
    const dados = parcelasFiltradas.map(p => ({
      'Nome': p.comprador_nome,
      'Telefone': p.comprador_telefone,
      'Email': p.comprador_email,
      'Quadra': p.comprador_quadra,
      'Lote': p.comprador_lote,
      'Grupo': p.comprador_grupo,
      'Empreendimento': p.comprador_empreendimento,
      'Tipo': p.comprador_tipo_classificado,
      'Data Contrato': formatDate(p.contrato_data),
      'Área (m²)': p.contrato_area_m2,
      'Valor Contrato': p.contrato_valor_total,
      'Tipo Parcela': p.tipo_parcela,
      'Nº Parcela': p.numero_parcela,
      'Vencimento': formatDate(p.vencimento_parcela),
      'Valor': p.valor_parcela,
      'Situação': p.situacao,
      'Data Recebimento': formatDate(p.data_recebimento),
      'Desconto': p.desconto,
      'Juros': p.juros,
      'Valor Pago': p.valor_pago || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Financeiro');
    XLSX.writeFile(wb, `financeiro_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Dados exportados com sucesso!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Financeiro COHAPM</h2>
        <p className="text-muted-foreground">
          Gestão completa de contratos e parcelas
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos Realizados</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pagamentosRealizados)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.parcelasPagas} parcelas pagas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Vencer</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.valorAVencer)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.parcelasAVencer} parcelas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.valorVencido)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.parcelasVencidas} parcelas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Devedor</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.saldoDevedor)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total pendente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.valorTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalParcelas} parcelas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Pagamento</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalParcelas > 0 
                ? ((stats.parcelasPagas / stats.totalParcelas) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Do total
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Parcelas Financeiras</CardTitle>
              <CardDescription>
                Visualize e gerencie todas as parcelas dos contratos
              </CardDescription>
            </div>
            <Button onClick={handleExportar} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone, quadra ou lote..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Quadra</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data Contrato</TableHead>
                  <TableHead>Área (m²)</TableHead>
                  <TableHead>Valor Contrato</TableHead>
                  <TableHead>Tipo Parcela</TableHead>
                  <TableHead>Nº</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Data Receb.</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Juros</TableHead>
                  <TableHead>Honorários</TableHead>
                  <TableHead>Valor Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={21} className="text-center py-8 text-muted-foreground">
                      Nenhuma parcela encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  parcelasFiltradas.map((parcela) => (
                    <TableRow key={`${parcela.parcela_id}`}>
                      <TableCell className="font-medium">{parcela.comprador_nome}</TableCell>
                      <TableCell>{parcela.comprador_telefone}</TableCell>
                      <TableCell>{parcela.comprador_email}</TableCell>
                      <TableCell>{parcela.comprador_quadra}</TableCell>
                      <TableCell>{parcela.comprador_lote}</TableCell>
                      <TableCell>{parcela.comprador_grupo}</TableCell>
                      <TableCell>{parcela.comprador_empreendimento}</TableCell>
                      <TableCell>{parcela.comprador_tipo_classificado}</TableCell>
                      <TableCell>{formatDate(parcela.contrato_data)}</TableCell>
                      <TableCell>{parcela.contrato_area_m2}</TableCell>
                      <TableCell>{formatCurrency(parcela.contrato_valor_total)}</TableCell>
                      <TableCell>{parcela.tipo_parcela}</TableCell>
                      <TableCell>{parcela.numero_parcela}</TableCell>
                      <TableCell>{formatDate(parcela.vencimento_parcela)}</TableCell>
                      <TableCell>{formatCurrency(parcela.valor_parcela)}</TableCell>
                      <TableCell>
                        <Badge variant={parcela.situacao === 'PAGO' ? 'default' : 'secondary'}>
                          {parcela.situacao}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(parcela.data_recebimento)}</TableCell>
                      <TableCell>{formatCurrency(parcela.desconto)}</TableCell>
                      <TableCell>{formatCurrency(parcela.juros)}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{formatCurrency(parcela.valor_pago || 0)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
