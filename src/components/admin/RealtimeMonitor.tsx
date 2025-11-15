import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Activity, 
  Clock, 
  Database,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface UpdateEvent {
  timestamp: Date;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId?: string;
}

interface RealtimeStats {
  totalUpdates: number;
  updatesByTable: Record<string, number>;
  lastUpdate: Date | null;
  connectionDuration: number;
  reconnections: number;
}

type ConnectionStatus = 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CONNECTING';

export function RealtimeMonitor() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING');
  const [stats, setStats] = useState<RealtimeStats>({
    totalUpdates: 0,
    updatesByTable: {},
    lastUpdate: null,
    connectionDuration: 0,
    reconnections: 0
  });
  const [recentUpdates, setRecentUpdates] = useState<UpdateEvent[]>([]);
  const [connectionStartTime, setConnectionStartTime] = useState<Date>(new Date());

  useEffect(() => {
    // Realtime desabilitado
    setConnectionStatus('CLOSED');
    toast.info('Realtime desabilitado', {
      description: 'Atualização automática de dados desativada'
    });
  }, []);

  const handleUpdate = (table: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', recordId?: string) => {
    const updateEvent: UpdateEvent = {
      timestamp: new Date(),
      table,
      operation,
      recordId
    };

    // Atualizar estatísticas
    setStats(prev => ({
      totalUpdates: prev.totalUpdates + 1,
      updatesByTable: {
        ...prev.updatesByTable,
        [table]: (prev.updatesByTable[table] || 0) + 1
      },
      lastUpdate: new Date(),
      connectionDuration: prev.connectionDuration,
      reconnections: prev.reconnections
    }));

    // Adicionar ao histórico de atualizações recentes (manter últimas 50)
    setRecentUpdates(prev => [updateEvent, ...prev].slice(0, 50));
  };

  const handleForceReconnect = async () => {
    toast.info('Reconectando...', {
      description: 'Tentando restabelecer conexão'
    });
    
    // Forçar reconexão removendo e recriando o canal
    window.location.reload();
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'SUBSCRIBED':
        return 'bg-green-500';
      case 'CONNECTING':
        return 'bg-yellow-500';
      case 'CLOSED':
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'SUBSCRIBED':
        return 'Conectado';
      case 'CONNECTING':
        return 'Conectando';
      case 'CLOSED':
        return 'Desconectado';
      case 'CHANNEL_ERROR':
        return 'Erro no Canal';
      case 'TIMED_OUT':
        return 'Tempo Esgotado';
      default:
        return 'Desconhecido';
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getOperationBadge = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return <Badge variant="default" className="bg-green-500">Inserção</Badge>;
      case 'UPDATE':
        return <Badge variant="default" className="bg-blue-500">Atualização</Badge>;
      case 'DELETE':
        return <Badge variant="destructive">Exclusão</Badge>;
      default:
        return <Badge variant="secondary">{operation}</Badge>;
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Status de Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {connectionStatus === 'SUBSCRIBED' ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            Status da Conexão Realtime
          </CardTitle>
          <CardDescription>
            Monitoramento da conexão WebSocket com Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${getStatusColor()} animate-pulse`} />
              <span className="font-medium">{getStatusText()}</span>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tempo Conectado</span>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{formatDuration(stats.connectionDuration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Reconexões</span>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{stats.reconnections}</span>
            </div>
          </div>

          <Separator />

          <Button 
            onClick={handleForceReconnect} 
            variant="outline" 
            className="w-full"
            disabled={connectionStatus === 'CONNECTING'}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Forçar Reconexão
          </Button>
        </CardContent>
      </Card>

      {/* Estatísticas de Sincronização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Estatísticas de Sincronização
          </CardTitle>
          <CardDescription>
            Resumo das atualizações em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total de Atualizações</span>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.totalUpdates}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <span className="text-sm font-medium">Atualizações por Tabela</span>
            <div className="space-y-2">
              {Object.entries(stats.updatesByTable).map(([table, count]) => (
                <div key={table} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{table}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {Object.keys(stats.updatesByTable).length === 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  Nenhuma atualização registrada
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Última Atualização</span>
            <span className="text-sm font-medium">
              {stats.lastUpdate ? formatTimestamp(stats.lastUpdate) : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Atualizações Recentes */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Histórico de Atualizações Recentes
          </CardTitle>
          <CardDescription>
            Últimas 50 atualizações em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {recentUpdates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p className="text-sm">Aguardando atualizações...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentUpdates.map((update, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{update.table}</span>
                          {getOperationBadge(update.operation)}
                        </div>
                        {update.recordId && (
                          <span className="text-xs text-muted-foreground">
                            ID: {update.recordId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(update.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
