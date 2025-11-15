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
      // Criar workbook com 3 abas
      const wb = XLSX.utils.book_new();

      // Aba 1: Compradores
      const compradoresData = [
        {
          'id': 'Exemplo: COMP001',
          'nome': 'João da Silva Santos',
          'cpf_cnpj': '123.456.789-00',
          'telefone': '(71) 99999-9999',
          'email': 'joao@email.com',
          'quadra': 'A',
          'lote': '01',
          'grupo': 'Grupo 1',
          'empreendimento': 'Residencial La Felicità',
          'tipo_classificado': 'Comprador',
          'financeiro_valor_total': '150000',
          'financeiro_valor_pago': '50000',
          'financeiro_valor_pendente': '100000',
          'total_contratos': '1',
          'total_parcelas': '60',
          'financeiro_parcelas_atrasadas': '0',
          'financeiro_situacao': 'Em dia'
        }
      ];
      const wsCompradores = XLSX.utils.json_to_sheet(compradoresData);
      XLSX.utils.book_append_sheet(wb, wsCompradores, 'Compradores');

      // Aba 2: Contratos
      const contratosData = [
        {
          'comprador_id': 'COMP001',
          'numero_contrato': 'CT-2024-001',
          'numero_ficha': 'F-001',
          'data_contrato': '2024-01-15',
          'quadra': 'A',
          'lote': '01',
          'area_m2': '450',
          'metragem': '450',
          'valor_total': '150000',
          'valor_entrada': '30000',
          'valor_financiado': '120000',
          'numero_parcelas': '60',
          'valor_parcela': '2000',
          'situacao': 'Ativo',
          'status': 'Em dia',
          'imobiliaria': 'Imobiliária XYZ',
          'corretor': 'Maria Souza',
          'observacoes': ''
        }
      ];
      const wsContratos = XLSX.utils.json_to_sheet(contratosData);
      XLSX.utils.book_append_sheet(wb, wsContratos, 'Contratos');

      // Aba 3: Parcelas
      const parcelasData = [
        {
          'comprador_id': 'COMP001',
          'contrato_id': '1',
          'numero_parcela': '1',
          'valor_parcela': '2000',
          'valor_original': '2000',
          'data_vencimento': '2024-02-15',
          'data_pagamento': '2024-02-10',
          'data_recebimento': '2024-02-10',
          'data_lancamento': '2024-01-15',
          'valor_pago': '2000',
          'valor_juros': '0',
          'valor_multa': '0',
          'valor_desconto': '0',
          'valor_total_calculado': '2000',
          'status': 'Pago',
          'dias_atraso': '0',
          'forma_pagamento': 'PIX',
          'banco': 'Banco do Brasil',
          'agencia': '1234-5',
          'conta': '12345-6',
          'periodo_inicio': '2024-02-01',
          'periodo_fim': '2024-02-28',
          'numero_lancamento': 'LC-001',
          'numero_baixa': 'BX-001',
          'codigo_remessa': 'RM-001',
          'observacoes': ''
        }
      ];
      const wsParcelas = XLSX.utils.json_to_sheet(parcelasData);
      XLSX.utils.book_append_sheet(wb, wsParcelas, 'Parcelas');

      // Fazer download
      XLSX.writeFile(wb, 'template_importacao_cohapm.xlsx');
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
          <CardDescription>
            Baixe o template, preencha com seus dados e faça a importação automática
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
