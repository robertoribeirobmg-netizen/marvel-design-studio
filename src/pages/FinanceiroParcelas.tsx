import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Upload,
  Calendar,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Parcela {
  id: number;
  contrato_id: number | null;
  comprador_id: string | null;
  numero_parcela: number | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  valor_parcela: number | null;
  valor_pago: number | null;
  valor_juros: number | null;
  valor_multa: number | null;
  valor_desconto: number | null;
  dias_atraso: number | null;
  status: string | null;
  comprador_nome?: string;
  contrato_numero?: string;
}

export default function FinanceiroParcelas() {
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [filteredParcelas, setFilteredParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [selectedParcelas, setSelectedParcelas] = useState<Set<number>>(new Set());
  const [showBaixaDialog, setShowBaixaDialog] = useState(false);
  const [parcelaParaBaixa, setParcelaParaBaixa] = useState<Parcela | null>(null);
  const [processando, setProcessando] = useState(false);
  const { toast } = useToast();

  // Form state
  const [dataPagamento, setDataPagamento] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [valorPago, setValorPago] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [comprovante, setComprovante] = useState<File | null>(null);

  useEffect(() => {
    loadParcelas();
  }, []);

  useEffect(() => {
    filterParcelas();
  }, [searchTerm, filtroStatus, parcelas]);

  const loadParcelas = async () => {
    try {
      setLoading(true);

      // Buscar parcelas com informações do comprador e contrato
      const { data: parcelasData, error: parcelasError } = await supabase
        .from("parcelas_cohapm")
        .select(`
          *,
          comprador:compradores_cohapm!parcelas_cohapm_comprador_id_fkey(nome),
          contrato:contratos_cohapm!parcelas_cohapm_contrato_id_fkey(numero_contrato)
        `)
        .order("data_vencimento", { ascending: true });

      if (parcelasError) throw parcelasError;

      const parcelasFormatadas = parcelasData?.map((p: any) => ({
        ...p,
        comprador_nome: p.comprador?.nome || "Não informado",
        contrato_numero: p.contrato?.numero_contrato || "-",
      })) || [];

      setParcelas(parcelasFormatadas);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar parcelas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterParcelas = () => {
    let filtered = [...parcelas];

    // Filtro de status
    if (filtroStatus !== "todas") {
      filtered = filtered.filter((p) => p.status === filtroStatus);
    }

    // Filtro de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.comprador_nome?.toLowerCase().includes(term) ||
          p.contrato_numero?.toLowerCase().includes(term) ||
          p.numero_parcela?.toString().includes(term)
      );
    }

    setFilteredParcelas(filtered);
  };

  const openBaixaDialog = (parcela: Parcela) => {
    setParcelaParaBaixa(parcela);
    setValorPago(parcela.valor_parcela?.toString() || "");
    setDataPagamento(format(new Date(), "yyyy-MM-dd"));
    setObservacoes("");
    setComprovante(null);
    setShowBaixaDialog(true);
  };

  const darBaixa = async () => {
    if (!parcelaParaBaixa) return;

    try {
      setProcessando(true);

      let comprovanteUrl = null;

      // Upload do comprovante se houver
      if (comprovante) {
        const fileName = `${Date.now()}_${comprovante.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("comprovantes")
          .upload(fileName, comprovante);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("comprovantes")
          .getPublicUrl(fileName);

        comprovanteUrl = urlData.publicUrl;
      }

      // Atualizar parcela
      const { error: updateError } = await supabase
        .from("parcelas_cohapm")
        .update({
          status: "paga",
          data_pagamento: dataPagamento,
          valor_pago: parseFloat(valorPago),
          dias_atraso: 0,
        })
        .eq("id", parcelaParaBaixa.id);

      if (updateError) throw updateError;

      toast({
        title: "Baixa realizada com sucesso",
        description: `Parcela ${parcelaParaBaixa.numero_parcela} baixada`,
      });

      setShowBaixaDialog(false);
      loadParcelas();
    } catch (error: any) {
      toast({
        title: "Erro ao dar baixa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessando(false);
    }
  };

  const darBaixaEmLote = async () => {
    if (selectedParcelas.size === 0) {
      toast({
        title: "Nenhuma parcela selecionada",
        description: "Selecione ao menos uma parcela",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessando(true);

      const parcelasIds = Array.from(selectedParcelas);
      
      for (const id of parcelasIds) {
        await supabase
          .from("parcelas_cohapm")
          .update({
            status: "paga",
            data_pagamento: format(new Date(), "yyyy-MM-dd"),
            valor_pago: parcelas.find(p => p.id === id)?.valor_parcela || 0,
            dias_atraso: 0,
          })
          .eq("id", id);
      }

      toast({
        title: "Baixa em lote realizada",
        description: `${parcelasIds.length} parcelas foram baixadas`,
      });

      setSelectedParcelas(new Set());
      loadParcelas();
    } catch (error: any) {
      toast({
        title: "Erro na baixa em lote",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessando(false);
    }
  };

  const toggleSelectParcela = (id: number) => {
    const newSelected = new Set(selectedParcelas);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedParcelas(newSelected);
  };

  const selectAll = () => {
    if (selectedParcelas.size === filteredParcelas.length) {
      setSelectedParcelas(new Set());
    } else {
      setSelectedParcelas(new Set(filteredParcelas.map(p => p.id)));
    }
  };

  const getStatusBadge = (status: string | null) => {
    const variants: Record<string, any> = {
      paga: { variant: "default", label: "Paga", icon: CheckCircle },
      pendente: { variant: "secondary", label: "Pendente", icon: Calendar },
      atrasada: { variant: "destructive", label: "Atrasada", icon: XCircle },
    };

    const config = variants[status || "pendente"] || variants.pendente;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const calcularEstatisticas = () => {
    const total = filteredParcelas.length;
    const pagas = filteredParcelas.filter(p => p.status === "paga").length;
    const pendentes = filteredParcelas.filter(p => p.status === "pendente").length;
    const atrasadas = filteredParcelas.filter(p => p.status === "atrasada").length;
    const valorTotal = filteredParcelas.reduce((sum, p) => sum + (Number(p.valor_parcela) || 0), 0);
    const valorRecebido = filteredParcelas
      .filter(p => p.status === "paga")
      .reduce((sum, p) => sum + (Number(p.valor_pago) || 0), 0);

    return { total, pagas, pendentes, atrasadas, valorTotal, valorRecebido };
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">Carregando parcelas...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = calcularEstatisticas();

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Gestão de Parcelas
          </h1>
          <p className="text-muted-foreground">
            Controle e baixa de parcelas COHAPM
          </p>
        </div>
        {selectedParcelas.size > 0 && (
          <Button onClick={darBaixaEmLote} disabled={processando}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Dar Baixa em Lote ({selectedParcelas.size})
          </Button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.pagas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pendentes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.atrasadas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats.valorTotal / 1000).toFixed(0)}k
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {(stats.valorRecebido / 1000).toFixed(0)}k
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por comprador, contrato ou número da parcela..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="paga">Pagas</SelectItem>
                <SelectItem value="atrasada">Atrasadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Parcelas ({filteredParcelas.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selectedParcelas.size === filteredParcelas.length ? "Desmarcar Todos" : "Selecionar Todos"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Nº</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParcelas.map((parcela) => (
                <TableRow key={parcela.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedParcelas.has(parcela.id)}
                      onCheckedChange={() => toggleSelectParcela(parcela.id)}
                      disabled={parcela.status === "paga"}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{parcela.comprador_nome}</TableCell>
                  <TableCell>{parcela.contrato_numero}</TableCell>
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
                  <TableCell>{getStatusBadge(parcela.status)}</TableCell>
                  <TableCell>
                    {parcela.status !== "paga" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openBaixaDialog(parcela)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Baixar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Baixa */}
      <Dialog open={showBaixaDialog} onOpenChange={setShowBaixaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar Baixa na Parcela</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Comprador</Label>
              <Input value={parcelaParaBaixa?.comprador_nome || ""} disabled />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Parcela Nº</Label>
                <Input value={parcelaParaBaixa?.numero_parcela || ""} disabled />
              </div>
              <div>
                <Label>Valor Original</Label>
                <Input
                  value={`R$ ${Number(parcelaParaBaixa?.valor_parcela || 0).toFixed(2)}`}
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Pagamento *</Label>
                <Input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                />
              </div>
              <div>
                <Label>Valor Pago *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={valorPago}
                  onChange={(e) => setValorPago(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações sobre o pagamento..."
              />
            </div>

            <div>
              <Label>Comprovante</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setComprovante(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBaixaDialog(false)}
              disabled={processando}
            >
              Cancelar
            </Button>
            <Button onClick={darBaixa} disabled={processando}>
              {processando ? "Processando..." : "Confirmar Baixa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
