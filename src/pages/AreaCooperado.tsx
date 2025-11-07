import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, Calendar, Phone, FileText, Building2, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AreaCooperado() {
  const { user, signOut, isAdmin } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              La Felicità
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline">
                  Painel Admin
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-primary rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-2">
              Bem-vindo, {profile?.nome_completo || 'Cooperado'}!
            </h2>
            <p className="text-white/90">
              Acompanhe aqui todas as informações sobre o Residencial La Felicità
            </p>
          </div>

          {/* Profile Info */}
          {isLoading ? (
            <Card>
              <CardContent className="p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Meus Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Nome Completo</p>
                  <p className="font-semibold">{profile?.nome_completo}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">E-mail</p>
                  <p className="font-semibold">{user?.email}</p>
                </div>
                {profile?.telefone && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Telefone
                    </p>
                    <p className="font-semibold">{profile.telefone}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Membro desde
                  </p>
                  <p className="font-semibold">
                    {new Date(profile?.data_cadastro).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Obra
                </CardTitle>
                <CardDescription>
                  Acompanhe o andamento da construção
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/dashboard">
                  <Button variant="outline" className="w-full">
                    Ver Progresso
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Documentos
                </CardTitle>
                <CardDescription>
                  Acesse contratos e documentação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" disabled>
                  Em Breve
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Investimento
                </CardTitle>
                <CardDescription>
                  Informações sobre seu investimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" disabled>
                  Em Breve
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
