import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileText, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import { z } from "zod";

// Schema de validação com zod
const contratoSchema = z.object({
  comprador_id: z.string().trim().min(1, "ID do comprador é obrigatório").max(50),
  numero_contrato: z.string().trim().max(100).optional(),
  data_contrato: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (formato: YYYY-MM-DD)").optional(),
  valor_total: z.string().optional(),
  valor_entrada: z.string().optional(),
  numero_parcelas: z.string().optional(),
  valor_parcela: z.string().optional(),
  status: z.string().trim().max(50).optional(),
  situacao: z.string().trim().max(50).optional(),
  quadra: z.string().trim().max(20).optional(),
  lote: z.string().trim().max(20).optional(),
  area_m2: z.string().optional(),
  corretor: z.string().trim().max(200).optional(),
  imobiliaria: z.string().trim().max(200).optional(),
});

interface ContratoCSV {
  comprador_id: string;
  numero_contrato?: string;
  data_contrato?: string;
  valor_total?: string;
  valor_entrada?: string;
  numero_parcelas?: string;
  valor_parcela?: string;
  status?: string;
  situacao?: string;
  quadra?: string;
  lote?: string;
  area_m2?: string;
  corretor?: string;
  imobiliaria?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export default function ImportacaoContratosCohapm() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<ContratoCSV[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, invalid: 0, imported: 0, errors: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setValidationErrors([]);
      previewAndValidateFile(selectedFile);
    } else {
      toast.error("Por favor selecione um arquivo CSV válido");
    }
  };

  const parseDecimal = (value?: string): number | null => {
    if (!value) return null;
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  const parseInt = (value?: string): number | null => {
    if (!value) return null;
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  };

  const previewAndValidateFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as ContratoCSV[];
        const errors: ValidationError[] = [];
        let validCount = 0;

        data.forEach((row, index) => {
          try {
            contratoSchema.parse(row);
            validCount++;
          } catch (error) {
            if (error instanceof z.ZodError) {
              error.errors.forEach(err => {
                errors.push({
                  row: index + 2, // +2 porque linha 1 é header e array começa em 0
                  field: err.path.join('.'),
                  message: err.message,
                  value: String(row[err.path[0] as keyof ContratoCSV] || '')
                });
              });
            }
          }
        });

        setPreview(data.slice(0, 5));
        setValidationErrors(errors.slice(0, 20)); // Mostrar apenas os primeiros 20 erros
        setStats({
          total: data.length,
          valid: validCount,
          invalid: data.length - validCount,
          imported: 0,
          errors: 0
        });
      },
      error: (error) => {
        console.error("Erro ao fazer preview do CSV:", error);
        toast.error("Erro ao ler arquivo CSV");
      }
    });
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Selecione um arquivo CSV");
      return;
    }

    if (validationErrors.length > 0) {
      toast.error("Corrija os erros de validação antes de importar");
      return;
    }

    setIsProcessing(true);
    let imported = 0;
    let errors = 0;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as ContratoCSV[];

        // Verificar se os compradores existem
        const compradorIds = [...new Set(data.map(c => c.comprador_id))];
        const { data: existingCompradores } = await supabase
          .from('compradores_cohapm')
          .select('id')
          .in('id', compradorIds);

        const existingIds = new Set(existingCompradores?.map(c => c.id) || []);
        const validData = data.filter(c => existingIds.has(c.comprador_id));

        if (validData.length < data.length) {
          const missing = data.length - validData.length;
          toast.warning(`${missing} contratos ignorados (compradores não encontrados)`);
        }

        // Processar em lotes de 50
        const batchSize = 50;
        for (let i = 0; i < validData.length; i += batchSize) {
          const batch = validData.slice(i, i + batchSize);
          
          const { error } = await supabase
            .from('contratos_cohapm')
            .insert(
              batch.map(contrato => ({
                comprador_id: contrato.comprador_id,
                numero_contrato: contrato.numero_contrato || null,
                data_contrato: contrato.data_contrato || null,
                valor_total: parseDecimal(contrato.valor_total),
                valor_entrada: parseDecimal(contrato.valor_entrada),
                numero_parcelas: parseInt(contrato.numero_parcelas),
                valor_parcela: parseDecimal(contrato.valor_parcela),
                status: contrato.status || null,
                situacao: contrato.situacao || null,
                quadra: contrato.quadra || null,
                lote: contrato.lote || null,
                area_m2: parseDecimal(contrato.area_m2),
                corretor: contrato.corretor || null,
                imobiliaria: contrato.imobiliaria || null,
              }))
            );

          if (error) {
            console.error('Erro ao importar lote:', error);
            errors += batch.length;
          } else {
            imported += batch.length;
          }

          setStats(prev => ({ ...prev, imported, errors }));
        }

        setIsProcessing(false);
        
        if (errors === 0) {
          toast.success(`${imported} contratos importados com sucesso!`);
          setTimeout(() => navigate('/compradores-cohapm'), 2000);
        } else {
          toast.warning(`${imported} importados, ${errors} erros`);
        }
      },
      error: (error) => {
        console.error("Erro ao processar CSV:", error);
        toast.error("Erro ao processar arquivo CSV");
        setIsProcessing(false);
      }
    });
  };

  const downloadTemplate = () => {
    const template = [
      'comprador_id,numero_contrato,data_contrato,valor_total,valor_entrada,numero_parcelas,valor_parcela,status,situacao,quadra,lote,area_m2,corretor,imobiliaria',
      '10,CONT-001,2024-01-15,150000.00,30000.00,120,1000.00,Ativo,Regular,C1,L10,250.00,João Silva,Imobiliária ABC'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_contratos_cohapm.csv';
    link.click();
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Importação de Contratos COHAPM
            </h1>
            <p className="text-muted-foreground">
              Importe contratos de compra vinculados aos compradores do sistema COHAPM
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <FileText className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-2xl font-bold">{stats.total}</h3>
              <p className="text-sm text-muted-foreground">Total de Registros</p>
            </Card>

            <Card className="p-6">
              <AlertCircle className={`h-8 w-8 mb-3 ${stats.valid > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
              <h3 className="text-2xl font-bold text-green-600">{stats.valid}</h3>
              <p className="text-sm text-muted-foreground">Registros Válidos</p>
            </Card>

            <Card className="p-6">
              <AlertCircle className={`h-8 w-8 mb-3 ${stats.invalid > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              <h3 className="text-2xl font-bold text-destructive">{stats.invalid}</h3>
              <p className="text-sm text-muted-foreground">Erros de Validação</p>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload do Arquivo CSV</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Arquivo CSV dos Contratos
                </label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />
              </div>

              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">Erros de Validação Encontrados:</p>
                    <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                      {validationErrors.map((err, idx) => (
                        <div key={idx} className="border-l-2 border-destructive pl-2">
                          <strong>Linha {err.row}, Campo "{err.field}":</strong> {err.message}
                          {err.value && <span className="text-xs"> (valor: "{err.value}")</span>}
                        </div>
                      ))}
                      {validationErrors.length >= 20 && (
                        <p className="text-xs italic">... e mais erros. Corrija os primeiros para ver os próximos.</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {preview.length > 0 && validationErrors.length === 0 && (
                <Alert>
                  <AlertDescription>
                    <p className="font-semibold mb-2 text-green-600">✓ Validação passou! Preview (5 primeiros):</p>
                    <div className="text-sm space-y-1">
                      {preview.map((cont, idx) => (
                        <div key={idx} className="border-l-2 border-primary pl-2">
                          <strong>Comprador {cont.comprador_id}</strong> - Contrato: {cont.numero_contrato || 'N/A'} - 
                          Valor: R$ {cont.valor_total || '0'}
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {isProcessing && (
                <Alert>
                  <AlertDescription>
                    <p className="font-semibold mb-2">Processando importação...</p>
                    <p className="text-sm">
                      Importados: {stats.imported} de {stats.valid}
                      {stats.errors > 0 && ` | Erros: ${stats.errors}`}
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleImport}
                  disabled={!file || isProcessing || validationErrors.length > 0}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isProcessing ? 'Importando...' : 'Importar Contratos'}
                </Button>

                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Baixar Template
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-muted">
            <h3 className="font-semibold mb-3">ℹ️ Campos do CSV</h3>
            <div className="text-sm space-y-2 text-muted-foreground">
              <p>• <strong>comprador_id*</strong>: ID do comprador (obrigatório, máx. 50 caracteres)</p>
              <p>• <strong>numero_contrato</strong>: Número do contrato (máx. 100 caracteres)</p>
              <p>• <strong>data_contrato</strong>: Data no formato YYYY-MM-DD</p>
              <p>• <strong>valor_total, valor_entrada, valor_parcela</strong>: Valores numéricos</p>
              <p>• <strong>numero_parcelas</strong>: Número inteiro</p>
              <p>• <strong>status, situacao</strong>: Texto livre (máx. 50 caracteres)</p>
              <p>• <strong>quadra, lote</strong>: Identificação do imóvel (máx. 20 caracteres)</p>
              <p className="text-xs italic mt-3">* Campos obrigatórios</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
