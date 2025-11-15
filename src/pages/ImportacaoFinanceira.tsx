import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as XLSX from 'xlsx';

export default function ImportacaoFinanceira() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resultado, setResultado] = useState<{
    success: boolean;
    investimentosCriados?: number;
    parcelasCriadas?: number;
    parcelasAtualizadas?: number;
    totalClientes?: number;
    erros?: string[];
    error?: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar tipo de arquivo
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
        return;
      }
      setFile(selectedFile);
      setResultado(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecione um arquivo para importar');
      return;
    }

    setIsUploading(true);
    setResultado(null);

    try {
      // Ler o arquivo Excel
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

      // Agrupar parcelas por cliente
      const parcelasPorCliente: Record<string, any[]> = {};
      
      // Pular o cabeçalho (linha 0)
      for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        if (!row[0] || !row[1]) continue;

        const quadraLote = String(row[0] || '').trim();
        const cliente = String(row[1] || '').trim().toUpperCase();
        
        if (!cliente) continue;

        const parcela = {
          quadraLote,
          cliente,
          descricao: String(row[2] || '').trim(),
          vencimento: String(row[3] || '').trim(),
          valor: parseFloat(String(row[4] || '0').replace(/[R$\s.]/g, '').replace(',', '.')),
          situacao: String(row[5] || '').trim().toUpperCase(),
          dataRecebimento: row[6] ? String(row[6]).trim() : null,
          desconto: parseFloat(String(row[7] || '0').replace(/[R$\s.]/g, '').replace(',', '.')),
          juros: parseFloat(String(row[8] || '0').replace(/[R$\s.]/g, '').replace(',', '.')),
          honorarios: parseFloat(String(row[9] || '0').replace(/[R$\s.]/g, '').replace(',', '.')),
          valorPago: parseFloat(String(row[10] || '0').replace(/[R$\s.]/g, '').replace(',', '.'))
        };

        if (!parcelasPorCliente[cliente]) {
          parcelasPorCliente[cliente] = [];
        }
        parcelasPorCliente[cliente].push(parcela);
      }

      // Analisar dados primeiro (dry run)
      const { data: analiseData, error: analiseError } = await supabase.functions.invoke('import-financial-data', {
        body: { parcelasPorCliente, dryRun: true },
      });

      if (analiseError) throw analiseError;

      // Navegar para preview
      navigate('/preview-importacao-financeira', {
        state: { parcelasPorCliente, analise: analiseData }
      });
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao processar o arquivo: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Importação de Dados Financeiros
          </CardTitle>
          <CardDescription>
            Importe dados de investimentos e parcelas a partir de um arquivo Excel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instruções */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Formato esperado do Excel:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Quadra/Lote | Cliente | Descrição | Vencimento | Valor | Situação | Data Recebimento | Desconto | Juros | Honorários | Valor Pago</li>
                <li>O sistema identificará automaticamente os clientes cadastrados</li>
                <li>Situação deve ser "PAGO" ou "A Vencer"</li>
                <li>Datas no formato MM/DD/AAAA</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="whitespace-nowrap"
              >
                {isUploading ? (
                  'Processando...'
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </>
                )}
              </Button>
            </div>

            {file && !isUploading && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {file.name}
              </p>
            )}
          </div>

          {/* Resultado */}
          {resultado && (
            <Alert variant={resultado.success ? 'default' : 'destructive'}>
              {resultado.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {resultado.success ? (
                  <div className="space-y-2">
                    <p className="font-semibold">Importação concluída com sucesso!</p>
                    <ul className="text-sm space-y-1">
                      {resultado.investimentosCriados > 0 && (
                        <li>✓ {resultado.investimentosCriados} investimentos criados</li>
                      )}
                      {resultado.parcelasCriadas > 0 && (
                        <li>✓ {resultado.parcelasCriadas} parcelas criadas</li>
                      )}
                      {resultado.parcelasAtualizadas > 0 && (
                        <li>✓ {resultado.parcelasAtualizadas} parcelas atualizadas</li>
                      )}
                      <li>✓ {resultado.totalClientes} clientes processados</li>
                    </ul>
                    {resultado.erros && resultado.erros.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium">
                          Ver erros ({resultado.erros.length})
                        </summary>
                        <ul className="mt-2 text-xs space-y-1 text-muted-foreground">
                          {resultado.erros.map((erro: string, i: number) => (
                            <li key={i}>• {erro}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ) : (
                  <p>{resultado.error}</p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
