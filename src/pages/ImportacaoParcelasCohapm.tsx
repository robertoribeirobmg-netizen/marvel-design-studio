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
const parcelaSchema = z.object({
  contrato_id: z.string().trim().min(1, "ID do contrato é obrigatório"),
  comprador_id: z.string().trim().min(1, "ID do comprador é obrigatório").max(50),
  numero_parcela: z.string().regex(/^\d+$/, "Número da parcela deve ser um inteiro"),
  data_vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (formato: YYYY-MM-DD)"),
  valor_parcela: z.string().min(1, "Valor da parcela é obrigatório"),
  valor_pago: z.string().optional(),
  data_pagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (formato: YYYY-MM-DD)").optional().or(z.literal('')),
  status: z.string().trim().max(50).optional(),
  dias_atraso: z.string().optional(),
  valor_juros: z.string().optional(),
  valor_multa: z.string().optional(),
  valor_desconto: z.string().optional(),
});

interface ParcelaCSV {
  contrato_id: string;
  comprador_id: string;
  numero_parcela: string;
  data_vencimento: string;
  valor_parcela: string;
  valor_pago?: string;
  data_pagamento?: string;
  status?: string;
  dias_atraso?: string;
  valor_juros?: string;
  valor_multa?: string;
  valor_desconto?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export default function ImportacaoParcelasCohapm() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<ParcelaCSV[]>([]);
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
        const data = results.data as ParcelaCSV[];
        const errors: ValidationError[] = [];
        let validCount = 0;

        data.forEach((row, index) => {
          try {
            parcelaSchema.parse(row);
            validCount++;
          } catch (error) {
            if (error instanceof z.ZodError) {
              error.errors.forEach(err => {
                errors.push({
                  row: index + 2,
                  field: err.path.join('.'),
                  message: err.message,
                  value: String(row[err.path[0] as keyof ParcelaCSV] || '')
                });
              });
            }
          }
        });

        setPreview(data.slice(0, 5));
        setValidationErrors(errors.slice(0, 20));
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
        const data = results.data as ParcelaCSV[];

        // Verificar se os contratos existem
        const contratoIds = [...new Set(data.map(p => parseInt(p.contrato_id)))].filter(Boolean);
        const { data: existingContratos } = await supabase
          .from('contratos_cohapm')
          .select('id')
          .in('id', contratoIds as number[]);

        const existingIds = new Set(existingContratos?.map(c => c.id) || []);
        const validData = data.filter(p => {
          const contratoId = parseInt(p.contrato_id);
          return contratoId && existingIds.has(contratoId);
        });

        if (validData.length < data.length) {
          const missing = data.length - validData.length;
          toast.warning(`${missing} parcelas ignoradas (contratos não encontrados)`);
        }

        // Processar em lotes de 100
        const batchSize = 100;
        for (let i = 0; i < validData.length; i += batchSize) {
          const batch = validData.slice(i, i + batchSize);
          
          const { error } = await supabase
            .from('parcelas_cohapm')
            .insert(
              batch.map(parcela => ({
                contrato_id: parseInt(parcela.contrato_id),
                comprador_id: parcela.comprador_id,
                numero_parcela: parseInt(parcela.numero_parcela),
                data_vencimento: parcela.data_vencimento,
                valor_parcela: parseDecimal(parcela.valor_parcela),
                valor_pago: parseDecimal(parcela.valor_pago) || null,
                data_pagamento: parcela.data_pagamento || null,
                status: parcela.status || 'Pendente',
                dias_atraso: parseInt(parcela.dias_atraso) || 0,
                valor_juros: parseDecimal(parcela.valor_juros) || 0,
                valor_multa: parseDecimal(parcela.valor_multa) || 0,
                valor_desconto: parseDecimal(parcela.valor_desconto) || 0,
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
          toast.success(`${imported} parcelas importadas com sucesso!`);
          setTimeout(() => navigate('/compradores-cohapm'), 2000);
        } else {
          toast.warning(`${imported} importadas, ${errors} erros`);
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
      'contrato_id,comprador_id,numero_parcela,data_vencimento,valor_parcela,valor_pago,data_pagamento,status,dias_atraso,valor_juros,valor_multa,valor_desconto',
      '1,10,1,2024-02-15,1000.00,1000.00,2024-02-15,Pago,0,0,0,0',
      '1,10,2,2024-03-15,1000.00,,,Pendente,0,0,0,0'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_parcelas_cohapm.csv';
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
              Importação de Parcelas COHAPM
            </h1>
            <p className="text-muted-foreground">
              Importe parcelas de pagamento vinculadas aos contratos do sistema COHAPM
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
                  Arquivo CSV das Parcelas
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
                      {preview.map((parc, idx) => (
                        <div key={idx} className="border-l-2 border-primary pl-2">
                          <strong>Parcela {parc.numero_parcela}</strong> - Contrato: {parc.contrato_id} - 
                          Venc: {parc.data_vencimento} - Valor: R$ {parc.valor_parcela}
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
                      Importadas: {stats.imported} de {stats.valid}
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
                  {isProcessing ? 'Importando...' : 'Importar Parcelas'}
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
              <p>• <strong>contrato_id*</strong>: ID do contrato (obrigatório, número inteiro)</p>
              <p>• <strong>comprador_id*</strong>: ID do comprador (obrigatório, máx. 50 caracteres)</p>
              <p>• <strong>numero_parcela*</strong>: Número da parcela (obrigatório, inteiro)</p>
              <p>• <strong>data_vencimento*</strong>: Data no formato YYYY-MM-DD (obrigatório)</p>
              <p>• <strong>valor_parcela*</strong>: Valor da parcela (obrigatório, número)</p>
              <p>• <strong>valor_pago, valor_juros, valor_multa, valor_desconto</strong>: Valores opcionais</p>
              <p>• <strong>data_pagamento</strong>: Data no formato YYYY-MM-DD (opcional)</p>
              <p>• <strong>status</strong>: Pendente/Pago/Atrasado/Cancelado (padrão: Pendente)</p>
              <p className="text-xs italic mt-3">* Campos obrigatórios</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
