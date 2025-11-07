import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Video, 
  Image as ImageIcon, 
  ArrowRight, 
  Images,
  Bell,
  Calendar,
  TrendingUp,
  Home as HomeIcon,
  LogOut,
  Sparkles,
  Activity,
  BarChart3,
  FileText,
  Users,
  ChevronRight,
  Play
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [animateProgress, setAnimateProgress] = useState(false);

  // Mock data - em produção viria de uma API
  const stages = [
    { 
      id: 1, 
      name: "Terraplenagem", 
      progress: 100, 
      status: 'completed',
      description: "Preparação e nivelamento do terreno",
      startDate: "Jan 2024",
      endDate: "Fev 2024"
    },
    { 
      id: 2, 
      name: "Fechamento da Área (Muro) - 1ª Fase", 
      progress: 100, 
      status: 'completed',
      description: "Construção do muro perimetral - primeira etapa",
      startDate: "Fev 2024",
      endDate: "Mar 2024"
    },
    { 
      id: 3, 
      name: "Fechamento da Área (Muro) - 2ª Fase", 
      progress: 45, 
      status: 'in_progress',
      description: "Conclusão do muro perimetral",
      startDate: "Mar 2024",
      endDate: "Mai 2024"
    },
    { 
      id: 4, 
      name: "Fundações", 
      progress: 0, 
      status: 'pending',
      description: "Estrutura de fundação dos edifícios",
      startDate: "Jun 2024",
      endDate: "Ago 2024"
    },
    { 
      id: 5, 
      name: "Estrutura", 
      progress: 0, 
      status: 'pending',
      description: "Levantamento da estrutura dos prédios",
      startDate: "Ago 2024",
      endDate: "Dez 2024"
    },
  ];

  const overallProgress = 49;

  useEffect(() => {
    setAnimateProgress(true);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-secondary animate-pulse" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'in_progress':
        return 'Em Andamento';
      default:
        return 'Não Iniciado';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      case 'in_progress':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const completedStages = stages.filter(s => s.status === 'completed').length;
  const inProgressStages = stages.filter(s => s.status === 'in_progress').length;
  const totalStages = stages.length;

  const weeklyProgress = 2.5;
  const lastUpdate = new Date().toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });

  const notifications = [
    {
      id: 1,
      title: "Nova atualização disponível",
      message: "Fotos da etapa de Terraplenagem foram adicionadas",
      time: "Há 2 horas",
      unread: true,
      type: "photo"
    },
    {
      id: 2,
      title: "Progresso atualizado",
      message: "Fechamento da Área 2ª Fase do Muro: 45% concluído",
      time: "Ontem",
      unread: true,
      type: "progress"
    },
    {
      id: 3,
      title: "Vídeo disponível",
      message: "Novo vídeo da obra adicionado à galeria",
      time: "Há 3 dias",
      unread: false,
      type: "video"
    }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-secondary/5">
      {/* Header Premium */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="h-20 flex items-center justify-between">
            {/* Logo */}
            <Link to="/">
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <Sparkles className="h-8 w-8 text-primary group-hover:text-primary-hover transition-colors" />
                  <div className="absolute inset-0 bg-primary blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
                </div>
                <div>
                  <span className="font-bold text-xl">La Felicità</span>
                  <p className="text-xs text-primary font-medium">Portal do Cooperado</p>
                </div>
              </div>
            </Link>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </Button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-card rounded-xl shadow-2xl border border-border z-50 animate-fade-in-up">
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Notificações</h3>
                        <Badge variant="secondary" className="text-xs">
                          {unreadCount} novas
                        </Badge>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer ${
                            notif.unread ? 'bg-secondary/5' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              notif.unread ? 'bg-secondary' : 'bg-muted-foreground'
                            }`} />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{notif.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                              <span className="text-xs text-muted-foreground mt-2 block">{notif.time}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link to="/">
                <Button variant="ghost" size="sm">
                  <HomeIcon className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 lg:px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Bem-vindo ao seu Portal! 👋
          </h1>
          <p className="text-muted-foreground">
            Acompanhe em tempo real o progresso da construção do seu sonho
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Progresso Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{overallProgress}%</div>
              <div className="flex items-center gap-1 text-xs text-success mt-2">
                <TrendingUp className="h-3 w-3" />
                <span>+{weeklyProgress}% esta semana</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Etapas Concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{completedStages}</div>
              <p className="text-xs text-muted-foreground mt-2">de {totalStages} etapas</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-secondary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">{inProgressStages}</div>
              <p className="text-xs text-muted-foreground mt-2">etapa ativa</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Última Atualização</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                <div className="text-sm font-medium">{lastUpdate}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Overview */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Progresso da Obra
              </CardTitle>
              <CardDescription>Visualização detalhada de cada etapa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {stages.map((stage) => (
                <div key={stage.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(stage.status)}
                      <div>
                        <h3 className="font-semibold">{stage.name}</h3>
                        <p className="text-sm text-muted-foreground">{stage.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={getStatusColor(stage.status)}>
                      {getStatusText(stage.status)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{stage.startDate} - {stage.endDate}</span>
                      <span className="font-semibold text-primary">{stage.progress}%</span>
                    </div>
                    <Progress 
                      value={animateProgress ? stage.progress : 0} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Circular Progress */}
          <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
            <CardHeader>
              <CardTitle>Status Geral</CardTitle>
              <CardDescription>Progresso total da obra</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="relative">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="url(#gradient)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - (animateProgress ? overallProgress : 0) / 100)}`}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="50%" stopColor="hsl(var(--secondary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                    {overallProgress}%
                  </span>
                  <span className="text-sm text-muted-foreground mt-2">Concluído</span>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {completedStages} de {totalStages} etapas concluídas
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="group hover:shadow-xl transition-all cursor-pointer border-primary/20 hover:border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                  <Images className="h-6 w-6 text-white" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold text-lg mb-1">Galeria de Fotos</h3>
              <p className="text-sm text-muted-foreground">
                126 fotos disponíveis
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all cursor-pointer border-secondary/20 hover:border-secondary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-gradient-to-br from-secondary to-accent rounded-xl flex items-center justify-center">
                  <Play className="h-6 w-6 text-white" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-secondary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold text-lg mb-1">Vídeos da Obra</h3>
              <p className="text-sm text-muted-foreground">
                8 vídeos atualizados
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all cursor-pointer border-accent/20 hover:border-accent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold text-lg mb-1">Documentos</h3>
              <p className="text-sm text-muted-foreground">
                Projetos e plantas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Banner */}
        <Card className="bg-gradient-to-r from-primary via-secondary to-accent text-white border-0 overflow-hidden relative">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px'}} />
          <CardHeader className="relative z-10">
            <CardTitle className="text-2xl">Explore a Galeria Completa</CardTitle>
            <CardDescription className="text-white/90">
              Veja fotos e vídeos em alta resolução de cada etapa da construção
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <Images className="mr-2 h-5 w-5" />
              Abrir Galeria Completa
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
