import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CooperadoData {
  nome_completo: string;
  quadra?: string;
  lote?: string;
  fase?: string;
  data_compra?: string;
  cpf?: string;
  telefone?: string;
}

interface EstatisticasData {
  totalCooperados: number;
  cooperadosComLote: number;
  cooperadosSemLote: number;
  cooperadosRecentes: number;
  cooperadosComDataCompra: number;
  cooperadosPorFase: Record<string, number>;
  cooperadosPorQuadra: Record<string, number>;
}

export function generateCooperadosReport(
  cooperados: CooperadoData[],
  estatisticas: EstatisticasData
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 15;

  // Cabeçalho
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Cooperados', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;

  // Seção de Estatísticas Gerais
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Estatísticas Gerais', 14, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const estatisticasGerais = [
    ['Total de Cooperados', estatisticas.totalCooperados.toString()],
    ['Cooperados com Lote Definido', estatisticas.cooperadosComLote.toString()],
    ['Cooperados sem Lote', estatisticas.cooperadosSemLote.toString()],
    ['Cadastrados nos Últimos 30 Dias', estatisticas.cooperadosRecentes.toString()],
    ['Com Data de Compra', estatisticas.cooperadosComDataCompra.toString()],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Métrica', 'Valor']],
    body: estatisticasGerais,
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202] },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 12;

  // Seção de Distribuição por Fase
  if (Object.keys(estatisticas.cooperadosPorFase).length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribuição por Fase', 14, yPosition);
    
    yPosition += 8;

    const fasesSorted = Object.entries(estatisticas.cooperadosPorFase)
      .sort(([a], [b]) => {
        if (a === 'Sem fase') return 1;
        if (b === 'Sem fase') return -1;
        return a.localeCompare(b, undefined, { numeric: true });
      });

    const fasesData = fasesSorted.map(([fase, count]) => [
      fase,
      count.toString(),
      `${Math.round((count / estatisticas.totalCooperados) * 100)}%`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Fase', 'Quantidade', 'Percentual']],
      body: fasesData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 12;
  }

  // Seção de Distribuição por Quadra
  if (Object.keys(estatisticas.cooperadosPorQuadra).length > 0) {
    // Verificar se precisa de nova página
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 15;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribuição por Quadra (Top 10)', 14, yPosition);
    
    yPosition += 8;

    const quadrasSorted = Object.entries(estatisticas.cooperadosPorQuadra)
      .sort(([a], [b]) => {
        if (a === 'Sem quadra') return 1;
        if (b === 'Sem quadra') return -1;
        return a.localeCompare(b, undefined, { numeric: true });
      })
      .slice(0, 10);

    const quadrasData = quadrasSorted.map(([quadra, count]) => [
      quadra === 'Sem quadra' ? quadra : `Quadra ${quadra}`,
      count.toString(),
      `${Math.round((count / estatisticas.totalCooperados) * 100)}%`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Quadra', 'Quantidade', 'Percentual']],
      body: quadrasData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 12;
  }

  // Nova página para lista de cooperados
  doc.addPage();
  yPosition = 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Lista Completa de Cooperados', 14, yPosition);
  
  yPosition += 8;

  // Preparar dados dos cooperados
  const cooperadosData = cooperados.map((c) => [
    c.nome_completo,
    c.quadra && c.lote ? `Q${c.quadra} L${c.lote}` : '-',
    c.fase || '-',
    c.data_compra ? new Date(c.data_compra).toLocaleDateString('pt-BR') : '-',
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Nome', 'Quadra/Lote', 'Fase', 'Data Compra']],
    body: cooperadosData,
    theme: 'striped',
    headStyles: { fillColor: [66, 139, 202] },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 30 },
      2: { cellWidth: 20 },
      3: { cellWidth: 30 },
    },
  });

  // Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Salvar PDF
  const fileName = `relatorio-cooperados-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
