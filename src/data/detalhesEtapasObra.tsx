import { ReactNode } from 'react';

export interface DetalheEtapa {
  resumo: string;
  status: string;
  periodo: string;
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
    resumo: 'Remodelagem do relevo para preparar as plataformas que receberão vias, edificações comuns, lotes e infraestrutura subterrânea — operações de corte, aterro e compactação controlada por camadas, com controle topográfico permanente.',
    status: 'EM EXECUÇÃO',
    periodo: '28/02/2026 → 30/10/2026',
    secoes: [
      {
        titulo: 'Operação atual',
        conteudo: <p className="text-sm">Iniciada em 28/02/2026, com conclusão programada para 30/10/2026. A operação envolve frota de tratores de esteira, motoniveladoras, rolos compactadores e caminhões basculantes em jornada contínua, com controle topográfico permanente para garantir aderência ao projeto geométrico.</p>,
      },
      {
        titulo: 'Cronograma físico previsto',
        conteudo: <Tabela headers={['Período', 'Etapa em execução', 'Acumulado']} rows={[
          ['28/02/2026', 'Início da mobilização de equipamentos', '5%'],
          ['Mar–Abr/26', 'Cortes e aterros primários — quadrantes iniciais', '18%'],
          ['Mai/26', 'Início da plataforma do clube e da portaria', '30%'],
          ['Jun/26', 'Vias principais e secundárias — modelagem', '45%'],
          ['Jul/26', 'Compactação por camadas — sub-base preparada', '60%'],
          ['Ago/26', 'Áreas remanescentes e ajustes topográficos', '75%'],
          ['Set/26', 'Acabamento de greide das vias — liberação à infra', '92%'],
          ['Out/26', 'Encerramento e entrega das plataformas', '100%'],
        ]} />,
      },
      {
        titulo: 'Controle de qualidade',
        conteudo: <p className="text-sm">A compactação de aterros é verificada por ensaios de grau de compactação (Proctor) com meta mínima de 95% para sub-base de vias internas. Em pontos críticos de infraestrutura enterrada — travessias de rede pluvial e cruzamentos de água e esgoto — a exigência sobe para 98%, evitando recalques diferenciais que comprometeriam tubulações.</p>,
      },
      {
        titulo: 'Volumetria de bota-fora',
        conteudo: <Tabela headers={['Parâmetro dimensional', 'Valor']} rows={[
          ['Volume total a transportar', '295.000 toneladas'],
          ['Período da operação', 'Maio a Agosto de 2026'],
          ['Dias úteis efetivos no período', '≈ 87 dias úteis'],
          ['Capacidade de carga média', '18 toneladas/caçamba'],
          ['Viagens diárias por caçamba', '5 viagens/dia'],
          ['Viagens totais necessárias', '≈ 16.389 viagens'],
          ['Frota diária dimensionada', '38 caçambas/dia (até 50 em pico)'],
        ]} />,
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
      {
        titulo: 'Curva de colaboradores mês a mês',
        conteudo: <Tabela headers={['Mês', 'Colaboradores', 'Observação']} rows={[
          ['Fev/26', '≈ 30', 'Mobilização inicial, 1 frente em ramp-up'],
          ['Mar/26', '≈ 42', '1ª frente plena, abertura da 2ª'],
          ['Abr/26', '≈ 52', '2 frentes em regime pleno'],
          ['Mai/26', '≈ 58', 'Reforço — plataforma do clube e portaria'],
          ['Jun/26', '≈ 65', 'Vias principais e secundárias'],
          ['Jul/26', '≈ 80', 'Início do pico — compactação por camadas'],
          ['Ago/26', '≈ 85', 'Pico máximo — áreas remanescentes'],
          ['Set/26', '≈ 72', 'Acabamento de greide e ajustes finais'],
          ['Out/26', '≈ 50', 'Encerramento — desmobilização progressiva'],
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

  'Infraestrutura': {
    resumo: 'Instalação de todas as redes técnicas subterrâneas que dão ao condomínio status de loteamento plenamente urbanizado: água potável, esgoto sanitário, drenagem pluvial, rede elétrica de média/baixa tensão e telecomunicações.',
    status: 'AGUARDANDO INÍCIO',
    periodo: '31/07/2026 → 30/12/2026',
    secoes: [
      {
        titulo: 'Escopo da infraestrutura',
        conteudo: <Lista itens={[
          'Rede de água potável — tubulação principal, ramais secundários e ramais individuais até o limite de cada lote',
          'Rede de esgoto sanitário — coletores prediais, coletores principais e estação elevatória/tratamento',
          'Rede de drenagem pluvial — galerias, bocas de lobo, poços de visita e dispositivos de dissipação',
          'Rede elétrica de média e baixa tensão — entrada de energia, transformadores, ramais e iluminação pública',
          'Rede de telecomunicações — dutos para cabeamento óptico e infraestrutura de conectividade interna',
        ]} />,
      },
      {
        titulo: 'Cronograma de execução',
        conteudo: <Tabela headers={['Mês', 'Etapa', 'Acumulado']} rows={[
          ['Jul/26', 'Mobilização, locação topográfica, escavações iniciais', '10%'],
          ['Ago/26', 'Drenagem pluvial e rede de esgoto — vias principais', '28%'],
          ['Set/26', 'Rede de água, continuidade da drenagem e esgoto', '48%'],
          ['Out/26', 'Rede elétrica subterrânea, iluminação pública', '70%'],
          ['Nov/26', 'Telecomunicações, ramais individuais até lotes', '88%'],
          ['Dez/26', 'Testes, regularizações, ligações definitivas', '100%'],
        ]} />,
      },
      {
        titulo: 'Sequência técnica obrigatória',
        conteudo: <p className="text-sm">A ordem não é arbitrária: drenagem pluvial e esgoto primeiro (maior profundidade, dependem do greide entregue pela terraplanagem); rede de água em sequência (cota intermediária); rede elétrica e telecom por último (cotas rasas, após as hidráulicas para evitar interferências). A finalização em dezembro/2026 é compatível com o término da pavimentação no mesmo mês — o paver se sobrepõe à infra nas vias onde as redes já estão prontas.</p>,
      },
    ],
  },

  'Pavimentação': {
    resumo: 'Mais de 3 milhões de unidades de paver de concreto a serem assentadas em ≈ 90 dias — fabricação interna dedicada ao empreendimento, com controle de qualidade e rastreabilidade industrial.',
    status: 'AGUARDANDO INÍCIO',
    periodo: '30/09/2026 → 30/12/2026',
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
        titulo: 'Volume mês a mês — assentamento',
        conteudo: <Tabela headers={['Mês', 'Pavers no mês', '% do total', 'Acumulado']} rows={[
          ['Set/26', 'Mobilização — mínimo', '—', '—'],
          ['Out/26', '600.000', '20%', '600.000'],
          ['Nov/26', '1.200.000', '40%', '1.800.000'],
          ['Dez/26', '1.200.000', '40%', '3.000.000'],
          ['TOTAL', '3.000.000', '100%', '3.000.000'],
        ]} />,
      },
      {
        titulo: 'Dimensionamento de mão de obra',
        conteudo: <>
          <p className="text-sm mb-2">Cada equipe padrão: 1 oficial (calceteiro) + 2 ajudantes, com produtividade média de 2.000 pavers/dia útil.</p>
          <Tabela headers={['Mês', 'Equipes', 'Assentadores', 'Apoio', 'Total']} rows={[
            ['Out/26', '14', '42', '8', '50'],
            ['Nov/26', '30', '90', '15', '105'],
            ['Dez/26', '28', '84', '14', '98'],
          ]} />
        </>,
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

  'Portaria e Clube': {
    resumo: 'Os dois equipamentos comuns mais visíveis do empreendimento — executados em janela simultânea, compartilhando equipes de estrutura e acabamento para otimização de cronograma.',
    status: 'EM EXECUÇÃO',
    periodo: '30/04/2026 → 30/12/2026',
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
        titulo: 'Distribuição percentual (curva-S)',
        conteudo: <Tabela headers={['Mês', 'Etapa principal', '% mês', 'Acum.']} rows={[
          ['Abr–Jun/26', 'Mobilização, supressão, terraplanagem, locação', '3%', '3%'],
          ['Jul/26', 'Fundações e estruturas inferiores (sapatas, baldrames)', '7%', '10%'],
          ['Ago/26', 'Estruturas — pilares, vigas e lajes', '12%', '22%'],
          ['Set/26', 'Alvenaria, contrapisos, vedações', '15%', '37%'],
          ['Out/26', 'Cobertura, instalações primárias', '17%', '54%'],
          ['Out–Nov/26', 'Esquadrias, revestimentos, primeiros acabamentos', '15%', '69%'],
          ['Nov/26', 'Acabamentos finos, louças, metais, pintura', '13%', '82%'],
          ['Dez/26', 'Instalações finais, equipamentos, testes', '10%', '92%'],
          ['Dez/26', 'Acabamentos finais, comissionamento, entrega', '8%', '100%'],
        ]} />,
      },
      {
        titulo: 'Status real em 30/04/2026',
        conteudo: <p className="text-sm">A supressão vegetal específica das áreas do Clube e da Portaria já está concluída e a terraplanagem das duas plataformas está em execução. As fundações estão programadas para iniciar em maio/junho conforme a entrega progressiva das plataformas. O acumulado físico no fechamento de abril é compatível com a curva-S (3%). A concentração de massa crítica entre agosto e outubro coincide com o período seco do litoral norte baiano, ideal para cobertura e acabamentos externos.</p>,
      },
    ],
  },

  'Paisagismo': {
    resumo: 'Última grande frente de obra — entrega a experiência sensorial final. Regula o microclima, complementa a drenagem pluvial, oferece sombreamento e cria as zonas verdes de convivência. Posicionado após a pavimentação para evitar dano a mudas recém-plantadas.',
    status: 'AGUARDANDO INÍCIO',
    periodo: '30/09/2026 → 28/12/2026',
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
        titulo: 'Cronograma de execução',
        conteudo: <Tabela headers={['Mês', 'Etapa', 'Acumulado']} rows={[
          ['Out/26', 'Preparação de solo, correção, instalação da irrigação', '30%'],
          ['Nov/26', 'Plantio massivo — mudas e arbustos', '70%'],
          ['Dez/26', 'Forração, ajustes finais e primeiras podas de formação', '100%'],
        ]} />,
      },
      {
        titulo: 'Manutenção pós-entrega',
        conteudo: <p className="text-sm">A entrega em dezembro/2026 é o ponto de partida da composição. O paisagismo é obra viva — atinge plenitude estética entre o 2º e o 4º ano após o plantio. Os primeiros 12 meses exigem irrigação reforçada, replantio pontual e podas de formação, coordenados pela administração do condomínio.</p>,
      },
    ],
  },
};
