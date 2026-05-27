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
    resumo: 'Primeira intervenção física no terreno: remoção controlada da cobertura vegetal sobre vias, lotes, áreas comuns e faixa perimetral do muro, com autorização ambiental específica.',
    status: '100% CONCLUÍDA',
    periodo: '09/12/2025 → 28/03/2026',
    secoes: [
      {
        titulo: 'Procedimento técnico adotado',
        conteudo: <p className="text-sm">Operação conduzida por equipe especializada com corte mecanizado (motosserras, roçadeiras e tratores florestais) e mão de obra dedicada para destocamento e remoção. O destocamento (retirada das raízes principais) é a etapa crítica — qualquer raiz remanescente compromete o desempenho geotécnico da terraplanagem subsequente.</p>,
      },
      {
        titulo: 'Marcos e cumprimento de prazos',
        conteudo: <Tabela headers={['Marco', 'Resultado']} rows={[
          ['Início da operação', '09/12/2025'],
          ['Conclusão', '28/03/2026'],
          ['Duração total', '~110 dias corridos'],
          ['Percentual executado', '100% — etapa encerrada'],
        ]} />,
      },
      {
        titulo: 'Por que esta etapa importa para o comprador',
        conteudo: <p className="text-sm">A qualidade da supressão é determinante para todas as etapas seguintes. Terreno mal suprimido gera retrabalho na terraplanagem, aumenta risco de afundamentos diferenciais sob a futura pavimentação e compromete a infraestrutura enterrada. No La Felicità a operação foi feita com destocamento completo, varredura final e disposição adequada da biomassa, sem passivos remanescentes.</p>,
      },
    ],
  },

  'Terraplanagem': {
    resumo: 'Remodelagem do relevo para preparar as plataformas que receberão vias, edificações comuns, lotes e infraestrutura subterrânea — cortes, aterros e compactação controlada por camadas.',
    status: 'EM EXECUÇÃO',
    periodo: '28/02/2026 → 30/10/2026',
    secoes: [
      {
        titulo: 'Operação atual',
        conteudo: <p className="text-sm">Frota de tratores de esteira, motoniveladoras, rolos compactadores e caminhões basculantes em jornada contínua, com controle topográfico permanente para aderência ao projeto geométrico.</p>,
      },
      {
        titulo: 'Cronograma físico previsto',
        conteudo: <Tabela headers={['Mês', 'Etapa', 'Acumulado']} rows={[
          ['Fev/26', 'Mobilização e início dos cortes', '5%'],
          ['Mar/26', 'Cortes e aterros primários — quadrantes iniciais', '18%'],
          ['Abr/26', 'Plataforma do clube e portaria — entrega parcial', '30%'],
          ['Mai/26', 'Vias principais e secundárias — modelagem', '42%'],
          ['Jun/26', 'Compactação por camadas — sub-base preparada', '55%'],
          ['Jul/26', 'Áreas remanescentes e ajustes topográficos', '70%'],
          ['Ago/26', 'Acabamento de greide das vias', '82%'],
          ['Set/26', 'Ajustes finais para liberação à infraestrutura', '93%'],
          ['Out/26', 'Encerramento e entrega das plataformas', '100%'],
        ]} />,
      },
      {
        titulo: 'Controle de qualidade',
        conteudo: <p className="text-sm">Compactação verificada por ensaios de grau de compactação (Proctor) com meta mínima de 95% para sub-base de vias internas. Em travessias de rede pluvial e cruzamentos de água e esgoto, exigência elevada para 98% para evitar recalques diferenciais.</p>,
      },
    ],
  },

  '1ª Fase do Muro': {
    resumo: 'Primeiro trecho do fechamento perimetral — primeira camada de segurança física do empreendimento, executada com sistema pré-moldado.',
    status: '100% CONCLUÍDA',
    periodo: 'Concluída',
    secoes: [
      {
        titulo: 'Sistema construtivo adotado',
        conteudo: <p className="text-sm">Sistema pré-moldado: pilares de concreto armado fundados em sapatas isoladas, com placas pré-moldadas encaixadas verticalmente entre os pilares. Vantagens em relação à alvenaria convencional: velocidade industrial de execução, controle de qualidade industrial das peças e durabilidade comparável a obras de arte rodoviárias.</p>,
      },
      {
        titulo: 'Importância estratégica',
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
    resumo: 'Trecho mais complexo do perímetro — exigiu supressão vegetal específica da faixa, terraplanagem prévia para nivelamento e estudo geotécnico complementar.',
    status: 'EM EXECUÇÃO',
    periodo: 'Conclusão prevista até julho/2026',
    secoes: [
      {
        titulo: 'Detalhamento técnico',
        conteudo: <p className="text-sm">A Fase 2 é a mais complexa das três etapas. Diferente das fases 1 e 3, atravessa região onde foi necessário executar previamente supressão vegetal da faixa do muro, terraplanagem para nivelar as cotas de fundação dos pilares e estudo geotécnico complementar para definição das fundações em locais com material de menor resistência.</p>,
      },
      {
        titulo: 'Pré-fabricação concluída',
        conteudo: <p className="text-sm">A fabricação das placas e pilares da Fase 2 foi iniciada em meados de 2025 e está concluída. Todo o material necessário já está fabricado, ensaiado e estocado — a etapa de produção foi descolada da etapa de montagem para permitir velocidade máxima em canteiro.</p>,
      },
      {
        titulo: 'Status em 31/03/2026',
        conteudo: <p className="text-sm">A Fase 2 registrava <strong>33% de execução em canteiro</strong>. Considerando estoque pleno de peças e manutenção do ritmo, a previsão é de conclusão integral até o final do primeiro semestre de 2026, com janela conservadora até julho/2026.</p>,
      },
    ],
  },

  '3ª Fase do Muro': {
    resumo: 'Trecho complementar do perímetro — concluído em paralelo à Fase 1, aproveitando condições topográficas favoráveis e acesso direto.',
    status: '100% CONCLUÍDA',
    periodo: 'Concluída',
    secoes: [
      {
        titulo: 'Estratégia de subdivisão em três fases',
        conteudo: <p className="text-sm">A subdivisão em três fases não é fragilidade do cronograma — é o oposto. Permite executar as duas fases mais simples em paralelo e isolar a fase complexa (Fase 2) com tempo adequado para resolução das particularidades topográficas. A pré-fabricação antecipada das placas e pilares retira do caminho crítico todo o tempo de cura do concreto.</p>,
      },
    ],
  },

  'Infraestrutura': {
    resumo: 'Instalação de todas as redes técnicas subterrâneas: água potável, esgoto sanitário, drenagem pluvial, rede elétrica de média/baixa tensão e telecomunicações.',
    status: 'AGUARDANDO INÍCIO',
    periodo: '31/07/2026 → 30/12/2026',
    secoes: [
      {
        titulo: 'Escopo da infraestrutura',
        conteudo: <Lista itens={[
          'Rede de abastecimento de água potável — tubulação principal, ramais secundários e ramais individuais até o limite de cada lote',
          'Rede de coleta de esgoto sanitário — coletores prediais, coletores principais e estação elevatória/tratamento',
          'Rede de drenagem pluvial — galerias, bocas de lobo, poços de visita e dispositivos de dissipação',
          'Rede elétrica de média e baixa tensão — entrada de energia, transformadores, ramais e iluminação pública',
          'Rede de telecomunicações — dutos para cabeamento óptico e infraestrutura para conectividade interna',
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
        conteudo: <p className="text-sm">Drenagem pluvial e esgoto primeiro (maior profundidade); rede de água em sequência (cota intermediária); rede elétrica e telecom por último (cotas rasas, após hidráulicas para evitar interferências). A finalização em dezembro/2026 é compatível com o término do paver no mesmo mês — pavimentação se sobrepõe à infraestrutura nas vias onde as redes já estão prontas.</p>,
      },
    ],
  },

  'Pavimentação': {
    resumo: 'Mais de 3 milhões de unidades de paver de concreto a serem assentadas em 3 meses — fabricação interna dedicada ao empreendimento, com controle de qualidade industrial.',
    status: 'AGUARDANDO INÍCIO',
    periodo: '30/09/2026 → 30/12/2026',
    secoes: [
      {
        titulo: 'Por que paver e não asfalto?',
        conteudo: <Lista itens={[
          'Drenagem superior — juntas entre blocos permitem percolação parcial da água da chuva',
          'Manutenção facilitada — intervenções subterrâneas permitem remoção pontual e reposição sem cicatrizes',
          'Durabilidade — vida útil de 25 a 30 anos sem recapeamento (asfalto: ciclos de 7 a 10 anos)',
          'Estética e identidade — combinações de cores e paginações que reforçam identidade visual',
          'Conforto térmico — reduz temperatura superficial das vias em até 8°C no pico solar',
        ]} />,
      },
      {
        titulo: 'Especificação técnica (NBR 9781)',
        conteudo: <Tabela headers={['Parâmetro', 'Especificação']} rows={[
          ['Resistência à compressão', 'fpk ≥ 35 MPa'],
          ['Espessura — vias internas', '80 mm (8 cm)'],
          ['Espessura — tráfego pesado', '100 mm (10 cm)'],
          ['Absorção de água máxima', '≤ 6,0%'],
          ['Tolerância dimensional', '± 3 mm'],
          ['Resistência à abrasão', 'Perda ≤ 23 mm em 16 km'],
          ['Vida útil de projeto', '25 a 30 anos sem recapeamento'],
        ]} />,
      },
      {
        titulo: 'Fabricação interna — racional estratégico',
        conteudo: <Lista itens={[
          'Controle absoluto de qualidade — cada lote ensaiado quanto a resistência, absorção e dimensões',
          'Garantia de fornecimento contínuo — produção dimensionada exclusivamente para o La Felicità',
          'Redução de custo total — elimina margem do fornecedor e custos de frete',
          'Personalização sem sobrepreço — cor, formato e paginação ajustados ao projeto',
          'Rastreabilidade total — cada lote registrado com data, traço, ensaios e local de assentamento',
        ]} />,
      },
      {
        titulo: 'Volume mês a mês',
        conteudo: <Tabela headers={['Mês', 'Pavers no mês', '% do total', 'Acumulado']} rows={[
          ['Set/26', 'Mobilização', '—', '—'],
          ['Out/26', '600.000', '20%', '600.000'],
          ['Nov/26', '1.200.000', '40%', '1.800.000'],
          ['Dez/26', '1.200.000', '40%', '3.000.000'],
          ['TOTAL', '3.000.000', '100%', '3.000.000'],
        ]} />,
      },
      {
        titulo: 'Mão de obra dimensionada',
        conteudo: <Tabela headers={['Mês', 'Equipes', 'Assentadores', 'Apoio', 'Total']} rows={[
          ['Out/26', '14', '42', '8', '50'],
          ['Nov/26', '30', '90', '15', '105'],
          ['Dez/26', '28', '84', '14', '98'],
        ]} />,
      },
      {
        titulo: 'Processo de assentamento em campo',
        conteudo: <Lista itens={[
          'Compactação rigorosa da sub-base (≥95% do Proctor)',
          'Lançamento e nivelamento da camada de areia média lavada (3 a 5 cm)',
          'Assentamento conforme paginação, com juntas de 2 a 3 mm',
          'Confinamento de bordas com guias de concreto ou meio-fio',
          'Compactação final com placa vibratória',
          'Rejuntamento com areia fina varrida até preenchimento total das juntas',
        ]} />,
      },
    ],
  },

  'Portaria e Clube': {
    resumo: 'Dois equipamentos comuns mais visíveis do empreendimento — executados em paralelo, compartilhando equipes de estrutura e acabamento.',
    status: 'EM EXECUÇÃO (TERRAPLANAGEM)',
    periodo: '30/04/2026 → 30/12/2026',
    secoes: [
      {
        titulo: 'Portaria — dados técnicos',
        conteudo: <Lista itens={[
          'Estrutura de concreto armado para uso 24 horas com previsão de cargas eletrônicas',
          'Sistema redundante de energia — entrada da concessionária + grupo gerador automático',
          'Infraestrutura completa para CFTV, com rede estruturada e sala técnica climatizada',
          'Cancela automática dimensionada para fluxo de 712 unidades',
          'Eclusas separadas para morador, visitante e prestador de serviço',
          'Acessibilidade plena para pessoas com mobilidade reduzida',
        ]} />,
      },
      {
        titulo: 'Clube — programa arquitetônico',
        conteudo: <p className="text-sm">Ambientes de lazer e convivência dimensionados para 712 unidades com base em índices de uso simultâneo típicos para empreendimentos de mesmo porte na região. Estrutura de concreto armado convencional para áreas internas, com soluções de cobertura de vão amplo (estrutura metálica ou pré-moldada) sobre espaços coletivos. Instalações hidráulicas e elétricas com redundância similar à da Portaria.</p>,
      },
      {
        titulo: 'Regras de uso (em formalização)',
        conteudo: <Lista itens={[
          'Controle de acesso por aplicativo e identificação biométrica/facial',
          'Pré-autorização digital de visitantes pelo morador',
          'Restrições de horário e capacidade por ambiente (piscina, salões, academia, áreas gourmet)',
          'Sistema de reserva online integrado à gestão do condomínio',
          'Política de uso para visitantes e convidados',
          'Regras específicas para áreas pet, esportivas e infantis',
        ]} />,
      },
      {
        titulo: 'Distribuição percentual (curva-S)',
        conteudo: <Tabela headers={['Mês', 'Etapa principal', '% mês', 'Acum.']} rows={[
          ['Abr/26', 'Mobilização, supressão, terraplanagem, locação', '3%', '3%'],
          ['Mai/26', 'Fundações e estruturas inferiores', '7%', '10%'],
          ['Jun/26', 'Estruturas — pilares, vigas e lajes', '12%', '22%'],
          ['Jul/26', 'Alvenaria, contrapisos, vedações', '15%', '37%'],
          ['Ago/26', 'Cobertura, instalações primárias', '17%', '54%'],
          ['Set/26', 'Esquadrias, revestimentos, primeiros acabamentos', '15%', '69%'],
          ['Out/26', 'Acabamentos finos, louças, metais, pintura', '13%', '82%'],
          ['Nov/26', 'Instalações finais, equipamentos, testes', '10%', '92%'],
          ['Dez/26', 'Acabamentos finais, comissionamento, entrega', '8%', '100%'],
        ]} />,
      },
    ],
  },

  'Paisagismo': {
    resumo: 'Última grande frente de obra — entrega ao morador a experiência sensorial final. Regula o microclima, complementa a drenagem pluvial e cria as zonas verdes de convivência.',
    status: 'AGUARDANDO INÍCIO',
    periodo: '30/09/2026 → 28/12/2026',
    secoes: [
      {
        titulo: 'Volume de paisagismo previsto',
        conteudo: <Tabela headers={['Elemento', 'Quantidade', 'Observação']} rows={[
          ['Mudas arbóreas nativas e adaptadas', '1.200 un.', 'Bioma local, baixa exigência hídrica'],
          ['Palmeiras ornamentais', '80 un.', 'Imperial, areca-bambu, porte'],
          ['Arbustos diversos', '4.500 un.', 'Composição de massas'],
          ['Espécies aromáticas e perfumadas', '600 un.', 'Áreas de convivência'],
          ['Espécies frutíferas', '250 un.', 'Pomares de convivência'],
          ['Forração de solo', '12.000 m²', 'Controle de erosão'],
          ['Gramado em áreas comuns', '30.000 m²', 'Grama esmeralda ou similar'],
          ['Pontos de irrigação automatizada', 'Conforme projeto', 'Setorizada com temporizador'],
        ]} />,
      },
      {
        titulo: 'Critério técnico de seleção de espécies',
        conteudo: <Lista itens={[
          'Espécies nativas ou adaptadas ao clima do litoral norte baiano',
          'Diversificação de portes (árvores grandes, médias, arbustos, forrações)',
          'Evitar espécies com sistema radicular agressivo próximas a pavimentos e edificações',
        ]} />,
      },
      {
        titulo: 'Cronograma de execução',
        conteudo: <Tabela headers={['Mês', 'Etapa', 'Acumulado']} rows={[
          ['Out/26', 'Preparação de solo, correção, irrigação', '30%'],
          ['Nov/26', 'Plantio massivo — mudas, arbustos, palmeiras', '70%'],
          ['Dez/26', 'Forração, gramado, ajustes, podas de formação', '100%'],
        ]} />,
      },
      {
        titulo: 'Manutenção pós-entrega',
        conteudo: <p className="text-sm">A entrega em dezembro/2026 é o ponto de partida. O paisagismo é obra viva — atinge plenitude estética entre o 2º e o 4º ano após o plantio. Os primeiros 12 meses exigem irrigação reforçada, replantio pontual e podas de formação, coordenadas pela administração do condomínio.</p>,
      },
    ],
  },
};
