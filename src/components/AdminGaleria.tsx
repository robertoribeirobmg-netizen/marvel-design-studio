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
import { toast } from 'sonner';
import { Upload, Trash2, Image as ImageIcon, Video, Link as LinkIcon, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface GaleriaItem {
  id: string;
  titulo: string;
  descricao: string | null;
  foto_url: string | null;
  video_url: string | null;
  categoria: 'fundacao' | 'estrutura' | 'acabamento';
  data_upload: string;
}

export function AdminGaleria() {
  const [items, setItems] = useState<GaleriaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tipo, setTipo] = useState<'foto' | 'video'>('foto');
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    categoria: 'fundacao' as 'fundacao' | 'estrutura' | 'acabamento',
    videoUrl: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  useEffect(() => {
    loadItems();
  }, [dateFrom, dateTo]);

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

    query = query.order('data_upload', { ascending: false });

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

    if (tipo === 'foto' && !file) {
      toast.error('Selecione uma foto');
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

      if (tipo === 'foto' && file) {
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

      toast.success(`${tipo === 'foto' ? 'Foto' : 'Vídeo'} adicionado com sucesso!`);
      setForm({
        titulo: '',
        descricao: '',
        categoria: 'fundacao',
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adicionar à Galeria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tipo de Conteúdo</Label>
              <Select
                value={tipo}
                onValueChange={(value: 'foto' | 'video') => setTipo(value)}
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
                  <SelectItem value="fundacao">Fundação</SelectItem>
                  <SelectItem value="estrutura">Estrutura</SelectItem>
                  <SelectItem value="acabamento">Acabamento</SelectItem>
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
              {uploading ? 'Enviando...' : `Adicionar ${tipo === 'foto' ? 'Foto' : 'Vídeo'}`}
            </Button>
          </CardContent>
        </Card>

        {/* Date Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Filtrar por Data
            </CardTitle>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Thumbnail */}
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                        {item.foto_url ? (
                          <img
                            src={item.foto_url}
                            alt={item.titulo}
                            className="w-full h-full object-cover"
                          />
                        ) : item.video_url ? (
                          <div className="relative w-full h-full">
                            <img
                              src={getYouTubeThumbnail(item.video_url)}
                              alt={item.titulo}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-red-600 rounded-full p-3">
                                <Video className="h-6 w-6 text-white" />
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
                            {item.categoria === 'fundacao' && 'Fundação'}
                            {item.categoria === 'estrutura' && 'Estrutura'}
                            {item.categoria === 'acabamento' && 'Acabamento'}
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
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(item.id, item.foto_url)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
