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
      toast.info('Carregando arquivo Excel...');
      setProgress(20);

      const fileResponse = await fetch('/compradores_cohapm_dados_completos.xlsx');
      if (!fileResponse.ok) throw new Error('Arquivo não encontrado');

      const fileBlob = await fileResponse.blob();
      const arrayBuffer = await fileBlob.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      toast.info('Enviando para processamento...');
      setProgress(40);

      const { data, error: functionError } = await supabase.functions.invoke('process-cohapm-auto', {
        method: 'POST',
        body: { fileData: base64Data }
      });

      if (functionError) throw functionError;

      setProgress(100);
      toast.success(data.message || 'Processamento iniciado!', {
        description: 'Os dados serão importados em background'
      });

      setStats({
        totalRegistros: data.totalRegistros,
        mensagem: data.message
      });

    } catch (err: any) {
      console.error('Erro:', err);
      setError(err.message || 'Erro ao processar');
      toast.error('Erro ao processar dados COHAPM');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Processamento Automático:</strong> Importa 726 compradores COHAPM automaticamente.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Processar Dados COHAPM
          </CardTitle>
          <CardDescription>Processamento em background - lotes de 50 registros</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">Enviando dados...</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleProcessar} disabled={isProcessing} className="w-full" size="lg">
            {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando...</> : <><Play className="h-4 w-4 mr-2" />Iniciar</>}
          </Button>
        </CardContent>
      </Card>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Em Processamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>{stats.mensagem}</strong>
                <p className="mt-2 text-sm">{stats.totalRegistros} registros em processamento background.</p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
