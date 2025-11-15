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
      // Criar workbook com UMA ÚNICA ABA
      const wb = XLSX.utils.book_new();

      // Dados combinados em uma única linha
      const dadosCombinados = [
        {
          // Dados do Comprador
          'comprador_id': 'COMP001',
          'comprador_nome': 'João da Silva Santos',
          'comprador_cpf_cnpj': '123.456.789-00',
          'comprador_telefone': '(71) 99999-9999',
          'comprador_email': 'joao@email.com',
          'comprador_quadra': 'A',
          'comprador_lote': '01',
          'comprador_grupo': 'Grupo 1',
          'comprador_empreendimento': 'Residencial La Felicità',
          'comprador_tipo_classificado': 'Comprador',
          
          // Dados do Contrato
          'contrato_numero': 'CT-2024-001',
          'contrato_numero_ficha': 'F-001',
          'contrato_data': '2024-01-15',
          'contrato_area_m2': '450',
          'contrato_valor_total': '150000',
          'contrato_valor_entrada': '30000',
          'contrato_valor_financiado': '120000',
          'contrato_numero_parcelas': '60',
          'contrato_valor_parcela': '2000',
          'contrato_situacao': 'Ativo',
          'contrato_status': 'Em dia',
          'contrato_imobiliaria': 'Imobiliária XYZ',
          'contrato_corretor': 'Maria Souza',
          
          // Dados da Parcela
          'parcela_numero': '1',
          'parcela_valor': '2000',
          'parcela_valor_original': '2000',
          'parcela_data_vencimento': '2024-02-15',
          'parcela_data_pagamento': '2024-02-10',
          'parcela_valor_pago': '2000',
          'parcela_valor_juros': '0',
          'parcela_valor_multa': '0',
          'parcela_valor_desconto': '0',
          'parcela_status': 'Pago',
          'parcela_dias_atraso': '0',
          'parcela_forma_pagamento': 'PIX',
          'parcela_banco': 'Banco do Brasil',
          'parcela_agencia': '1234-5',
          'parcela_conta': '12345-6'
        }
      ];
      
      const ws = XLSX.utils.json_to_sheet(dadosCombinados);
      XLSX.utils.book_append_sheet(wb, ws, 'Dados COHAPM');

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
      rawData.forEach((row: any) => {
        // Extrair dados do comprador
        const comprador: any = { id: row.comprador_id || row.id };
        Object.keys(row).forEach(key => {
          if (key.startsWith('comprador_')) {
            const newKey = key.replace('comprador_', '');
            comprador[newKey] = row[key];
          }
        });
        if (Object.keys(comprador).length > 1) allData.compradores.push(comprador);

        // Extrair dados do contrato
        const contrato: any = { comprador_id: row.comprador_id || row.id };
        Object.keys(row).forEach(key => {
          if (key.startsWith('contrato_')) {
            const newKey = key.replace('contrato_', '');
            contrato[newKey] = row[key];
          }
        });
        if (Object.keys(contrato).length > 1) allData.contratos.push(contrato);

        // Extrair dados da parcela
        const parcela: any = { comprador_id: row.comprador_id || row.id };
        Object.keys(row).forEach(key => {
          if (key.startsWith('parcela_')) {
            const newKey = key.replace('parcela_', '');
            parcela[newKey] = row[key];
          }
        });
        if (Object.keys(parcela).length > 1) allData.parcelas.push(parcela);
      });

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
            Baixe o template em planilha única, preencha com seus dados e faça a importação automática
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
