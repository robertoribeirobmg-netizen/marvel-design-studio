import * as XLSX from 'xlsx';

export interface CooperadoTemplate {
  tipo_usuario: string;
  nome_completo: string;
  email: string;
  cpf: string;
  telefone: string;
  quadra: string;
  lote: string;
  fase: string;
}

export const generateCooperadosTemplate = () => {
  const template: CooperadoTemplate[] = [
    {
      tipo_usuario: 'cooperado',
      nome_completo: 'João da Silva',
      email: 'joao@email.com',
      cpf: '123.456.789-00',
      telefone: '(11) 98765-4321',
      quadra: 'A',
      lote: '01',
      fase: 'Fase 1'
    },
    {
      tipo_usuario: 'cooperado',
      nome_completo: 'Maria Santos',
      email: 'maria@email.com',
      cpf: '987.654.321-00',
      telefone: '(11) 91234-5678',
      quadra: 'B',
      lote: '15',
      fase: 'Fase 2'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  
  // Define largura das colunas
  ws['!cols'] = [
    { wch: 15 }, // tipo_usuario
    { wch: 30 }, // nome_completo
    { wch: 30 }, // email
    { wch: 18 }, // cpf
    { wch: 20 }, // telefone
    { wch: 10 }, // quadra
    { wch: 10 }, // lote
    { wch: 15 }  // fase
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cooperados');

  // Adicionar sheet de instruções
  const instructions = [
    ['INSTRUÇÕES PARA PREENCHIMENTO'],
    [''],
    ['1. tipo_usuario: Tipo do usuário (cooperado, admin, admin_obras, executivo_vendas)'],
    ['2. nome_completo: Nome completo do cooperado'],
    ['3. email: Email válido para login'],
    ['4. cpf: CPF com ou sem formatação (123.456.789-00 ou 12345678900)'],
    ['5. telefone: Telefone com DDD'],
    ['6. quadra: Quadra do lote'],
    ['7. lote: Número do lote'],
    ['8. fase: Fase do empreendimento'],
    [''],
    ['IMPORTANTE:'],
    ['- Não altere os nomes das colunas (primeira linha)'],
    ['- Preencha todos os campos obrigatórios'],
    ['- O sistema irá verificar duplicatas automaticamente'],
    ['- A senha inicial será os 4 primeiros dígitos do CPF'],
    ['- O sistema tentará vincular aos dados financeiros do COHAPM automaticamente']
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções');

  return wb;
};

export const downloadCooperadosTemplate = () => {
  const wb = generateCooperadosTemplate();
  XLSX.writeFile(wb, 'template_cooperados.xlsx');
};
