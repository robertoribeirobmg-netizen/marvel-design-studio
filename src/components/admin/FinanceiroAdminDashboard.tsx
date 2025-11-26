import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, DollarSign, FileText, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Parcela {
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
  contrato_id: number;
  contrato_data: string;
  contrato_area_m2: number;
  contrato_valor_total: number;
}

interface CooperadoFinanceiro {
  comprador_id: string;
  comprador_nome: string;
  comprador_telefone: string;
  comprador_email: string;
  comprador_quadra: string;
  comprador_lote: string;
  comprador_grupo: string;
  comprador_empreendimento: string;
  comprador_tipo_classificado: string;
  parcelas: Parcela[];
}

export function FinanceiroAdminDashboard() {
  const [cooperados, setCooperados] = useState<CooperadoFinanceiro[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
        setCooperados([]);
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

      // Agrupar parcelas por cooperado
      const cooperadosMap = new Map<string, CooperadoFinanceiro>();

      parcelasData.forEach(parcela => {
        const comprador = compradoresData?.find(c => c.id === parcela.comprador_id);
        const contrato = contratosData?.find(c => c.id === parcela.contrato_id);

        if (!comprador) return;

        const compradorId = parcela.comprador_id || '';

        if (!cooperadosMap.has(compradorId)) {
          cooperadosMap.set(compradorId, {
            comprador_id: compradorId,
            comprador_nome: comprador.nome || 'N/A',
            comprador_telefone: comprador.telefone || 'N/A',
            comprador_email: comprador.email || 'N/A',
            comprador_quadra: comprador.quadra || 'N/A',
            comprador_lote: comprador.lote || 'N/A',
            comprador_grupo: comprador.grupo || 'N/A',
            comprador_empreendimento: comprador.empreendimento || 'N/A',
            comprador_tipo_classificado: comprador.tipo_classificado || 'N/A',
            parcelas: [],
          });
        }

        cooperadosMap.get(compradorId)!.parcelas.push({
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
          contrato_id: parcela.contrato_id || 0,
          contrato_data: contrato?.data_contrato || 'N/A',
          contrato_area_m2: contrato?.area_m2 || 0,
          contrato_valor_total: contrato?.valor_total || 0,
        });
      });

      setCooperados(Array.from(cooperadosMap.values()));
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setIsLoading(false);
    }
  };

  const cooperadosFiltrados = cooperados.filter(cooperado => {
    const searchLower = searchTerm.toLowerCase();
    return (
      cooperado.comprador_nome.toLowerCase().includes(searchLower) ||
      cooperado.comprador_email.toLowerCase().includes(searchLower) ||
      cooperado.comprador_telefone.toLowerCase().includes(searchLower) ||
      cooperado.comprador_quadra.toLowerCase().includes(searchLower) ||
      cooperado.comprador_lote.toLowerCase().includes(searchLower)
    );
  });

  const toggleRow = (compradorId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(compradorId)) {
        newSet.delete(compradorId);
      } else {
        newSet.add(compradorId);
      }
      return newSet;
    });
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Calcular estatísticas de todas as parcelas
  const todasParcelas = cooperados.flatMap(c => c.parcelas);

  const stats = {
    totalParcelas: todasParcelas.length,
    valorTotal: todasParcelas.reduce((sum, p) => sum + (p.valor_parcela || 0), 0),
    valorPago: todasParcelas.reduce((sum, p) => sum + (p.valor_pago || 0), 0),
    
    parcelasPagas: todasParcelas.filter(p => p.situacao === 'PAGO').length,
    pagamentosRealizados: todasParcelas.reduce((sum, p) => 
      p.situacao === 'PAGO' ? sum + (p.valor_pago || 0) : sum, 0
    ),
    
    parcelasAVencer: todasParcelas.filter(p => {
      if (p.situacao === 'PAGO') return false;
      const vencimento = new Date(p.vencimento_parcela);
      return vencimento >= hoje;
    }).length,
    valorAVencer: todasParcelas.reduce((sum, p) => {
      if (p.situacao === 'PAGO') return sum;
      const vencimento = new Date(p.vencimento_parcela);
      return vencimento >= hoje ? sum + (p.valor_parcela || 0) : sum;
    }, 0),
    
    parcelasVencidas: todasParcelas.filter(p => {
      if (p.situacao === 'PAGO') return false;
      const vencimento = new Date(p.vencimento_parcela);
      return vencimento < hoje;
    }).length,
    valorVencido: todasParcelas.reduce((sum, p) => {
      if (p.situacao === 'PAGO') return sum;
      const vencimento = new Date(p.vencimento_parcela);
      return vencimento < hoje ? sum + (p.valor_parcela || 0) : sum;
    }, 0),
    
    saldoDevedor: todasParcelas.reduce((sum, p) => {
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
    const dados: any[] = [];
    
    cooperadosFiltrados.forEach(cooperado => {
      cooperado.parcelas.forEach(parcela => {
        dados.push({
          'Nome': cooperado.comprador_nome,
          'Telefone': cooperado.comprador_telefone,
          'Email': cooperado.comprador_email,
          'Quadra': cooperado.comprador_quadra,
          'Lote': cooperado.comprador_lote,
          'Grupo': cooperado.comprador_grupo,
          'Empreendimento': cooperado.comprador_empreendimento,
          'Tipo': cooperado.comprador_tipo_classificado,
          'Data Contrato': formatDate(parcela.contrato_data),
          'Área (m²)': parcela.contrato_area_m2,
          'Valor Contrato': parcela.contrato_valor_total,
          'Tipo Parcela': parcela.tipo_parcela,
          'Nº Parcela': parcela.numero_parcela,
          'Vencimento': formatDate(parcela.vencimento_parcela),
          'Valor': parcela.valor_parcela,
          'Situação': parcela.situacao,
          'Data Recebimento': formatDate(parcela.data_recebimento),
          'Desconto': parcela.desconto,
          'Juros': parcela.juros,
          'Valor Pago': parcela.valor_pago || 0,
        });
      });
    });

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
              <CardTitle>Financeiro do Cooperado</CardTitle>
              <CardDescription>
                Detalhamento completo de contratos e parcelas por cooperado
              </CardDescription>
            </div>
            <Button onClick={handleExportar} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, telefone, quadra ou lote..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Quadra</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Empreendimento</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cooperadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'Nenhum cooperado encontrado com os critérios de busca.' : 'Nenhum cooperado registrado.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  cooperadosFiltrados.map((cooperado) => {
                    const isExpanded = expandedRows.has(cooperado.comprador_id);
                    return (
                      <Collapsible key={cooperado.comprador_id} open={isExpanded} asChild>
                        <>
                          <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(cooperado.comprador_id)}>
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell className="font-medium">{cooperado.comprador_nome}</TableCell>
                            <TableCell>{cooperado.comprador_telefone}</TableCell>
                            <TableCell>{cooperado.comprador_email}</TableCell>
                            <TableCell>{cooperado.comprador_quadra}</TableCell>
                            <TableCell>{cooperado.comprador_lote}</TableCell>
                            <TableCell>{cooperado.comprador_grupo}</TableCell>
                            <TableCell>{cooperado.comprador_empreendimento}</TableCell>
                            <TableCell>{cooperado.comprador_tipo_classificado}</TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={9} className="p-0 bg-muted/30">
                                <div className="p-4">
                                  <h4 className="font-semibold mb-3 text-sm">Parcelas e Contratos</h4>
                                  <div className="rounded-md border overflow-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="text-xs">Data Contrato</TableHead>
                                          <TableHead className="text-xs">Área (m²)</TableHead>
                                          <TableHead className="text-xs">Valor Contrato</TableHead>
                                          <TableHead className="text-xs">Tipo Parcela</TableHead>
                                          <TableHead className="text-xs">Nº</TableHead>
                                          <TableHead className="text-xs">Vencimento</TableHead>
                                          <TableHead className="text-xs">Valor</TableHead>
                                          <TableHead className="text-xs">Situação</TableHead>
                                          <TableHead className="text-xs">Data Receb.</TableHead>
                                          <TableHead className="text-xs">Desconto</TableHead>
                                          <TableHead className="text-xs">Juros</TableHead>
                                          <TableHead className="text-xs">Honorários</TableHead>
                                          <TableHead className="text-xs">Valor Pago</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {cooperado.parcelas.map((parcela) => (
                                          <TableRow key={parcela.parcela_id}>
                                            <TableCell className="text-xs">{formatDate(parcela.contrato_data)}</TableCell>
                                            <TableCell className="text-xs">{parcela.contrato_area_m2}</TableCell>
                                            <TableCell className="text-xs">{formatCurrency(parcela.contrato_valor_total)}</TableCell>
                                            <TableCell className="text-xs">{parcela.tipo_parcela}</TableCell>
                                            <TableCell className="text-xs">{parcela.numero_parcela}</TableCell>
                                            <TableCell className="text-xs">{formatDate(parcela.vencimento_parcela)}</TableCell>
                                            <TableCell className="text-xs">{formatCurrency(parcela.valor_parcela)}</TableCell>
                                            <TableCell className="text-xs">
                                              <Badge variant={parcela.situacao === 'PAGO' ? 'default' : 'secondary'} className="text-xs">
                                                {parcela.situacao}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs">{formatDate(parcela.data_recebimento)}</TableCell>
                                            <TableCell className="text-xs">{formatCurrency(parcela.desconto)}</TableCell>
                                            <TableCell className="text-xs">{formatCurrency(parcela.juros)}</TableCell>
                                            <TableCell className="text-xs">-</TableCell>
                                            <TableCell className="text-xs">{formatCurrency(parcela.valor_pago || 0)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
