import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Home, Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DashboardCooperadosProps {
  cooperados: any[];
}

export function DashboardCooperados({ cooperados }: DashboardCooperadosProps) {
  // Estatísticas gerais
  const totalCooperados = cooperados.length;
  const cooperadosComLote = cooperados.filter(c => c.quadra && c.lote).length;
  const cooperadosSemLote = totalCooperados - cooperadosComLote;

  // Cooperados por fase
  const cooperadosPorFase = cooperados.reduce((acc: Record<string, number>, c) => {
    const fase = c.fase || 'Sem fase';
    acc[fase] = (acc[fase] || 0) + 1;
    return acc;
  }, {});

  const fasesSorted = Object.entries(cooperadosPorFase)
    .sort(([a], [b]) => {
      if (a === 'Sem fase') return 1;
      if (b === 'Sem fase') return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

  // Cooperados por quadra
  const cooperadosPorQuadra = cooperados.reduce((acc: Record<string, number>, c) => {
    const quadra = c.quadra || 'Sem quadra';
    acc[quadra] = (acc[quadra] || 0) + 1;
    return acc;
  }, {});

  const quadrasSorted = Object.entries(cooperadosPorQuadra)
    .sort(([a], [b]) => {
      if (a === 'Sem quadra') return 1;
      if (b === 'Sem quadra') return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

  // Cooperados cadastrados nos últimos 30 dias
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const cooperadosRecentes = cooperados.filter(c => {
    const dataCadastro = new Date(c.data_cadastro);
    return dataCadastro >= trintaDiasAtras;
  }).length;

  // Cooperados com data de compra definida
  const cooperadosComDataCompra = cooperados.filter(c => c.data_compra).length;

  return (
    <div className="space-y-6">
      {/* Cards de estatísticas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cooperados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCooperados}</div>
            <p className="text-xs text-muted-foreground">
              {cooperadosRecentes} cadastrados nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Lote Definido</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cooperadosComLote}</div>
            <p className="text-xs text-muted-foreground">
              {cooperadosSemLote} ainda sem lote
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fases Ativas</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(cooperadosPorFase).filter(f => f !== 'Sem fase').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {cooperadosPorFase['Sem fase'] || 0} cooperados sem fase
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Data de Compra</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cooperadosComDataCompra}</div>
            <p className="text-xs text-muted-foreground">
              {totalCooperados - cooperadosComDataCompra} sem data definida
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por fase e quadra */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Fase</CardTitle>
            <CardDescription>
              Quantidade de cooperados em cada fase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fasesSorted.length > 0 ? (
                fasesSorted.map(([fase, count]) => (
                  <div key={fase} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={fase === 'Sem fase' ? 'outline' : 'secondary'}>
                        {fase}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all"
                          style={{ width: `${(Number(count) / totalCooperados) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {String(count)} ({Math.round((Number(count) / totalCooperados) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum dado disponível
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Quadra</CardTitle>
            <CardDescription>
              Quantidade de cooperados em cada quadra
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quadrasSorted.length > 0 ? (
                quadrasSorted.slice(0, 10).map(([quadra, count]) => (
                  <div key={quadra} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={quadra === 'Sem quadra' ? 'outline' : 'secondary'}>
                        {quadra === 'Sem quadra' ? quadra : `Quadra ${quadra}`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all"
                          style={{ width: `${(Number(count) / totalCooperados) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {String(count)} ({Math.round((Number(count) / totalCooperados) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum dado disponível
                </p>
              )}
              {quadrasSorted.length > 10 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Mostrando 10 de {quadrasSorted.length} quadras
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
