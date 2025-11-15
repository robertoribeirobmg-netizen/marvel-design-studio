import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Search, Link2, Unlink, Download, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CompradorCohapm {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  profile_id: string | null;
}

interface Profile {
  id: string;
  nome_completo: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  quadra: string | null;
  lote: string | null;
}

interface Divergencia {
  comprador: CompradorCohapm;
  profile?: Profile;
  tipo: 'vinculado' | 'nao_vinculado' | 'cpf_divergente' | 'dados_divergentes';
  divergencias: string[];
}

export default function ReconciliacaoCohapm() {
  const navigate = useNavigate();
  const [compradores, setCompradores] = useState<CompradorCohapm[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [divergencias, setDivergencias] = useState<Divergencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [compradoresRes, profilesRes] = await Promise.all([
        supabase.from('compradores_cohapm').select('*'),
        supabase.from('profiles').select('*')
      ]);

      if (compradoresRes.error) throw compradoresRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setCompradores(compradoresRes.data || []);
      setProfiles(profilesRes.data || []);
      
      analisarDivergencias(compradoresRes.data || [], profilesRes.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const analisarDivergencias = (comps: CompradorCohapm[], profs: Profile[]) => {
    const divs: Divergencia[] = [];
    const profilesMap = new Map(profs.map(p => [p.id, p]));

    comps.forEach(comprador => {
      const divergenciasList: string[] = [];
      let tipo: Divergencia['tipo'] = 'nao_vinculado';
      let profileVinculado: Profile | undefined;

      if (comprador.profile_id) {
        profileVinculado = profilesMap.get(comprador.profile_id);
        if (profileVinculado) {
          tipo = 'vinculado';

          // Verificar divergências nos dados
          if (comprador.cpf_cnpj && profileVinculado.cpf) {
            const cpfCohapm = comprador.cpf_cnpj.replace(/\D/g, '');
            const cpfProfile = profileVinculado.cpf.replace(/\D/g, '');
            if (cpfCohapm !== cpfProfile) {
              tipo = 'cpf_divergente';
              divergenciasList.push(`CPF divergente: COHAPM=${comprador.cpf_cnpj} vs Sistema=${profileVinculado.cpf}`);
            }
          }

          // Verificar nome
          if (comprador.nome.toLowerCase() !== profileVinculado.nome_completo.toLowerCase()) {
            divergenciasList.push(`Nome divergente: COHAPM="${comprador.nome}" vs Sistema="${profileVinculado.nome_completo}"`);
          }

          // Verificar email
          if (comprador.email && profileVinculado.email) {
            if (comprador.email.toLowerCase() !== profileVinculado.email.toLowerCase()) {
              divergenciasList.push(`Email divergente: COHAPM="${comprador.email}" vs Sistema="${profileVinculado.email}"`);
            }
          }

          // Verificar telefone
          if (comprador.telefone && profileVinculado.telefone) {
            const telCohapm = comprador.telefone.replace(/\D/g, '');
            const telProfile = profileVinculado.telefone.replace(/\D/g, '');
            if (telCohapm !== telProfile) {
              divergenciasList.push(`Telefone divergente: COHAPM="${comprador.telefone}" vs Sistema="${profileVinculado.telefone}"`);
            }
          }

          if (divergenciasList.length > 0 && tipo === 'vinculado') {
            tipo = 'dados_divergentes';
          }
        }
      } else {
        // Tentar encontrar profile pelo CPF
        if (comprador.cpf_cnpj) {
          const cpfBusca = comprador.cpf_cnpj.replace(/\D/g, '');
          profileVinculado = profs.find(p => p.cpf?.replace(/\D/g, '') === cpfBusca);
          if (profileVinculado) {
            divergenciasList.push(`Possível vinculação automática com ${profileVinculado.nome_completo} (CPF: ${profileVinculado.cpf})`);
          }
        }
      }

      divs.push({
        comprador,
        profile: profileVinculado,
        tipo,
        divergencias: divergenciasList
      });
    });

    setDivergencias(divs);
  };

  const vincularComprador = async (compradorId: string, profileId: string) => {
    try {
      const { error } = await supabase
        .from('compradores_cohapm')
        .update({ profile_id: profileId })
        .eq('id', compradorId);

      if (error) throw error;

      toast.success('Comprador vinculado com sucesso!');
      fetchData();
    } catch (error: any) {
      console.error('Erro ao vincular:', error);
      toast.error('Erro ao vincular comprador');
    }
  };

  const desvincularComprador = async (compradorId: string) => {
    try {
      const { error } = await supabase
        .from('compradores_cohapm')
        .update({ profile_id: null })
        .eq('id', compradorId);

      if (error) throw error;

      toast.success('Comprador desvinculado com sucesso!');
      fetchData();
    } catch (error: any) {
      console.error('Erro ao desvincular:', error);
      toast.error('Erro ao desvincular comprador');
    }
  };

  const exportarRelatorio = () => {
    const csv = [
      ['ID', 'Nome COHAPM', 'CPF/CNPJ', 'Status', 'Profile Vinculado', 'Divergências'].join(','),
      ...divergenciasFiltradas.map(d => [
        d.comprador.id,
        `"${d.comprador.nome}"`,
        d.comprador.cpf_cnpj || '',
        d.tipo,
        d.profile?.nome_completo || '',
        `"${d.divergencias.join('; ')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reconciliacao_cohapm_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Relatório exportado com sucesso!');
  };

  const divergenciasFiltradas = divergencias.filter(d => {
    const matchSearch = d.comprador.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       d.comprador.cpf_cnpj?.includes(searchTerm) ||
                       d.profile?.nome_completo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchTipo = filtroTipo === 'todos' || d.tipo === filtroTipo;
    
    return matchSearch && matchTipo;
  });

  const stats = {
    total: compradores.length,
    vinculados: divergencias.filter(d => d.tipo === 'vinculado').length,
    naoVinculados: divergencias.filter(d => d.tipo === 'nao_vinculado').length,
    cpfDivergente: divergencias.filter(d => d.tipo === 'cpf_divergente').length,
    dadosDivergentes: divergencias.filter(d => d.tipo === 'dados_divergentes').length
  };

  const getTipoBadge = (tipo: Divergencia['tipo']) => {
    switch (tipo) {
      case 'vinculado':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Vinculado</Badge>;
      case 'nao_vinculado':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Não Vinculado</Badge>;
      case 'cpf_divergente':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />CPF Divergente</Badge>;
      case 'dados_divergentes':
        return <Badge className="bg-orange-500"><AlertCircle className="w-3 h-3 mr-1" />Dados Divergentes</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Reconciliação de Dados COHAPM
          </h1>
          <p className="text-muted-foreground">
            Compare e vincule dados do sistema COHAPM com cooperados existentes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Vinculados</p>
            <p className="text-2xl font-bold text-green-600">{stats.vinculados}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Não Vinculados</p>
            <p className="text-2xl font-bold text-orange-600">{stats.naoVinculados}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">CPF Divergente</p>
            <p className="text-2xl font-bold text-destructive">{stats.cpfDivergente}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Dados Divergentes</p>
            <p className="text-2xl font-bold text-orange-500">{stats.dadosDivergentes}</p>
          </Card>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-4 py-2 rounded-md border border-input bg-background"
            >
              <option value="todos">Todos os Status</option>
              <option value="vinculado">Vinculados</option>
              <option value="nao_vinculado">Não Vinculados</option>
              <option value="cpf_divergente">CPF Divergente</option>
              <option value="dados_divergentes">Dados Divergentes</option>
            </select>
            <Button onClick={exportarRelatorio} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Comprador COHAPM</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Profile Vinculado</TableHead>
                <TableHead>Divergências</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {divergenciasFiltradas.map((d) => (
                <TableRow key={d.comprador.id}>
                  <TableCell>{getTipoBadge(d.tipo)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{d.comprador.nome}</p>
                      {d.comprador.email && (
                        <p className="text-xs text-muted-foreground">{d.comprador.email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{d.comprador.cpf_cnpj || '-'}</TableCell>
                  <TableCell>
                    {d.profile ? (
                      <div>
                        <p className="font-medium">{d.profile.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.profile.quadra && d.profile.lote ? `${d.profile.quadra}/${d.profile.lote}` : 'Sem lote'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {d.divergencias.length > 0 ? (
                      <div className="space-y-1">
                        {d.divergencias.map((div, idx) => (
                          <Alert key={idx} variant="default" className="py-2">
                            <AlertDescription className="text-xs">{div}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {d.comprador.profile_id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => desvincularComprador(d.comprador.id)}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      ) : d.profile ? (
                        <Button
                          size="sm"
                          onClick={() => vincularComprador(d.comprador.id, d.profile!.id)}
                        >
                          <Link2 className="h-4 w-4 mr-1" />
                          Vincular
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {divergenciasFiltradas.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum resultado encontrado
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
