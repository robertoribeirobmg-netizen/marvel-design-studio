import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, Calendar, Phone, FileText, Building2, TrendingUp, Camera, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { DashboardFinanceiro } from '@/components/DashboardFinanceiro';

export default function AreaCooperado() {
  const { user, signOut, isAdmin } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fotos, setFotos] = useState<any[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<'todas' | 'fundacao' | 'estrutura' | 'acabamento'>('todas');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadFotos();
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

  const loadFotos = async () => {
    try {
      let query = supabase
        .from('obra_fotos')
        .select('*')
        .order('data_upload', { ascending: false });

      if (filtroCategoria !== 'todas') {
        query = query.eq('categoria', filtroCategoria);
      }

      const { error, data } = await query;

      if (error) throw error;
      setFotos(data || []);
    } catch (error) {
      console.error('Erro ao carregar fotos:', error);
    }
  };

  useEffect(() => {
    loadFotos();
  }, [filtroCategoria]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
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

          </div>

          {/* Dashboard Financeiro */}
          {user && <DashboardFinanceiro userId={user.id} />}

          {/* Photo Gallery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Galeria de Fotos da Obra
              </CardTitle>
              <CardDescription>
                Acompanhe o andamento da construção através de fotos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Category Filters */}
              <div className="mb-6 flex flex-wrap gap-2">
                <Button
                  variant={filtroCategoria === 'todas' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroCategoria('todas')}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Todas
                </Button>
                <Button
                  variant={filtroCategoria === 'fundacao' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroCategoria('fundacao')}
                >
                  Fundação
                </Button>
                <Button
                  variant={filtroCategoria === 'estrutura' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroCategoria('estrutura')}
                >
                  Estrutura
                </Button>
                <Button
                  variant={filtroCategoria === 'acabamento' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroCategoria('acabamento')}
                >
                  Acabamento
                </Button>
              </div>

              {fotos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma foto disponível ainda
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {fotos.map((foto, index) => (
                    <div key={foto.id} className="group">
                      <div 
                        className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                        onClick={() => openLightbox(index)}
                      >
                        <img
                          src={foto.foto_url}
                          alt={foto.titulo}
                          className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{foto.titulo}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {foto.categoria === 'fundacao' && 'Fundação'}
                            {foto.categoria === 'estrutura' && 'Estrutura'}
                            {foto.categoria === 'acabamento' && 'Acabamento'}
                          </Badge>
                        </div>
                        {foto.descricao && (
                          <p className="text-sm text-muted-foreground">{foto.descricao}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(foto.data_upload).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Photo Lightbox */}
      <PhotoLightbox
        photos={fotos}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
}
