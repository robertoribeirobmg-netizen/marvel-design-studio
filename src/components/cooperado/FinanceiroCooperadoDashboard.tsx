import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface FinanceiroCooperadoDashboardProps {
  userId: string;
}

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

export function FinanceiroCooperadoDashboard({ userId }: FinanceiroCooperadoDashboardProps) {
  const [parcelas, setParcelas] = useState<ParcelaFinanceira[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const { data: compradorData, error: compradorError } = await supabase
        .from('compradores_cohapm')
        .select('id, nome, telefone, email, quadra, lote, grupo, empreendimento, tipo_classificado')
        .eq('profile_id', userId)
        .maybeSingle();

      if (compradorError) throw compradorError;

      if (!compradorData) {
        setParcelas([]);
        setIsLoading(false);
        return;
      }

      const { data: contratosData, error: contratosError } = await supabase
        .from('contratos_cohapm')
        .select('id, data_contrato, area_m2, valor_total')
        .eq('comprador_id', compradorData.id);

      if (contratosError) throw contratosError;

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
          contrato_id
        `)
        .eq('comprador_id', compradorData.id)
        .order('data_vencimento', { ascending: false });

      if (parcelasError) throw parcelasError;

      const parcelasCompletas = (parcelasData || []).map(parcela => {
        const contrato = contratosData?.find(c => c.id === parcela.contrato_id);

        return {
          comprador_id: compradorData.id,
          comprador_nome: compradorData.nome,
          comprador_telefone: compradorData.telefone || 'N/A',
          comprador_email: compradorData.email || 'N/A',
          comprador_quadra: compradorData.quadra || 'N/A',
          comprador_lote: compradorData.lote || 'N/A',
          comprador_grupo: compradorData.grupo || 'N/A',
          comprador_empreendimento: compradorData.empreendimento || 'N/A',
          comprador_tipo_classificado: compradorData.tipo_classificado || 'N/A',
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
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    totalParcelas: parcelas.length,
    valorTotal: parcelas.reduce((sum, p) => sum + (p.valor_parcela || 0), 0),
    valorPago: parcelas.reduce((sum, p) => sum + (p.valor_pago || 0), 0),
    valorPendente: parcelas.reduce((sum, p) => sum + ((p.valor_pago ? 0 : p.valor_parcela) || 0), 0),
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (parcelas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Nenhum dado financeiro encontrado para sua conta.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Minha Área Financeira</h2>
        <p className="text-muted-foreground">
          Acompanhe suas parcelas e contratos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parcelas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParcelas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.valorTotal)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Pago</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.valorPago)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.valorPendente)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Minhas Parcelas</CardTitle>
          <CardDescription>
            Detalhamento completo das suas parcelas e contratos
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                {parcelas.map((parcela) => (
                  <TableRow key={parcela.parcela_id}>
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
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
