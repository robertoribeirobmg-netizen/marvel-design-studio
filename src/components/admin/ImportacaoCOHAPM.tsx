import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Download, Info, Zap, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProcessarCOHAPMAuto } from './ProcessarCOHAPMAuto';

export function ImportacaoCOHAPM() {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [isClearing, setIsClearing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStats(null);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/compradores_cohapm_template.xlsx', '_blank');
  };

  const handleClearDatabase = async () => {
    if (!confirm('⚠️ ATENÇÃO: Esta ação irá apagar TODOS os dados de compradores, contratos e parcelas COHAPM do banco de dados. Esta ação não pode ser desfeita. Deseja continuar?')) {
      return;
    }

    setIsClearing(true);
    try {
      toast.info('Limpando dados do banco...');

      // Deletar parcelas primeiro (devido às foreign keys)
      const { error: parcelasError } = await supabase
        .from('parcelas_cohapm')
        .delete()
        .neq('id', 0); // Deleta todos os registros

      if (parcelasError) throw parcelasError;

      // Deletar contratos
      const { error: contratosError } = await supabase
        .from('contratos_cohapm')
        .delete()
        .neq('id', 0);

      if (contratosError) throw contratosError;

      // Deletar compradores
      const { error: compradoresError } = await supabase
        .from('compradores_cohapm')
        .delete()
        .neq('id', '');

      if (compradoresError) throw compradoresError;

      toast.success('Todos os dados COHAPM foram removidos com sucesso!');
      setStats(null);
    } catch (err: any) {
      console.error('Erro ao limpar banco:', err);
      toast.error('Erro ao limpar dados: ' + err.message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecione um arquivo Excel para importar');
      return;
    }

    setIsImporting(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      setProgress(30);

      const { data, error } = await supabase.functions.invoke('import-cohapm-data', {
        body: formData,
      });

      if (error) throw error;

      setProgress(100);
      setStats(data.stats);
      toast.success('Importação concluída com sucesso!');
      
      setFile(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast.error(error.message || 'Erro ao importar dados');
    } finally {
      setIsImporting(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="auto" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="auto" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Processamento Automático
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auto">
          <ProcessarCOHAPMAuto />
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Esta ferramenta permite importar os 726 compradores do sistema COHAPM com todos os dados cadastrais e financeiros.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Importar Dados COHAPM
              </CardTitle>
              <CardDescription>
                Importe o arquivo Excel com os 726 compradores do sistema COHAPM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-3">
                <Button 
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  className="flex-1" 
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Template
                </Button>

                <Button 
                  onClick={handleClearDatabase}
                  disabled={isClearing}
                  variant="destructive"
                  className="flex-1" 
                  size="lg"
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Limpando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpar Banco
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <label htmlFor="file-input" className="text-sm font-medium">
                  Selecionar Arquivo Excel
                </label>
                <Input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={isImporting}
                  className="cursor-pointer"
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Arquivo selecionado: {file.name}
                  </p>
                )}
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importando...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={!file || isImporting}
                className="w-full"
                size="lg"
              >
                {isImporting ? 'Importando...' : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Dados
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Importação Concluída
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Processado</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <div className="p-4 border rounded-lg border-green-500/20 bg-green-500/5">
                    <p className="text-sm text-muted-foreground">Inseridos</p>
                    <p className="text-2xl font-bold text-green-600">{stats.inseridos}</p>
                  </div>
                  <div className="p-4 border rounded-lg border-blue-500/20 bg-blue-500/5">
                    <p className="text-sm text-muted-foreground">Atualizados</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.atualizados}</p>
                  </div>
                  <div className="p-4 border rounded-lg border-red-500/20 bg-red-500/5">
                    <p className="text-sm text-muted-foreground">Erros</p>
                    <p className="text-2xl font-bold text-red-600">{stats.erros}</p>
                  </div>
                </div>

                {stats.detalhes && stats.detalhes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      Detalhes dos Erros
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {stats.detalhes.map((detalhe: any, index: number) => (
                        <div key={index} className="p-3 border rounded bg-destructive/5 text-sm">
                          <p className="font-medium">{detalhe.nome}</p>
                          <p className="text-muted-foreground">{detalhe.erro}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
