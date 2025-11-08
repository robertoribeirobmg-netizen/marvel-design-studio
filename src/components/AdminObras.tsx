import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Edit, Upload, FileText, Image, Video, File, Trash2, Save } from 'lucide-react';

interface EtapaObra {
  id: string;
  nome: string;
  descricao: string | null;
  percentual_concluido: number;
  percentual_planejado: number;
  data_inicio: string | null;
  data_conclusao: string | null;
  ordem: number;
}

interface Arquivo {
  id: string;
  etapa_id: string;
  tipo: 'foto' | 'video' | 'pdf' | 'texto';
  titulo: string;
  descricao: string | null;
  arquivo_url: string | null;
  conteudo_texto: string | null;
  data_upload: string;
}

export function AdminObras() {
  const [etapas, setEtapas] = useState<EtapaObra[]>([]);
  const [selectedEtapa, setSelectedEtapa] = useState<EtapaObra | null>(null);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [editForm, setEditForm] = useState({
    percentual_concluido: 0,
    percentual_planejado: 0,
    data_inicio: '',
    data_conclusao: '',
    descricao: '',
  });
  const [uploadForm, setUploadForm] = useState({
    tipo: 'foto' as 'foto' | 'video' | 'pdf' | 'texto',
    titulo: '',
    descricao: '',
    conteudo_texto: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadEtapas();
  }, []);

  useEffect(() => {
    if (selectedEtapa) {
      loadArquivos(selectedEtapa.id);
      setEditForm({
        percentual_concluido: selectedEtapa.percentual_concluido,
        percentual_planejado: selectedEtapa.percentual_planejado,
        data_inicio: selectedEtapa.data_inicio || '',
        data_conclusao: selectedEtapa.data_conclusao || '',
        descricao: selectedEtapa.descricao || '',
      });
    }
  }, [selectedEtapa]);

  const loadEtapas = async () => {
    const { data, error } = await supabase
      .from('etapas_obra')
      .select('*')
      .order('ordem');

    if (error) {
      toast.error('Erro ao carregar etapas');
      return;
    }
    setEtapas(data || []);
  };

  const loadArquivos = async (etapaId: string) => {
    const { data, error } = await supabase
      .from('etapas_obra_arquivos')
      .select('*')
      .eq('etapa_id', etapaId)
      .order('data_upload', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar arquivos');
      return;
    }
    setArquivos((data || []) as Arquivo[]);
  };

  const handleUpdateEtapa = async () => {
    if (!selectedEtapa) return;

    const { error } = await supabase
      .from('etapas_obra')
      .update({
        percentual_concluido: editForm.percentual_concluido,
        percentual_planejado: (editForm as any).percentual_planejado,
        data_inicio: editForm.data_inicio || null,
        data_conclusao: editForm.data_conclusao || null,
        descricao: editForm.descricao || null,
      })
      .eq('id', selectedEtapa.id);

    if (error) {
      toast.error('Erro ao atualizar etapa');
      return;
    }

    toast.success('Etapa atualizada com sucesso!');
    loadEtapas();
    setSelectedEtapa(null);
  };

  const handleUploadArquivo = async () => {
    if (!selectedEtapa) return;

    setUploading(true);
    try {
      let arquivo_url = null;

      // Upload de arquivo para o storage (exceto texto)
      if (uploadForm.tipo !== 'texto' && file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedEtapa.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('obra-fotos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('obra-fotos')
          .getPublicUrl(fileName);

        arquivo_url = urlData.publicUrl;
      }

      // Inserir registro no banco
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('etapas_obra_arquivos')
        .insert({
          etapa_id: selectedEtapa.id,
          tipo: uploadForm.tipo,
          titulo: uploadForm.titulo,
          descricao: uploadForm.descricao || null,
          arquivo_url,
          conteudo_texto: uploadForm.tipo === 'texto' ? uploadForm.conteudo_texto : null,
          uploaded_by: userData.user?.id,
        });

      if (error) throw error;

      toast.success('Arquivo adicionado com sucesso!');
      loadArquivos(selectedEtapa.id);
      setUploadForm({
        tipo: 'foto',
        titulo: '',
        descricao: '',
        conteudo_texto: '',
      });
      setFile(null);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao adicionar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteArquivo = async (id: string) => {
    const { error } = await supabase
      .from('etapas_obra_arquivos')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao deletar arquivo');
      return;
    }

    toast.success('Arquivo deletado com sucesso!');
    if (selectedEtapa) {
      loadArquivos(selectedEtapa.id);
    }
  };

  const getIconForTipo = (tipo: string) => {
    switch (tipo) {
      case 'foto': return <Image className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      case 'pdf': return <File className="h-5 w-5" />;
      case 'texto': return <FileText className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Etapas de Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {etapas.map((etapa) => (
              <Card key={etapa.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{etapa.nome}</h3>
                      <Progress value={etapa.percentual_concluido} className="mt-2 h-2" />
                      <p className="text-sm text-muted-foreground mt-1">
                        {etapa.percentual_concluido}% concluído
                      </p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEtapa(etapa)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{etapa.nome}</DialogTitle>
                        </DialogHeader>
                        <Tabs defaultValue="dados" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="dados">Dados da Etapa</TabsTrigger>
                            <TabsTrigger value="arquivos">Arquivos e Mídia</TabsTrigger>
                          </TabsList>

                          <TabsContent value="dados" className="space-y-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Percentual Concluído (%) - Real</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={editForm.percentual_concluido}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        percentual_concluido: parseInt(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>Percentual Planejado (%) - Meta</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={(editForm as any).percentual_planejado || 0}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        percentual_planejado: parseInt(e.target.value) || 0,
                                      } as any)
                                    }
                                  />
                                </div>
                              </div>

                              <div>
                                <Label>Data de Início</Label>
                                <Input
                                  type="date"
                                  value={editForm.data_inicio}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, data_inicio: e.target.value })
                                  }
                                />
                              </div>

                              <div>
                                <Label>Data de Conclusão</Label>
                                <Input
                                  type="date"
                                  value={editForm.data_conclusao}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, data_conclusao: e.target.value })
                                  }
                                />
                              </div>

                              <div>
                                <Label>Descrição</Label>
                                <Textarea
                                  value={editForm.descricao}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, descricao: e.target.value })
                                  }
                                  rows={4}
                                />
                              </div>

                              <Button onClick={handleUpdateEtapa} className="w-full">
                                <Save className="h-4 w-4 mr-2" />
                                Salvar Alterações
                              </Button>
                            </div>
                          </TabsContent>

                          <TabsContent value="arquivos" className="space-y-4">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Adicionar Novo Arquivo</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div>
                                  <Label>Tipo de Arquivo</Label>
                                  <Select
                                    value={uploadForm.tipo}
                                    onValueChange={(value: any) =>
                                      setUploadForm({ ...uploadForm, tipo: value })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="foto">Foto</SelectItem>
                                      <SelectItem value="video">Vídeo</SelectItem>
                                      <SelectItem value="pdf">PDF</SelectItem>
                                      <SelectItem value="texto">Texto</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label>Título</Label>
                                  <Input
                                    value={uploadForm.titulo}
                                    onChange={(e) =>
                                      setUploadForm({ ...uploadForm, titulo: e.target.value })
                                    }
                                  />
                                </div>

                                <div>
                                  <Label>Descrição</Label>
                                  <Textarea
                                    value={uploadForm.descricao}
                                    onChange={(e) =>
                                      setUploadForm({ ...uploadForm, descricao: e.target.value })
                                    }
                                    rows={2}
                                  />
                                </div>

                                {uploadForm.tipo === 'texto' ? (
                                  <div>
                                    <Label>Conteúdo do Texto</Label>
                                    <Textarea
                                      value={uploadForm.conteudo_texto}
                                      onChange={(e) =>
                                        setUploadForm({
                                          ...uploadForm,
                                          conteudo_texto: e.target.value,
                                        })
                                      }
                                      rows={6}
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <Label>Arquivo</Label>
                                    <Input
                                      type="file"
                                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                                      accept={
                                        uploadForm.tipo === 'foto'
                                          ? 'image/*'
                                          : uploadForm.tipo === 'video'
                                          ? 'video/*'
                                          : '.pdf'
                                      }
                                    />
                                  </div>
                                )}

                                <Button
                                  onClick={handleUploadArquivo}
                                  disabled={uploading || !uploadForm.titulo}
                                  className="w-full"
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  {uploading ? 'Enviando...' : 'Adicionar Arquivo'}
                                </Button>
                              </CardContent>
                            </Card>

                            <div className="space-y-2">
                              <h4 className="font-semibold">Arquivos Existentes</h4>
                              {arquivos.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Nenhum arquivo adicionado ainda.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {arquivos.map((arquivo) => (
                                    <Card key={arquivo.id}>
                                      <CardContent className="pt-4">
                                        <div className="flex items-start justify-between">
                                          <div className="flex gap-3">
                                            {getIconForTipo(arquivo.tipo)}
                                            <div>
                                              <h5 className="font-medium">{arquivo.titulo}</h5>
                                              {arquivo.descricao && (
                                                <p className="text-sm text-muted-foreground">
                                                  {arquivo.descricao}
                                                </p>
                                              )}
                                              <Badge variant="secondary" className="mt-1">
                                                {arquivo.tipo}
                                              </Badge>
                                            </div>
                                          </div>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteArquivo(arquivo.id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
