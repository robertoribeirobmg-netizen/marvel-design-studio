import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, Calendar, Phone, FileText, Building2, TrendingUp, Camera, Filter, Calendar as CalendarIcon, X, Grid3x3, List, ChevronLeft, ChevronRight, AlertCircle, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComp } from '@/components/ui/calendar';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { AcompanhamentoObras } from '@/components/AcompanhamentoObras';
import { DashboardComparativoObras } from '@/components/DashboardComparativoObras';
import { FinanceiroCooperadoDashboard } from '@/components/cooperado/FinanceiroCooperadoDashboard';
import { useParcelasData } from '@/hooks/useParcelasData';
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

  const { parcelas, isLoading: isLoadingParcelas } = useParcelasData(user?.id);

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

  const loadFotos = async () => {
    try {
      let query = supabase
        .from('obra_fotos')
        .select('*');

      if (filtroCategoria !== 'todas') {
        query = query.eq('categoria', filtroCategoria);
      }

      // Aplicar filtros de data
      if (dateFrom) {
        const dateFromStr = format(dateFrom, 'yyyy-MM-dd');
        query = query.gte('data_upload', dateFromStr);
      }
      
      if (dateTo) {
        const dateToStr = format(new Date(dateTo.getTime() + 86400000), 'yyyy-MM-dd'); // +1 dia para incluir o dia todo
        query = query.lt('data_upload', dateToStr);
      }

      query = query.order('data_upload', { ascending: ordenacao === 'asc' });

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
    loadFotos();
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

  // Calcular notificações de parcelas
  const hoje = new Date();
  const parcelasVencendo = parcelas.filter(p => {
    if (p.situacao === 'PAGO') return false;
    const vencimento = parseISO(p.vencimento);
    const diasRestantes = differenceInDays(vencimento, hoje);
    return diasRestantes >= 0 && diasRestantes <= 7;
  });

  const parcelasAtrasadas = parcelas.filter(p => {
    if (p.situacao === 'PAGO') return false;
    const vencimento = parseISO(p.vencimento);
    return isBefore(vencimento, hoje);
  });

  const totalEmAberto = parcelas
    .filter(p => p.situacao !== 'PAGO')
    .reduce((sum, p) => sum + p.valor, 0);

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

          {/* Notificações Financeiras */}
          {!isLoadingParcelas && (parcelasAtrasadas.length > 0 || parcelasVencendo.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Notificações</h3>
              </div>
              
              {parcelasAtrasadas.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Parcelas em Atraso</AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <p className="font-semibold">
                      Você possui {parcelasAtrasadas.length} parcela(s) em atraso
                    </p>
                    <div className="space-y-1">
                      {parcelasAtrasadas.slice(0, 3).map(parcela => {
                        const diasAtraso = Math.abs(differenceInDays(parseISO(parcela.vencimento), hoje));
                        return (
                          <div key={parcela.id} className="flex justify-between items-center text-sm bg-destructive/10 p-2 rounded">
                            <span>{parcela.descricao}</span>
                            <div className="text-right">
                              <p className="font-semibold">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcela.valor)}
                              </p>
                              <p className="text-xs opacity-80">{diasAtraso} dia(s) de atraso</p>
                            </div>
                          </div>
                        );
                      })}
                      {parcelasAtrasadas.length > 3 && (
                        <p className="text-sm opacity-80 pt-1">
                          + {parcelasAtrasadas.length - 3} parcela(s) atrasada(s)
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 bg-background hover:bg-background/90"
                      onClick={() => document.getElementById('dashboard-financeiro')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Ver Detalhes
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {parcelasVencendo.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Parcelas Próximas do Vencimento</AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <p className="font-semibold">
                      {parcelasVencendo.length} parcela(s) vencem nos próximos 7 dias
                    </p>
                    <div className="space-y-1">
                      {parcelasVencendo.slice(0, 3).map(parcela => {
                        const diasRestantes = differenceInDays(parseISO(parcela.vencimento), hoje);
                        return (
                          <div key={parcela.id} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded">
                            <span>{parcela.descricao}</span>
                            <div className="text-right">
                              <p className="font-semibold">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcela.valor)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Vence em {diasRestantes} dia(s)
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {parcelasVencendo.length > 3 && (
                        <p className="text-sm text-muted-foreground pt-1">
                          + {parcelasVencendo.length - 3} parcela(s) a vencer
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => document.getElementById('dashboard-financeiro')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Ver Detalhes
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {totalEmAberto > 0 && (
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Total em Aberto</p>
                        <p className="text-2xl font-bold text-primary">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalEmAberto)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-primary opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
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
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Financeiro
                </CardTitle>
                <CardDescription>
                  Visualize suas parcelas e pagamentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => document.getElementById('dashboard-financeiro')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Ver Detalhes
                </Button>
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
          <div id="dashboard-financeiro">
            {user && <FinanceiroCooperadoDashboard userId={user.id} />}
          </div>

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

              {/* Date Filters */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Filtrar por Data
                </h4>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Data Início</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-[160px] justify-start text-left font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComp
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Data Fim</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-[160px] justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComp
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                          disabled={(date) => dateFrom ? date < dateFrom : false}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {(dateFrom || dateTo) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearDateFilters}
                      title="Limpar filtros de data"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>

                {(dateFrom || dateTo) && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Mostrando {dateFrom && `de ${format(dateFrom, "dd/MM/yyyy")}`} {dateTo && `até ${format(dateTo, "dd/MM/yyyy")}`}
                  </div>
                )}
              </div>

              {fotos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma foto disponível ainda
                </p>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {paginatedFotos.map((foto, index) => (
                        <div key={foto.id} className="group">
                          {foto.foto_url ? (
                            <div 
                              className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                              onClick={() => openLightbox(startIndex + index)}
                            >
                              <img
                                src={foto.foto_url}
                                alt={foto.titulo}
                                className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                          ) : foto.video_url ? (
                            <div className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow">
                              <iframe
                                src={foto.video_url}
                                title={foto.titulo}
                                className="w-full h-64"
                                allowFullScreen
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              />
                            </div>
                          ) : null}
                          <div className="mt-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">{foto.titulo}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {foto.categoria}
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
                  ) : (
                    <div className="space-y-2">
                      {paginatedFotos.map((foto, index) => (
                        <div 
                          key={foto.id} 
                          className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          {foto.foto_url ? (
                            <div 
                              className="shrink-0 w-24 h-24 rounded-md overflow-hidden cursor-pointer"
                              onClick={() => openLightbox(startIndex + index)}
                            >
                              <img
                                src={foto.foto_url}
                                alt={foto.titulo}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : foto.video_url ? (
                            <div className="shrink-0 w-24 h-24 rounded-md overflow-hidden relative">
                              <iframe
                                src={foto.video_url}
                                title={foto.titulo}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              />
                            </div>
                          ) : null}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-semibold truncate">{foto.titulo}</h3>
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {foto.categoria}
                              </Badge>
                            </div>
                            {foto.descricao && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                                {foto.descricao}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(foto.data_upload).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Mostrando {startIndex + 1}-{Math.min(endIndex, fotos.length)} de {fotos.length} itens
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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

          {/* Dashboard Comparativo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Análise Comparativa
              </CardTitle>
              <CardDescription>
                Compare o progresso real com o planejado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardComparativoObras />
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
