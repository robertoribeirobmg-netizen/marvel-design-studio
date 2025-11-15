import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, AlertTriangle, TrendingUp, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function PreviewImportacaoFinanceira() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isImporting, setIsImporting] = useState(false);

  const { parcelasPorCliente, analise } = location.state || {};

  if (!parcelasPorCliente || !analise) {
    navigate('/importacao-financeira');
    return null;
  }

  const { conflitos = [], novasParcelas = [], totalClientes } = analise;

  const handleConfirmarImportacao = async () => {
    setIsImporting(true);
    try {
      const { data: responseData, error } = await supabase.functions.invoke('import-financial-data', {
        body: { parcelasPorCliente, dryRun: false },
      });

      if (error) throw error;

      if (responseData.success) {
        const mensagens = [];
        if (responseData.investimentosCriados) mensagens.push(`${responseData.investimentosCriados} investimentos criados`);
        if (responseData.parcelasCriadas) mensagens.push(`${responseData.parcelasCriadas} parcelas criadas`);
        if (responseData.parcelasAtualizadas) mensagens.push(`${responseData.parcelasAtualizadas} parcelas atualizadas`);
        
        toast.success(`Importação concluída! ${mensagens.join(', ')}.`);
        navigate('/admin');
      } else {
        toast.error('Erro na importação: ' + responseData.error);
      }
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao processar importação: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/importacao-financeira')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Preview da Importação</h1>
          <p className="text-muted-foreground">
            Revise as mudanças antes de confirmar a importação
          </p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Novas Parcelas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{novasParcelas.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Atualizações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{conflitos.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{totalClientes}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conflitos */}
      {conflitos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Parcelas que serão atualizadas ({conflitos.length})
            </CardTitle>
            <CardDescription>
              As seguintes parcelas já existem e serão atualizadas com novos valores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Parcela</TableHead>
                    <TableHead>Mudanças</TableHead>
                    <TableHead className="text-right">Valor Anterior</TableHead>
                    <TableHead className="text-right">Valor Novo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conflitos.map((conflito: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{conflito.cliente}</TableCell>
                      <TableCell className="text-center">{conflito.numeroParcela}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {conflito.mudancas.map((m: string) => (
                            <Badge key={m} variant="outline" className="text-xs">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        R$ {conflito.valorAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {conflito.valorNovo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={conflito.statusNovo === 'paga' ? 'default' : 'secondary'}>
                          {conflito.statusAnterior} → {conflito.statusNovo}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Novas Parcelas */}
      {novasParcelas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-500" />
              Novas parcelas a serem criadas ({novasParcelas.length})
            </CardTitle>
            <CardDescription>
              Estas parcelas serão criadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Parcela</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vencimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {novasParcelas.slice(0, 10).map((parcela: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{parcela.cliente}</TableCell>
                      <TableCell className="text-center">{parcela.numeroParcela}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {parcela.descricao || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={parcela.status === 'paga' ? 'default' : 'secondary'}>
                          {parcela.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{parcela.dataVencimento}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {novasParcelas.length > 10 && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                ... e mais {novasParcelas.length - 10} parcelas
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Atenção:</strong> Esta ação irá modificar {conflitos.length} parcelas existentes e criar {novasParcelas.length} novas parcelas.
          Revise cuidadosamente antes de confirmar.
        </AlertDescription>
      </Alert>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => navigate('/importacao-financeira')}
          disabled={isImporting}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirmarImportacao}
          disabled={isImporting}
        >
          {isImporting ? 'Importando...' : 'Confirmar Importação'}
        </Button>
      </div>
    </div>
  );
}
