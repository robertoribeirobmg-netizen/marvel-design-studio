import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Upload, FileText, CheckCircle2, XCircle, AlertCircle, FileDown, RefreshCw, Terminal } from 'lucide-react';
import { downloadCooperadosTemplate } from '@/lib/cooperadosTemplateGenerator';
import ColumnMappingSelector from '@/components/ColumnMappingSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ProcessResult {
  success: number;
  errors: number;
  duplicates: number;
  updated: number;
  associated: number;
  details: Array<{
    row: number;
    status: 'success' | 'error' | 'duplicate' | 'existing' | 'updated';
    message: string;
    nome?: string;
    email?: string;
    senha?: string;
  }>;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

const requiredFields = ['tipo_usuario', 'nome_completo', 'email', 'cpf'];

const BATCH_SIZE = 30; // Processar 30 registros por vez para evitar timeout

interface UploadCooperadosLoteProps {
  onImportComplete?: () => void;
}

export function UploadCooperadosLote({ onImportComplete }: UploadCooperadosLoteProps = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[][]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: number | null }>({
    tipo_usuario: null,
    nome_completo: null,
    email: null,
    cpf: null,
    telefone: null,
    quadra: null,
    lote: null,
    fase: null
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [...prev, { timestamp, type, message }]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setLogs([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.length < 2) {
          toast.error('Arquivo vazio ou sem dados');
          return;
        }

        const headerRow = jsonData[0] as string[];
        const dataRows = jsonData.slice(1) as any[][];

        setExcelHeaders(headerRow);
        setParsedData(dataRows.filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== '')));
        setShowMapping(true);
        addLog('info', `Arquivo carregado: ${selectedFile.name}`);
        addLog('info', `${dataRows.length} linhas encontradas`);
      } catch (error) {
        console.error('Erro ao ler arquivo:', error);
        toast.error('Erro ao ler arquivo Excel');
        addLog('error', `Erro ao ler arquivo: ${error}`);
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleMappingChange = (field: string, columnIndex: number | null) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: columnIndex
    }));
  };

  const validateData = (data: any[]) => {
    const errors: Array<{ row: number; field: string; message: string; value: any }> = [];
    const tiposUsuarioValidos = ['admin', 'cooperado', 'admin_obras', 'executivo_vendas'];

    data.forEach((row, index) => {
      const rowNumber = index + 2;

      if (row.email && typeof row.email === 'string' && row.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email.trim())) {
          errors.push({
            row: rowNumber,
            field: 'email',
            message: 'Email com formato inválido',
            value: row.email
          });
        }
      }

      if (row.tipo_usuario && typeof row.tipo_usuario === 'string') {
        const tipoNormalizado = row.tipo_usuario.toLowerCase().trim();
        if (!tiposUsuarioValidos.includes(tipoNormalizado)) {
          errors.push({
            row: rowNumber,
            field: 'tipo_usuario',
            message: `Tipo de usuário inválido. Deve ser: ${tiposUsuarioValidos.join(', ')}`,
            value: row.tipo_usuario
          });
        }
      }

      if (row.nome_completo && typeof row.nome_completo === 'string') {
        if (row.nome_completo.trim().length < 3) {
          errors.push({
            row: rowNumber,
            field: 'nome_completo',
            message: 'Nome deve ter pelo menos 3 caracteres',
            value: row.nome_completo
          });
        }
      }
    });

    return errors;
  };

  const processarLote = async (cooperados: any[], batchNumber: number, totalBatches: number): Promise<ProcessResult> => {
    addLog('info', `Processando lote ${batchNumber}/${totalBatches} (${cooperados.length} registros)...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('process-cooperados-batch', {
        body: { cooperados }
      });

      if (error) {
        const errorMessage = error.message || JSON.stringify(error);
        addLog('error', `Erro no lote ${batchNumber}: ${errorMessage}`);
        
        // Retornar resultado parcial com erro
        return {
          success: 0,
          errors: cooperados.length,
          duplicates: 0,
          updated: 0,
          associated: 0,
          details: cooperados.map((c, i) => ({
            row: c.row_number,
            status: 'error' as const,
            message: `Erro de conexão: ${errorMessage}`,
            nome: c.nome_completo
          }))
        };
      }

      addLog('success', `Lote ${batchNumber} concluído: ${data.success} sucesso, ${data.duplicates} duplicados, ${data.errors} erros`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      addLog('error', `Exceção no lote ${batchNumber}: ${errorMessage}`);
      
      return {
        success: 0,
        errors: cooperados.length,
        duplicates: 0,
        updated: 0,
        associated: 0,
        details: cooperados.map((c) => ({
          row: c.row_number,
          status: 'error' as const,
          message: `Exceção: ${errorMessage}`,
          nome: c.nome_completo
        }))
      };
    }
  };

  const handleProcessar = async () => {
    setShowMapping(false);
    setIsProcessing(true);
    setProgress(0);
    setLogs([]);
    setShowLogs(true);

    try {
      // Preparar dados mapeados
      const mappedData = parsedData.map((row, index) => {
        const mapped: any = { row_number: index + 2 };
        
        Object.entries(columnMapping).forEach(([key, colIndex]) => {
          if (colIndex !== null) {
            mapped[key] = row[colIndex];
          }
        });

        return mapped;
      });

      addLog('info', `Total de registros a processar: ${mappedData.length}`);

      // Validar dados antes de processar
      const validationErrors = validateData(mappedData);
      
      if (validationErrors.length > 0) {
        addLog('error', `${validationErrors.length} erros de validação encontrados`);
        setIsProcessing(false);
        setProgress(0);
        
        const errorMessages = validationErrors.slice(0, 5).map(err => 
          `Linha ${err.row} - ${err.field}: ${err.message} (valor: "${err.value}")`
        ).join('\n');
        
        toast.error(
          `${validationErrors.length} erro(s) de validação encontrado(s)`,
          { duration: 10000 }
        );
        
        setResult({
          success: 0,
          errors: validationErrors.length,
          duplicates: 0,
          updated: 0,
          associated: 0,
          details: validationErrors.map(err => ({
            row: err.row,
            status: 'error' as const,
            message: `${err.field}: ${err.message} (valor: "${err.value}")`
          }))
        });
        
        return;
      }

      // Dividir em lotes
      const batches: any[][] = [];
      for (let i = 0; i < mappedData.length; i += BATCH_SIZE) {
        batches.push(mappedData.slice(i, i + BATCH_SIZE));
      }

      setTotalBatches(batches.length);
      addLog('info', `Dividido em ${batches.length} lote(s) de até ${BATCH_SIZE} registros`);

      // Resultado acumulado
      const finalResult: ProcessResult = {
        success: 0,
        errors: 0,
        duplicates: 0,
        updated: 0,
        associated: 0,
        details: []
      };

      // Processar cada lote sequencialmente
      for (let i = 0; i < batches.length; i++) {
        setCurrentBatch(i + 1);
        setProgress(Math.round((i / batches.length) * 100));

        const batchResult = await processarLote(batches[i], i + 1, batches.length);
        
        finalResult.success += batchResult.success;
        finalResult.errors += batchResult.errors;
        finalResult.duplicates += batchResult.duplicates;
        finalResult.updated += batchResult.updated || 0;
        finalResult.associated += batchResult.associated;
        finalResult.details.push(...batchResult.details);

        // Pequena pausa entre lotes para não sobrecarregar
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setProgress(100);
      setResult(finalResult);
      
      addLog('success', '=== IMPORTAÇÃO CONCLUÍDA ===');
      addLog('info', `Total processados: ${mappedData.length}`);
      addLog('success', `Novos cadastrados: ${finalResult.success}`);
      addLog('info', `Atualizados: ${finalResult.updated}`);
      addLog('info', `Vinculados COHAPM: ${finalResult.associated}`);
      addLog('warning', `Duplicados no lote: ${finalResult.duplicates}`);
      addLog('error', `Erros: ${finalResult.errors}`);

      if (onImportComplete && finalResult.success > 0) {
        onImportComplete();
      }
      
      const totalProcessados = finalResult.success + finalResult.updated;
      toast.success(
        `Importação concluída! ${totalProcessados} cooperado(s) processado(s) (${finalResult.success} novos, ${finalResult.updated} atualizados)`,
        { duration: 5000 }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao processar:', error);
      addLog('error', `Erro geral: ${errorMessage}`);
      toast.error(`Erro ao processar arquivo: ${errorMessage}`);
      setProgress(0);
    } finally {
      setIsProcessing(false);
      setCurrentBatch(0);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setParsedData([]);
    setExcelHeaders([]);
    setShowMapping(false);
    setResult(null);
    setProgress(0);
    setLogs([]);
    setShowLogs(false);
    setCurrentBatch(0);
    setTotalBatches(0);
    setColumnMapping({
      tipo_usuario: null,
      nome_completo: null,
      email: null,
      cpf: null,
      telefone: null,
      quadra: null,
      lote: null,
      fase: null
    });
  };

  const exportCredentials = () => {
    if (!result || (result.success === 0 && result.updated === 0)) {
      toast.error('Nenhuma credencial para exportar');
      return;
    }

    const successfulImports = result.details.filter(
      detail => (detail.status === 'success' || detail.status === 'updated') && detail.email && detail.senha
    );

    if (successfulImports.length === 0) {
      toast.error('Nenhuma credencial disponível para exportar');
      return;
    }

    const exportData = successfulImports.map((detail, index) => ({
      '#': index + 1,
      'Nome': detail.nome || '',
      'Email': detail.email || '',
      'Senha Temporária': detail.senha || '',
      'Status': detail.status === 'updated' ? 'Atualizado' : 'Novo',
      'Observação': 'Senha deve ser alterada no primeiro acesso'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    ws['!cols'] = [
      { wch: 5 },
      { wch: 40 },
      { wch: 35 },
      { wch: 20 },
      { wch: 12 },
      { wch: 40 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Credenciais');

    const fileName = `credenciais_cooperados_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast.success(`${successfulImports.length} credenciais exportadas com sucesso!`);
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload em Lote de Cooperados
        </CardTitle>
        <CardDescription>
          Importe múltiplos cooperados através de uma planilha Excel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Download Template */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h4 className="font-semibold">Template de Importação</h4>
              <p className="text-sm text-muted-foreground">
                Baixe o modelo para preenchimento
              </p>
            </div>
          </div>
          <Button onClick={downloadCooperadosTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Baixar Template
          </Button>
        </div>

        {/* Upload Area */}
        {!file && !showMapping && !result && (
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Selecione o arquivo Excel</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Arquivo .xlsx ou .xls com os dados dos cooperados
            </p>
            <Button asChild>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                Selecionar Arquivo
              </label>
            </Button>
          </div>
        )}

        {/* Column Mapping */}
        {showMapping && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Mapeie as colunas do arquivo para os campos do sistema. 
                Foram encontradas {parsedData.length} linhas de dados.
              </AlertDescription>
            </Alert>
            
            <ColumnMappingSelector
              excelHeaders={excelHeaders}
              excelData={parsedData}
              columnMapping={columnMapping}
              onMappingChange={handleMappingChange}
            />

            <div className="flex gap-2">
              <Button onClick={handleProcessar} className="flex-1">
                Processar Dados ({parsedData.length} registros)
              </Button>
              <Button onClick={resetUpload} variant="outline">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="space-y-4">
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Processando lote {currentBatch} de {totalBatches}... Por favor, aguarde.
              </AlertDescription>
            </Alert>
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              {progress}% concluído
            </p>
          </div>
        )}

        {/* Log Panel */}
        {showLogs && logs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Log de Importação
              </h4>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>
            <ScrollArea className="h-48 w-full rounded-md border bg-muted/50 p-3">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, index) => (
                  <div key={index} className={`${getLogColor(log.type)}`}>
                    <span className="text-muted-foreground">[{log.timestamp}]</span>{' '}
                    {log.message}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                      <p className="text-2xl font-bold">{result.success}</p>
                      <p className="text-xs text-muted-foreground">Novos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-cyan-600">
                    <RefreshCw className="h-5 w-5" />
                    <div>
                      <p className="text-2xl font-bold">{result.updated}</p>
                      <p className="text-xs text-muted-foreground">Atualizados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                      <p className="text-2xl font-bold">{result.associated}</p>
                      <p className="text-xs text-muted-foreground">Vinculados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-5 w-5" />
                    <div>
                      <p className="text-2xl font-bold">{result.duplicates}</p>
                      <p className="text-xs text-muted-foreground">Duplicados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <div>
                      <p className="text-2xl font-bold">{result.errors}</p>
                      <p className="text-xs text-muted-foreground">Erros</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Details */}
            {result.details.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Detalhes do Processamento</h4>
                <ScrollArea className="h-64 rounded-md border">
                  <div className="p-4 space-y-2">
                    {result.details.map((detail, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-2 p-2 rounded text-sm ${
                          detail.status === 'success'
                            ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                            : detail.status === 'updated'
                            ? 'bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200'
                            : detail.status === 'duplicate' || detail.status === 'existing'
                            ? 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
                            : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
                        }`}
                      >
                        {detail.status === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        ) : detail.status === 'updated' ? (
                          <RefreshCw className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        ) : detail.status === 'duplicate' || detail.status === 'existing' ? (
                          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-medium">Linha {detail.row}:</span>{' '}
                          {detail.nome && <span className="font-medium">{detail.nome} - </span>}
                          {detail.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {(result.success > 0 || result.updated > 0) && (
                <Button onClick={exportCredentials} variant="outline" className="flex-1">
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar Credenciais ({result.success + result.updated})
                </Button>
              )}
              <Button onClick={resetUpload} className="flex-1">
                Novo Upload
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
