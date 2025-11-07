import { useState } from "react";
import { Settings as SettingsIcon, Users, Bell, Shield, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoApproval, setAutoApproval] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSaveGeneral = () => {
    toast.success("Configurações gerais salvas com sucesso!");
  };

  const handleSaveNotifications = () => {
    toast.success("Configurações de notificações salvas com sucesso!");
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações e preferências do sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Configure as opções gerais do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="maintenance">Modo de Manutenção</Label>
                    <p className="text-sm text-muted-foreground">
                      Coloca o sistema em modo de manutenção para todos os usuários
                    </p>
                  </div>
                  <Switch
                    id="maintenance"
                    checked={maintenanceMode}
                    onCheckedChange={setMaintenanceMode}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="site-name">Nome do Sistema</Label>
                  <Input
                    id="site-name"
                    placeholder="Portal do Cooperado"
                    defaultValue="Portal do Cooperado"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email de Contato</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="contato@sistema.com"
                  />
                </div>
              </div>

              <Button onClick={handleSaveGeneral}>Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Usuários</CardTitle>
              <CardDescription>
                Configure as políticas de gerenciamento de usuários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-approval">Aprovação Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Novos usuários são aprovados automaticamente
                  </p>
                </div>
                <Switch
                  id="auto-approval"
                  checked={autoApproval}
                  onCheckedChange={setAutoApproval}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="max-users">Limite de Usuários</Label>
                <Input
                  id="max-users"
                  type="number"
                  placeholder="100"
                  defaultValue="100"
                />
                <p className="text-sm text-muted-foreground">
                  Número máximo de usuários permitidos no sistema
                </p>
              </div>

              <Button onClick={handleSaveGeneral}>Salvar Alterações</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total de Usuários</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Administradores</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Cooperados</p>
                  <p className="text-2xl font-bold">1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificações</CardTitle>
              <CardDescription>
                Gerencie como e quando os usuários recebem notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notif">Notificações por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar notificações importantes por email
                  </p>
                </div>
                <Switch
                  id="email-notif"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="smtp-host">Servidor SMTP</Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Porta SMTP</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">Usuário SMTP</Label>
                  <Input
                    id="smtp-user"
                    placeholder="noreply@sistema.com"
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifications}>Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Segurança</CardTitle>
              <CardDescription>
                Gerencie as políticas de segurança e acesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Tempo de Sessão (minutos)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  placeholder="60"
                  defaultValue="60"
                />
                <p className="text-sm text-muted-foreground">
                  Tempo até o logout automático por inatividade
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="password-min">Tamanho Mínimo da Senha</Label>
                <Input
                  id="password-min"
                  type="number"
                  placeholder="8"
                  defaultValue="8"
                />
              </div>

              <div className="space-y-4">
                <Label>Requisitos de Senha</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="require-uppercase" defaultChecked />
                    <Label htmlFor="require-uppercase" className="font-normal">
                      Exigir letras maiúsculas
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="require-numbers" defaultChecked />
                    <Label htmlFor="require-numbers" className="font-normal">
                      Exigir números
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="require-special" defaultChecked />
                    <Label htmlFor="require-special" className="font-normal">
                      Exigir caracteres especiais
                    </Label>
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveGeneral}>Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
