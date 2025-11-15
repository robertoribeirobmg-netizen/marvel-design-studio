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
      
      // Processar todas as abas
      const allData: any = {
        compradores: [],
        contratos: [],
        parcelas: []
      };

      // Aba de compradores
      if (workbook.SheetNames.includes('Compradores') || workbook.SheetNames[0]) {
        const sheetName = workbook.SheetNames.includes('Compradores') ? 'Compradores' : workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        allData.compradores = XLSX.utils.sheet_to_json(worksheet);
      }

      // Aba de contratos
      if (workbook.SheetNames.includes('Contratos')) {
        const worksheet = workbook.Sheets['Contratos'];
        allData.contratos = XLSX.utils.sheet_to_json(worksheet);
      }

      // Aba de parcelas
      if (workbook.SheetNames.includes('Parcelas')) {
        const worksheet = workbook.Sheets['Parcelas'];
        allData.parcelas = XLSX.utils.sheet_to_json(worksheet);
      }

      const totalRegistros = allData.compradores.length + allData.contratos.length + allData.parcelas.length;
      console.log(`📊 Compradores: ${allData.compradores.length}, Contratos: ${allData.contratos.length}, Parcelas: ${allData.parcelas.length}`);
      toast.info(`${totalRegistros} registros encontrados (${allData.compradores.length} compradores, ${allData.contratos.length} contratos, ${allData.parcelas.length} parcelas)`);
      setProgress(25);

      // Processar em lotes de 10 registros
      const BATCH_SIZE = 10;
      
      const globalStats = {
        total: totalRegistros,
        compradores: { inseridos: 0, atualizados: 0, erros: 0 },
        contratos: { inseridos: 0, atualizados: 0, erros: 0 },
        parcelas: { inseridos: 0, atualizados: 0, erros: 0 },
      };

      // Processar COMPRADORES
      if (allData.compradores.length > 0) {
        toast.info('Processando compradores...');
        const totalBatches = Math.ceil(allData.compradores.length / BATCH_SIZE);
        
        for (let i = 0; i < totalBatches; i++) {
          const batch = allData.compradores.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
          
          try {
            const { data: result, error: batchError } = await supabase.functions.invoke(
              'batch-insert-cohapm',
              {
                body: { tipo: 'compradores', batch }
              }
            );

            if (batchError) throw batchError;

            if (result?.stats) {
              globalStats.compradores.inseridos += result.stats.inseridos;
              globalStats.compradores.atualizados += result.stats.atualizados;
              globalStats.compradores.erros += result.stats.erros;
            }

            const progressPercent = 25 + ((i + 1) / totalBatches) * 25;
            setProgress(progressPercent);
          } catch (err: any) {
            console.error(`Erro no lote ${i + 1}:`, err);
            globalStats.compradores.erros += batch.length;
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Processar CONTRATOS
      if (allData.contratos.length > 0) {
        toast.info('Processando contratos...');
        const totalBatches = Math.ceil(allData.contratos.length / BATCH_SIZE);
        
        for (let i = 0; i < totalBatches; i++) {
          const batch = allData.contratos.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
          
          try {
            const { data: result, error: batchError } = await supabase.functions.invoke(
              'batch-insert-cohapm',
              {
                body: { tipo: 'contratos', batch }
              }
            );

            if (batchError) throw batchError;

            if (result?.stats) {
              globalStats.contratos.inseridos += result.stats.inseridos;
              globalStats.contratos.atualizados += result.stats.atualizados;
              globalStats.contratos.erros += result.stats.erros;
            }

            const progressPercent = 50 + ((i + 1) / totalBatches) * 20;
            setProgress(progressPercent);
          } catch (err: any) {
            console.error(`Erro no lote ${i + 1}:`, err);
            globalStats.contratos.erros += batch.length;
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Processar PARCELAS
      if (allData.parcelas.length > 0) {
        toast.info('Processando parcelas...');
        const totalBatches = Math.ceil(allData.parcelas.length / BATCH_SIZE);
        
        for (let i = 0; i < totalBatches; i++) {
          const batch = allData.parcelas.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
          
          try {
            const { data: result, error: batchError } = await supabase.functions.invoke(
              'batch-insert-cohapm',
              {
                body: { tipo: 'parcelas', batch }
              }
            );

            if (batchError) throw batchError;

            if (result?.stats) {
              globalStats.parcelas.inseridos += result.stats.inseridos;
              globalStats.parcelas.atualizados += result.stats.atualizados;
              globalStats.parcelas.erros += result.stats.erros;
            }

            const progressPercent = 70 + ((i + 1) / totalBatches) * 25;
            setProgress(progressPercent);
          } catch (err: any) {
            console.error(`Erro no lote ${i + 1}:`, err);
            globalStats.parcelas.erros += batch.length;
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setProgress(100);
      setStats(globalStats);
      
      const totalInseridos = globalStats.compradores.inseridos + globalStats.contratos.inseridos + globalStats.parcelas.inseridos;
      const totalAtualizados = globalStats.compradores.atualizados + globalStats.contratos.atualizados + globalStats.parcelas.atualizados;
      const totalErros = globalStats.compradores.erros + globalStats.contratos.erros + globalStats.parcelas.erros;
      
      toast.success('Processamento completo concluído!', {
        description: `Total: ${totalInseridos} inseridos, ${totalAtualizados} atualizados, ${totalErros} erros`
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
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Compradores</h4>
                <div className="pl-4 space-y-1 text-sm">
                  <div className="flex justify-between text-success">
                    <span>Inseridos:</span>
                    <span className="font-bold">{stats.compradores.inseridos}</span>
                  </div>
                  <div className="flex justify-between text-primary">
                    <span>Atualizados:</span>
                    <span className="font-bold">{stats.compradores.atualizados}</span>
                  </div>
                  {stats.compradores.erros > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Erros:</span>
                      <span className="font-bold">{stats.compradores.erros}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Contratos</h4>
                <div className="pl-4 space-y-1 text-sm">
                  <div className="flex justify-between text-success">
                    <span>Inseridos:</span>
                    <span className="font-bold">{stats.contratos.inseridos}</span>
                  </div>
                  <div className="flex justify-between text-primary">
                    <span>Atualizados:</span>
                    <span className="font-bold">{stats.contratos.atualizados}</span>
                  </div>
                  {stats.contratos.erros > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Erros:</span>
                      <span className="font-bold">{stats.contratos.erros}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Parcelas</h4>
                <div className="pl-4 space-y-1 text-sm">
                  <div className="flex justify-between text-success">
                    <span>Inseridos:</span>
                    <span className="font-bold">{stats.parcelas.inseridos}</span>
                  </div>
                  <div className="flex justify-between text-primary">
                    <span>Atualizados:</span>
                    <span className="font-bold">{stats.parcelas.atualizados}</span>
                  </div>
                  {stats.parcelas.erros > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Erros:</span>
                      <span className="font-bold">{stats.parcelas.erros}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
