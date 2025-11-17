import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Play, CheckCircle2, XCircle, Info, Loader2, Download, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { COHAPMColumnMapper } from './COHAPMColumnMapper';
import { Input } from '@/components/ui/input';

export function ProcessarCOHAPMAuto() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showMapping, setShowMapping] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const targetFields = {
    // Campos do Comprador
    'comprador_id': 'ID do Comprador',
    'comprador_nome': 'Nome do Comprador',
    'comprador_cpf_cnpj': 'CPF/CNPJ',
    'comprador_telefone': 'Telefone',
    'comprador_email': 'Email',
    'comprador_quadra': 'Quadra',
    'comprador_lote': 'Lote',
    'comprador_grupo': 'Grupo',
    'comprador_empreendimento': 'Empreendimento',
    'comprador_tipo_classificado': 'Tipo Classificado',
    // Campos do Contrato
    'contrato_data': 'Data do Contrato',
    'contrato_area_m2': 'Área (m²)',
    'contrato_valor_total': 'Valor Total do Contrato',
    // Campos da Parcela
    'tipo_parcela': 'Tipo de Parcela',
    'vencimento_parcela': 'Vencimento da Parcela',
    'valor_parcela': 'Valor da Parcela',
    'situacao': 'Situação',
    'data_recebimento': 'Data Recebimento',
    'desconto': 'Desconto',
    'juros': 'Juros',
    'honorarios': 'Honorários',
    'valor_pago': 'Valor Pago',
  };

  const handleDownloadTemplate = () => {
    try {
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      setPreviewData(data.slice(0, 5));
      setShowMapping(true);
      toast.success('Arquivo carregado! Configure o mapeamento de colunas.');
    } catch (err) {
      console.error('Erro ao ler arquivo:', err);
      setError('Erro ao ler arquivo Excel');
      toast.error('Erro ao ler arquivo Excel');
    }
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

  const handleProcessar = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecione um arquivo Excel');
      return;
    }

    if (Object.keys(columnMapping).length === 0) {
      toast.error('Por favor, configure o mapeamento de colunas');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setStats(null);

    try {
      toast.info('Processando arquivo Excel...');
      setProgress(5);

      const arrayBuffer = await selectedFile.arrayBuffer();

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
        // Aplicar mapeamento de colunas
        const mappedRow: any = {};
        Object.keys(columnMapping).forEach(excelCol => {
          const systemCol = columnMapping[excelCol];
          if (systemCol && row[excelCol] !== undefined) {
            mappedRow[systemCol] = row[excelCol];
          }
        });

        const compradorId = mappedRow.comprador_id;
        
        // Extrair dados do comprador (consolidar duplicatas)
        if (compradorId && !compradoresMap.has(compradorId)) {
          const comprador: any = { id: compradorId };
          Object.keys(mappedRow).forEach(key => {
            if (key.startsWith('comprador_')) {
              const newKey = key.replace('comprador_', '');
              if (mappedRow[key]) comprador[newKey] = mappedRow[key];
            }
          });
          if (Object.keys(comprador).length > 1) {
            compradoresMap.set(compradorId, comprador);
          }
        }

        // Extrair dados do contrato (consolidar duplicatas por comprador+data)
        const contratoKey = `${compradorId}_${mappedRow.contrato_data}`;
        if (compradorId && mappedRow.contrato_data && !contratosMap.has(contratoKey)) {
          const contrato: any = { comprador_id: compradorId };
          Object.keys(mappedRow).forEach(key => {
            if (key.startsWith('contrato_')) {
              const newKey = key.replace('contrato_', '');
              if (mappedRow[key]) contrato[newKey] = mappedRow[key];
            }
          });
          if (Object.keys(contrato).length > 1) {
            contratosMap.set(contratoKey, contrato);
          }
        }

        // Extrair dados da parcela (cada linha é uma parcela única)
        const parcela: any = { comprador_id: compradorId };
        let hasParcela = false;
        Object.keys(mappedRow).forEach(key => {
          if (key === 'tipo_parcela' || key === 'vencimento_parcela' || key === 'valor_parcela' || 
              key === 'situacao' || key === 'data_recebimento' || key === 'desconto' || 
              key === 'juros' || key === 'honorarios' || key === 'valor_pago') {
            hasParcela = true;
            parcela[key] = mappedRow[key];
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
          <strong>Nova Importação:</strong> Selecione um arquivo Excel, mapeie as colunas e processe os dados em lotes otimizados.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Dados COHAPM
          </CardTitle>
          <CardDescription>
            Faça upload da planilha Excel e configure o mapeamento de colunas para importar compradores, contratos e parcelas.
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

          <div className="space-y-4">
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
              <label className="text-sm font-medium">Selecionar Arquivo Excel</label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
            </div>

            {showMapping && previewData.length > 0 && (
              <COHAPMColumnMapper
                previewData={previewData}
                targetFields={targetFields}
                onMappingChange={setColumnMapping}
              />
            )}

            <Button 
              onClick={handleProcessar} 
              disabled={isProcessing || !selectedFile || Object.keys(columnMapping).length === 0} 
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
