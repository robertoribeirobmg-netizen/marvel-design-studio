import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LogOut, UserPlus, Shield, Users, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Admin() {
  const { signOut } = useAuth();
  const [cooperados, setCooperados] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNome, setNewNome] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCooperados();
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
        <div className="max-w-7xl mx-auto space-y-8">
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
        </div>
      </main>
    </div>
  );
}
