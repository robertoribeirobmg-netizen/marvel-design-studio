import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon,
  TrendingUp,
  Users,
  DollarSign,
  FileSpreadsheet
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

export default function FinanceiroRelatorios() {
  const [tipoRelatorio, setTipoRelatorio] = useState<string>("extrato");
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date>(endOfMonth(new Date()));
  const [gerando, setGerando] = useState(false);
  const { toast } = useToast();

  const gerarExtratoCooperado = async () => {
    try {
      setGerando(true);

      // Buscar parcelas no período
      const { data: parcelas, error } = await supabase
        .from("parcelas_cohapm")
        .select(`
          *,
          comprador:compradores_cohapm!parcelas_cohapm_comprador_id_fkey(nome, cpf_cnpj),
          contrato:contratos_cohapm!parcelas_cohapm_contrato_id_fkey(numero_contrato, quadra, lote)
        `)
        .gte("data_vencimento", format(dataInicio, "yyyy-MM-dd"))
        .lte("data_vencimento", format(dataFim, "yyyy-MM-dd"))
        .order("data_vencimento");

      if (error) throw error;

      // Preparar dados para Excel
      const dadosExcel = parcelas?.map((p: any) => ({
        Comprador: p.comprador?.nome || "-",
        CPF_CNPJ: p.comprador?.cpf_cnpj || "-",
        Contrato: p.contrato?.numero_contrato || "-",
        Quadra: p.contrato?.quadra || "-",
        Lote: p.contrato?.lote || "-",
        Parcela: p.numero_parcela,
        Vencimento: p.data_vencimento ? format(new Date(p.data_vencimento), "dd/MM/yyyy") : "-",
        Pagamento: p.data_pagamento ? format(new Date(p.data_pagamento), "dd/MM/yyyy") : "-",
        Valor: Number(p.valor_parcela || 0).toFixed(2),
        Pago: Number(p.valor_pago || 0).toFixed(2),
        Status: p.status || "-",
        Dias_Atraso: p.dias_atraso || 0,
      })) || [];

      // Gerar planilha
      const ws = XLSX.utils.json_to_sheet(dadosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Extrato");

      // Download
      XLSX.writeFile(
        wb,
        `Extrato_Cooperados_${format(dataInicio, "dd-MM-yyyy")}_a_${format(dataFim, "dd-MM-yyyy")}.xlsx`
      );

      toast({
        title: "Relatório gerado",
        description: "Extrato exportado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGerando(false);
    }
  };

  const gerarRelatorioInadimplencia = async () => {
    try {
      setGerando(true);

      // Buscar parcelas atrasadas
      const { data: parcelas, error } = await supabase
        .from("parcelas_cohapm")
        .select(`
          *,
          comprador:compradores_cohapm!parcelas_cohapm_comprador_id_fkey(nome, cpf_cnpj, email, telefone),
          contrato:contratos_cohapm!parcelas_cohapm_contrato_id_fkey(numero_contrato, valor_total)
        `)
        .eq("status", "atrasada")
        .order("dias_atraso", { ascending: false });

      if (error) throw error;

      // Agrupar por comprador
      const compradores: Record<string, any> = {};
      
      parcelas?.forEach((p: any) => {
        const compradorId = p.comprador_id;
        if (!compradores[compradorId]) {
          compradores[compradorId] = {
            nome: p.comprador?.nome || "-",
            cpf_cnpj: p.comprador?.cpf_cnpj || "-",
            email: p.comprador?.email || "-",
            telefone: p.comprador?.telefone || "-",
            parcelas_atrasadas: 0,
            valor_total_atrasado: 0,
            maior_atraso: 0,
          };
        }

        compradores[compradorId].parcelas_atrasadas++;
        compradores[compradorId].valor_total_atrasado += Number(p.valor_parcela || 0);
        compradores[compradorId].maior_atraso = Math.max(
          compradores[compradorId].maior_atraso,
          p.dias_atraso || 0
        );
      });

      // Preparar dados para Excel
      const dadosExcel = Object.values(compradores).map((c: any) => ({
        Comprador: c.nome,
        CPF_CNPJ: c.cpf_cnpj,
        Email: c.email,
        Telefone: c.telefone,
        Parcelas_Atrasadas: c.parcelas_atrasadas,
        Valor_Total_Atrasado: c.valor_total_atrasado.toFixed(2),
        Maior_Atraso_Dias: c.maior_atraso,
      }));

      // Gerar planilha
      const ws = XLSX.utils.json_to_sheet(dadosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inadimplência");

      // Download
      XLSX.writeFile(wb, `Relatorio_Inadimplencia_${format(new Date(), "dd-MM-yyyy")}.xlsx`);

      toast({
        title: "Relatório gerado",
        description: "Relatório de inadimplência exportado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGerando(false);
    }
  };

  const gerarFluxoCaixa = async () => {
    try {
      setGerando(true);

      // Buscar parcelas no período
      const { data: parcelas, error } = await supabase
        .from("parcelas_cohapm")
        .select("*")
        .gte("data_vencimento", format(dataInicio, "yyyy-MM-dd"))
        .lte("data_vencimento", format(dataFim, "yyyy-MM-dd"))
        .order("data_vencimento");

      if (error) throw error;

      // Agrupar por mês
      const fluxoPorMes: Record<string, any> = {};

      parcelas?.forEach((p: any) => {
        const mes = format(new Date(p.data_vencimento), "MM/yyyy");
        if (!fluxoPorMes[mes]) {
          fluxoPorMes[mes] = {
            Mes: mes,
            Previsto: 0,
            Realizado: 0,
            Pendente: 0,
            Atrasado: 0,
          };
        }

        fluxoPorMes[mes].Previsto += Number(p.valor_parcela || 0);
        
        if (p.status === "paga") {
          fluxoPorMes[mes].Realizado += Number(p.valor_pago || 0);
        } else if (p.status === "atrasada") {
          fluxoPorMes[mes].Atrasado += Number(p.valor_parcela || 0);
        } else {
          fluxoPorMes[mes].Pendente += Number(p.valor_parcela || 0);
        }
      });

      // Preparar dados para Excel
      const dadosExcel = Object.values(fluxoPorMes).map((f: any) => ({
        Mes: f.Mes,
        Previsto: f.Previsto.toFixed(2),
        Realizado: f.Realizado.toFixed(2),
        Pendente: f.Pendente.toFixed(2),
        Atrasado: f.Atrasado.toFixed(2),
        Percentual_Realizado: ((f.Realizado / f.Previsto) * 100).toFixed(1) + "%",
      }));

      // Gerar planilha
      const ws = XLSX.utils.json_to_sheet(dadosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Fluxo de Caixa");

      // Download
      XLSX.writeFile(
        wb,
        `Fluxo_Caixa_${format(dataInicio, "dd-MM-yyyy")}_a_${format(dataFim, "dd-MM-yyyy")}.xlsx`
      );

      toast({
        title: "Relatório gerado",
        description: "Fluxo de caixa exportado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGerando(false);
    }
  };

  const gerarAgingList = async () => {
    try {
      setGerando(true);

      // Buscar parcelas atrasadas
      const { data: parcelas, error } = await supabase
        .from("parcelas_cohapm")
        .select(`
          *,
          comprador:compradores_cohapm!parcelas_cohapm_comprador_id_fkey(nome, cpf_cnpj),
          contrato:contratos_cohapm!parcelas_cohapm_contrato_id_fkey(numero_contrato)
        `)
        .eq("status", "atrasada")
        .order("dias_atraso", { ascending: false });

      if (error) throw error;

      // Preparar dados para Excel com faixas de aging
      const dadosExcel = parcelas?.map((p: any) => {
        let faixa = "";
        const dias = p.dias_atraso || 0;

        if (dias <= 30) faixa = "0-30 dias";
        else if (dias <= 60) faixa = "31-60 dias";
        else if (dias <= 90) faixa = "61-90 dias";
        else faixa = "Mais de 90 dias";

        return {
          Faixa: faixa,
          Dias_Atraso: dias,
          Comprador: p.comprador?.nome || "-",
          CPF_CNPJ: p.comprador?.cpf_cnpj || "-",
          Contrato: p.contrato?.numero_contrato || "-",
          Parcela: p.numero_parcela,
          Vencimento: p.data_vencimento ? format(new Date(p.data_vencimento), "dd/MM/yyyy") : "-",
          Valor: Number(p.valor_parcela || 0).toFixed(2),
        };
      }) || [];

      // Gerar planilha
      const ws = XLSX.utils.json_to_sheet(dadosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Aging List");

      // Download
      XLSX.writeFile(wb, `Aging_List_${format(new Date(), "dd-MM-yyyy")}.xlsx`);

      toast({
        title: "Relatório gerado",
        description: "Aging List exportado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGerando(false);
    }
  };

  const gerarRelatorio = () => {
    switch (tipoRelatorio) {
      case "extrato":
        gerarExtratoCooperado();
        break;
      case "inadimplencia":
        gerarRelatorioInadimplencia();
        break;
      case "fluxocaixa":
        gerarFluxoCaixa();
        break;
      case "aging":
        gerarAgingList();
        break;
      default:
        toast({
          title: "Tipo não selecionado",
          description: "Selecione um tipo de relatório",
          variant: "destructive",
        });
    }
  };

  const setPreset = (preset: string) => {
    const hoje = new Date();
    switch (preset) {
      case "mes-atual":
        setDataInicio(startOfMonth(hoje));
        setDataFim(endOfMonth(hoje));
        break;
      case "mes-anterior":
        const mesAnterior = subMonths(hoje, 1);
        setDataInicio(startOfMonth(mesAnterior));
        setDataFim(endOfMonth(mesAnterior));
        break;
      case "trimestre":
        setDataInicio(subMonths(hoje, 3));
        setDataFim(hoje);
        break;
      case "semestre":
        setDataInicio(subMonths(hoje, 6));
        setDataFim(hoje);
        break;
      case "ano":
        setDataInicio(subMonths(hoje, 12));
        setDataFim(hoje);
        break;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Relatórios Financeiros
        </h1>
        <p className="text-muted-foreground">
          Gere relatórios completos em Excel
        </p>
      </div>

      {/* Tipos de Relatório */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-lg",
            tipoRelatorio === "extrato" && "border-primary ring-2 ring-primary"
          )}
          onClick={() => setTipoRelatorio("extrato")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Extrato Cooperados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Extrato detalhado por cooperado com todas as parcelas
            </p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-lg",
            tipoRelatorio === "inadimplencia" && "border-primary ring-2 ring-primary"
          )}
          onClick={() => setTipoRelatorio("inadimplencia")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-destructive" />
              Inadimplência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Análise de parcelas atrasadas por cooperado
            </p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-lg",
            tipoRelatorio === "fluxocaixa" && "border-primary ring-2 ring-primary"
          )}
          onClick={() => setTipoRelatorio("fluxocaixa")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Fluxo de Caixa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Fluxo previsto vs realizado por mês
            </p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-lg",
            tipoRelatorio === "aging" && "border-primary ring-2 ring-primary"
          )}
          onClick={() => setTipoRelatorio("aging")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5" />
              Aging List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Parcelas atrasadas por faixa de tempo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Relatório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Presets */}
          <div>
            <Label>Períodos Pré-definidos</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => setPreset("mes-atual")}>
                Mês Atual
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("mes-anterior")}>
                Mês Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("trimestre")}>
                Último Trimestre
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("semestre")}>
                Último Semestre
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreset("ano")}>
                Último Ano
              </Button>
            </div>
          </div>

          {/* Datas personalizadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={(date) => date && setDataInicio(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Data Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataFim && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={(date) => date && setDataFim(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Botão Gerar */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={gerarRelatorio}
              disabled={!tipoRelatorio || gerando}
            >
              <Download className="mr-2 h-5 w-5" />
              {gerando ? "Gerando..." : "Gerar Relatório"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre os Relatórios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Extrato Cooperados:</strong> Exporta todas as parcelas do período selecionado com dados completos.</p>
          <p><strong>Inadimplência:</strong> Lista cooperados com parcelas atrasadas, total devido e maior atraso.</p>
          <p><strong>Fluxo de Caixa:</strong> Compara valores previstos vs realizados mês a mês.</p>
          <p><strong>Aging List:</strong> Organiza parcelas atrasadas por faixas de tempo (0-30, 31-60, 61-90, +90 dias).</p>
        </CardContent>
      </Card>
    </div>
  );
}
