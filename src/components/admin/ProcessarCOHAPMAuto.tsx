import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Play, CheckCircle2, XCircle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export function ProcessarCOHAPMAuto() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcessar = async () => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setStats(null);

    try {
      toast.info('Carregando arquivo Excel...');
      setProgress(5);

      // Carregar arquivo
      const fileResponse = await fetch('/compradores_cohapm_dados_completos.xlsx');
      if (!fileResponse.ok) throw new Error('Arquivo não encontrado');

      const fileBlob = await fileResponse.blob();
      const arrayBuffer = await fileBlob.arrayBuffer();

      toast.info('Processando Excel no navegador...');
      setProgress(15);

      // Parse Excel no CLIENTE (evita timeout no Edge Function)
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      console.log(`📊 Total de registros: ${data.length}`);
      toast.info(`${data.length} registros encontrados`);
      setProgress(25);

      // Processar em lotes de 10 registros
      const BATCH_SIZE = 10;
      const totalBatches = Math.ceil(data.length / BATCH_SIZE);
      
      const globalStats = {
        total: data.length,
        inseridos: 0,
        atualizados: 0,
        erros: 0,
      };

      for (let i = 0; i < totalBatches; i++) {
        const batch = data.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        
        try {
          const { data: result, error: batchError } = await supabase.functions.invoke(
            'batch-insert-cohapm',
            {
              body: { batch }
            }
          );

          if (batchError) throw batchError;

          if (result?.stats) {
            globalStats.inseridos += result.stats.inseridos;
            globalStats.atualizados += result.stats.atualizados;
            globalStats.erros += result.stats.erros;
          }

          // Atualizar progresso
          const progressPercent = 25 + ((i + 1) / totalBatches) * 70;
          setProgress(progressPercent);

          console.log(`✅ Lote ${i + 1}/${totalBatches} processado`);
        } catch (err: any) {
          console.error(`Erro no lote ${i + 1}:`, err);
          globalStats.erros += batch.length;
        }

        // Pequena pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setProgress(100);
      setStats(globalStats);
      
      toast.success('Processamento concluído!', {
        description: `${globalStats.inseridos} inseridos, ${globalStats.atualizados} atualizados, ${globalStats.erros} erros`
      });

    } catch (err: any) {
      console.error('Erro:', err);
      setError(err.message || 'Erro ao processar');
      toast.error('Erro ao processar dados COHAPM');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Processamento Otimizado:</strong> O Excel é processado no navegador e enviado em lotes de 10 registros.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Processar Dados COHAPM
          </CardTitle>
          <CardDescription>Importação automática de 726 compradores</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">
                {progress < 25 ? 'Carregando arquivo...' : 
                 progress < 95 ? 'Importando dados...' : 
                 'Finalizando...'}
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleProcessar} 
            disabled={isProcessing} 
            className="w-full" 
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Iniciar Importação
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
              Processamento Concluído
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Inseridos</p>
                <p className="text-2xl font-bold text-success">{stats.inseridos}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Atualizados</p>
                <p className="text-2xl font-bold text-primary">{stats.atualizados}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Erros</p>
                <p className="text-2xl font-bold text-destructive">{stats.erros}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
