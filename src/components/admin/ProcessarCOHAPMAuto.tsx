import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Play, CheckCircle2, XCircle, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ProcessarCOHAPMAuto() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcessar = async () => {
    setIsProcessing(true);
    setProgress(10);
    setError(null);
    setStats(null);

    try {
      toast.info('Iniciando processamento automático...');
      setProgress(30);

      // Chamar edge function
      const { data, error: functionError } = await supabase.functions.invoke('process-cohapm-auto', {
        method: 'POST',
      });

      if (functionError) throw functionError;

      setProgress(100);
      setStats(data.stats);
      
      toast.success(data.message || 'Processamento concluído com sucesso!');

    } catch (err: any) {
      console.error('Erro no processamento:', err);
      setError(err.message || 'Erro ao processar dados');
      toast.error('Erro ao processar dados COHAPM');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informações */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Processamento Automático:</strong> Esta ferramenta processa automaticamente o arquivo Excel com os 726 compradores do sistema COHAPM, 
          importando todos os dados cadastrais e financeiros para o banco de dados.
        </AlertDescription>
      </Alert>

      {/* Card Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Processar Dados COHAPM
          </CardTitle>
          <CardDescription>
            Importação automática de 726 compradores com dados completos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações do Arquivo */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Arquivo</p>
                <p className="font-medium">compradores_cohapm_dados_completos.xlsx</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total de Registros</p>
                <p className="font-medium">726 compradores</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tempo Estimado</p>
                <p className="font-medium">2-3 minutos</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">
                Aguarde enquanto os dados são importados e vinculados...
              </p>
            </div>
          )}

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Botão de Processar */}
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
                Iniciar Processamento
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Processamento Concluído
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-4 border rounded-lg border-green-500/20 bg-green-500/5">
                <p className="text-sm text-muted-foreground">Inseridos</p>
                <p className="text-2xl font-bold text-green-600">{stats.inseridos}</p>
              </div>
              <div className="p-4 border rounded-lg border-blue-500/20 bg-blue-500/5">
                <p className="text-sm text-muted-foreground">Atualizados</p>
                <p className="text-2xl font-bold text-blue-600">{stats.atualizados}</p>
              </div>
              <div className="p-4 border rounded-lg border-purple-500/20 bg-purple-500/5">
                <p className="text-sm text-muted-foreground">Vinculados</p>
                <p className="text-2xl font-bold text-purple-600">{stats.vinculados}</p>
              </div>
              <div className="p-4 border rounded-lg border-red-500/20 bg-red-500/5">
                <p className="text-sm text-muted-foreground">Erros</p>
                <p className="text-2xl font-bold text-red-600">{stats.erros}</p>
              </div>
            </div>

            {stats.detalhes && stats.detalhes.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Detalhes dos Erros ({stats.detalhes.length})
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {stats.detalhes.map((detalhe: any, index: number) => (
                    <div key={index} className="p-3 border rounded bg-destructive/5 text-sm">
                      <p className="font-medium">{detalhe.nome}</p>
                      <p className="text-muted-foreground">{detalhe.erro}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
