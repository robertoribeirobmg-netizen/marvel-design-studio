import { ReactNode } from 'react';

export interface DetalheEtapa {
  resumo: string;
  status: string;
  periodo: string;
  fonte?: string;
  secoes: { titulo: string; conteudo: ReactNode }[];
}

const Tabela = ({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) => (
  <div className="overflow-x-auto rounded-md border">
    <table className="w-full text-xs sm:text-sm">
      <thead className="bg-muted">
        <tr>
          {headers.map((h) => (
            <th key={h} className="px-2 sm:px-3 py-2 text-left font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t">
            {r.map((c, j) => (
              <td key={j} className="px-2 sm:px-3 py-2">{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Lista = ({ itens }: { itens: string[] }) => (
  <ul className="list-disc pl-5 space-y-1 text-sm">
    {itens.map((i, idx) => <li key={idx}>{i}</li>)}
  </ul>
);

const FONTE_COMUNICADO = 'Fonte: Comunicado aos compradores "Obra, etapa por etapa — O caminho até a entrega" (23/09/2026). Metas mensais: distribuição proposta para acompanhamento, sujeita à validação das metas físicas pela engenharia; o executado será registrado a partir das medições mensais.';

export const detalhesEtapasObra: Record<string, DetalheEtapa> = {
  'Supressão Vegetal': {
    resumo: 'Primeira intervenção física no terreno: remoção controlada da cobertura vegetal sobre vias, lotes, áreas comuns, futura portaria, clube social e faixa perimetral do muro, executada com base em autorização ambiental específica.',
    status: '100% CONCLUÍDA',
    periodo: '09/12/2025 → 28/03/2026',
    secoes: [
      {
        titulo: 'Procedimento técnico adotado',
        conteudo: <p className="text-sm">A operação foi conduzida por equipe especializada utilizando equipamentos de corte mecanizado (motosserras, roçadeiras e tratores florestais) e mão de obra dedicada para destocamento e remoção. O destocamento (retirada das raízes principais) é a etapa crítica — qualquer raiz remanescente compromete o desempenho geotécnico da terraplanagem subsequente.</p>,
      },
      {
        titulo: 'Marcos e cumprimento de prazos',
        conteudo: <Tabela headers={['Marco', 'Data / Resultado']} rows={[
          ['Início da operação', '09 de dezembro de 2025'],
          ['Conclusão da operação', '28 de março de 2026'],
          ['Duração total', '≈ 110 dias corridos'],
          ['Percentual executado', '100% — etapa encerrada'],
        ]} />,
      },
      {
        titulo: 'Volumetria de bota-fora — logística de transporte',
        conteudo: <Tabela headers={['Parâmetro logístico', 'Valor executado']} rows={[
          ['Frota empregada em pico', 'Mais de 60 caçambas/dia (seg. a sex.)'],
          ['Viagens diárias por caçamba', '4 viagens/dia'],
          ['Período efetivo de transporte', '75 dias úteis'],
          ['Capacidade volumétrica média', '13 m³ (caçamba truck 3 eixos)'],
          ['Capacidade de carga média', '18 toneladas (biomassa + solo orgânico)'],
          ['Viagens totais executadas', '18.000 viagens (60 × 4 × 75)'],
          ['Volume total removido', '234.000 m³'],
          ['Tonelagem total removida', '≈ 324.000 toneladas'],
        ]} />,
      },
      {
        titulo: 'Conformidade ambiental',
        conteudo: <p className="text-sm">Todo o material removido foi destinado a áreas de disposição licenciadas, com emissão de manifestos de transporte e comprovantes de recebimento que compõem o dossiê ambiental do empreendimento, arquivado no setor de compliance da executora para fins de auditoria.</p>,
      },
      {
        titulo: 'Por que esta etapa importa',
        conteudo: <p className="text-sm">A qualidade da supressão vegetal é determinante para todas as etapas seguintes. Terreno mal suprimido gera retrabalho na terraplanagem, aumenta o risco de afundamentos diferenciais sob a futura pavimentação e compromete a infraestrutura enterrada. No La Felicità a operação foi feita com destocamento completo, varredura final e disposição adequada da biomassa, sem passivos remanescentes.</p>,
      },
    ],
  },


  'Terraplanagem': {
    resumo: 'Remodelagem do relevo para preparar as plataformas que receberão vias, edificações comuns, lotes e infraestrutura subterrânea — corte, aterro e compactação controlada por camadas, com controle topográfico permanente. Conclusão reprogramada para fevereiro/2027.',
    status: 'EM EXECUÇÃO — REPROGRAMADA',
    periodo: '01/03/2026 → 28/02/2027',
    fonte: FONTE_COMUNICADO,
    secoes: [
      {
        titulo: 'Por que o prazo foi reprogramado',
        conteudo: <p className="text-sm">De março até a segunda semana de agosto de 2026, as chuvas e a umidade do solo restringiram a movimentação e a compactação de terra. A avaliação operacional da engenharia e da cooperativa é de uma capacidade média de trabalho de, no máximo, 40% nesse período. O atraso estimado na conclusão da terraplanagem é de 4 meses. Segundo a consultoria climática contratada pela cooperativa, as chuvas na região da Praia do Forte ficaram muito acima das médias dos períodos mais chuvosos dos últimos anos, cenário atípico associado ao El Niño. Nas duas últimas semanas de agosto a operação ganhou continuidade e, em setembro, o ritmo se intensificou. Engenharia e cooperativa trabalham para aproveitar as janelas de sol e buscar a antecipação do novo prazo, sem assumir esse resultado como garantido.</p>,
      },
      {
        titulo: 'Posição em 31/08/2026',
        conteudo: <>
          <Tabela headers={['Serviço', 'Executado', 'Total de referência', '%']} rows={[
          ['Corte', '273.591,97 m³', '698.000,00 m³', '39,20%'],
          ['Aterro', '209.397,72 m³', '498.318,00 m³', '42,02%'],
          ['Bota-fora', '82.560,75 m³ soltos', '249.602,50 m³ soltos', '33,08%'],
          ]} />
          <p className="text-xs text-muted-foreground mt-2">O percentual de cada serviço compara o volume acumulado com seu próprio total de referência. Corte e aterro não devem ser somados. Base: Relatório Técnico de Execução — julho e agosto/2026.</p>
        </>,
      },
      {
        titulo: 'Metas mensais da frente',
        conteudo: <>
          <Tabela headers={['Mês', 'Meta do mês']} rows={[
          ['Set/26', '10%'],
          ['Out/26', '10%'],
          ['Nov/26', '21,6%'],
          ['Dez/26', '21,6%'],
          ['Jan/27', '21,6%'],
          ['Fev/27', '15,2% (conclusão)'],
          ]} />
          <p className="text-xs text-muted-foreground mt-2">Percentuais que distribuem o saldo programado da frente; não representam o acumulado desde o início da obra.</p>
        </>,
      },
      {
        titulo: 'Corte — meta mês a mês',
        conteudo: <>
          <Tabela headers={['Mês', 'Acumulado anterior', 'Meta do mês', 'Acumulado previsto', 'Resultado medido']} rows={[
          ['Set/26', '273.591,97 (39,20%)', '42.440,80 (6,08%)', '316.032,77 (45,28%)', 'A apurar'],
          ['Out/26', '316.032,77 (45,28%)', '42.440,80 (6,08%)', '358.473,57 (51,36%)', 'A apurar'],
          ['Nov/26', '358.473,57 (51,36%)', '91.672,13 (13,13%)', '450.145,70 (64,49%)', 'A apurar'],
          ['Dez/26', '450.145,70 (64,49%)', '91.672,13 (13,13%)', '541.817,83 (77,62%)', 'A apurar'],
          ['Jan/27', '541.817,83 (77,62%)', '91.672,13 (13,13%)', '633.489,96 (90,76%)', 'A apurar'],
          ['Fev/27', '633.489,96 (90,76%)', '64.510,04 (9,24%)', '698.000,00 (100,00%)', 'A apurar'],
          ]} />
          <p className="text-xs text-muted-foreground mt-2">Volumes em m³. Percentuais sobre o total do serviço: 698.000,00 m³.</p>
        </>,
      },
      {
        titulo: 'Aterro — meta mês a mês',
        conteudo: <>
          <Tabela headers={['Mês', 'Acumulado anterior', 'Meta do mês', 'Acumulado previsto', 'Resultado medido']} rows={[
          ['Set/26', '209.397,72 (42,02%)', '28.892,03 (5,80%)', '238.289,75 (47,82%)', 'A apurar'],
          ['Out/26', '238.289,75 (47,82%)', '28.892,03 (5,80%)', '267.181,78 (53,62%)', 'A apurar'],
          ['Nov/26', '267.181,78 (53,62%)', '62.406,78 (12,52%)', '329.588,56 (66,14%)', 'A apurar'],
          ['Dez/26', '329.588,56 (66,14%)', '62.406,78 (12,52%)', '391.995,34 (78,66%)', 'A apurar'],
          ['Jan/27', '391.995,34 (78,66%)', '62.406,78 (12,52%)', '454.402,12 (91,19%)', 'A apurar'],
          ['Fev/27', '454.402,12 (91,19%)', '43.915,88 (8,81%)', '498.318,00 (100,00%)', 'A apurar'],
          ]} />
          <p className="text-xs text-muted-foreground mt-2">Volumes em m³. Percentuais sobre o total do serviço: 498.318,00 m³.</p>
        </>,
      },
      {
        titulo: 'Bota-fora — meta mês a mês',
        conteudo: <>
          <Tabela headers={['Mês', 'Acumulado anterior', 'Meta do mês', 'Acumulado previsto', 'Resultado medido']} rows={[
          ['Set/26', '82.560,75 (33,08%)', '31.517,31 (12,63%)', '114.078,06 (45,70%)', 'A apurar'],
          ['Out/26', '114.078,06 (45,70%)', '31.517,31 (12,63%)', '145.595,37 (58,33%)', 'A apurar'],
          ['Nov/26', '145.595,37 (58,33%)', '31.517,31 (12,63%)', '177.112,68 (70,96%)', 'A apurar'],
          ['Dez/26', '177.112,68 (70,96%)', '31.517,31 (12,63%)', '208.629,99 (83,58%)', 'A apurar'],
          ['Jan/27', '208.629,99 (83,58%)', '31.517,31 (12,63%)', '240.147,30 (96,21%)', 'A apurar'],
          ['Fev/27', '240.147,30 (96,21%)', '9.455,20 (3,79%)', '249.602,50 (100,00%)', 'A apurar'],
          ]} />
          <p className="text-xs text-muted-foreground mt-2">Volumes em m³ soltos. Percentuais sobre o total do serviço: 249.602,50 m³ soltos.</p>
        </>,
      },
      {
        titulo: 'Controle de qualidade',
        conteudo: <p className="text-sm">A compactação de aterros é verificada por ensaios de grau de compactação (Proctor) com meta mínima de 95% para sub-base de vias internas. Em pontos críticos de infraestrutura enterrada — travessias de rede pluvial e cruzamentos de água e esgoto — a exigência sobe para 98%, evitando recalques diferenciais que comprometeriam tubulações.</p>,
      },
      {
        titulo: 'Estudo de solo — sondagens executadas',
        conteudo: <>
          <Tabela headers={['Tipo de sondagem', 'Qtd.', 'Função técnica']} rows={[
            ['Trado', '150 furos', 'Reconhecimento superficial até 6 m e caracterização da camada de cobertura'],
            ['SPT (à percussão)', '80 furos', 'Caracterização em profundidade (20–25 m), nível d\'água e fundações — NBR 6484'],
            ['Rotativa mista', '5 furos', 'Investigação pontual em transições com material rochoso/impenetrável'],
            ['TOTAL', '235 furos', 'Cobertura geotécnica completa dos 500 mil m²'],
          ]} />
          <p className="text-sm mt-2">Densidade média de 1 sondagem a cada ≈ 2.130 m², acima do mínimo da NBR 8036. Os relatórios das 235 sondagens integram o dossiê técnico da obra.</p>
        </>,
      },
      {
        titulo: 'Equipamentos (2 frentes simultâneas)',
        conteudo: <Tabela headers={['Equipamento', 'Por frente', 'Total']} rows={[
          ['Trator de esteira (D6/D8)', '1', '2'],
          ['Motoniveladora (patrol)', '1', '2'],
          ['Retroescavadeira', '1', '2'],
          ['Caçamba basculante', '6', '12'],
          ['Rolo compactador', '1', '2'],
          ['TOTAL', '10', '20 unidades'],
        ]} />,
      },
    ],
  },

  '1ª Fase do Muro': {
    resumo: 'Primeiro trecho do fechamento perimetral — primeira camada de segurança física do empreendimento. Trecho com condições topográficas favoráveis e acesso direto, executado com sistema pré-moldado.',
    status: '100% CONCLUÍDA',
    periodo: 'Concluída',
    secoes: [
      {
        titulo: 'Sistema construtivo adotado',
        conteudo: <p className="text-sm">Sistema pré-moldado: pilares de concreto armado fundados em sapatas isoladas, com placas pré-moldadas encaixadas verticalmente entre os pilares. Vantagens sobre a alvenaria convencional: velocidade de execução em ritmo industrial, controle de qualidade industrial das peças (fabricadas e ensaiadas antes da entrega) e durabilidade superior, com vida útil de projeto comparável à de obras de arte rodoviárias.</p>,
      },
      {
        titulo: 'Importância estratégica do fechamento',
        conteudo: <Lista itens={[
          'Define o limite de propriedade do empreendimento',
          'Impede acessos indevidos durante a fase de obras',
          'Protege equipamentos e materiais no canteiro',
          'Marca visualmente a identidade do condomínio',
        ]} />,
      },
    ],
  },

  '2ª Fase do Muro': {
    resumo: 'Trecho mais complexo do perímetro — exigiu supressão vegetal específica da faixa, terraplanagem prévia para nivelamento das cotas de fundação e estudo geotécnico complementar.',
    status: 'EM EXECUÇÃO ACELERADA',
    periodo: 'Conclusão prevista até julho/2026',
    secoes: [
      {
        titulo: 'Detalhamento técnico',
        conteudo: <>
          <p className="text-sm mb-2">A Fase 2 é a mais complexa das três etapas. Diferente das fases 1 e 3, atravessa região onde foi necessário executar previamente:</p>
          <Lista itens={[
            'Supressão vegetal específica da faixa do muro — operação concluída',
            'Terraplanagem da faixa de implantação — nivelamento das cotas de fundação dos pilares',
            'Estudo geotécnico complementar — definição das fundações em locais de menor resistência',
          ]} />
        </>,
      },
      {
        titulo: 'Pré-fabricação concluída',
        conteudo: <p className="text-sm">A fabricação das placas e pilares da Fase 2 foi iniciada em meados de 2025 e está concluída. Todo o material necessário já está fabricado, ensaiado e estocado — a etapa de produção foi descolada da montagem para permitir velocidade máxima em canteiro.</p>,
      },
      {
        titulo: 'Racional da subdivisão em fases',
        conteudo: <p className="text-sm">A subdivisão em três fases não é fragilidade de cronograma — é o oposto. Permite executar as duas fases mais simples em paralelo e isolar a fase complexa (Fase 2) com tempo adequado para resolver as particularidades topográficas. A pré-fabricação antecipada retira do caminho crítico todo o tempo de cura do concreto. Mantido o ritmo atual, a previsão é de conclusão integral até o final do 1º semestre de 2026, com janela conservadora até julho/2026.</p>,
      },
    ],
  },

  '3ª Fase do Muro': {
    resumo: 'Trecho complementar do perímetro — concluído aproveitando condições topográficas favoráveis e acesso direto, em paralelo à Fase 1.',
    status: '100% CONCLUÍDA',
    periodo: 'Concluída',
    secoes: [
      {
        titulo: 'Trecho complementar do perímetro',
        conteudo: <p className="text-sm">A Fase 3 fecha o trecho complementar do perímetro. Assim como a Fase 1, apresentava condições topográficas favoráveis e acesso direto, o que permitiu sua execução em paralelo, sem depender de supressão ou terraplanagem prévias da faixa. Utilizou o mesmo sistema pré-moldado (pilares de concreto armado sobre sapatas isoladas e placas pré-moldadas encaixadas), com controle de qualidade industrial das peças.</p>,
      },
      {
        titulo: 'Estratégia de execução em paralelo',
        conteudo: <p className="text-sm">Executar as duas fases mais simples (1 e 3) em paralelo permitiu isolar a fase complexa (Fase 2) com tempo adequado para resolução das particularidades topográficas, mantendo o fechamento perimetral fora do caminho crítico do cronograma geral da obra.</p>,
      },
    ],
  },

  'Cercamento interno': {
    resumo: 'Colocação de gradil separando a área de proteção ambiental interna das áreas de unidades residenciais.',
    status: 'EM EXECUÇÃO',
    periodo: '01/09/2026 → 31/03/2027',
    fonte: FONTE_COMUNICADO,
    secoes: [
      {
        titulo: 'Metas mensais',
        conteudo: <Tabela headers={['Mês', 'Meta do mês', 'Acumulado previsto']} rows={[
          ['Set/26', '38,75%', '38,75%'],
          ['Out/26', '16,25%', '55,00%'],
          ['Nov/26', '12,50%', '67,50%'],
          ['Dez/26', '12,50%', '80,00%'],
          ['Jan/27', '11,25%', '91,25%'],
          ['Fev/27', '6,25%', '97,50%'],
          ['Mar/27', '2,50%', '100% (conclusão)'],
        ]} />,
      },
    ],
  },

  'Drenagem': {
    resumo: 'Rede de drenagem pluvial das vias e áreas do residencial — primeira rede a ser executada após a entrega do greide pela terraplanagem.',
    status: 'AGUARDANDO INÍCIO',
    periodo: '01/11/2026 → 31/01/2027',
    fonte: FONTE_COMUNICADO,
    secoes: [
      {
        titulo: 'Escopo',
        conteudo: <Lista itens={[
          'Galerias e tubulações de águas pluviais',
          'Bocas de lobo e poços de visita',
          'Dispositivos de dissipação e lançamento',
        ]} />,
      },
      {
        titulo: 'Metas mensais',
        conteudo: <Tabela headers={['Mês', 'Meta do mês', 'Acumulado previsto']} rows={[
          ['Nov/26', '33,33%', '33,33%'],
          ['Dez/26', '33,33%', '66,66%'],
          ['Jan/27', '33,34%', '100% (conclusão)'],
        ]} />,
      },
      {
        titulo: 'Sequência técnica',
        conteudo: <p className="text-sm">Drenagem e esgoto vêm primeiro por estarem nas cotas mais profundas e dependerem do greide entregue pela terraplanagem; a pavimentação avança sobre as vias onde as redes já estão prontas.</p>,
      },
    ],
  },

  'Pavimentação': {
    resumo: 'Mais de 3 milhões de unidades de paver de concreto, com fabricação interna dedicada ao empreendimento, controle de qualidade e rastreabilidade industrial. Execução de novembro/2026 a maio/2027.',
    status: 'AGUARDANDO INÍCIO',
    periodo: '01/11/2026 → 31/05/2027',
    fonte: FONTE_COMUNICADO,
    secoes: [
      {
        titulo: 'Por que paver e não asfalto?',
        conteudo: <Lista itens={[
          'Drenagem superior — juntas entre blocos permitem percolação parcial da água da chuva',
          'Manutenção facilitada — intervenções subterrâneas permitem remoção pontual e reposição sem cicatrizes',
          'Durabilidade — vida útil de 25 a 30 anos sem recapeamento (asfalto: ciclos de 7 a 10 anos)',
          'Estética e identidade — combinações de cores e paginações que reforçam a identidade visual',
          'Conforto térmico — reduz a temperatura superficial das vias em até 8 °C no pico solar',
        ]} />,
      },
      {
        titulo: 'Especificação técnica (NBR 9781)',
        conteudo: <Tabela headers={['Parâmetro', 'Especificação', 'Referência']} rows={[
          ['Resistência à compressão', 'fpk ≥ 35 MPa', 'NBR 9781'],
          ['Espessura — vias internas', '80 mm (8 cm)', 'Tráfego leve/médio'],
          ['Espessura — tráfego pesado', '100 mm (10 cm)', 'Acessos de carga'],
          ['Absorção de água máxima', '≤ 6,0%', 'NBR 9781'],
          ['Tolerância dimensional', '± 3 mm', 'NBR 9781'],
          ['Resistência à abrasão', 'Perda ≤ 23 mm em 16 km', 'ABNT NM 119'],
          ['Vida útil de projeto', '25 a 30 anos sem recapeamento', 'Boas práticas'],
        ]} />,
      },
      {
        titulo: 'Fabricação interna — racional estratégico',
        conteudo: <Lista itens={[
          'Controle absoluto de qualidade — cada lote ensaiado quanto a resistência, absorção e dimensões',
          'Garantia de fornecimento contínuo — ritmo de chegada superior a 33 mil unidades/dia em pico',
          'Redução de custo total — elimina margem do fornecedor e custos de frete, com ganho de escala',
          'Personalização sem sobrepreço — cor, formato, paginação e espessura ajustados ao projeto',
          'Rastreabilidade total — cada lote registrado com data, traço, ensaios e local de assentamento',
        ]} />,
      },
      {
        titulo: 'Metas mensais',
        conteudo: <Tabela headers={['Mês', 'Meta do mês', 'Acumulado previsto']} rows={[
          ['Nov/26', '10%', '10%'],
          ['Dez/26', '12%', '22%'],
          ['Jan/27', '14%', '36%'],
          ['Fev/27', '16%', '52%'],
          ['Mar/27', '17%', '69%'],
          ['Abr/27', '17%', '86%'],
          ['Mai/27', '14%', '100% (conclusão)'],
        ]} />,
      },
      {
        titulo: 'Processo de assentamento em campo',
        conteudo: <Lista itens={[
          'Compactação rigorosa da sub-base (≥ 95% do Proctor)',
          'Lançamento e nivelamento da camada de areia média lavada (3 a 5 cm)',
          'Assentamento conforme paginação de projeto, com juntas de 2 a 3 mm',
          'Confinamento de bordas com guias de concreto ou meio-fio',
          'Compactação final com placa vibratória sobre os pavers assentados',
          'Rejuntamento com areia fina varrida até preenchimento total das juntas',
        ]} />,
      },
    ],
  },

  'Infraestrutura elétrica': {
    resumo: 'Instalações de média e baixa tensão, alimentação das unidades, iluminação viária e das áreas comuns, cabeamento estruturado, CFTV e antena.',
    status: 'AGUARDANDO INÍCIO',
    periodo: '01/01/2027 → 30/04/2027',
    fonte: FONTE_COMUNICADO,
    secoes: [
      {
        titulo: 'Escopo',
        conteudo: <Lista itens={[
          'Instalações de média e baixa tensão',
          'Alimentação das unidades',
          'Iluminação viária e das áreas comuns',
          'Cabeamento estruturado',
          'CFTV e antena',
        ]} />,
      },
      {
        titulo: 'Metas mensais',
        conteudo: <Tabela headers={['Mês', 'Meta do mês', 'Acumulado previsto']} rows={[
          ['Jan/27', '6,25%', '6,25%'],
          ['Fev/27', '31,25%', '37,50%'],
          ['Mar/27', '31,25%', '68,75%'],
          ['Abr/27', '31,25%', '100% (conclusão)'],
        ]} />,
      },
    ],
  },

  'Água e esgotamento sanitário': {
    resumo: 'Rede de coleta de esgoto, testes de operação, fornecimento de água canalizada, estações elevatórias e sistema da ETE — Estação de Tratamento de Esgoto.',
    status: 'AGUARDANDO INÍCIO',
    periodo: '01/12/2026 → 31/05/2027',
    fonte: FONTE_COMUNICADO,
    secoes: [
      {
        titulo: 'Escopo',
        conteudo: <Lista itens={[
          'Rede de coleta de esgoto',
          'Testes de operação',
          'Fornecimento de água canalizada',
          'Estações elevatórias',
          'Sistema da ETE — Estação de Tratamento de Esgoto',
        ]} />,
      },
      {
        titulo: 'Prazos internos',
        conteudo: <p className="text-sm">A rede de água está programada até março/2027; a conclusão do conjunto de esgotamento, até maio/2027.</p>,
      },
      {
        titulo: 'Metas mensais',
        conteudo: <Tabela headers={['Mês', 'Meta do mês', 'Acumulado previsto']} rows={[
          ['Dez/26', '21,79%', '21,79%'],
          ['Jan/27', '23,21%', '45,00%'],
          ['Fev/27', '23,21%', '68,21%'],
          ['Mar/27', '16,52%', '84,73%'],
          ['Abr/27', '8,84%', '93,57%'],
          ['Mai/27', '6,43%', '100% (conclusão)'],
        ]} />,
      },
    ],
  },

  'Portaria e Clube': {
    resumo: 'Os dois equipamentos comuns mais visíveis do empreendimento. Junho/2027 passa a ser o mês final, com início pela portaria e avanço posterior dos serviços do clube.',
    status: 'EM EXECUÇÃO — REPROGRAMADA',
    periodo: '01/05/2026 → 30/06/2027',
    fonte: FONTE_COMUNICADO,
    secoes: [
      {
        titulo: 'Portaria — dados técnicos da edificação',
        conteudo: <Lista itens={[
          'Estrutura de concreto armado dimensionada para uso contínuo (24 horas)',
          'Sistema redundante de energia — entrada da concessionária + grupo gerador automático',
          'Infraestrutura completa para CFTV, com rede estruturada e sala técnica climatizada',
          'Cancela automática veicular dimensionada para 712 unidades',
          'Eclusas separadas para morador, visitante e prestador de serviço',
          'Acessibilidade plena conforme normas e acabamentos alinhados à identidade visual',
        ]} />,
      },
      {
        titulo: 'Clube — programa arquitetônico',
        conteudo: <p className="text-sm">O Clube comporta os ambientes de lazer e convivência projetados para 712 unidades. Combina estrutura de concreto armado convencional nas áreas internas com soluções de cobertura de vão amplo (estrutura metálica ou pré-moldada) sobre os espaços de uso coletivo.</p>,
      },
      {
        titulo: 'Sequência de execução',
        conteudo: <p className="text-sm">A portaria iniciou em setembro/2026 a etapa final de terraplanagem. A sequência prevê finalizar a drenagem e iniciar, em outubro/2026, a pavimentação da portaria. Essa primeira etapa avança até sua conclusão; em seguida, a jornada de execução se concentra no clube, respeitando os prazos do cronograma.</p>,
      },
      {
        titulo: 'Metas mensais',
        conteudo: <Tabela headers={['Mês', 'Meta do mês', 'Acumulado previsto']} rows={[
          ['Set/26', '4%', '4%'],
          ['Out/26', '6%', '10%'],
          ['Nov/26', '7%', '17%'],
          ['Dez/26', '10%', '27%'],
          ['Jan/27', '11%', '38%'],
          ['Fev/27', '14%', '52%'],
          ['Mar/27', '11%', '63%'],
          ['Abr/27', '12%', '75%'],
          ['Mai/27', '13%', '88%'],
          ['Jun/27', '12%', '100% (conclusão)'],
        ]} />,
      },
    ],
  },

  'Paisagismo': {
    resumo: 'Última grande frente de obra — entrega a experiência sensorial final. Regula o microclima, complementa a drenagem pluvial, oferece sombreamento e cria as zonas verdes de convivência. Posicionado após a pavimentação para evitar dano a mudas recém-plantadas.',
    status: 'AGUARDANDO INÍCIO',
    periodo: '01/03/2027 → 30/06/2027',
    fonte: FONTE_COMUNICADO,
    secoes: [
      {
        titulo: 'Volume de paisagismo previsto',
        conteudo: <Tabela headers={['Elemento', 'Quantidade', 'Observação técnica']} rows={[
          ['Mudas arbóreas nativas e adaptadas', '1.200 un.', 'Bioma local, baixa exigência hídrica'],
          ['Arbustos diversos', '4.500 un.', 'Composição de massas, divisão de áreas'],
          ['Espécies aromáticas e perfumadas', '600 un.', 'Áreas de convivência e calçadas'],
          ['Espécies frutíferas', '250 un.', 'Pomares de convivência, manejo coletivo'],
          ['Forração de solo', '12.000 m²', 'Cobertura viva, controle de erosão'],
        ]} />,
      },
      {
        titulo: 'Critério técnico de seleção de espécies',
        conteudo: <Lista itens={[
          'Espécies nativas ou adaptadas ao clima do litoral norte baiano — maior sobrevivência, menor demanda hídrica',
          'Diversificação de portes (árvores grandes, médias, arbustos, forrações) para massas equilibradas',
          'Evitar espécies de raiz agressiva próximas a pavimentos, redes subterrâneas e edificações',
        ]} />,
      },
      {
        titulo: 'Metas mensais',
        conteudo: <>
          <Tabela headers={['Mês', 'Meta do mês', 'Acumulado previsto']} rows={[
          ['Mar/27', '20%', '20%'],
          ['Abr/27', '30%', '50%'],
          ['Mai/27', '30%', '80%'],
          ['Jun/27', '20%', '100% (conclusão)'],
        ]} />
          <p className="text-xs text-muted-foreground mt-2">A frente acompanha a liberação das áreas e a conclusão dos serviços anteriores.</p>
        </>,
      },
      {
        titulo: 'Manutenção pós-entrega',
        conteudo: <p className="text-sm">A entrega em junho/2027 é o ponto de partida da composição. O paisagismo é obra viva — atinge plenitude estética entre o 2º e o 4º ano após o plantio. Os primeiros 12 meses exigem irrigação reforçada, replantio pontual e podas de formação, coordenados pela administração do condomínio.</p>,
      },
    ],
  },

  'Sinalização': {
    resumo: 'Sinalização do residencial, executada na fase final, acompanhando a liberação das áreas e a conclusão dos serviços anteriores.',
    status: 'AGUARDANDO INÍCIO',
    periodo: '01/03/2027 → 31/05/2027',
    fonte: FONTE_COMUNICADO,
    secoes: [
      {
        titulo: 'Metas mensais',
        conteudo: <Tabela headers={['Mês', 'Meta do mês', 'Acumulado previsto']} rows={[
          ['Mar/27', '30%', '30%'],
          ['Abr/27', '40%', '70%'],
          ['Mai/27', '30%', '100% (conclusão)'],
        ]} />,
      },
    ],
  },
};
