import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, History, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Sincronizacao {
  id: string;
  data_execucao: string;
  total_analisados: number;
  divergencias_encontradas: number;
  detalhes: any;
  status: string;
}

export default function HistoricoSincronizacoes() {
  const [sincronizacoes, setSincronizacoes] = useState<Sincronizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [executando, setExecutando] = useState(false);
  const [detalhesDialog, setDetalhesDialog] = useState<Sincronizacao | null>(null);
  const { toast } = useToast();

  const fetchSincronizacoes = async () => {
    try {
      const { data, error } = await supabase
        .from("sincronizacoes_cohapm")
        .select("*")
        .order("data_execucao", { ascending: false })
        .limit(20);

      if (error) throw error;
      setSincronizacoes(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSincronizacoes();
  }, []);

  const executarSincronizacao = async () => {
    setExecutando(true);
    try {
      const { error } = await supabase.functions.invoke("reconciliacao-cohapm");

      if (error) throw error;

      toast({
        title: "Sincronização executada",
        description: "A reconciliação foi executada com sucesso",
      });

      await fetchSincronizacoes();
    } catch (error: any) {
      toast({
        title: "Erro ao executar sincronização",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExecutando(false);
    }
  };

  const getTipoBadge = (tipo: string) => {
    const badges: Record<string, { label: string; variant: any }> = {
      vinculado: { label: "Vinculado", variant: "default" },
      nao_vinculado: { label: "Não Vinculado", variant: "secondary" },
      cpf_divergente: { label: "CPF Divergente", variant: "destructive" },
      dados_divergentes: { label: "Dados Divergentes", variant: "outline" },
      match_potencial: { label: "Match Potencial", variant: "default" },
      vinculo_invalido: { label: "Vínculo Inválido", variant: "destructive" },
    };

    const badge = badges[tipo] || { label: tipo, variant: "secondary" };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">Carregando histórico...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            Histórico de Sincronizações
          </h1>
          <p className="text-muted-foreground">
            Acompanhe as reconciliações automáticas dos dados COHAPM
          </p>
        </div>
        <Button onClick={executarSincronizacao} disabled={executando}>
          <RefreshCw className={`mr-2 h-4 w-4 ${executando ? "animate-spin" : ""}`} />
          Executar Agora
        </Button>
      </div>

      {sincronizacoes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Nenhuma sincronização encontrada. Execute a primeira sincronização.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Execuções Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Total Analisados</TableHead>
                  <TableHead>Divergências</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sincronizacoes.map((sync) => (
                  <TableRow key={sync.id}>
                    <TableCell>
                      {format(new Date(sync.data_execucao), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>{sync.total_analisados}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {sync.divergencias_encontradas > 0 && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        <span className={sync.divergencias_encontradas > 0 ? "font-semibold text-destructive" : ""}>
                          {sync.divergencias_encontradas}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sync.status === "concluida" ? "default" : "secondary"}>
                        {sync.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetalhesDialog(sync)}
                      >
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!detalhesDialog} onOpenChange={() => setDetalhesDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Sincronização</DialogTitle>
          </DialogHeader>
          {detalhesDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Data/Hora</div>
                    <div className="text-lg font-semibold">
                      {format(new Date(detalhesDialog.data_execucao), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Total Analisados</div>
                    <div className="text-lg font-semibold">{detalhesDialog.total_analisados}</div>
                  </CardContent>
                </Card>
              </div>

              {detalhesDialog.detalhes?.divergencias && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Divergências Encontradas ({detalhesDialog.divergencias_encontradas})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {detalhesDialog.detalhes.divergencias.map((div: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold">{div.comprador_nome}</div>
                              <div className="text-sm text-muted-foreground">ID: {div.comprador_id}</div>
                            </div>
                            {getTipoBadge(div.tipo)}
                          </div>
                          {div.profile_nome && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Vinculado a:</span> {div.profile_nome}
                            </div>
                          )}
                          {div.issues && div.issues.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">Problemas:</div>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {div.issues.map((issue: string, issueIdx: number) => (
                                  <li key={issueIdx} className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                                    <span>{issue}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
