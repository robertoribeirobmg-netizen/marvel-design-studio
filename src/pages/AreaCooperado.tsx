import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, Calendar, Phone, FileText, Building2, TrendingUp, Camera, Filter, Calendar as CalendarIcon, X, Grid3x3, List, ChevronLeft, ChevronRight, AlertCircle, Bell, Play, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComp } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { OptimizedImage } from '@/components/OptimizedImage';
import { AcompanhamentoObras } from '@/components/AcompanhamentoObras';
import { DashboardComparativoObras } from '@/components/DashboardComparativoObras';
// import { FinanceiroCooperadoDashboard } from '@/components/cooperado/FinanceiroCooperadoDashboard';
// import { useParcelasData } from '@/hooks/useParcelasData';
import { format, differenceInDays, parseISO, isBefore, isAfter, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlterarSenhaPrimeiroAcesso } from '@/components/AlterarSenhaPrimeiroAcesso';

export default function AreaCooperado() {
  const { user, signOut, isAdmin } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fotos, setFotos] = useState<any[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<'todas' | '1ª Fase do Muro' | '2ª Fase do Muro' | '3ª Fase do Muro' | 'Supressão Vegetal' | 'Terraplanagem' | 'Infraestrutura' | 'Pavimentação' | 'Portaria e Clube' | 'Paisagismo'>('todas');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [ordenacao, setOrdenacao] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [showAlterarSenha, setShowAlterarSenha] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  // Helper functions for YouTube
  const getYouTubeThumbnail = (embedUrl: string) => {
    const videoId = embedUrl?.split('/').pop()?.split('?')[0];
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';
  };

  const getYouTubeWatchUrl = (embedUrl: string) => {
    const videoId = embedUrl?.split('/').pop()?.split('?')[0];
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : '';
  };

  // const { parcelas, isLoading: isLoadingParcelas } = useParcelasData(user?.id);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadFotos(filtroCategoria, dateFrom, dateTo, ordenacao);
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
      
      // Verificar se é o primeiro acesso
      if (data && !data.primeira_senha_alterada) {
        setShowAlterarSenha(true);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFotos = async (categoria: typeof filtroCategoria, fromDate?: Date, toDate?: Date, ordem: 'desc' | 'asc' = 'desc') => {
    try {
      let query = supabase
        .from('obra_fotos')
        .select('*');

      if (categoria !== 'todas') {
        query = query.eq('categoria', categoria as any);
      }

      // Aplicar filtros de data
      if (fromDate) {
        const dateFromStr = format(fromDate, 'yyyy-MM-dd');
        query = query.gte('data_upload', dateFromStr);
      }
      
      if (toDate) {
        const dateToStr = format(new Date(toDate.getTime() + 86400000), 'yyyy-MM-dd'); // +1 dia para incluir o dia todo
        query = query.lt('data_upload', dateToStr);
      }

      query = query.order('data_upload', { ascending: ordem === 'asc' });

      const { error, data } = await query;

      if (error) throw error;
      setFotos(data || []);
    } catch (error) {
      console.error('Erro ao carregar fotos:', error);
    }
  };

  const clearDateFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  };

  useEffect(() => {
    loadFotos(filtroCategoria, dateFrom, dateTo, ordenacao);
    setCurrentPage(1); // Reset to first page when filters change
  }, [filtroCategoria, dateFrom, dateTo, ordenacao]);

  // Pagination calculations
  const totalPages = Math.ceil(fotos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFotos = fotos.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Calcular notificações de parcelas (ocultado)
  // const hoje = new Date();
  // const parcelasVencendo = parcelas.filter(p => {
  //   if (p.situacao === 'PAGO') return false;
  //   const vencimento = parseISO(p.vencimento);
  //   const diasRestantes = differenceInDays(vencimento, hoje);
  //   return diasRestantes >= 0 && diasRestantes <= 7;
  // });

  // const parcelasAtrasadas = parcelas.filter(p => {
  //   if (p.situacao === 'PAGO') return false;
  //   const vencimento = parseISO(p.vencimento);
  //   return isBefore(vencimento, hoje);
  // });

  // const totalEmAberto = parcelas
  //   .filter(p => p.situacao !== 'PAGO')
  //   .reduce((sum, p) => sum + p.valor, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Modal de Alteração de Senha no Primeiro Acesso */}
      <AlterarSenhaPrimeiroAcesso
        open={showAlterarSenha}
        onSuccess={() => {
          setShowAlterarSenha(false);
          loadProfile();
        }}
      />
      
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

          {/* Notificações Financeiras - Ocultadas */}


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
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => document.getElementById('dashboard-obra')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Ver Progresso
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer opacity-60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Financeiro
                </CardTitle>
                <CardDescription>
                  Em breve você poderá visualizar suas parcelas e pagamentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled
                >
                  Em Breve
                </Button>
              </CardContent>
            </Card>

          </div>

          {/* Seção de Obra */}
          <div id="dashboard-obra" className="space-y-6">
            {/* Acompanhamento de Obras */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Acompanhamento de Obras
                </CardTitle>
                <CardDescription>
                  Veja o andamento detalhado de cada etapa da construção
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AcompanhamentoObras />
              </CardContent>
            </Card>

            {/* Photo and Video Gallery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Galeria de Fotos e Vídeos da Obra
                </CardTitle>
                <CardDescription>
                  Acompanhe o andamento da construção através de fotos e vídeos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters Header */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h4 className="text-sm font-medium">Filtros e Ordenação</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOrdenacao(ordenacao === 'desc' ? 'asc' : 'desc')}
                    >
                      {ordenacao === 'desc' ? '↓ Mais Recentes' : '↑ Mais Antigas'}
                    </Button>
                    <div className="flex border rounded-md">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="rounded-r-none"
                      >
                        <Grid3x3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="rounded-l-none"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Category Filters */}
                <div className="mb-4">
                  <h4 className="text-xs text-muted-foreground mb-2">Categoria</h4>
                  <div className="flex flex-wrap gap-2">
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
                    variant={filtroCategoria === '1ª Fase do Muro' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroCategoria('1ª Fase do Muro')}
                  >
                    1ª Fase do Muro
                  </Button>
                  <Button
                    variant={filtroCategoria === '2ª Fase do Muro' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroCategoria('2ª Fase do Muro')}
                  >
                    2ª Fase do Muro
                  </Button>
                  <Button
                    variant={filtroCategoria === '3ª Fase do Muro' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroCategoria('3ª Fase do Muro')}
                  >
                    3ª Fase do Muro
                  </Button>
                  <Button
                    variant={filtroCategoria === 'Supressão Vegetal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroCategoria('Supressão Vegetal')}
                  >
                    Supressão Vegetal
                  </Button>
                  <Button
                    variant={filtroCategoria === 'Terraplanagem' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroCategoria('Terraplanagem')}
                  >
                    Terraplanagem
                  </Button>
                  <Button
                    variant={filtroCategoria === 'Infraestrutura' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroCategoria('Infraestrutura')}
                  >
                    Infraestrutura
                  </Button>
                  <Button
                    variant={filtroCategoria === 'Pavimentação' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroCategoria('Pavimentação')}
                  >
                    Pavimentação
                  </Button>
                  <Button
                    variant={filtroCategoria === 'Portaria e Clube' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroCategoria('Portaria e Clube')}
                  >
                    Portaria e Clube
                  </Button>
                  <Button
                    variant={filtroCategoria === 'Paisagismo' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroCategoria('Paisagismo')}
                  >
                    Paisagismo
                  </Button>
                </div>
                </div>

                {/* Date Range Filters */}
                <div className="mb-4">
                  <h4 className="text-xs text-muted-foreground mb-2">Filtrar por Data</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data Início"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComp
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data Fim"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComp
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {(dateFrom || dateTo) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearDateFilters}
                        className="flex items-center gap-1"
                      >
                        <X className="h-4 w-4" />
                        Limpar Datas
                      </Button>
                    )}
                  </div>
                </div>

                {/* Photos/Videos Grid or List */}
                {fotos.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma foto ou vídeo encontrado</p>
                  </div>
                ) : (
                  <>
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {fotos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((foto, index) => (
                          <div
                            key={foto.id}
                            className="group relative overflow-hidden rounded-lg border bg-card cursor-pointer hover:shadow-lg transition-all"
                            onClick={() => {
                              if (foto.video_url) {
                                setSelectedVideo(foto);
                              } else {
                                setLightboxIndex((currentPage - 1) * itemsPerPage + index);
                                setLightboxOpen(true);
                              }
                            }}
                          >
                            {foto.video_url ? (
                              <div className="aspect-video bg-muted relative">
                                <img
                                  src={getYouTubeThumbnail(foto.video_url)}
                                  alt={foto.titulo}
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${foto.video_url?.split('/').pop()}/hqdefault.jpg`;
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                  <div className="bg-red-600 rounded-full p-3 group-hover:scale-110 transition-transform">
                                    <Play className="h-6 w-6 text-white fill-white" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              foto.foto_url && (
                                <OptimizedImage
                                  src={foto.foto_url}
                                  alt={foto.titulo}
                                  containerClassName="aspect-video"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              )
                            )}
                            <div className="p-4">
                              <h4 className="font-semibold mb-1 line-clamp-1">{foto.titulo}</h4>
                              {foto.descricao && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{foto.descricao}</p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">
                                  {foto.categoria}
                                </Badge>
                                <span>{format(parseISO(foto.data_upload), 'dd/MM/yyyy')}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4 mb-6">
                        {fotos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((foto, index) => (
                          <div
                            key={foto.id}
                            className="flex gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => {
                              if (foto.video_url) {
                                setSelectedVideo(foto);
                              } else {
                                setLightboxIndex((currentPage - 1) * itemsPerPage + index);
                                setLightboxOpen(true);
                              }
                            }}
                          >
                            {foto.video_url ? (
                              <div className="w-32 h-32 flex-shrink-0 bg-muted rounded-md overflow-hidden relative group">
                                <img
                                  src={getYouTubeThumbnail(foto.video_url)}
                                  alt={foto.titulo}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${foto.video_url?.split('/').pop()}/hqdefault.jpg`;
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                  <div className="bg-red-600 rounded-full p-2 group-hover:scale-110 transition-transform">
                                    <Play className="h-4 w-4 text-white fill-white" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              foto.foto_url && (
                                <OptimizedImage
                                  src={foto.foto_url}
                                  alt={foto.titulo}
                                  containerClassName="w-32 h-32 flex-shrink-0 rounded-md"
                                  className="w-full h-full object-cover"
                                />
                              )
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold mb-2">{foto.titulo}</h4>
                              {foto.descricao && (
                                <p className="text-sm text-muted-foreground mb-3">{foto.descricao}</p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">
                                  {foto.categoria}
                                </Badge>
                                <span>{format(parseISO(foto.data_upload), 'dd/MM/yyyy')}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pagination */}
                    {fotos.length > itemsPerPage && (
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          
                          <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => handlePageChange(pageNum)}
                                  className="w-9"
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>

                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="text-sm border rounded-md px-2 py-1 bg-background"
                        >
                          <option value={6}>6 por página</option>
                          <option value={12}>12 por página</option>
                          <option value={24}>24 por página</option>
                          <option value={48}>48 por página</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dashboard Financeiro - Em Breve */}
          <div id="dashboard-financeiro">
            <Card className="opacity-60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Dashboard Financeiro
                </CardTitle>
                <CardDescription>
                  Este módulo estará disponível em breve
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Em Breve</h3>
                  <p className="text-muted-foreground max-w-md">
                    Estamos preparando seu dashboard financeiro com informações detalhadas sobre parcelas, pagamentos e muito mais.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>

      {/* Photo Lightbox */}
      <PhotoLightbox
        photos={fotos.filter(f => f.foto_url)}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />

      {/* Video Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl w-full p-0">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>{selectedVideo?.titulo}</DialogTitle>
              {selectedVideo?.video_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(getYouTubeWatchUrl(selectedVideo.video_url), '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir no YouTube
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="p-4">
            <div className="aspect-video w-full">
              {selectedVideo?.video_url && (
                <iframe
                  src={`${selectedVideo.video_url}?autoplay=1`}
                  title={selectedVideo.titulo}
                  className="w-full h-full rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
            {selectedVideo?.descricao && (
              <p className="text-muted-foreground mt-3">{selectedVideo.descricao}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{selectedVideo?.categoria}</Badge>
              <span className="text-xs text-muted-foreground">
                {selectedVideo && format(parseISO(selectedVideo.data_upload), 'dd/MM/yyyy')}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
