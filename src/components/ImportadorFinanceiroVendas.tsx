import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

interface ParcelaExcel {
  quadraLote: string;
  cliente: string;
  descricao: string;
  vencimento: string;
  valor: number;
  situacao: string;
  dataRecebimento: string;
  desconto: number;
  juros: number;
  honorarios: number;
  valorPago: number;
}

export function ImportadorFinanceiroVendas() {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const parseValorMonetario = (valor: string): number => {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    
    // Remove R$, pontos e substitui vírgula por ponto
    const valorLimpo = valor
      .toString()
      .replace(/R\$\s?/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.');
    
    return parseFloat(valorLimpo) || 0;
  };

  const parseData = (dataStr: string): string | null => {
    if (!dataStr) return null;
    
    try {
      // Tenta vários formatos de data
      let data: Date;
      
      if (typeof dataStr === 'number') {
        // Excel serial date
        data = new Date((dataStr - 25569) * 86400 * 1000);
      } else if (dataStr.includes('/')) {
        // Formato brasileiro: DD/MM/YYYY ou MM/DD/YYYY
        const partes = dataStr.split('/');
        if (partes.length === 3) {
          const [p1, p2, p3] = partes;
          // Tenta DD/MM/YYYY primeiro
          data = new Date(`${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`);
          
          if (isNaN(data.getTime())) {
            // Tenta MM/DD/YYYY
            data = new Date(`${p3}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`);
          }
        } else {
          return null;
        }
      } else {
        data = new Date(dataStr);
      }
      
      if (isNaN(data.getTime())) return null;
      
      // Retorna no formato YYYY-MM-DD
      return data.toISOString().split('T')[0];
    } catch (error) {
      console.error('Erro ao parsear data:', dataStr, error);
      return null;
    }
  };

  const processarExcel = async () => {
    if (!excelFile) {
      toast.error('Selecione um arquivo Excel');
      return;
    }

    setIsProcessing(true);
    try {
      const data = await excelFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Pular a primeira linha (cabeçalho)
      const linhas = jsonData.slice(1) as any[][];
      
      const parcelasExcel: ParcelaExcel[] = [];
      
      for (const linha of linhas) {
        if (!linha[0] || !linha[1]) continue; // Pular linhas vazias
        
        parcelasExcel.push({
          quadraLote: linha[0]?.toString().trim() || '',
          cliente: linha[1]?.toString().trim() || '',
          descricao: linha[2]?.toString().trim() || '',
          vencimento: linha[3]?.toString() || '',
          valor: parseValorMonetario(linha[4]),
          situacao: linha[5]?.toString().trim() || '',
          dataRecebimento: linha[6]?.toString() || '',
          desconto: parseValorMonetario(linha[7]),
          juros: parseValorMonetario(linha[8]),
          honorarios: parseValorMonetario(linha[9]),
          valorPago: parseValorMonetario(linha[10]),
        });
      }

      // Agrupar por cliente
      const clientesMap = new Map<string, ParcelaExcel[]>();
      
      for (const parcela of parcelasExcel) {
        const clienteKey = `${parcela.cliente}|${parcela.quadraLote}`;
        if (!clientesMap.has(clienteKey)) {
          clientesMap.set(clienteKey, []);
        }
        clientesMap.get(clienteKey)!.push(parcela);
      }

      // Preparar dados para preview
      const previewData = Array.from(clientesMap.entries()).map(([clienteKey, parcelas]) => {
        const [cliente, quadraLote] = clienteKey.split('|');
        const valorTotal = parcelas.reduce((sum, p) => sum + p.valor, 0);
        const valorPago = parcelas.reduce((sum, p) => sum + p.valorPago, 0);
        const parcelas_validas = parcelas.filter(p => p.vencimento).length;
        
        return {
          cliente,
          quadraLote,
          numeroParcelas: parcelas.length,
          parcelasValidas: parcelas_validas,
          valorTotal: valorTotal.toFixed(2),
          valorPago: valorPago.toFixed(2),
          parcelas: parcelas.map((p, idx) => ({
            numero: idx + 1,
            descricao: p.descricao,
            vencimento: parseData(p.vencimento),
            valor: p.valor,
            situacao: p.situacao,
            dataRecebimento: parseData(p.dataRecebimento),
            desconto: p.desconto,
            juros: p.juros,
            honorarios: p.honorarios,
            valorPago: p.valorPago,
          })),
          valido: parcelas_validas > 0 && cliente && quadraLote,
        };
      });

      const stats = {
        totalRegistros: previewData.length,
        registrosValidos: previewData.filter(r => r.valido).length,
        registrosInvalidos: previewData.filter(r => !r.valido).length,
        totalParcelas: previewData.reduce((sum, r) => sum + r.numeroParcelas, 0),
      };

      // Navegar para a página de preview com os dados
      navigate('/preview-importacao', {
        state: {
          previewData,
          previewStats: stats,
          isFinancialImport: true,
        }
      });

      toast.success(`${previewData.length} cooperados processados para preview`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar arquivo');
      console.error('Erro ao processar Excel:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Importar Relatório de Vendas
        </CardTitle>
        <CardDescription>
          Faça upload do relatório de vendas com parcelas financeiras
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excel-vendas">Arquivo Excel (.xlsx)</Label>
            <Input
              id="excel-vendas"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              Formato esperado: Quadra/Lote | Cliente | Descrição | Vencimento | Valor | Situação | Data Recebimento | Desconto | Juros | Honorários | Valor Pago
            </p>
          </div>
          <Button 
            onClick={processarExcel} 
            disabled={isProcessing || !excelFile}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processando...' : 'Processar e Visualizar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
