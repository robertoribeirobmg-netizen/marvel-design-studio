import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Download, Info, Zap, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProcessarCOHAPMAuto } from './ProcessarCOHAPMAuto';

export function ImportacaoCOHAPM() {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [isClearing, setIsClearing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStats(null);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/compradores_cohapm_template.xlsx', '_blank');
  };

  const handleClearDatabase = async () => {
    if (!confirm('⚠️ ATENÇÃO: Esta ação irá apagar TODOS os dados de compradores, contratos e parcelas COHAPM do banco de dados. Esta ação não pode ser desfeita. Deseja continuar?')) {
      return;
    }

    setIsClearing(true);
    try {
      toast.info('Limpando dados do banco...');

      // Deletar parcelas primeiro (devido às foreign keys)
      const { error: parcelasError } = await supabase
        .from('parcelas_cohapm')
        .delete()
        .neq('id', 0); // Deleta todos os registros

      if (parcelasError) throw parcelasError;

      // Deletar contratos
      const { error: contratosError } = await supabase
        .from('contratos_cohapm')
        .delete()
        .neq('id', 0);

      if (contratosError) throw contratosError;

      // Deletar compradores
      const { error: compradoresError } = await supabase
        .from('compradores_cohapm')
        .delete()
        .neq('id', '');

      if (compradoresError) throw compradoresError;

      toast.success('Todos os dados COHAPM foram removidos com sucesso!');
      setStats(null);
    } catch (err: any) {
      console.error('Erro ao limpar banco:', err);
      toast.error('Erro ao limpar dados: ' + err.message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecione um arquivo Excel para importar');
      return;
    }

    setIsImporting(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      setProgress(30);

      const { data, error } = await supabase.functions.invoke('import-cohapm-data', {
        body: formData,
      });

      if (error) throw error;

      setProgress(100);
      setStats(data.stats);
      toast.success('Importação concluída com sucesso!');
      
      setFile(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast.error(error.message || 'Erro ao importar dados');
    } finally {
      setIsImporting(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="space-y-6">
      <ProcessarCOHAPMAuto />
    </div>
  );
}
