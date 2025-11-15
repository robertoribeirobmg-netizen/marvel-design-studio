import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Building2, FileText, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinanceiroCooperadoDashboardProps {
  userId: string;
}

export function FinanceiroCooperadoDashboard({ userId }: FinanceiroCooperadoDashboardProps) {
  const [profile, setProfile] = useState<any>(null);
  const [comprador, setComprador] = useState<any>(null);
  const [contratos, setContratos] = useState<any[]>([]);
  const [parcelasCohapm, setParcelasCohapm] = useState<any[]>([]);
  const [investimentos, setInvestimentos] = useState<any[]>([]);
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Buscar perfil do cooperado
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Buscar comprador vinculado
      const { data: compradorData, error: compradorError } = await supabase
        .from('compradores_cohapm')
        .select('*')
        .eq('profile_id', userId)
        .maybeSingle();

      if (compradorError) throw compradorError;
      setComprador(compradorData);

      if (compradorData) {
        // Buscar contratos do comprador
        const { data: contratosData, error: contratosError } = await supabase
          .from('contratos_cohapm')
          .select('*')
          .eq('comprador_id', compradorData.id)
          .order('data_contrato', { ascending: false });

        if (contratosError) throw contratosError;
        setContratos(contratosData || []);

        // Buscar parcelas COHAPM
        const { data: parcelasCohapmData, error: parcelasCohapmError } = await supabase
          .from('parcelas_cohapm')
          .select('*')
          .eq('comprador_id', compradorData.id)
          .order('data_vencimento');

        if (parcelasCohapmError) throw parcelasCohapmError;
        setParcelasCohapm(parcelasCohapmData || []);
      }

      // Buscar investimentos do cooperado
      const { data: investimentosData, error: investimentosError } = await supabase
        .from('investimentos')
        .select('*')
        .eq('user_id', userId)
        .order('data_inicio', { ascending: false });

      if (investimentosError) throw investimentosError;
      setInvestimentos(investimentosData || []);

      // Buscar parcelas dos investimentos
      if (investimentosData && investimentosData.length > 0) {
        const investimentoIds = investimentosData.map(i => i.id);
        const { data: parcelasData, error: parcelasError } = await supabase
          .from('parcelas')
          .select('*')
          .in('investimento_id', investimentoIds)
          .order('data_vencimento');

        if (parcelasError) throw parcelasError;
        setParcelas(parcelasData || []);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'pago': { label: 'Pago', variant: 'default' },
      'pendente': { label: 'Pendente', variant: 'secondary' },
      'vencida': { label: 'Vencida', variant: 'destructive' },
      'renegociada': { label: 'Renegociada', variant: 'outline' }
    };

    const statusInfo = statusMap[status?.toLowerCase()] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const calcularDiasAtraso = (dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = parseISO(dataVencimento);
    return Math.max(0, differenceInDays(hoje, vencimento));
  };

  const statsInvestimentos = {
    valorTotal: investimentos.reduce((sum, inv) => sum + (inv.valor_total || 0), 0),
    valorPago: parcelas.filter(p => p.status === 'pago').reduce((sum, p) => sum + (p.valor_pago || 0), 0),
    valorPendente: parcelas.filter(p => p.status === 'pendente' || p.status === 'vencida').reduce((sum, p) => sum + (p.valor_parcela || 0), 0),
    parcelasAtrasadas: parcelas.filter(p => p.status === 'vencida').length
  };

  const statsCohapm = {
    valorTotal: contratos.reduce((sum, c) => sum + (c.valor_total || 0), 0),
    valorPago: parcelasCohapm.filter(p => p.status === 'pago').reduce((sum, p) => sum + (p.valor_pago || 0), 0),
    valorPendente: parcelasCohapm.filter(p => p.status === 'pendente' || p.status === 'atrasada').reduce((sum, p) => sum + (p.valor_parcela || 0), 0),
    parcelasAtrasadas: parcelasCohapm.filter(p => p.status === 'atrasada').length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Minha Área Financeira</h2>
        <p className="text-muted-foreground">Acompanhe seus investimentos e contratos</p>
      </div>

      {/* Dados Cadastrais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados Cadastrais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome Completo</p>
              <p className="font-medium">{profile?.nome_completo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{profile?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPF</p>
              <p className="font-medium">{profile?.cpf || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium">{profile?.telefone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quadra / Lote</p>
              <p className="font-medium">
                {profile?.quadra && profile?.lote ? `${profile.quadra} / ${profile.lote}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fase</p>
              <p className="font-medium">{profile?.fase || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comprador Vinculado */}
      {comprador && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados do Comprador COHAPM
            </CardTitle>
            <CardDescription>Informações do comprador vinculado ao seu perfil</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{comprador.nome}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                <p className="font-medium">{comprador.cpf_cnpj || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{comprador.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{comprador.telefone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Grupo</p>
                <p className="font-medium">{comprador.grupo || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{comprador.tipo_classificado || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs de Financeiro */}
      <Tabs defaultValue="investimentos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="investimentos">Meus Investimentos</TabsTrigger>
          <TabsTrigger value="cohapm" disabled={!comprador}>Contratos COHAPM</TabsTrigger>
        </TabsList>

        {/* Tab Investimentos */}
        <TabsContent value="investimentos" className="space-y-4">
          {/* Stats Investimentos */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsInvestimentos.valorTotal)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Valor Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsInvestimentos.valorPago)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsInvestimentos.valorPendente)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Parcelas Atrasadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {statsInvestimentos.parcelasAtrasadas}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Investimentos */}
          {investimentos.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Nenhum investimento encontrado
              </CardContent>
            </Card>
          ) : (
            investimentos.map(investimento => {
              const parcelasInvestimento = parcelas.filter(p => p.investimento_id === investimento.id);
              return (
                <Card key={investimento.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Investimento - {format(parseISO(investimento.data_inicio), "dd/MM/yyyy")}
                      </span>
                      <span className="text-lg">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(investimento.valor_total)}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      {investimento.numero_parcelas} parcelas de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(investimento.valor_parcela)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parcela</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Pagamento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parcelasInvestimento.map(parcela => {
                            const diasAtraso = parcela.status === 'vencida' ? calcularDiasAtraso(parcela.data_vencimento) : 0;
                            return (
                              <TableRow key={parcela.id}>
                                <TableCell>{parcela.numero_parcela}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {format(parseISO(parcela.data_vencimento), "dd/MM/yyyy")}
                                    {diasAtraso > 0 && (
                                      <Badge variant="destructive" className="text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {diasAtraso}d
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcela.valor_parcela)}
                                </TableCell>
                                <TableCell>{getStatusBadge(parcela.status)}</TableCell>
                                <TableCell>
                                  {parcela.data_pagamento ? format(parseISO(parcela.data_pagamento), "dd/MM/yyyy") : '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Tab COHAPM */}
        <TabsContent value="cohapm" className="space-y-4">
          {/* Stats COHAPM */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsCohapm.valorTotal)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Valor Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsCohapm.valorPago)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsCohapm.valorPendente)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Parcelas Atrasadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {statsCohapm.parcelasAtrasadas}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Contratos */}
          {contratos.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Nenhum contrato encontrado
              </CardContent>
            </Card>
          ) : (
            contratos.map(contrato => {
              const parcelasContrato = parcelasCohapm.filter(p => p.contrato_id === contrato.id);
              return (
                <Card key={contrato.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Contrato {contrato.numero_contrato}
                      </span>
                      <span className="text-lg">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contrato.valor_total)}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Quadra {contrato.quadra} / Lote {contrato.lote} - {contrato.area_m2}m²
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parcela</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Pagamento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parcelasContrato.map(parcela => {
                            const diasAtraso = parcela.dias_atraso || 0;
                            return (
                              <TableRow key={parcela.id}>
                                <TableCell>{parcela.numero_parcela}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {parcela.data_vencimento ? format(parseISO(parcela.data_vencimento), "dd/MM/yyyy") : '-'}
                                    {diasAtraso > 0 && (
                                      <Badge variant="destructive" className="text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {diasAtraso}d
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcela.valor_parcela)}
                                </TableCell>
                                <TableCell>{getStatusBadge(parcela.status)}</TableCell>
                                <TableCell>
                                  {parcela.data_pagamento ? format(parseISO(parcela.data_pagamento), "dd/MM/yyyy") : '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
