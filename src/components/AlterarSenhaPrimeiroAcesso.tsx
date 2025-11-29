import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface AlterarSenhaPrimeiroAcessoProps {
  open: boolean;
  onSuccess: () => void;
}

export function AlterarSenhaPrimeiroAcesso({ open, onSuccess }: AlterarSenhaPrimeiroAcessoProps) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();

    if (novaSenha.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    try {
      setIsUpdating(true);

      // Atualizar senha no auth
      const { error: passwordError } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (passwordError) {
        // Tratar erro específico de mesma senha
        if (passwordError.message?.includes('same password') || 
            (passwordError as any).code === 'same_password') {
          toast.error('A nova senha deve ser diferente da senha atual');
          return;
        }
        throw passwordError;
      }

      // Atualizar flag no profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ primeira_senha_alterada: true })
          .eq('id', user.id);

        if (profileError) {
          console.error('Erro ao atualizar perfil:', profileError);
          // Não bloquear o fluxo se falhar atualização do perfil
        }
      }

      toast.success('Senha alterada com sucesso!');
      
      // Limpar campos e fechar dialog
      setNovaSenha('');
      setConfirmarSenha('');
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      
      // Mensagens de erro amigáveis
      let errorMessage = 'Erro ao alterar senha';
      if (error.message?.includes('different')) {
        errorMessage = 'A nova senha deve ser diferente da senha atual';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Alterar Senha
          </DialogTitle>
          <DialogDescription>
            Por segurança, você precisa alterar sua senha no primeiro acesso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAlterarSenha} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="novaSenha">Nova Senha</Label>
            <div className="relative">
              <Input
                id="novaSenha"
                type={showPassword ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Digite sua nova senha"
                required
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
            <Input
              id="confirmarSenha"
              type={showPassword ? 'text' : 'password'}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Digite a senha novamente"
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isUpdating}>
            {isUpdating ? 'Atualizando...' : 'Alterar Senha'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
