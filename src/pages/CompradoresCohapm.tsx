import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Search, Users, FileText, Trash2, Link as LinkIcon } from "lucide-react";
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
}

export default function CompradoresCohapm() {
  const navigate = useNavigate();
  const [compradores, setCompradores] = useState<CompradorCohapm[]>([]);
  const [filteredCompradores, setFilteredCompradores] = useState<CompradorCohapm[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
    const { data, error } = await supabase
      .from('compradores_cohapm')
      .select('*')
      .order('nome');

    if (error) {
      console.error('Erro ao carregar compradores:', error);
      toast.error('Erro ao carregar compradores');
    } else {
      setCompradores(data || []);
      setFilteredCompradores(data || []);
    }
    setIsLoading(false);
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
    const headers = ['ID', 'Nome', 'CPF/CNPJ', 'Telefone', 'Grupo', 'Empreendimento'];
    const rows = filteredCompradores.map(c => [
      c.id,
      c.nome,
      c.cpf_cnpj,
      c.telefone,
      c.grupo || '',
      c.empreendimento
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <Users className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-2xl font-bold">{compradores.length}</h3>
              <p className="text-sm text-muted-foreground">Total de Compradores</p>
            </Card>

            <Card className="p-6">
              <LinkIcon className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-2xl font-bold">
                {compradores.filter(c => c.profile_id).length}
              </h3>
              <p className="text-sm text-muted-foreground">Vinculados ao Sistema</p>
            </Card>

            <Card className="p-6">
              <Search className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-2xl font-bold">{filteredCompradores.length}</h3>
              <p className="text-sm text-muted-foreground">Resultados da Busca</p>
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
                      <TableHead>Grupo</TableHead>
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
                          {comprador.grupo ? (
                            <Badge variant="outline">{comprador.grupo}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {comprador.profile_id ? (
                            <Badge className="bg-green-500">Vinculado</Badge>
                          ) : (
                            <Badge variant="secondary">Não vinculado</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(comprador.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
    </div>
  );
}
