import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processFinancialFile, DetailedImportResults } from '@/lib/processFinancialImport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function ProcessImport() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [results, setResults] = useState<DetailedImportResults | null>(null);
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
        setResults({ 
          success: 0, 
          errors: [error.message],
          cooperadosDetalhes: []
        });
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
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Importação Bem-Sucedida
                </h3>
                <p className="text-green-800 dark:text-green-200">
                  {results.success} cooperado(s) importado(s) com sucesso!
                </p>
              </div>

              {/* Estatísticas Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total de Cooperados</p>
                        <p className="text-2xl font-bold">{results.cooperadosDetalhes.length}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total de Parcelas</p>
                        <p className="text-2xl font-bold">
                          {results.cooperadosDetalhes.reduce((sum, c) => sum + c.totalParcelas, 0)}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Parcelas Pagas</p>
                        <p className="text-2xl font-bold text-green-600">
                          {results.cooperadosDetalhes.reduce((sum, c) => sum + c.parcelasPagas, 0)}
                        </p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Parcelas Vencidas</p>
                        <p className="text-2xl font-bold text-red-600">
                          {results.cooperadosDetalhes.reduce((sum, c) => sum + c.parcelasVencidas, 0)}
                        </p>
                      </div>
                      <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela Detalhada por Cooperado */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento por Cooperado</CardTitle>
                  <CardDescription>
                    Estatísticas financeiras de cada cooperado importado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Quadra/Lote</TableHead>
                          <TableHead className="text-center">Total Parcelas</TableHead>
                          <TableHead className="text-center">Pagas</TableHead>
                          <TableHead className="text-center">Vencidas</TableHead>
                          <TableHead className="text-center">A Vencer</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                          <TableHead className="text-right">Valor Pago</TableHead>
                          <TableHead className="text-right">Saldo Devedor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.cooperadosDetalhes.map((cooperado, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{cooperado.cliente}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{cooperado.quadraLote}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{cooperado.totalParcelas}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="default" className="bg-green-500">
                                {cooperado.parcelasPagas}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {cooperado.parcelasVencidas > 0 ? (
                                <Badge variant="destructive">{cooperado.parcelasVencidas}</Badge>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{cooperado.parcelasAVencer}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              R$ {cooperado.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              R$ {cooperado.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              R$ {cooperado.saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

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
