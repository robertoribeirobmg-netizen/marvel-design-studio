import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Search, Users, FileText, Trash2, Link as LinkIcon, Eye } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CompradorCohapm {
  id: string;
  nome: string;
  cpf_cnpj: string;
  telefone: string;
  grupo: string;
  tipo: string;
  empreendimento: string;
  profile_id: string | null;
  created_at: string;
  contratos_count?: number;
  parcelas_count?: number;
}

interface Contrato {
  id: number;
  numero_contrato: string;
  data_contrato: string;
  valor_total: number;
  status: string;
  quadra: string;
  lote: string;
}

interface Parcela {
  id: number;
  numero_parcela: number;
  data_vencimento: string;
  valor_parcela: number;
  status: string;
  data_pagamento: string | null;
}

export default function CompradoresCohapm() {
  const navigate = useNavigate();
  const [compradores, setCompradores] = useState<CompradorCohapm[]>([]);
  const [filteredCompradores, setFilteredCompradores] = useState<CompradorCohapm[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedComprador, setSelectedComprador] = useState<string | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    fetchCompradores();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = compradores.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cpf_cnpj.includes(searchTerm) ||
        c.telefone.includes(searchTerm)
      );
      setFilteredCompradores(filtered);
    } else {
      setFilteredCompradores(compradores);
    }
  }, [searchTerm, compradores]);

  const fetchCompradores = async () => {
    setIsLoading(true);
    
    // Buscar compradores
    const { data: compradoresData, error } = await supabase
      .from('compradores_cohapm')
      .select('*')
      .order('nome');

    if (error) {
      console.error('Erro ao carregar compradores:', error);
      toast.error('Erro ao carregar compradores');
      setIsLoading(false);
      return;
    }

    // Buscar contagem de contratos e parcelas
    const compradorIds = compradoresData?.map(c => c.id) || [];
    
    const { data: contratosCount } = await supabase
      .from('contratos_cohapm')
      .select('comprador_id')
      .in('comprador_id', compradorIds);

    const { data: parcelasCount } = await supabase
      .from('parcelas_cohapm')
      .select('comprador_id')
      .in('comprador_id', compradorIds);

    // Mapear contagens
    const contratosMap = new Map<string, number>();
    const parcelasMap = new Map<string, number>();

    contratosCount?.forEach(c => {
      contratosMap.set(c.comprador_id, (contratosMap.get(c.comprador_id) || 0) + 1);
    });

    parcelasCount?.forEach(p => {
      parcelasMap.set(p.comprador_id, (parcelasMap.get(p.comprador_id) || 0) + 1);
    });

    const enrichedData = compradoresData?.map(c => ({
      ...c,
      contratos_count: contratosMap.get(c.id) || 0,
      parcelas_count: parcelasMap.get(c.id) || 0,
    })) || [];

    setCompradores(enrichedData);
    setFilteredCompradores(enrichedData);
    setIsLoading(false);
  };

  const fetchCompradorDetails = async (compradorId: string) => {
    setIsLoadingDetails(true);
    
    // Buscar contratos
    const { data: contratosData, error: contratosError } = await supabase
      .from('contratos_cohapm')
      .select('*')
      .eq('comprador_id', compradorId)
      .order('data_contrato', { ascending: false });

    if (contratosError) {
      console.error('Erro ao carregar contratos:', contratosError);
      toast.error('Erro ao carregar contratos');
    } else {
      setContratos(contratosData || []);
    }

    // Buscar parcelas
    const { data: parcelasData, error: parcelasError } = await supabase
      .from('parcelas_cohapm')
      .select('*')
      .eq('comprador_id', compradorId)
      .order('data_vencimento', { ascending: false });

    if (parcelasError) {
      console.error('Erro ao carregar parcelas:', parcelasError);
      toast.error('Erro ao carregar parcelas');
    } else {
      setParcelas(parcelasData || []);
    }

    setIsLoadingDetails(false);
  };

  const handleViewDetails = (compradorId: string) => {
    setSelectedComprador(compradorId);
    fetchCompradorDetails(compradorId);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('compradores_cohapm')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar comprador:', error);
      toast.error('Erro ao deletar comprador');
    } else {
      toast.success('Comprador removido com sucesso');
      fetchCompradores();
    }
    setDeleteId(null);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Nome', 'CPF/CNPJ', 'Telefone', 'Grupo', 'Empreendimento', 'Contratos', 'Parcelas'];
    const rows = filteredCompradores.map(c => [
      c.id,
      c.nome,
      c.cpf_cnpj,
      c.telefone,
      c.grupo || '',
      c.empreendimento,
      c.contratos_count || 0,
      c.parcelas_count || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `compradores_cohapm_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalContratos = compradores.reduce((sum, c) => sum + (c.contratos_count || 0), 0);
  const totalParcelas = compradores.reduce((sum, c) => sum + (c.parcelas_count || 0), 0);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Compradores COHAPM
              </h1>
              <p className="text-muted-foreground">
                Residencial La Felicità - Sistema IBSystemLote
              </p>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <Users className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-2xl font-bold">{compradores.length}</h3>
              <p className="text-sm text-muted-foreground">Total de Compradores</p>
            </Card>

            <Card className="p-6">
              <FileText className="h-8 w-8 text-blue-500 mb-3" />
              <h3 className="text-2xl font-bold">{totalContratos}</h3>
              <p className="text-sm text-muted-foreground">Contratos Importados</p>
            </Card>

            <Card className="p-6">
              <FileText className="h-8 w-8 text-purple-500 mb-3" />
              <h3 className="text-2xl font-bold">{totalParcelas}</h3>
              <p className="text-sm text-muted-foreground">Parcelas Importadas</p>
            </Card>

            <Card className="p-6">
              <LinkIcon className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-2xl font-bold">
                {compradores.filter(c => c.profile_id).length}
              </h3>
              <p className="text-sm text-muted-foreground">Vinculados ao Sistema</p>
            </Card>
          </div>

          <Card className="p-6">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando compradores...
              </div>
            ) : filteredCompradores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Nenhum comprador encontrado' : 'Nenhum comprador importado ainda'}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Contratos</TableHead>
                      <TableHead>Parcelas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompradores.map((comprador) => (
                      <TableRow key={comprador.id}>
                        <TableCell className="font-mono text-sm">{comprador.id}</TableCell>
                        <TableCell className="font-medium">{comprador.nome}</TableCell>
                        <TableCell>{comprador.cpf_cnpj}</TableCell>
                        <TableCell>{comprador.telefone}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{comprador.contratos_count || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{comprador.parcelas_count || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          {comprador.profile_id ? (
                            <Badge className="bg-green-500">Vinculado</Badge>
                          ) : (
                            <Badge variant="secondary">Não vinculado</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(comprador.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(comprador.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este comprador? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!selectedComprador} onOpenChange={() => setSelectedComprador(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Comprador</DialogTitle>
            <DialogDescription>
              {selectedComprador && compradores.find(c => c.id === selectedComprador)?.nome}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <div className="space-y-6">
              {contratos.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Contratos ({contratos.length})</h3>
                  <div className="space-y-2">
                    {contratos.map(contrato => (
                      <Card key={contrato.id} className="p-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><strong>Nº Contrato:</strong> {contrato.numero_contrato || 'N/A'}</div>
                          <div><strong>Data:</strong> {contrato.data_contrato || 'N/A'}</div>
                          <div><strong>Valor Total:</strong> R$ {contrato.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</div>
                          <div><strong>Status:</strong> <Badge>{contrato.status || 'N/A'}</Badge></div>
                          <div><strong>Quadra/Lote:</strong> {contrato.quadra || 'N/A'} / {contrato.lote || 'N/A'}</div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {parcelas.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Parcelas ({parcelas.length})</h3>
                  <div className="rounded-md border max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pagamento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parcelas.map(parcela => (
                          <TableRow key={parcela.id}>
                            <TableCell>{parcela.numero_parcela}</TableCell>
                            <TableCell>{parcela.data_vencimento}</TableCell>
                            <TableCell>R$ {parcela.valor_parcela?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell>
                              <Badge variant={parcela.status === 'Pago' ? 'default' : 'outline'}>
                                {parcela.status || 'Pendente'}
                              </Badge>
                            </TableCell>
                            <TableCell>{parcela.data_pagamento || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {contratos.length === 0 && parcelas.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum contrato ou parcela encontrado para este comprador
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
