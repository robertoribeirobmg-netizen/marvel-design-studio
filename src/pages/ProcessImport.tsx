import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processFinancialFile } from '@/lib/processFinancialImport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProcessImport() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const processFile = async () => {
      try {
        setStatus('processing');
        const importResults = await processFinancialFile('/temp-import.xlsx');
        setResults(importResults);
        setStatus('success');
      } catch (error: any) {
        console.error('Erro ao processar importação:', error);
        setResults({ success: 0, errors: [error.message] });
        setStatus('error');
      }
    };

    processFile();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'processing' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
            Processamento de Importação
          </CardTitle>
          <CardDescription>
            {status === 'processing' && 'Processando arquivo Excel...'}
            {status === 'success' && 'Importação concluída com sucesso!'}
            {status === 'error' && 'Erro durante a importação'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'processing' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Aguarde enquanto processamos os dados financeiros...</p>
            </div>
          )}

          {status === 'success' && results && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  ✓ Importação Bem-Sucedida
                </h3>
                <p className="text-green-800 dark:text-green-200">
                  {results.success} cooperado(s) importado(s) com sucesso!
                </p>
              </div>

              {results.errors.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    ⚠ Avisos
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-amber-800 dark:text-amber-200">
                    {results.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => navigate('/admin')} variant="default">
                  Voltar para Admin
                </Button>
                <Button onClick={() => navigate('/area-cooperado')} variant="outline">
                  Ver Área do Cooperado
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && results && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h3 className="font-semibold text-destructive mb-2">
                  ✗ Erro na Importação
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-destructive/90">
                  {results.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>

              <Button onClick={() => navigate('/admin')} variant="default">
                Voltar para Admin
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
