import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, DollarSign, Users, FileText, TrendingUp, Link as LinkIcon, Unlink } from 'lucide-react';
import { toast } from 'sonner';

interface Cooperado {
  id: string;
  nome_completo: string;
  email: string;
  cpf: string;
  telefone: string;
  quadra: string;
  lote: string;
  comprador_vinculado?: {
    id: string;
    nome: string;
    cpf_cnpj: string;
    contratos_count: number;
    valor_total_contratos: number;
  };
  investimentos: {
    total: number;
    valor_total: number;
  };
  parcelas_pendentes: number;
  valor_pendente: number;
}

export function FinanceiroAdminDashboard() {
  const [cooperados, setCooperados] = useState<Cooperado[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCooperado, setSelectedCooperado] = useState<string | null>(null);
  const [compradores, setCompradores] = useState<any[]>([]);
  const [showVincularDialog, setShowVincularDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Buscar perfis (cooperados)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('nome_completo');

      if (profilesError) throw profilesError;

      // Buscar compradores vinculados
      const { data: compradoresData, error: compradoresError } = await supabase
        .from('compradores_cohapm')
        .select('*');

      if (compradoresError) throw compradoresError;

      // Buscar investimentos
      const { data: investimentos, error: investimentosError } = await supabase
        .from('investimentos')
        .select('*');

      if (investimentosError) throw investimentosError;

      // Buscar parcelas pendentes
      const { data: parcelas, error: parcelasError } = await supabase
        .from('parcelas')
        .select('*')
        .in('status', ['pendente', 'vencida']);

      if (parcelasError) throw parcelasError;

      // Buscar contratos COHAPM
      const { data: contratos, error: contratosError } = await supabase
        .from('contratos_cohapm')
        .select('*');

      if (contratosError) throw contratosError;

      // Montar dados dos cooperados
      const cooperadosData: Cooperado[] = profiles.map(profile => {
        const comprador = compradoresData.find(c => c.profile_id === profile.id);
        const investimentosCooperado = investimentos.filter(i => i.user_id === profile.id);
        const parcelasCooperado = parcelas.filter(p => 
          investimentosCooperado.some(inv => inv.id === p.investimento_id)
        );

        let compradorVinculado;
        if (comprador) {
          const contratosComprador = contratos.filter(c => c.comprador_id === comprador.id);
          compradorVinculado = {
            id: comprador.id,
            nome: comprador.nome,
            cpf_cnpj: comprador.cpf_cnpj,
            contratos_count: contratosComprador.length,
            valor_total_contratos: contratosComprador.reduce((sum, c) => sum + (c.valor_total || 0), 0)
          };
        }

        return {
          id: profile.id,
          nome_completo: profile.nome_completo,
          email: profile.email,
          cpf: profile.cpf,
          telefone: profile.telefone,
          quadra: profile.quadra,
          lote: profile.lote,
          comprador_vinculado: compradorVinculado,
          investimentos: {
            total: investimentosCooperado.length,
            valor_total: investimentosCooperado.reduce((sum, i) => sum + (i.valor_total || 0), 0)
          },
          parcelas_pendentes: parcelasCooperado.length,
          valor_pendente: parcelasCooperado.reduce((sum, p) => sum + (p.valor_parcela || 0), 0)
        };
      });

      setCooperados(cooperadosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompradoresDisponiveis = async () => {
    try {
      const { data, error } = await supabase
        .from('compradores_cohapm')
        .select('*')
        .is('profile_id', null)
        .order('nome');

      if (error) throw error;
      setCompradores(data || []);
    } catch (error) {
      console.error('Erro ao carregar compradores:', error);
      toast.error('Erro ao carregar compradores disponíveis');
    }
  };

  const handleVincular = async (compradorId: string) => {
    if (!selectedCooperado) return;

    try {
      const { error } = await supabase
        .from('compradores_cohapm')
        .update({ profile_id: selectedCooperado })
        .eq('id', compradorId);

      if (error) throw error;

      toast.success('Comprador vinculado com sucesso!');
      setShowVincularDialog(false);
      loadData();
    } catch (error) {
      console.error('Erro ao vincular:', error);
      toast.error('Erro ao vincular comprador');
    }
  };

  const handleDesvincular = async (compradorId: string) => {
    try {
      const { error } = await supabase
        .from('compradores_cohapm')
        .update({ profile_id: null })
        .eq('id', compradorId);

      if (error) throw error;

      toast.success('Comprador desvinculado com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao desvincular:', error);
      toast.error('Erro ao desvincular comprador');
    }
  };

  const cooperadosFiltrados = cooperados.filter(c =>
    c.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf?.includes(searchTerm) ||
    c.comprador_vinculado?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalCooperados: cooperados.length,
    cooperadosVinculados: cooperados.filter(c => c.comprador_vinculado).length,
    totalInvestimentos: cooperados.reduce((sum, c) => sum + c.investimentos.valor_total, 0),
    totalPendente: cooperados.reduce((sum, c) => sum + c.valor_pendente, 0)
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
        <h2 className="text-3xl font-bold">Gestão Financeira</h2>
        <p className="text-muted-foreground">Gerencie cooperados, compradores e transações financeiras</p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cooperados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCooperados}</div>
            <p className="text-xs text-muted-foreground">
              {stats.cooperadosVinculados} vinculados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalInvestimentos)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalPendente)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos COHAPM</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cooperados.reduce((sum, c) => sum + (c.comprador_vinculado?.contratos_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Cooperados e Vinculações</CardTitle>
          <CardDescription>Gerencie cooperados e suas vinculações com compradores COHAPM</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cooperado</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Comprador Vinculado</TableHead>
                  <TableHead>Investimentos</TableHead>
                  <TableHead>Pendente</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cooperadosFiltrados.map(cooperado => (
                  <TableRow key={cooperado.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{cooperado.nome_completo}</div>
                        <div className="text-sm text-muted-foreground">{cooperado.cpf}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{cooperado.email}</div>
                        <div className="text-muted-foreground">{cooperado.telefone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cooperado.quadra && cooperado.lote ? (
                        <Badge variant="outline">{cooperado.quadra} / {cooperado.lote}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cooperado.comprador_vinculado ? (
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{cooperado.comprador_vinculado.nome}</div>
                          <div className="text-xs text-muted-foreground">{cooperado.comprador_vinculado.cpf_cnpj}</div>
                          <Badge variant="secondary" className="text-xs">
                            {cooperado.comprador_vinculado.contratos_count} contrato(s)
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Não vinculado</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cooperado.investimentos.valor_total)}
                        </div>
                        <div className="text-muted-foreground">{cooperado.investimentos.total} investimento(s)</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium text-orange-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cooperado.valor_pendente)}
                        </div>
                        <div className="text-muted-foreground">{cooperado.parcelas_pendentes} parcela(s)</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cooperado.comprador_vinculado ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDesvincular(cooperado.comprador_vinculado!.id)}
                        >
                          <Unlink className="h-4 w-4 mr-1" />
                          Desvincular
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCooperado(cooperado.id);
                            loadCompradoresDisponiveis();
                            setShowVincularDialog(true);
                          }}
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Vincular
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Vinculação */}
      <Dialog open={showVincularDialog} onOpenChange={setShowVincularDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vincular Comprador</DialogTitle>
            <DialogDescription>
              Selecione um comprador COHAPM para vincular ao cooperado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {compradores.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum comprador disponível para vinculação
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compradores.map(comprador => (
                      <TableRow key={comprador.id}>
                        <TableCell>{comprador.nome}</TableCell>
                        <TableCell>{comprador.cpf_cnpj}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleVincular(comprador.id)}
                          >
                            Vincular
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
