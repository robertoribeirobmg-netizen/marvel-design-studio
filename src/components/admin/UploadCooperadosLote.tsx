import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { downloadCooperadosTemplate } from '@/lib/cooperadosTemplateGenerator';
import ColumnMappingSelector from '@/components/ColumnMappingSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ProcessResult {
  success: number;
  errors: number;
  duplicates: number;
  associated: number;
  details: Array<{
    row: number;
    status: 'success' | 'error' | 'duplicate';
    message: string;
    nome?: string;
  }>;
}

const requiredFields = ['tipo_usuario', 'nome_completo', 'email', 'cpf'];

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
  const [result, setResult] = useState<ProcessResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

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
      } catch (error) {
        console.error('Erro ao ler arquivo:', error);
        toast.error('Erro ao ler arquivo Excel');
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

  const validateMapping = () => {
    const missingFields = requiredFields.filter(field => columnMapping[field] === null);
    if (missingFields.length > 0) {
      toast.error(`Campos obrigatórios não mapeados: ${missingFields.join(', ')}`);
      return false;
    }
    return true;
  };

  const handleProcessar = async () => {
    if (!validateMapping()) return;

    setShowMapping(false);
    setIsProcessing(true);
    setProgress(0);

    try {
      // Preparar dados mapeados
      const mappedData = parsedData.map((row, index) => {
        const mapped: any = { row_number: index + 2 }; // +2 porque Excel começa em 1 e pulamos header
        
        Object.entries(columnMapping).forEach(([key, colIndex]) => {
          if (colIndex !== null) {
            mapped[key] = row[colIndex];
          }
        });

        return mapped;
      });

      console.log('Enviando dados:', mappedData);

      // Simular progresso enquanto processa
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);

      // Chamar edge function para processar
      const { data, error } = await supabase.functions.invoke('process-cooperados-batch', {
        body: { cooperados: mappedData }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        console.error('Erro da edge function:', error);
        throw error;
      }

      setResult(data);
      
      // Notificar que a importação foi concluída para atualizar a lista
      if (onImportComplete && data.success > 0) {
        onImportComplete();
      }
      
      // Notificações detalhadas
      const total = mappedData.length;
      const processed = data.success + data.duplicates + data.errors;
      
      toast.success(
        `Importação concluída! ${data.success} de ${total} cooperado(s) cadastrado(s) com sucesso`,
        { duration: 5000 }
      );
      
      if (data.associated > 0) {
        toast.info(`${data.associated} cooperado(s) vinculado(s) aos dados financeiros COHAPM`);
      }
      
      if (data.duplicates > 0) {
        toast.warning(`${data.duplicates} cooperado(s) já cadastrado(s) anteriormente`);
      }
      
      if (data.errors > 0) {
        toast.error(`${data.errors} erro(s) encontrado(s). Verifique os detalhes abaixo.`);
      }

    } catch (error) {
      console.error('Erro ao processar:', error);
      toast.error('Erro ao processar arquivo. Tente novamente.');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setParsedData([]);
    setExcelHeaders([]);
    setShowMapping(false);
    setResult(null);
    setProgress(0);
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
                Processar Dados
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
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Processando cooperados... Por favor, aguarde.
              </AlertDescription>
            </Alert>
            <Progress value={progress} />
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                      <p className="text-2xl font-bold">{result.success}</p>
                      <p className="text-xs text-muted-foreground">Cadastrados</p>
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
                      <p className="text-xs text-muted-foreground">Vinculados COHAPM</p>
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
            {result.details && result.details.length > 0 && (
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                <h4 className="font-semibold mb-3">Detalhes do Processamento</h4>
                <div className="space-y-2">
                  {result.details.map((detail, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 p-2 rounded text-sm ${
                        detail.status === 'success'
                          ? 'bg-green-50 text-green-800'
                          : detail.status === 'duplicate'
                          ? 'bg-yellow-50 text-yellow-800'
                          : 'bg-red-50 text-red-800'
                      }`}
                    >
                      {detail.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : detail.status === 'duplicate' ? (
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">Linha {detail.row}</p>
                        {detail.nome && <p className="text-xs opacity-75">{detail.nome}</p>}
                        <p>{detail.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
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
