import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ClearAllDataButton() {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAllData = async () => {
    setIsClearing(true);
    
    try {
      toast.info('Limpando todo o banco de dados...');
      
      const { data, error } = await supabase.functions.invoke('clear-all-auth-users', {
        body: {}
      });

      if (error) {
        console.error('Erro ao limpar dados:', error);
        toast.error('Erro ao limpar banco de dados');
        return;
      }

      toast.success(
        `Banco de dados limpo! ${data?.deleted || 0} usuários e ${data?.tablesCleared || 0} tabelas limpas.`,
        { duration: 5000 }
      );

      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);

    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      toast.error('Erro ao limpar banco de dados');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Limpar Todos os Dados
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            ⚠️ ATENÇÃO: Operação Irreversível
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p className="font-semibold">
              Esta ação irá apagar TODOS os dados do banco de dados:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Todos os usuários e perfis</li>
              <li>Todos os cooperados e compradores</li>
              <li>Todos os dados financeiros</li>
              <li>Todas as etapas de obra e fotos</li>
              <li>Todos os logs e históricos</li>
            </ul>
            <p className="font-semibold text-destructive mt-4">
              A estrutura do banco (tabelas, triggers, policies) será mantida.
            </p>
            <p className="font-semibold text-destructive">
              Esta ação NÃO PODE ser desfeita!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isClearing}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearAllData}
            disabled={isClearing}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isClearing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Limpando...
              </>
            ) : (
              'Confirmar Limpeza'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
