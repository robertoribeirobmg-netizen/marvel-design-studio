import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Upload, Database, FileText, Users } from "lucide-react";
import Papa from "papaparse";

interface CompradorCohapm {
  id: string;
  nome: string;
  grupo: string | null;
  tipo: string;
  cpf_cnpj: string;
  telefone: string;
  data_extracao: string;
  fonte: string;
  empreendimento: string;
  tipo_classificado: string;
}

export default function ImportacaoCohapm() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<CompradorCohapm[]>([]);
  const [stats, setStats] = useState({ total: 0, imported: 0, errors: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      previewFile(selectedFile);
    } else {
      toast.error("Por favor selecione um arquivo CSV válido");
    }
  };

  const previewFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      preview: 5,
      complete: (results) => {
        setPreview(results.data as CompradorCohapm[]);
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

    setIsProcessing(true);
    let imported = 0;
    let errors = 0;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as CompradorCohapm[];
        setStats({ total: data.length, imported: 0, errors: 0 });

        // Processar em lotes de 50
        const batchSize = 50;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          
          const { error } = await supabase
            .from('compradores_cohapm')
            .upsert(
              batch.map(comprador => ({
                id: comprador.id,
                nome: comprador.nome,
                grupo: comprador.grupo || null,
                tipo: comprador.tipo,
                cpf_cnpj: comprador.cpf_cnpj,
                telefone: comprador.telefone,
                empreendimento: comprador.empreendimento,
                tipo_classificado: comprador.tipo_classificado,
                fonte: 'sistema_cohapm',
              })),
              { onConflict: 'id' }
            );

          if (error) {
            console.error('Erro ao importar lote:', error);
            errors += batch.length;
          } else {
            imported += batch.length;
          }

          setStats({ total: data.length, imported, errors });
        }

        setIsProcessing(false);
        
        if (errors === 0) {
          toast.success(`${imported} compradores importados com sucesso!`);
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
    window.open('/dados_compradores_cohapm.csv', '_blank');
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
              Importação COHAPM
            </h1>
            <p className="text-muted-foreground">
              Importe os dados dos 726 compradores do sistema COHAPM (Residencial La Felicità)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <Users className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">726 Compradores</h3>
              <p className="text-sm text-muted-foreground">
                Dados extraídos do sistema original
              </p>
            </Card>

            <Card className="p-6">
              <Database className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Estrutura Completa</h3>
              <p className="text-sm text-muted-foreground">
                Tabelas para compradores, contratos e parcelas
              </p>
            </Card>

            <Card className="p-6">
              <FileText className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Formato CSV</h3>
              <p className="text-sm text-muted-foreground">
                Importação via arquivo padronizado
              </p>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload do Arquivo CSV</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Arquivo CSV dos Compradores
                </label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />
              </div>

              {preview.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <p className="font-semibold mb-2">Preview (5 primeiros registros):</p>
                    <div className="text-sm space-y-1">
                      {preview.map((comp, idx) => (
                        <div key={idx} className="border-l-2 border-primary pl-2">
                          <strong>{comp.nome}</strong> - CPF: {comp.cpf_cnpj}
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
                      Importados: {stats.imported} de {stats.total}
                      {stats.errors > 0 && ` | Erros: ${stats.errors}`}
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleImport}
                  disabled={!file || isProcessing}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isProcessing ? 'Importando...' : 'Importar Compradores'}
                </Button>

                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Baixar CSV Original
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-muted">
            <h3 className="font-semibold mb-3">ℹ️ Informações sobre os Dados</h3>
            <div className="text-sm space-y-2 text-muted-foreground">
              <p>• <strong>Total de compradores:</strong> 726</p>
              <p>• <strong>Origem:</strong> Sistema COHAPM (IBSystemLote)</p>
              <p>• <strong>Empreendimento:</strong> Residencial La Felicità</p>
              <p>• <strong>Data da extração:</strong> 15/11/2025</p>
              <p>• <strong>Campos incluídos:</strong> Nome, CPF/CNPJ, Telefone, Grupo, Tipo</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
