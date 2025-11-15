import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, FileText, Eye, User, MapPin, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Contrato {
  id: number;
  numero_contrato: string | null;
  comprador_id: string | null;
  data_contrato: string | null;
  quadra: string | null;
  lote: string | null;
  area_m2: number | null;
  valor_total: number | null;
  valor_entrada: number | null;
  valor_parcela: number | null;
  numero_parcelas: number | null;
  status: string | null;
  situacao: string | null;
  corretor: string | null;
  imobiliaria: string | null;
}

interface CompradorDetails {
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
}

export default function FinanceiroContratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [filteredContratos, setFilteredContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [compradorDetails, setCompradorDetails] = useState<CompradorDetails | null>(null);
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadContratos();
  }, []);

  useEffect(() => {
    filterContratos();
  }, [searchTerm, contratos]);

  const loadContratos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contratos_cohapm")
        .select("*")
        .order("data_contrato", { ascending: false });

      if (error) throw error;
      setContratos(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar contratos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterContratos = () => {
    if (!searchTerm.trim()) {
      setFilteredContratos(contratos);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = contratos.filter(
      (c) =>
        c.numero_contrato?.toLowerCase().includes(term) ||
        c.quadra?.toLowerCase().includes(term) ||
        c.lote?.toLowerCase().includes(term) ||
        c.corretor?.toLowerCase().includes(term)
    );
    setFilteredContratos(filtered);
  };

  const viewDetails = async (contrato: Contrato) => {
    try {
      setSelectedContrato(contrato);

      // Buscar dados do comprador
      if (contrato.comprador_id) {
        const { data: compradorData, error: compradorError } = await supabase
          .from("compradores_cohapm")
          .select("nome, cpf_cnpj, email, telefone")
          .eq("id", contrato.comprador_id)
          .single();

        if (compradorError) throw compradorError;
        setCompradorDetails(compradorData);
      }

      // Buscar parcelas do contrato
      const { data: parcelasData, error: parcelasError } = await supabase
        .from("parcelas_cohapm")
        .select("*")
        .eq("contrato_id", contrato.id)
        .order("numero_parcela");

      if (parcelasError) throw parcelasError;
      setParcelas(parcelasData || []);

      setShowDetailsDialog(true);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar detalhes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, any> = {
      ativo: "default",
      cancelado: "destructive",
      concluido: "secondary",
    };
    return (
      <Badge variant={variants[status || "ativo"] || "secondary"}>
        {status || "Ativo"}
      </Badge>
    );
  };

  const calcularEstatisticas = () => {
    const total = parcelas.reduce((sum, p) => sum + (Number(p.valor_parcela) || 0), 0);
    const pago = parcelas
      .filter(p => p.status === "paga")
      .reduce((sum, p) => sum + (Number(p.valor_pago) || 0), 0);
    const pendente = total - pago;
    const pagas = parcelas.filter(p => p.status === "paga").length;
    const atrasadas = parcelas.filter(p => p.status === "atrasada").length;

    return { total, pago, pendente, pagas, atrasadas };
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">Carregando contratos...</div>
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
            <FileText className="h-8 w-8" />
            Gestão de Contratos
          </h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os contratos COHAPM
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número do contrato, quadra, lote ou corretor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Contratos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contratos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {contratos.filter(c => c.status === "ativo").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(contratos.reduce((sum, c) => sum + (Number(c.valor_total) || 0), 0) / 1000).toFixed(0)}k
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R${" "}
              {contratos.length > 0
                ? (contratos.reduce((sum, c) => sum + (Number(c.valor_total) || 0), 0) /
                    contratos.length /
                    1000).toFixed(0)
                : 0}
              k
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Contratos */}
      <Card>
        <CardHeader>
          <CardTitle>Contratos ({filteredContratos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Contrato</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Quadra/Lote</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContratos.map((contrato) => (
                <TableRow key={contrato.id}>
                  <TableCell className="font-medium">
                    {contrato.numero_contrato || "-"}
                  </TableCell>
                  <TableCell>
                    {contrato.data_contrato
                      ? format(new Date(contrato.data_contrato), "dd/MM/yyyy", {
                          locale: ptBR,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {contrato.quadra && contrato.lote
                      ? `Q${contrato.quadra} L${contrato.lote}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    R$ {Number(contrato.valor_total || 0).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell>
                    {contrato.numero_parcelas}x de R${" "}
                    {Number(contrato.valor_parcela || 0).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewDetails(contrato)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Contrato {selectedContrato?.numero_contrato}</DialogTitle>
          </DialogHeader>

          {selectedContrato && (
            <div className="space-y-6">
              {/* Dados do Comprador */}
              {compradorDetails && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Dados do Comprador
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Nome</div>
                      <div className="font-medium">{compradorDetails.nome}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">CPF/CNPJ</div>
                      <div className="font-medium">{compradorDetails.cpf_cnpj || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="font-medium">{compradorDetails.email || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Telefone</div>
                      <div className="font-medium">{compradorDetails.telefone || "-"}</div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dados do Contrato */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Informações do Contrato
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Quadra/Lote</div>
                    <div className="font-medium">
                      {selectedContrato.quadra && selectedContrato.lote
                        ? `Quadra ${selectedContrato.quadra} - Lote ${selectedContrato.lote}`
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Área (m²)</div>
                    <div className="font-medium">{selectedContrato.area_m2 || "-"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Data do Contrato</div>
                    <div className="font-medium">
                      {selectedContrato.data_contrato
                        ? format(new Date(selectedContrato.data_contrato), "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Valor Total</div>
                    <div className="font-bold text-lg">
                      R${" "}
                      {Number(selectedContrato.valor_total || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Entrada</div>
                    <div className="font-medium">
                      R${" "}
                      {Number(selectedContrato.valor_entrada || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Parcelas</div>
                    <div className="font-medium">
                      {selectedContrato.numero_parcelas}x de R${" "}
                      {Number(selectedContrato.valor_parcela || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas das Parcelas */}
              {parcelas.length > 0 && (() => {
                const stats = calcularEstatisticas();
                return (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Total</div>
                        <div className="text-xl font-bold">
                          R$ {(stats.total / 1000).toFixed(0)}k
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Pago</div>
                        <div className="text-xl font-bold text-green-600">
                          R$ {(stats.pago / 1000).toFixed(0)}k
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Pendente</div>
                        <div className="text-xl font-bold text-amber-600">
                          R$ {(stats.pendente / 1000).toFixed(0)}k
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Pagas</div>
                        <div className="text-xl font-bold">{stats.pagas}/{parcelas.length}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground">Atrasadas</div>
                        <div className="text-xl font-bold text-destructive">{stats.atrasadas}</div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}

              {/* Parcelas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Parcelas ({parcelas.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pagamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parcelas.map((parcela) => (
                        <TableRow key={parcela.id}>
                          <TableCell>{parcela.numero_parcela}</TableCell>
                          <TableCell>
                            {parcela.data_vencimento
                              ? format(new Date(parcela.data_vencimento), "dd/MM/yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            R${" "}
                            {Number(parcela.valor_parcela || 0).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                parcela.status === "paga"
                                  ? "default"
                                  : parcela.status === "atrasada"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {parcela.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {parcela.data_pagamento
                              ? format(new Date(parcela.data_pagamento), "dd/MM/yyyy")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
