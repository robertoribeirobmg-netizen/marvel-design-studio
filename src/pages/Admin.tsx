import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LogOut, UserPlus, Shield, Users, Trash2, Camera, Upload, DollarSign, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceiroAdmin } from '@/components/FinanceiroAdmin';

export default function Admin() {
  const { signOut } = useAuth();
  const [cooperados, setCooperados] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNome, setNewNome] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Excel import state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // Photo gallery state
  const [fotos, setFotos] = useState<any[]>([]);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoTitulo, setFotoTitulo] = useState('');
  const [fotoDescricao, setFotoDescricao] = useState('');
  const [fotoCategoria, setFotoCategoria] = useState<'fundacao' | 'estrutura' | 'acabamento'>('fundacao');
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);

  useEffect(() => {
    loadCooperados();
    loadFotos();
  }, []);

  const loadCooperados = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles (role)
        `)
        .order('data_cadastro', { ascending: false });

      if (error) throw error;
      setCooperados(profiles || []);
    } catch (error) {
      console.error('Erro ao carregar cooperados:', error);
      toast.error('Erro ao carregar lista de cooperados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCooperado = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Create user using admin function (you'll need to create this edge function)
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newEmail,
          password: newPassword,
          nome_completo: newNome,
        },
      });

      if (error) throw error;

      toast.success('Cooperado criado com sucesso!');
      setNewEmail('');
      setNewPassword('');
      setNewNome('');
      loadCooperados();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar cooperado');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCooperado = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este cooperado?')) return;

    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;

      toast.success('Cooperado removido com sucesso!');
      loadCooperados();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover cooperado');
    }
  };

  const handleExcelImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) {
      toast.error('Selecione um arquivo Excel');
      return;
    }

    setIsImporting(true);

    try {
      const data = await excelFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        toast.error('Planilha vazia');
        setIsImporting(false);
        return;
      }

      let sucessos = 0;
      let erros = 0;

      for (const row of jsonData) {
        try {
          const { error } = await supabase.functions.invoke('create-user', {
            body: {
              email: row.email || row.Email,
              password: row.senha || row.Senha || row.password || row.Password,
              nome_completo: row.nome_completo || row.nome || row.Nome || row['Nome Completo'],
            },
          });

          if (error) {
            console.error('Erro ao criar usuário:', error);
            erros++;
          } else {
            sucessos++;
          }
        } catch (error) {
          console.error('Erro ao processar linha:', error);
          erros++;
        }
      }

      toast.success(`${sucessos} cooperados criados com sucesso! ${erros > 0 ? `${erros} erros.` : ''}`);
      setExcelFile(null);
      loadCooperados();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar planilha');
    } finally {
      setIsImporting(false);
    }
  };

  const loadFotos = async () => {
    try {
      const { data, error } = await supabase
        .from('obra_fotos')
        .select('*')
        .order('data_upload', { ascending: false });

      if (error) throw error;
      setFotos(data || []);
    } catch (error) {
      console.error('Erro ao carregar fotos:', error);
      toast.error('Erro ao carregar galeria de fotos');
    }
  };

  const handleUploadFoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotoFile) {
      toast.error('Selecione uma foto');
      return;
    }

    setIsUploadingFoto(true);

    try {
      const fileExt = fotoFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('obra-fotos')
        .upload(filePath, fotoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('obra-fotos')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('obra_fotos')
        .insert({
          titulo: fotoTitulo,
          descricao: fotoDescricao || null,
          foto_url: publicUrl,
          categoria: fotoCategoria,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (dbError) throw dbError;

      toast.success('Foto enviada com sucesso!');
      setFotoFile(null);
      setFotoTitulo('');
      setFotoDescricao('');
      setFotoCategoria('fundacao');
      loadFotos();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar foto');
    } finally {
      setIsUploadingFoto(false);
    }
  };

  const handleDeleteFoto = async (fotoId: string, fotoUrl: string) => {
    if (!confirm('Tem certeza que deseja remover esta foto?')) return;

    try {
      const fileName = fotoUrl.split('/').pop();
      
      if (fileName) {
        await supabase.storage
          .from('obra-fotos')
          .remove([fileName]);
      }

      const { error } = await supabase
        .from('obra_fotos')
        .delete()
        .eq('id', fotoId);

      if (error) throw error;

      toast.success('Foto removida com sucesso!');
      loadFotos();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover foto');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Painel Admin
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/area-cooperado">
              <Button variant="outline">Área do Cooperado</Button>
            </Link>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="cooperados" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cooperados" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Cooperados
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financeiro
              </TabsTrigger>
              <TabsTrigger value="fotos" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Galeria
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cooperados" className="space-y-8">
          {/* Create User Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Criar Novo Cooperado
              </CardTitle>
              <CardDescription>
                Adicione um novo cooperado ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCooperado} className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Nome do cooperado"
                    value={newNome}
                    onChange={(e) => setNewNome(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Senha (min 6 caracteres)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="md:col-span-3">
                  <Button type="submit" disabled={isCreating} className="w-full">
                    {isCreating ? 'Criando...' : 'Criar Cooperado'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Import from Excel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Importar Cooperados via Planilha
              </CardTitle>
              <CardDescription>
                Envie uma planilha Excel (.xlsx) com as colunas: nome_completo, email e senha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleExcelImport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="excel">Selecionar Planilha Excel</Label>
                  <Input
                    id="excel"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    A planilha deve conter as colunas: <strong>nome_completo</strong>, <strong>email</strong> e <strong>senha</strong>
                  </p>
                </div>
                <Button type="submit" disabled={isImporting} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importando...' : 'Importar Cooperados'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Lista de Cooperados ({cooperados.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : cooperados.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum cooperado cadastrado ainda
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Data Cadastro</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cooperados.map((cooperado) => (
                        <TableRow key={cooperado.id}>
                          <TableCell className="font-medium">
                            {cooperado.nome_completo}
                          </TableCell>
                          <TableCell>{cooperado.telefone || '-'}</TableCell>
                          <TableCell>
                            {new Date(cooperado.data_cadastro).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            {cooperado.user_roles?.some((r: any) => r.role === 'admin') ? (
                              <Badge variant="default">Admin</Badge>
                            ) : (
                              <Badge variant="secondary">Cooperado</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCooperado(cooperado.id)}
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
            </CardContent>
          </Card>

            </TabsContent>

            <TabsContent value="financeiro">
              <FinanceiroAdmin />
            </TabsContent>

            <TabsContent value="fotos">
              <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Galeria de Fotos da Obra
              </CardTitle>
              <CardDescription>
                Adicione fotos do andamento da construção
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadFoto} className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título da Foto</Label>
                    <Input
                      id="titulo"
                      type="text"
                      placeholder="Ex: Fundação concluída"
                      value={fotoTitulo}
                      onChange={(e) => setFotoTitulo(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <select
                      id="categoria"
                      value={fotoCategoria}
                      onChange={(e) => setFotoCategoria(e.target.value as any)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="fundacao">Fundação</option>
                      <option value="estrutura">Estrutura</option>
                      <option value="acabamento">Acabamento</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição (opcional)</Label>
                    <Input
                      id="descricao"
                      type="text"
                      placeholder="Detalhes adicionais"
                      value={fotoDescricao}
                      onChange={(e) => setFotoDescricao(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="foto">Selecionar Foto</Label>
                  <Input
                    id="foto"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isUploadingFoto} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploadingFoto ? 'Enviando...' : 'Enviar Foto'}
                </Button>
              </form>

              {/* Photos Grid */}
              <div className="mt-8">
                {fotos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma foto adicionada ainda
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {fotos.map((foto) => (
                      <div key={foto.id} className="relative group">
                        <img
                          src={foto.foto_url}
                          alt={foto.titulo}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-between p-3">
                          <div>
                            <p className="text-white font-semibold text-sm">{foto.titulo}</p>
                            {foto.descricao && (
                              <p className="text-white/80 text-xs mt-1">{foto.descricao}</p>
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteFoto(foto.id, foto.foto_url)}
                            className="w-full"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
