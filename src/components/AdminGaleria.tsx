import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OptimizedImage } from '@/components/OptimizedImage';
import { toast } from 'sonner';
import { Upload, Trash2, Image as ImageIcon, Video, Link as LinkIcon, Calendar as CalendarIcon, X, Grid3x3, List, ChevronLeft, ChevronRight, Play, ExternalLink, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
interface GaleriaItem {
  id: string;
  titulo: string;
  descricao: string | null;
  foto_url: string | null;
  video_url: string | null;
  categoria: '1ª Fase do Muro' | '2ª Fase do Muro' | '3ª Fase do Muro' | 'Supressão Vegetal' | 'Terraplanagem' | 'Infraestrutura' | 'Pavimentação' | 'Portaria e Clube' | 'Paisagismo' | 'Documentos';
  data_upload: string;
}

interface AdminGaleriaProps {
  readOnly?: boolean;
}

export function AdminGaleria({ readOnly = false }: AdminGaleriaProps) {
  const [items, setItems] = useState<GaleriaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tipo, setTipo] = useState<'foto' | 'video' | 'pdf'>('foto');
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    categoria: '1ª Fase do Muro' as '1ª Fase do Muro' | '2ª Fase do Muro' | '3ª Fase do Muro' | 'Supressão Vegetal' | 'Terraplanagem' | 'Infraestrutura' | 'Pavimentação' | 'Portaria e Clube' | 'Paisagismo' | 'Documentos',
    videoUrl: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [ordenacao, setOrdenacao] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [selectedVideo, setSelectedVideo] = useState<GaleriaItem | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<GaleriaItem | null>(null);

  useEffect(() => {
    loadItems();
    setCurrentPage(1); // Reset to first page when filters change
  }, [dateFrom, dateTo, ordenacao]);

  const loadItems = async () => {
    let query = supabase
      .from('obra_fotos')
      .select('*');

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

    const { data, error } = await query;

    if (error) {
      toast.error('Erro ao carregar galeria');
      return;
    }
    setItems(data || []);
  };

  const clearDateFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const extractYouTubeId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleUpload = async () => {
    if (!form.titulo) {
      toast.error('Preencha o título');
      return;
    }

    if ((tipo === 'foto' || tipo === 'pdf') && !file) {
      toast.error(tipo === 'foto' ? 'Selecione uma foto' : 'Selecione um PDF');
      return;
    }

    if (tipo === 'video' && !form.videoUrl) {
      toast.error('Cole o link do YouTube');
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      let foto_url = null;
      let video_url = null;

      if ((tipo === 'foto' || tipo === 'pdf') && file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('obra-fotos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('obra-fotos')
          .getPublicUrl(fileName);

        foto_url = urlData.publicUrl;
      } else if (tipo === 'video') {
        const videoId = extractYouTubeId(form.videoUrl);
        if (!videoId) {
          toast.error('Link do YouTube inválido');
          setUploading(false);
          return;
        }
        video_url = `https://www.youtube.com/embed/${videoId}`;
      }

      const { error } = await supabase
        .from('obra_fotos')
        .insert({
          titulo: form.titulo,
          descricao: form.descricao || null,
          foto_url,
          video_url,
          categoria: form.categoria,
          uploaded_by: userData.user?.id,
        });

      if (error) throw error;

      const tipoLabel = tipo === 'foto' ? 'Foto' : tipo === 'pdf' ? 'PDF' : 'Vídeo';
      toast.success(`${tipoLabel} adicionado com sucesso!`);
      setForm({
        titulo: '',
        descricao: '',
        categoria: '1ª Fase do Muro',
        videoUrl: '',
      });
      setFile(null);
      loadItems();
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao adicionar item');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fotoUrl: string | null) => {
    try {
      // Deletar arquivo do storage se for foto
      if (fotoUrl) {
        const fileName = fotoUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('obra-fotos')
            .remove([fileName]);
        }
      }

      const { error } = await supabase
        .from('obra_fotos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Item deletado com sucesso!');
      loadItems();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao deletar item');
    }
  };

  const getYouTubeThumbnail = (embedUrl: string) => {
    const videoId = embedUrl.split('/').pop();
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Galeria de Fotos e Vídeos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Form */}
        {!readOnly && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar à Galeria</CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tipo de Conteúdo</Label>
              <Select
                value={tipo}
                onValueChange={(value: 'foto' | 'video' | 'pdf') => setTipo(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foto">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Foto
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Vídeo do YouTube
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF / Documento
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Título</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex: Fundação concluída"
              />
            </div>

            <div>
              <Label>Categoria</Label>
              <Select
                value={form.categoria}
                onValueChange={(value: any) => setForm({ ...form, categoria: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1ª Fase do Muro">1ª Fase do Muro</SelectItem>
                  <SelectItem value="2ª Fase do Muro">2ª Fase do Muro</SelectItem>
                  <SelectItem value="3ª Fase do Muro">3ª Fase do Muro</SelectItem>
                  <SelectItem value="Supressão Vegetal">Supressão Vegetal</SelectItem>
                  <SelectItem value="Terraplanagem">Terraplanagem</SelectItem>
                  <SelectItem value="Infraestrutura">Infraestrutura</SelectItem>
                  <SelectItem value="Pavimentação">Pavimentação</SelectItem>
                  <SelectItem value="Portaria e Clube">Portaria e Clube</SelectItem>
                  <SelectItem value="Paisagismo">Paisagismo</SelectItem>
                  <SelectItem value="Documentos">Documentos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows={2}
                placeholder="Adicione detalhes sobre esta foto ou vídeo"
              />
            </div>

            {tipo === 'foto' ? (
              <div>
                <Label>Selecionar Foto</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Arquivo selecionado: {file.name}
                  </p>
                )}
              </div>
            ) : tipo === 'pdf' ? (
              <div>
                <Label>Selecionar PDF</Label>
                <Input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Arquivo selecionado: {file.name}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <Label className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Link do YouTube
                </Label>
                <Input
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="Cole o link do YouTube aqui (ex: https://www.youtube.com/watch?v=...)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Aceita links do YouTube em qualquer formato
                </p>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Enviando...' : `Adicionar ${tipo === 'foto' ? 'Foto' : tipo === 'pdf' ? 'PDF' : 'Vídeo'}`}
            </Button>
          </CardContent>
        </Card>
        )}

        {/* Date Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Filtrar por Data
              </CardTitle>
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
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
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
                <Label>Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
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
                  size="icon"
                  onClick={clearDateFilters}
                  title="Limpar filtros de data"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {(dateFrom || dateTo) && (
              <div className="mt-3 text-sm text-muted-foreground">
                Mostrando itens {dateFrom && `de ${format(dateFrom, "dd/MM/yyyy")}`} {dateTo && `até ${format(dateTo, "dd/MM/yyyy")}`}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gallery Grid */}
        <div>
          <h3 className="font-semibold mb-4">Itens da Galeria ({items.length})</h3>
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum item na galeria ainda
            </p>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Thumbnail */}
                      <div 
                        className={cn(
                          "relative aspect-video rounded-lg overflow-hidden bg-muted",
                          (item.video_url || (item.foto_url?.endsWith('.pdf'))) && "cursor-pointer group"
                        )}
                        onClick={() => {
                          if (item.video_url) setSelectedVideo(item);
                          else if (item.foto_url?.endsWith('.pdf')) {
                            const link = document.createElement('a');
                            link.href = item.foto_url;
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }}
                      >
                        {item.foto_url?.endsWith('.pdf') ? (
                          <div 
                            className="w-full h-full flex flex-col items-center justify-center bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPdf(item);
                            }}
                          >
                            <FileText className="h-12 w-12 text-primary mb-2" />
                            <span className="text-xs text-muted-foreground">Clique para visualizar</span>
                          </div>
                        ) : item.foto_url ? (
                          <OptimizedImage
                            src={item.foto_url}
                            alt={item.titulo}
                            containerClassName="w-full h-full"
                            className="w-full h-full object-cover"
                          />
                        ) : item.video_url ? (
                          <div className="relative w-full h-full">
                            <img
                              src={getYouTubeThumbnail(item.video_url)}
                              alt={item.titulo}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                              <div className="bg-red-600 rounded-full p-3 group-hover:scale-110 transition-transform">
                                <Play className="h-6 w-6 text-white fill-white" />
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Info */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm">{item.titulo}</h4>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {item.categoria}
                          </Badge>
                        </div>
                        
                        {item.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.descricao}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.data_upload).toLocaleDateString('pt-BR')}
                          </span>
                          <div className="flex gap-1">
                            {item.foto_url?.endsWith('.pdf') && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a href={item.foto_url} download target="_blank" rel="noopener noreferrer">
                                  <Download className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                            {!readOnly && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(item.id, item.foto_url)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {paginatedItems.map((item) => (
                <div 
                  key={item.id} 
                  className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Thumbnail */}
                  <div 
                    className={cn(
                      "shrink-0 w-24 h-24 rounded-md overflow-hidden bg-muted",
                      (item.video_url || item.foto_url?.endsWith('.pdf')) && "cursor-pointer group"
                    )}
                    onClick={() => {
                      if (item.video_url) setSelectedVideo(item);
                      else if (item.foto_url?.endsWith('.pdf')) setSelectedPdf(item);
                    }}
                  >
                    {item.foto_url?.endsWith('.pdf') ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted hover:bg-muted/80 transition-colors">
                        <FileText className="h-8 w-8 text-primary" />
                        <span className="text-[10px] text-muted-foreground mt-1">PDF</span>
                      </div>
                    ) : item.foto_url ? (
                      <OptimizedImage
                        src={item.foto_url}
                        alt={item.titulo}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover"
                      />
                    ) : item.video_url ? (
                      <div className="relative w-full h-full">
                        <img
                          src={getYouTubeThumbnail(item.video_url)}
                          alt={item.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                          <div className="bg-red-600 rounded-full p-2 group-hover:scale-110 transition-transform">
                            <Play className="h-4 w-4 text-white fill-white" />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold truncate">{item.titulo}</h4>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {item.categoria}
                      </Badge>
                    </div>
                    
                    {item.descricao && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                        {item.descricao}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.data_upload).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <div className="flex gap-1">
                        {item.foto_url?.endsWith('.pdf') && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={item.foto_url} download target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                        {!readOnly && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(item.id, item.foto_url)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                  ))}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1}-{Math.min(endIndex, items.length)} de {items.length} itens
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
        </div>

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
                      const videoId = selectedVideo.video_url?.split('/').pop();
                      window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
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
                  {selectedVideo && new Date(selectedVideo.data_upload).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* PDF Dialog */}
        <Dialog open={!!selectedPdf} onOpenChange={(open) => !open && setSelectedPdf(null)}>
          <DialogContent className="max-w-5xl w-full h-[90vh] p-0">
            <DialogHeader className="p-4 pb-0">
              <div className="flex items-center justify-between pr-8">
                <DialogTitle>{selectedPdf?.titulo}</DialogTitle>
                {selectedPdf?.foto_url && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={selectedPdf.foto_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href={selectedPdf.foto_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir em nova aba
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </DialogHeader>
            <div className="p-4 flex-1 h-full">
              <div className="w-full h-[calc(90vh-120px)]">
                {selectedPdf?.foto_url && (
                  <iframe
                    src={selectedPdf.foto_url}
                    title={selectedPdf.titulo}
                    className="w-full h-full rounded-lg border"
                  />
                )}
              </div>
              {selectedPdf?.descricao && (
                <p className="text-muted-foreground mt-3">{selectedPdf.descricao}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{selectedPdf?.categoria}</Badge>
                <span className="text-xs text-muted-foreground">
                  {selectedPdf && new Date(selectedPdf.data_upload).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
