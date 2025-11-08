import * as XLSX from 'xlsx';

export function downloadFinancialTemplate() {
  // Dados de exemplo para o template - FORMATO EXATO PARA PROCESSAMENTO AUTOMÁTICO
  const exampleData = [
    {
      'Quadra/Lote': 'A/01',
      'Cliente': 'João da Silva',
      'Descrição': 'Parcela 1/60',
      'Vencimento': '15/01/2024',
      'Valor': 'R$ 1.500,00',
      'Situação': 'Pago',
      'Data Recebimento': '14/01/2024',
      'Desconto': 'R$ 0,00',
      'Juros': 'R$ 0,00',
      'Honorários': 'R$ 0,00',
      'Valor Pago': 'R$ 1.500,00',
    },
    {
      'Quadra/Lote': 'A/01',
      'Cliente': 'João da Silva',
      'Descrição': 'Parcela 2/60',
      'Vencimento': '15/02/2024',
      'Valor': 'R$ 1.500,00',
      'Situação': 'Pendente',
      'Data Recebimento': '',
      'Desconto': 'R$ 0,00',
      'Juros': 'R$ 0,00',
      'Honorários': 'R$ 0,00',
      'Valor Pago': 'R$ 0,00',
    },
    {
      'Quadra/Lote': 'B/15',
      'Cliente': 'Maria Oliveira',
      'Descrição': 'Parcela 1/48',
      'Vencimento': '10/01/2024',
      'Valor': 'R$ 2.000,00',
      'Situação': 'Vencido',
      'Data Recebimento': '',
      'Desconto': 'R$ 0,00',
      'Juros': 'R$ 50,00',
      'Honorários': 'R$ 100,00',
      'Valor Pago': 'R$ 0,00',
    },
  ];

  // Criar planilha
  const ws = XLSX.utils.json_to_sheet(exampleData);

  // Definir larguras das colunas
  const columnWidths = [
    { wch: 12 }, // Quadra/Lote
    { wch: 25 }, // Cliente
    { wch: 20 }, // Descrição
    { wch: 15 }, // Vencimento
    { wch: 15 }, // Valor
    { wch: 12 }, // Situação
    { wch: 18 }, // Data Recebimento
    { wch: 15 }, // Desconto
    { wch: 15 }, // Juros
    { wch: 15 }, // Honorários
    { wch: 15 }, // Valor Pago
  ];
  ws['!cols'] = columnWidths;

  // Criar workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados Financeiros');

  // Adicionar uma segunda aba com instruções
  const instructions = [
    ['⭐ TEMPLATE PARA IMPORTAÇÃO AUTOMÁTICA VIA CHAT ⭐'],
    [''],
    ['COMO USAR:'],
    ['1. Preencha os dados seguindo o formato dos exemplos'],
    ['2. Envie o arquivo diretamente no chat do Lovable'],
    ['3. A IA irá processar e importar automaticamente!'],
    [''],
    ['FORMATO DAS COLUNAS:'],
    [''],
    ['Coluna', 'Descrição', 'Formato', 'Obrigatório'],
    ['Quadra/Lote', 'Identificação do lote (formato: Quadra/Lote)', 'Texto (ex: A/01)', 'Sim'],
    ['Cliente', 'Nome completo do cliente/cooperado', 'Texto', 'Sim'],
    ['Descrição', 'Descrição da parcela', 'Texto', 'Não'],
    ['Vencimento', 'Data de vencimento da parcela', 'Data (DD/MM/AAAA)', 'Sim'],
    ['Valor', 'Valor da parcela', 'Moeda (R$ 0,00)', 'Sim'],
    ['Situação', 'Status da parcela', 'Pago ou Pendente', 'Sim'],
    ['Data Recebimento', 'Data em que foi pago (se aplicável)', 'Data (DD/MM/AAAA)', 'Não'],
    ['Desconto', 'Valor de desconto aplicado', 'Moeda (R$ 0,00)', 'Não'],
    ['Juros', 'Valor de juros cobrado', 'Moeda (R$ 0,00)', 'Não'],
    ['Honorários', 'Valor de honorários cobrado', 'Moeda (R$ 0,00)', 'Não'],
    ['Valor Pago', 'Valor efetivamente pago', 'Moeda (R$ 0,00)', 'Não'],
    [''],
    ['⚡ PROCESSAMENTO AUTOMÁTICO:'],
    ['✅ Cooperados são criados automaticamente se não existirem'],
    ['✅ Investimentos são vinculados ou criados conforme necessário'],
    ['✅ Todas as parcelas são importadas com seus status corretos'],
    ['✅ Estatísticas completas são geradas automaticamente'],
    [''],
    ['📋 REGRAS IMPORTANTES:'],
    ['• Mantenha os cabeçalhos exatamente como no exemplo'],
    ['• Cada linha representa uma parcela individual'],
    ['• Valores monetários: use R$ ou não, vírgula para decimal'],
    ['• Datas: formato DD/MM/AAAA ou DD/MM/AA'],
    ['• Situação: apenas "Pago" ou "Pendente"'],
    [''],
    ['💡 DICA: Após preencher, salve e envie o arquivo no chat!'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [
    { wch: 20 },
    { wch: 50 },
    { wch: 25 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções');

  // Baixar arquivo
  XLSX.writeFile(wb, 'template_importacao_financeira.xlsx');
}

export function downloadCooperadosTemplate() {
  // Dados de exemplo para o template de cooperados
  const exampleData = [
    {
      'Nome Completo': 'João da Silva',
      'Email': 'joao.silva@email.com',
      'Senha': 'Senha123!',
      'CPF': '123.456.789-00',
      'Telefone': '(11) 98765-4321',
      'Quadra': 'A',
      'Lote': '01',
      'Fase': '1',
      'Data Compra': '15/01/2024',
    },
    {
      'Nome Completo': 'Maria Oliveira',
      'Email': 'maria.oliveira@email.com',
      'Senha': 'Senha456!',
      'CPF': '987.654.321-00',
      'Telefone': '(11) 91234-5678',
      'Quadra': 'B',
      'Lote': '15',
      'Fase': '2',
      'Data Compra': '20/02/2024',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(exampleData);
  ws['!cols'] = [
    { wch: 25 },
    { wch: 30 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cooperados');

  // Adicionar aba de instruções
  const instructions = [
    ['INSTRUÇÕES PARA PREENCHIMENTO DO TEMPLATE'],
    [''],
    ['Coluna', 'Descrição', 'Formato', 'Obrigatório'],
    ['Nome Completo', 'Nome completo do cooperado', 'Texto', 'Sim'],
    ['Email', 'Email do cooperado (deve ser único)', 'Email válido', 'Sim'],
    ['Senha', 'Senha de acesso (deixe em branco para gerar automaticamente)', 'Texto', 'Não'],
    ['CPF', 'CPF do cooperado', 'Texto com ou sem formatação', 'Não'],
    ['Telefone', 'Telefone do cooperado', 'Texto com ou sem formatação', 'Não'],
    ['Quadra', 'Identificação da quadra', 'Texto', 'Não'],
    ['Lote', 'Identificação do lote', 'Texto', 'Não'],
    ['Fase', 'Fase do empreendimento', 'Texto', 'Não'],
    ['Data Compra', 'Data da compra', 'Data (DD/MM/AAAA)', 'Não'],
    [''],
    ['OBSERVAÇÕES IMPORTANTES:'],
    ['1. A primeira linha deve conter os cabeçalhos (exatamente como no exemplo)'],
    ['2. Senhas são geradas automaticamente se deixadas em branco'],
    ['3. Emails duplicados serão ignorados na importação'],
    ['4. Apenas registros válidos serão importados'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [
    { wch: 20 },
    { wch: 50 },
    { wch: 25 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções');

  XLSX.writeFile(wb, 'template_importacao_cooperados.xlsx');
}
