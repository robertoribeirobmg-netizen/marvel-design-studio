import * as XLSX from 'xlsx';
import { importFinancialData, FinancialImportData } from './financialImportHelper';

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

const parseValorMonetario = (valor: any): number => {
  if (typeof valor === 'number') return valor;
  if (!valor) return 0;
  
  const valorLimpo = valor
    .toString()
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  
  return parseFloat(valorLimpo) || 0;
};

const parseData = (dataStr: any): string | null => {
  if (!dataStr) return null;
  
  try {
    let data: Date;
    
    if (typeof dataStr === 'number') {
      // Excel serial date
      data = new Date((dataStr - 25569) * 86400 * 1000);
    } else if (dataStr.includes('/')) {
      const partes = dataStr.split('/');
      if (partes.length === 3) {
        const [p1, p2, p3] = partes;
        // Formato MM/DD/YY ou DD/MM/YY
        const ano = p3.length === 2 ? (parseInt(p3) > 50 ? '19' + p3 : '20' + p3) : p3;
        data = new Date(`${ano}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`);
        
        if (isNaN(data.getTime())) {
          data = new Date(`${ano}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`);
        }
      } else {
        return null;
      }
    } else {
      data = new Date(dataStr);
    }
    
    if (isNaN(data.getTime())) return null;
    
    return data.toISOString().split('T')[0];
  } catch (error) {
    console.error('Erro ao parsear data:', dataStr, error);
    return null;
  }
};

export async function processFinancialFile(filePath: string) {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const linhas = jsonData.slice(1) as any[][];
    const parcelasExcel: ParcelaExcel[] = [];
    
    for (const linha of linhas) {
      if (!linha[0] || !linha[1]) continue;
      
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

    // Preparar dados para importação
    const importData: FinancialImportData[] = Array.from(clientesMap.entries()).map(([clienteKey, parcelas]) => {
      const [cliente, quadraLote] = clienteKey.split('|');
      
      return {
        cliente,
        quadraLote,
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
      };
    });

    // Importar dados
    const results = await importFinancialData(importData);
    
    return results;
  } catch (error: any) {
    throw new Error(`Erro ao processar arquivo: ${error.message}`);
  }
}
