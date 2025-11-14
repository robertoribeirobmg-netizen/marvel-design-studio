import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface Renegociacao {
  id: string;
  user_id: string;
  valor_original: number;
  valor_renegociado: number;
  numero_parcelas: number;
  valor_parcela: number;
  taxa_juros: number;
  valor_entrada: number;
  data_renegociacao: string;
  status: string;
  observacoes: string | null;
  cooperado: {
    nome_completo: string;
    quadra: string | null;
    lote: string | null;
  };
  parcelas: Array<{
    numero_parcela: number;
    data_vencimento: string;
    valor_parcela: number;
    status: string;
    data_pagamento: string | null;
  }>;
}

export async function gerarRelatorioRenegociacoes(
  renegociacoes: Renegociacao[],
  filtro: 'todas' | 'ativas' | 'finalizadas' = 'todas'
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Filtrar renegociações
  let renegociacoesFiltradas = renegociacoes;
  if (filtro === 'ativas') {
    renegociacoesFiltradas = renegociacoes.filter(r => r.status === 'ativo');
  } else if (filtro === 'finalizadas') {
    renegociacoesFiltradas = renegociacoes.filter(r => r.status === 'finalizado');
  }

  // Cabeçalho
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Renegociações de Dívidas', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data do Relatório: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 28, { align: 'center' });
  
  // Filtro aplicado
  const filtroTexto = filtro === 'todas' ? 'Todas as Renegociações' : 
                      filtro === 'ativas' ? 'Renegociações Ativas' : 
                      'Renegociações Finalizadas';
  doc.text(`Filtro: ${filtroTexto}`, pageWidth / 2, 35, { align: 'center' });

  // Estatísticas gerais
  let yPos = 45;
  
  const totalRenegociacoes = renegociacoesFiltradas.length;
  const valorTotalOriginal = renegociacoesFiltradas.reduce((sum, r) => sum + r.valor_original, 0);
  const valorTotalRenegociado = renegociacoesFiltradas.reduce((sum, r) => sum + r.valor_renegociado, 0);
  const totalParcelas = renegociacoesFiltradas.reduce((sum, r) => sum + r.numero_parcelas, 0);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo Geral', 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const resumoData = [
    ['Total de Renegociações:', totalRenegociacoes.toString()],
    ['Valor Original Total:', `R$ ${valorTotalOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
    ['Valor Renegociado Total:', `R$ ${valorTotalRenegociado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
    ['Total de Parcelas Geradas:', totalParcelas.toString()],
    ['Diferença (Juros):', `R$ ${(valorTotalRenegociado - valorTotalOriginal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: resumoData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 60 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Lista detalhada de renegociações
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhamento das Renegociações', 14, yPos);
  yPos += 5;

  // Processar cada renegociação
  renegociacoesFiltradas.forEach((renegociacao, index) => {
    // Verificar se precisa adicionar nova página
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${renegociacao.cooperado.nome_completo}`, 14, yPos);
    yPos += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const quadraLote = renegociacao.cooperado.quadra && renegociacao.cooperado.lote
      ? `${renegociacao.cooperado.quadra}/${renegociacao.cooperado.lote}`
      : '-';
    
    doc.text(`Quadra/Lote: ${quadraLote}`, 20, yPos);
    yPos += 5;
    
    doc.text(`Data da Renegociação: ${format(new Date(renegociacao.data_renegociacao), 'dd/MM/yyyy')}`, 20, yPos);
    yPos += 5;
    
    doc.text(`Status: ${renegociacao.status === 'ativo' ? 'Ativo' : 'Finalizado'}`, 20, yPos);
    yPos += 8;

    // Dados financeiros da renegociação
    const dadosFinanceiros = [
      ['Valor Original:', `R$ ${renegociacao.valor_original.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Taxa de Juros:', `${renegociacao.taxa_juros.toFixed(2)}%`],
      ['Valor Entrada:', `R$ ${renegociacao.valor_entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Valor Renegociado:', `R$ ${renegociacao.valor_renegociado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Número de Parcelas:', renegociacao.numero_parcelas.toString()],
      ['Valor da Parcela:', `R$ ${renegociacao.valor_parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: dadosFinanceiros,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 50 },
      },
      margin: { left: 20 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 5;

    // Observações
    if (renegociacao.observacoes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const observacoesLines = doc.splitTextToSize(`Obs: ${renegociacao.observacoes}`, 170);
      doc.text(observacoesLines, 20, yPos);
      yPos += observacoesLines.length * 5 + 3;
    }

    // Tabela de parcelas
    if (renegociacao.parcelas && renegociacao.parcelas.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Parcelas:', 20, yPos);
      yPos += 5;

      const parcelasPagas = renegociacao.parcelas.filter(p => p.status === 'paga').length;
      const parcelasPendentes = renegociacao.parcelas.filter(p => p.status === 'pendente').length;

      doc.setFont('helvetica', 'normal');
      doc.text(`${parcelasPagas} pagas de ${renegociacao.parcelas.length} | ${parcelasPendentes} pendentes`, 20, yPos);
      yPos += 5;

      const parcelasData = renegociacao.parcelas.slice(0, 5).map(p => [
        p.numero_parcela.toString(),
        format(new Date(p.data_vencimento), 'dd/MM/yyyy'),
        `R$ ${p.valor_parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        p.status === 'paga' ? '✓ Paga' : 'Pendente',
        p.data_pagamento ? format(new Date(p.data_pagamento), 'dd/MM/yyyy') : '-',
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Nº', 'Vencimento', 'Valor', 'Status', 'Pagamento']],
        body: parcelasData,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
        margin: { left: 20 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 3;

      if (renegociacao.parcelas.length > 5) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(`... e mais ${renegociacao.parcelas.length - 5} parcelas`, 20, yPos);
        yPos += 5;
      }
    }

    yPos += 10; // Espaço entre renegociações
  });

  // Rodapé em todas as páginas
  const pageCount = doc.internal.pages.length - 1;
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
  const nomeArquivo = `relatorio_renegociacoes_${filtro}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(nomeArquivo);
}
