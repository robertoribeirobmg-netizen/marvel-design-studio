import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Play, CheckCircle2, XCircle, Info, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export function ProcessarCOHAPMAuto() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    try {
      // Baixar template completo do servidor
      const link = document.createElement('a');
      link.href = '/template_cohapm_completo.xlsx';
      link.download = 'template_importacao_cohapm.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Template baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar template:', err);
      toast.error('Erro ao gerar template');
    }
  };

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
      
      // Processar ÚNICA ABA com dados combinados
      const allData: any = {
        compradores: [],
        contratos: [],
        parcelas: []
      };

      // Ler a primeira aba (única aba com todos os dados)
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      // Separar os dados por tipo baseado nos prefixos das colunas
      const compradoresMap = new Map();
      const contratosMap = new Map();
      const parcelasList: any[] = [];

      rawData.forEach((row: any) => {
        const compradorId = row.comprador_id || row.id;
        
        // Extrair dados do comprador (consolidar duplicatas)
        if (compradorId && !compradoresMap.has(compradorId)) {
          const comprador: any = { id: compradorId };
          Object.keys(row).forEach(key => {
            if (key.startsWith('comprador_')) {
              const newKey = key.replace('comprador_', '');
              if (row[key]) comprador[newKey] = row[key];
            }
          });
          if (Object.keys(comprador).length > 1) {
            compradoresMap.set(compradorId, comprador);
          }
        }

        // Extrair dados do contrato (consolidar duplicatas por comprador+data)
        const contratoKey = `${compradorId}_${row.contrato_data}`;
        if (compradorId && row.contrato_data && !contratosMap.has(contratoKey)) {
          const contrato: any = { comprador_id: compradorId };
          Object.keys(row).forEach(key => {
            if (key.startsWith('contrato_')) {
              const newKey = key.replace('contrato_', '');
              if (row[key]) contrato[newKey] = row[key];
            }
          });
          if (Object.keys(contrato).length > 1) {
            contratosMap.set(contratoKey, contrato);
          }
        }

        // Extrair dados da parcela (cada linha é uma parcela única)
        const parcela: any = { comprador_id: compradorId };
        let hasParcela = false;
        Object.keys(row).forEach(key => {
          // Mapear campos sem prefixo que são de parcela
          if (key === 'tipo_parcela' || key === 'vencimento_parcela' || key === 'valor_parcela' || 
              key === 'Situação' || key === 'Data Recebimento' || key === 'Desconto' || 
              key === 'Juros' || key === 'Honorarios' || key === 'Valor Pago') {
            hasParcela = true;
            const mappedKey = key.toLowerCase().replace(/\s+/g, '_');
            parcela[mappedKey] = row[key];
          }
          // Campos com prefixo parcela_
          if (key.startsWith('parcela_')) {
            hasParcela = true;
            const newKey = key.replace('parcela_', '');
            parcela[newKey] = row[key];
          }
        });
        if (hasParcela && Object.keys(parcela).length > 1) {
          parcelasList.push(parcela);
        }
      });

      // Converter maps para arrays
      allData.compradores = Array.from(compradoresMap.values());
      allData.contratos = Array.from(contratosMap.values());
      allData.parcelas = parcelasList;

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
          <CardDescription>
            Baixe o template Excel com a estrutura completa (compradores, contratos e parcelas). 
            Preencha com os dados e o sistema processará automaticamente, consolidando compradores e contratos duplicados.
            Campos suportados: tipo_parcela, vencimento_parcela, Situação, Data Recebimento, Desconto, Juros, Honorarios, Valor Pago.
          </CardDescription>
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

          <div className="space-y-3">
            <Button 
              onClick={handleDownloadTemplate}
              variant="outline"
              className="w-full" 
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Template Excel
            </Button>

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
          </div>
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
