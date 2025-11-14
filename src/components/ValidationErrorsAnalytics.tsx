import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, TrendingUp, Shield, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ValidationErrorStat {
  field_name: string;
  validation_rule: string;
  error_count: number;
  unique_ips: number;
  last_occurrence: string;
}

interface AttackPattern {
  ip_address: string;
  error_count: number;
  distinct_endpoints: number;
  distinct_fields: number;
  first_attempt: string;
  last_attempt: string;
}

interface RecentError {
  id: string;
  endpoint: string;
  field_name: string;
  validation_rule: string;
  error_message: string;
  attempted_value: string | null;
  ip_address: string;
  created_at: string;
}

export function ValidationErrorsAnalytics() {
  const [errorStats, setErrorStats] = useState<ValidationErrorStat[]>([]);
  const [attackPatterns, setAttackPatterns] = useState<AttackPattern[]>([]);
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'1 hour' | '24 hours' | '7 days'>('24 hours');

  useEffect(() => {
    loadAnalytics();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, [timeFilter]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load validation error statistics
      const { data: stats, error: statsError } = await supabase.rpc('get_validation_error_stats', {
        time_period: timeFilter === '1 hour' ? '1 hour' : timeFilter === '24 hours' ? '24 hours' : '7 days'
      });

      if (statsError) throw statsError;
      setErrorStats(stats || []);

      // Load attack patterns
      const { data: patterns, error: patternsError } = await supabase.rpc('detect_attack_patterns', {
        threshold: 10,
        time_window: timeFilter === '1 hour' ? '1 hour' : timeFilter === '24 hours' ? '24 hours' : '7 days'
      });

      if (patternsError) throw patternsError;
      setAttackPatterns(patterns || []);

      // Load recent errors
      const { data: recent, error: recentError } = await supabase
        .from('validation_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (recentError) throw recentError;
      setRecentErrors(recent || []);
    } catch (error) {
      console.error('Error loading validation analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalErrors = errorStats.reduce((sum, stat) => sum + stat.error_count, 0);
  const uniqueIPs = new Set(recentErrors.map(e => e.ip_address)).size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Análise de Erros de Validação</h2>
          <p className="text-muted-foreground">
            Monitore padrões de validação e detecte potenciais ataques
          </p>
        </div>
        <div className="flex gap-2">
          <Badge 
            variant={timeFilter === '1 hour' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setTimeFilter('1 hour')}
          >
            1 Hora
          </Badge>
          <Badge 
            variant={timeFilter === '24 hours' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setTimeFilter('24 hours')}
          >
            24 Horas
          </Badge>
          <Badge 
            variant={timeFilter === '7 days' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setTimeFilter('7 days')}
          >
            7 Dias
          </Badge>
        </div>
      </div>

      {/* Alert for detected attack patterns */}
      {attackPatterns.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Padrões de Ataque Detectados!</AlertTitle>
          <AlertDescription>
            {attackPatterns.length} endereços IP com comportamento suspeito foram identificados.
            Revise os detalhes na aba "Padrões de Ataque".
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Erros</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalErrors}</div>
            <p className="text-xs text-muted-foreground">
              Últimos {timeFilter}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IPs Únicos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueIPs}</div>
            <p className="text-xs text-muted-foreground">
              Origens distintas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campos Afetados</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(errorStats.map(s => s.field_name)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Campos com erros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ataques Detectados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{attackPatterns.length}</div>
            <p className="text-xs text-muted-foreground">
              IPs suspeitos
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stats" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="attacks">Padrões de Ataque</TabsTrigger>
          <TabsTrigger value="recent">Erros Recentes</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Erros por Campo e Regra</CardTitle>
              <CardDescription>
                Campos com mais falhas de validação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campo</TableHead>
                    <TableHead>Regra de Validação</TableHead>
                    <TableHead className="text-right">Ocorrências</TableHead>
                    <TableHead className="text-right">IPs Únicos</TableHead>
                    <TableHead>Última Ocorrência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : errorStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum erro de validação registrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    errorStats.map((stat, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{stat.field_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{stat.validation_rule}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {stat.error_count}
                        </TableCell>
                        <TableCell className="text-right">{stat.unique_ips}</TableCell>
                        <TableCell>
                          {format(new Date(stat.last_occurrence), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attacks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Padrões de Ataque Detectados</CardTitle>
              <CardDescription>
                IPs com múltiplas tentativas de validação falhadas (possíveis ataques)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endereço IP</TableHead>
                    <TableHead className="text-right">Total de Erros</TableHead>
                    <TableHead className="text-right">Endpoints Distintos</TableHead>
                    <TableHead className="text-right">Campos Distintos</TableHead>
                    <TableHead>Primeira Tentativa</TableHead>
                    <TableHead>Última Tentativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : attackPatterns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum padrão de ataque detectado
                      </TableCell>
                    </TableRow>
                  ) : (
                    attackPatterns.map((pattern, index) => (
                      <TableRow key={index} className="bg-destructive/10">
                        <TableCell className="font-mono">{pattern.ip_address}</TableCell>
                        <TableCell className="text-right font-bold text-destructive">
                          {pattern.error_count}
                        </TableCell>
                        <TableCell className="text-right">{pattern.distinct_endpoints}</TableCell>
                        <TableCell className="text-right">{pattern.distinct_fields}</TableCell>
                        <TableCell>
                          {format(new Date(pattern.first_attempt), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(pattern.last_attempt), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Erros Recentes</CardTitle>
              <CardDescription>
                Últimos 50 erros de validação registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : recentErrors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum erro recente
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentErrors.map((error) => (
                      <TableRow key={error.id}>
                        <TableCell>
                          {format(new Date(error.created_at), "dd/MM HH:mm:ss", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{error.endpoint}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{error.field_name}</TableCell>
                        <TableCell className="max-w-md truncate">
                          {error.error_message}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {error.ip_address}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
