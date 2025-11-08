import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { LogOut, UserPlus, Shield, Users, Trash2, Camera, Upload, DollarSign, FileSpreadsheet, Search, X, Edit, ChevronLeft, ChevronRight, BarChart3, FileText, Building2, Copy, Eye, EyeOff } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceiroAdmin } from '@/components/FinanceiroAdmin';
import { DashboardCooperados } from '@/components/DashboardCooperados';
import { AdminObras } from '@/components/AdminObras';
import { HistoricoGeralObras } from '@/components/HistoricoGeralObras';
import { TimelineObras } from '@/components/TimelineObras';
import { DashboardComparativoObras } from '@/components/DashboardComparativoObras';
import { AdminGaleria } from '@/components/AdminGaleria';
import { generateCooperadosReport } from '@/lib/pdfGenerator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function Admin() {
  const { signOut } = useAuth();
  const [cooperados, setCooperados] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newQuadra, setNewQuadra] = useState('');
  const [newLote, setNewLote] = useState('');
  const [newFase, setNewFase] = useState('');
  const [newDataCompra, setNewDataCompra] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Generated password state
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [generatedUserName, setGeneratedUserName] = useState('');
  
  // Type for import results
  type ImportResult = {
    row: number;
    nome: string;
    email: string;
    password?: string;
    status: 'success' | 'error';
    error?: string;
  };
  
  // Excel import state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showImportResults, setShowImportResults] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [createdUserIds, setCreatedUserIds] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [startTime, setStartTime] = useState<number>(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState<string>('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedCooperados, setSelectedCooperados] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewStats, setPreviewStats] = useState({
    total: 0,
    comEmail: 0,
    comSenha: 0,
    comNome: 0,
    comCpf: 0,
    comTelefone: 0,
    comQuadra: 0,
    comLote: 0,
    comFase: 0,
    comDataCompra: 0,
  });
  
  // Filter state
  const [filterNome, setFilterNome] = useState('');
  const [filterQuadra, setFilterQuadra] = useState('');
  const [filterLote, setFilterLote] = useState('');
  const [filterFase, setFilterFase] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Edit cooperado state
  const [editingCooperado, setEditingCooperado] = useState<any>(null);
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editQuadra, setEditQuadra] = useState('');
  const [editLote, setEditLote] = useState('');
  const [editFase, setEditFase] = useState('');
  const [editDataCompra, setEditDataCompra] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  


  useEffect(() => {
    loadCooperados();
  }, []);

  // Função para gerar senha aleatória segura
  const generatePassword = () => {
    const length = 10;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  };

  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    toast.success('Senha copiada para área de transferência!');
  };

  const loadCooperados = async () => {
    try {
      // Buscar profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('data_cadastro', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar user_roles de todos os usuários
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Buscar emails do auth.users
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Juntar os dados com emails
      const profilesWithRoles = profiles?.map(profile => {
        const user = users?.find((u: any) => u.id === profile.id);
        return {
          ...profile,
          email: user?.email || '-',
          user_roles: userRoles?.filter(role => role.user_id === profile.id) || []
        };
      }) || [];

      setCooperados(profilesWithRoles);
    } catch (error) {
      console.error('Erro ao carregar cooperados:', error);
      toast.error('Erro ao carregar lista de cooperados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCooperado = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Validar duplicação de quadra/lote se ambos forem fornecidos
      if (newQuadra && newLote) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .eq('quadra', newQuadra)
          .eq('lote', newLote)
          .maybeSingle();

        if (existing) {
          toast.error(`Quadra ${newQuadra} Lote ${newLote} já está cadastrado para ${existing.nome_completo}`);
          setIsCreating(false);
          return;
        }
      }

      // Gerar senha automaticamente
      const autoPassword = generatePassword();

      // Create user using admin function
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newEmail,
          password: autoPassword,
          nome_completo: newNome,
          quadra: newQuadra || null,
          lote: newLote || null,
          fase: newFase || null,
          data_compra: newDataCompra || null,
        },
      });

      if (error) throw error;
      
      // Check if user already exists (duplicate)
      if (data?.duplicate) {
        toast.error(`Já existe um usuário cadastrado com o email ${newEmail}`);
        setIsCreating(false);
        return;
      }

      // Mostrar senha gerada
      setGeneratedPassword(autoPassword);
      setGeneratedUserName(newNome);
      setShowPasswordDialog(true);

      toast.success('Cooperado criado com sucesso!');
      setNewEmail('');
      setNewNome('');
      setNewQuadra('');
      setNewLote('');
      setNewFase('');
      setNewDataCompra('');
      loadCooperados();
    } catch (error: any) {
      if (error.message?.includes('unique_quadra_lote')) {
        toast.error('Esta combinação de Quadra/Lote já está cadastrada');
      } else {
        toast.error(error.message || 'Erro ao criar cooperado');
      }
    } finally {
      setIsCreating(false);
    }
  };


  const handleEditCooperado = (cooperado: any) => {
    setEditingCooperado(cooperado);
    setEditNome(cooperado.nome_completo || '');
    setEditTelefone(cooperado.telefone || '');
    setEditCpf(cooperado.cpf || '');
    setEditQuadra(cooperado.quadra || '');
    setEditLote(cooperado.lote || '');
    setEditFase(cooperado.fase || '');
    setEditDataCompra(cooperado.data_compra || '');
  };

  const handleUpdateCooperado = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      // Validar duplicação de quadra/lote se ambos forem fornecidos
      if (editQuadra && editLote) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .eq('quadra', editQuadra)
          .eq('lote', editLote)
          .neq('id', editingCooperado.id)
          .maybeSingle();

        if (existing) {
          toast.error(`Quadra ${editQuadra} Lote ${editLote} já está cadastrado para ${existing.nome_completo}`);
          setIsUpdating(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          nome_completo: editNome,
          telefone: editTelefone || null,
          cpf: editCpf || null,
          quadra: editQuadra || null,
          lote: editLote || null,
          fase: editFase || null,
          data_compra: editDataCompra || null,
        })
        .eq('id', editingCooperado.id);

      if (error) throw error;

      toast.success('Cooperado atualizado com sucesso!');
      setEditingCooperado(null);
      loadCooperados();
    } catch (error: any) {
      if (error.message?.includes('unique_quadra_lote')) {
        toast.error('Esta combinação de Quadra/Lote já está cadastrada');
      } else {
        toast.error(error.message || 'Erro ao atualizar cooperado');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCooperado = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este cooperado?')) return;

    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;

      toast.success('Cooperado removido com sucesso!');
      loadCooperados();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover cooperado');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCooperados.length === 0) return;
    
    try {
      const deletePromises = selectedCooperados.map(id =>
        supabase.functions.invoke('delete-user', {
          body: { userId: id }
        })
      );
      
      await Promise.all(deletePromises);
      
      toast.success(`${selectedCooperados.length} cooperado(s) excluído(s) com sucesso`);
      setSelectedCooperados([]);
      setShowDeleteDialog(false);
      loadCooperados();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir cooperados');
    }
  };

  const toggleSelectAll = () => {
    if (selectedCooperados.length === paginatedCooperados.length) {
      setSelectedCooperados([]);
    } else {
      setSelectedCooperados(paginatedCooperados.map(c => c.id));
    }
  };

  const toggleSelectCooperado = (id: string) => {
    setSelectedCooperados(prev => 
      prev.includes(id) 
        ? prev.filter(cId => cId !== id)
        : [...prev, id]
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        toast.error('Planilha vazia');
        return;
      }

      // Processar dados para preview
      const processedData = jsonData.map((row, index) => {
        const email = row.email || row.Email;
        const nome_completo = row.nome_completo || row.nome || row.Nome || row['Nome Completo'];
        const cpf = row.cpf || row.CPF || null;
        const telefone = row.telefone || row.Telefone || row.phone || row.Phone || null;
        const quadra = row.quadra || row.Quadra || null;
        const lote = row.lote || row.Lote || null;
        const fase = row.fase || row.Fase || null;
        
        let data_compra = row.data_compra || row.data || row.Data || row['Data Compra'] || row['Data da Compra'] || null;
        if (data_compra && typeof data_compra === 'number') {
          const excelEpoch = new Date(1899, 11, 30);
          const date = new Date(excelEpoch.getTime() + data_compra * 86400000);
          data_compra = date.toISOString().split('T')[0];
        } else if (data_compra instanceof Date) {
          data_compra = data_compra.toISOString().split('T')[0];
        } else if (typeof data_compra === 'string' && data_compra.trim() !== '') {
          const parsed = new Date(data_compra);
          if (!isNaN(parsed.getTime())) {
            data_compra = parsed.toISOString().split('T')[0];
          }
        } else {
          data_compra = null;
        }

        return {
          row: index + 2,
          email,
          nome_completo,
          cpf,
          telefone,
          quadra,
          lote,
          fase,
          data_compra,
          valid: !!(email && nome_completo)
        };
      });

      // Calcular estatísticas
      const stats = {
        total: processedData.length,
        comEmail: processedData.filter(d => d.email).length,
        comSenha: processedData.length, // Todas terão senha gerada automaticamente
        comNome: processedData.filter(d => d.nome_completo).length,
        comCpf: processedData.filter(d => d.cpf).length,
        comTelefone: processedData.filter(d => d.telefone).length,
        comQuadra: processedData.filter(d => d.quadra).length,
        comLote: processedData.filter(d => d.lote).length,
        comFase: processedData.filter(d => d.fase).length,
        comDataCompra: processedData.filter(d => d.data_compra).length,
      };

      setExcelFile(file);
      setPreviewData(processedData);
      setPreviewStats(stats);
      setShowPreview(true);
    } catch (error: any) {
      toast.error('Erro ao processar planilha: ' + error.message);
    }
  };

  const handleConfirmImport = async () => {
    if (!excelFile || previewData.length === 0) {
      toast.error('Nenhum dado para importar');
      return;
    }

    setShowPreview(false);
    setIsImporting(true);
    setIsCancelling(false);
    setCreatedUserIds([]);
    setImportProgress({ current: 0, total: 0 });
    setStartTime(Date.now());
    setEstimatedTimeLeft('');
    const results: ImportResult[] = [];
    const createdIds: string[] = [];

    try {
      const jsonData = previewData;

      // Definir o total de registros
      setImportProgress({ current: 0, total: jsonData.length });

      let sucessos = 0;
      let erros = 0;
      let ignorados = 0;

      for (let i = 0; i < jsonData.length; i++) {
        // Atualizar progresso
        setImportProgress({ current: i + 1, total: jsonData.length });
        
        // Calcular tempo estimado restante
        if (i > 0) {
          const elapsedTime = Date.now() - startTime;
          const avgTimePerRecord = elapsedTime / (i + 1);
          const remainingRecords = jsonData.length - (i + 1);
          const estimatedMs = avgTimePerRecord * remainingRecords;
          
          const minutes = Math.floor(estimatedMs / 60000);
          const seconds = Math.floor((estimatedMs % 60000) / 1000);
          
          if (minutes > 0) {
            setEstimatedTimeLeft(`${minutes}m ${seconds}s`);
          } else {
            setEstimatedTimeLeft(`${seconds}s`);
          }
        }
        
        // Verificar se foi cancelado
        if (isCancelling) {
          break;
        }

        const row = jsonData[i];
        const email = row.email;
        const nome_completo = row.nome_completo;
        const cpf = row.cpf;
        const telefone = row.telefone;
        const quadra = row.quadra;
        const lote = row.lote;
        const fase = row.fase;
        const data_compra = row.data_compra;

        try {
          if (!email || !nome_completo) {
            throw new Error('Dados incompletos: email ou nome faltando');
          }

          // Gerar senha automaticamente
          const autoPassword = generatePassword();

          // Validar duplicação de quadra/lote se ambos forem fornecidos
          if (quadra && lote) {
            const { data: existing } = await supabase
              .from('profiles')
              .select('id, nome_completo')
              .eq('quadra', quadra)
              .eq('lote', lote)
              .maybeSingle();

            if (existing) {
              throw new Error(`Quadra ${quadra} Lote ${lote} já cadastrado para ${existing.nome_completo}`);
            }
          }

          console.log('Sending to create-user - data_compra:', data_compra, 'for user:', nome_completo);

          const { data, error } = await supabase.functions.invoke('create-user', {
            body: {
              email,
              password: autoPassword,
              nome_completo,
              cpf,
              telefone,
              quadra,
              lote,
              fase,
              data_compra,
            },
          });

          // Se a edge function retornar duplicado (considerando nome + email + lote), ignorar
          if (data?.duplicate) {
            ignorados++;
            continue;
          }

          if (error || data?.error) {
            results.push({
              row: i + 2,
              nome: nome_completo,
              email,
              status: 'error',
              error: data?.error || error?.message || 'Erro desconhecido',
            });
            erros++;
          } else {
            results.push({
              row: i + 2,
              nome: nome_completo,
              email,
              password: autoPassword,
              status: 'success',
            });
            sucessos++;
            // Rastrear ID do usuário criado
            if (data?.user?.user?.id) {
              createdIds.push(data.user.user.id);
              setCreatedUserIds(prev => [...prev, data.user.user.id]);
            }
          }
        } catch (error: any) {
          results.push({
            row: i + 2,
            nome: nome_completo || 'N/A',
            email: email || 'N/A',
            status: 'error',
            error: error.message || 'Erro ao processar linha',
          });
          erros++;
        }
      }

      const mensagem = ignorados > 0 
        ? `Importação concluída: ${sucessos} criados, ${erros} erros, ${ignorados} emails duplicados ignorados`
        : `Importação concluída: ${sucessos} criados, ${erros} erros`;

      setImportResults(results.filter(r => r.status === 'error'));
      if (results.some(r => r.status === 'error')) {
        setShowImportResults(true);
      }
      
      // Se foi cancelado, deletar todos os usuários criados
      if (isCancelling && createdIds.length > 0) {
        toast.info('Removendo registros criados...');
        for (const userId of createdIds) {
          try {
            await supabase.functions.invoke('delete-user', {
              body: { userId },
            });
          } catch (error) {
            console.error('Erro ao remover usuário:', error);
          }
        }
        toast.success('Importação cancelada e registros removidos');
      } else if (!isCancelling) {
        toast.success(mensagem);
      }
      
      setExcelFile(null);
      setPreviewData([]);
      setCreatedUserIds([]);
      setImportProgress({ current: 0, total: 0 });
      setStartTime(0);
      setEstimatedTimeLeft('');
      loadCooperados();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar planilha');
    } finally {
      setIsImporting(false);
      setIsCancelling(false);
      setImportProgress({ current: 0, total: 0 });
      setStartTime(0);
      setEstimatedTimeLeft('');
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setExcelFile(null);
    setPreviewData([]);
    setPreviewStats({
      total: 0,
      comEmail: 0,
      comSenha: 0,
      comNome: 0,
      comCpf: 0,
      comTelefone: 0,
      comQuadra: 0,
      comLote: 0,
      comFase: 0,
      comDataCompra: 0,
    });
  };


  // Filter cooperados
  const filteredCooperados = cooperados.filter((cooperado) => {
    const matchNome = !filterNome || 
      (cooperado.nome_completo && cooperado.nome_completo.toLowerCase().includes(filterNome.toLowerCase()));
    const matchQuadra = !filterQuadra || 
      (cooperado.quadra && cooperado.quadra.toLowerCase().includes(filterQuadra.toLowerCase()));
    const matchLote = !filterLote || 
      (cooperado.lote && cooperado.lote.toLowerCase().includes(filterLote.toLowerCase()));
    const matchFase = !filterFase || 
      (cooperado.fase && cooperado.fase.toLowerCase().includes(filterFase.toLowerCase()));
    
    return matchNome && matchQuadra && matchLote && matchFase;
  });

  const clearFilters = () => {
    setFilterNome('');
    setFilterQuadra('');
    setFilterLote('');
    setFilterFase('');
    setCurrentPage(1); // Reset to first page when clearing filters
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredCooperados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCooperados = filteredCooperados.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleExportFilteredPDF = () => {
    try {
      // Calcular estatísticas dos cooperados filtrados
      const totalCooperados = filteredCooperados.length;
      const cooperadosComLote = filteredCooperados.filter(c => c.quadra && c.lote).length;
      const cooperadosSemLote = totalCooperados - cooperadosComLote;

      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      const cooperadosRecentes = filteredCooperados.filter(c => {
        const dataCadastro = new Date(c.data_cadastro);
        return dataCadastro >= trintaDiasAtras;
      }).length;

      const cooperadosComDataCompra = filteredCooperados.filter(c => c.data_compra).length;

      const cooperadosPorFase = filteredCooperados.reduce((acc: Record<string, number>, c) => {
        const fase = c.fase || 'Sem fase';
        acc[fase] = (acc[fase] || 0) + 1;
        return acc;
      }, {});

      const cooperadosPorQuadra = filteredCooperados.reduce((acc: Record<string, number>, c) => {
        const quadra = c.quadra || 'Sem quadra';
        acc[quadra] = (acc[quadra] || 0) + 1;
        return acc;
      }, {});

      const estatisticas = {
        totalCooperados,
        cooperadosComLote,
        cooperadosSemLote,
        cooperadosRecentes,
        cooperadosComDataCompra,
        cooperadosPorFase,
        cooperadosPorQuadra,
      };
      
      generateCooperadosReport(filteredCooperados, estatisticas);
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar relatório PDF');
    }
  };

  const handleExportToExcel = () => {
    try {
      // Preparar dados para o Excel
      const excelData = filteredCooperados.map((cooperado) => ({
        'Nome Completo': cooperado.nome_completo,
        'Email': cooperado.email || '-',
        'CPF': cooperado.cpf || '-',
        'Telefone': cooperado.telefone || '-',
        'Quadra': cooperado.quadra || '-',
        'Lote': cooperado.lote || '-',
        'Fase': cooperado.fase || '-',
        'Data da Compra': cooperado.data_compra 
          ? new Date(cooperado.data_compra).toLocaleDateString('pt-BR')
          : '-',
        'Data de Cadastro': cooperado.data_cadastro 
          ? new Date(cooperado.data_cadastro).toLocaleDateString('pt-BR')
          : '-',
        'Role': cooperado.user_roles?.some((r: any) => r.role === 'admin') ? 'Admin' : 'Cooperado',
      }));

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 30 }, // Nome Completo
        { wch: 25 }, // Email
        { wch: 15 }, // CPF
        { wch: 15 }, // Telefone
        { wch: 10 }, // Quadra
        { wch: 10 }, // Lote
        { wch: 15 }, // Fase
        { wch: 15 }, // Data da Compra
        { wch: 15 }, // Data de Cadastro
        { wch: 12 }, // Role
      ];
      ws['!cols'] = colWidths;

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Cooperados');

      // Gerar arquivo Excel
      const fileName = `cooperados_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success(`Excel gerado com sucesso! ${filteredCooperados.length} cooperados exportados.`);
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast.error('Erro ao exportar para Excel');
    }
  };

  const handleExportCredentials = () => {
    try {
      // Filtrar apenas resultados bem-sucedidos com senha
      const successfulImports = importResults.filter(r => r.status === 'success' && r.password);

      if (successfulImports.length === 0) {
        toast.error('Nenhuma credencial para exportar');
        return;
      }

      // Preparar dados para o Excel
      const excelData = successfulImports.map((result) => ({
        'Linha': result.row,
        'Nome Completo': result.nome,
        'Email': result.email,
        'Senha': result.password,
        'Status': 'Criado com sucesso',
      }));

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 8 },  // Linha
        { wch: 30 }, // Nome Completo
        { wch: 30 }, // Email
        { wch: 15 }, // Senha
        { wch: 20 }, // Status
      ];
      ws['!cols'] = colWidths;

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Credenciais');

      // Gerar arquivo Excel
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = `credenciais_importacao_${timestamp}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success(`${successfulImports.length} credenciais exportadas com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar credenciais:', error);
      toast.error('Erro ao exportar credenciais');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Painel Admin
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/area-cooperado">
              <Button variant="outline">Área do Cooperado</Button>
            </Link>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="cooperados" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Cooperados
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financeiro
              </TabsTrigger>
              <TabsTrigger value="obras" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Obras
              </TabsTrigger>
              <TabsTrigger value="fotos" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Galeria
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <DashboardCooperados cooperados={cooperados} />
            </TabsContent>

            <TabsContent value="cooperados" className="space-y-8">
          {/* Create User Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Criar Novo Cooperado
              </CardTitle>
              <CardDescription>
                Adicione um novo cooperado ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCooperado} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Nome do cooperado"
                      value={newNome}
                      onChange={(e) => setNewNome(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Nome completo do cooperado"
                      value={newNome}
                      onChange={(e) => setNewNome(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quadra">Quadra</Label>
                    <Input
                      id="quadra"
                      type="text"
                      placeholder="Ex: 1, 2, 3..."
                      value={newQuadra}
                      onChange={(e) => setNewQuadra(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lote">Lote</Label>
                    <Input
                      id="lote"
                      type="text"
                      placeholder="Ex: 10, 20, 30..."
                      value={newLote}
                      onChange={(e) => setNewLote(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fase">Fase</Label>
                    <Input
                      id="fase"
                      type="text"
                      placeholder="Ex: 1, 2, 3..."
                      value={newFase}
                      onChange={(e) => setNewFase(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data-compra">Data da Compra</Label>
                    <Input
                      id="data-compra"
                      type="date"
                      value={newDataCompra}
                      onChange={(e) => setNewDataCompra(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isCreating} className="w-full">
                  {isCreating ? 'Criando...' : 'Criar Cooperado'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Import from Excel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Importar Cooperados via Planilha
              </CardTitle>
              <CardDescription>
                Envie uma planilha Excel (.xlsx) com as colunas: nome_completo (ou nome), email, senha, quadra, lote, fase e data_compra (ou data)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="excel">Selecionar Planilha Excel</Label>
                  <Input
                    id="excel"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    disabled={isImporting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Colunas obrigatórias: <strong>nome_completo</strong> (ou nome), <strong>email</strong><br/>
                    Colunas opcionais: <strong>cpf</strong>, <strong>telefone</strong>, <strong>quadra</strong>, <strong>lote</strong>, <strong>fase</strong>, <strong>data_compra</strong> (ou data)<br/>
                    <span className="text-primary font-medium">⚡ Senhas serão geradas automaticamente</span>
                  </p>
                </div>
                
                {/* Barra de progresso */}
                {isImporting && importProgress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Processando registros...</span>
                      <span>{importProgress.current} de {importProgress.total}</span>
                    </div>
                    <Progress value={(importProgress.current / importProgress.total) * 100} />
                    {estimatedTimeLeft && (
                      <div className="text-sm text-muted-foreground text-center">
                        Tempo estimado restante: <span className="font-medium text-foreground">{estimatedTimeLeft}</span>
                      </div>
                    )}
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setShowCancelDialog(true)}
                      disabled={isCancelling}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {isCancelling ? 'Cancelando...' : 'Cancelar Importação'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Lista de Cooperados ({filteredCooperados.length})
              </CardTitle>
              <CardDescription>
                Use os filtros abaixo para buscar cooperados específicos. Mostrando {startIndex + 1}-{Math.min(endIndex, filteredCooperados.length)} de {filteredCooperados.length} cooperados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm">Filtros de Busca</h3>
                  <div className="ml-auto flex gap-2">
                    {selectedCooperados.length > 0 && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setShowDeleteDialog(true)}
                        className="h-7 gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Excluir ({selectedCooperados.length})
                      </Button>
                    )}
                    {isImporting && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setShowCancelDialog(true)}
                        disabled={isCancelling}
                        className="h-7 gap-1"
                      >
                        <X className="h-3 w-3" />
                        {isCancelling ? 'Cancelando...' : 'Cancelar Importação'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportFilteredPDF}
                      className="h-7 gap-1"
                    >
                      <FileText className="h-3 w-3" />
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportToExcel}
                      className="h-7 gap-1"
                    >
                      <FileSpreadsheet className="h-3 w-3" />
                      Exportar Excel
                    </Button>
                    {(filterNome || filterQuadra || filterLote || filterFase) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-7"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="filter-nome" className="text-xs">Nome</Label>
                    <Input
                      id="filter-nome"
                      placeholder="Buscar por nome..."
                      value={filterNome}
                      onChange={(e) => setFilterNome(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="filter-quadra" className="text-xs">Quadra</Label>
                    <Input
                      id="filter-quadra"
                      placeholder="Ex: 1, 2, 3..."
                      value={filterQuadra}
                      onChange={(e) => setFilterQuadra(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="filter-lote" className="text-xs">Lote</Label>
                    <Input
                      id="filter-lote"
                      placeholder="Ex: 10, 20, 30..."
                      value={filterLote}
                      onChange={(e) => setFilterLote(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="filter-fase" className="text-xs">Fase</Label>
                    <Input
                      id="filter-fase"
                      placeholder="Ex: 1, 2, 3..."
                      value={filterFase}
                      onChange={(e) => setFilterFase(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : filteredCooperados.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {cooperados.length === 0 
                    ? 'Nenhum cooperado cadastrado ainda'
                    : 'Nenhum cooperado encontrado com os filtros aplicados'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={paginatedCooperados.length > 0 && selectedCooperados.length === paginatedCooperados.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Quadra/Lote</TableHead>
                        <TableHead>Fase</TableHead>
                        <TableHead>Data Compra</TableHead>
                        <TableHead>Data Cadastro</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCooperados.map((cooperado) => (
                        <TableRow key={cooperado.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCooperados.includes(cooperado.id)}
                              onCheckedChange={() => toggleSelectCooperado(cooperado.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {cooperado.nome_completo}
                          </TableCell>
                          <TableCell>
                            {cooperado.email || '-'}
                          </TableCell>
                          <TableCell>
                            {cooperado.cpf || '-'}
                          </TableCell>
                          <TableCell>
                            {cooperado.telefone || '-'}
                          </TableCell>
                          <TableCell>
                            {cooperado.quadra && cooperado.lote 
                              ? `Q${cooperado.quadra} L${cooperado.lote}`
                              : '-'}
                          </TableCell>
                          <TableCell>{cooperado.fase || '-'}</TableCell>
                          <TableCell>
                            {cooperado.data_compra 
                              ? new Date(cooperado.data_compra).toLocaleDateString('pt-BR')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {cooperado.data_cadastro 
                              ? new Date(cooperado.data_cadastro).toLocaleDateString('pt-BR')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {cooperado.user_roles?.some((r: any) => r.role === 'admin') ? (
                              <Badge variant="default">Admin</Badge>
                            ) : (
                              <Badge variant="secondary">Cooperado</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditCooperado(cooperado)}
                              >
                                <Edit className="h-4 w-4 text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCooperado(cooperado.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination Controls */}
              {filteredCooperados.length > 0 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="items-per-page" className="text-xs whitespace-nowrap">
                        Itens por página:
                      </Label>
                      <select
                        id="items-per-page"
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(e.target.value)}
                        className="flex h-9 w-20 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNumber}
                            variant={currentPage === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNumber)}
                            className="w-10"
                          >
                            {pageNumber}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

            </TabsContent>

            <TabsContent value="financeiro">
              <FinanceiroAdmin />
            </TabsContent>

            <TabsContent value="obras">
              <div className="space-y-6">
                <TimelineObras />
                <DashboardComparativoObras showVariacoes={true} />
                <HistoricoGeralObras />
                <AdminObras />
              </div>
            </TabsContent>

            <TabsContent value="fotos">
              <AdminGaleria />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Edit Cooperado Dialog */}
      <Dialog open={!!editingCooperado} onOpenChange={(open) => !open && setEditingCooperado(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Cooperado</DialogTitle>
            <DialogDescription>
              Atualize as informações do cooperado
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCooperado} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome Completo *</Label>
                <Input
                  id="edit-nome"
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telefone">Telefone</Label>
                <Input
                  id="edit-telefone"
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={editTelefone}
                  onChange={(e) => setEditTelefone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cpf">CPF</Label>
                <Input
                  id="edit-cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={editCpf}
                  onChange={(e) => setEditCpf(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-quadra">Quadra</Label>
                <Input
                  id="edit-quadra"
                  type="text"
                  placeholder="Ex: 1, 2, 3..."
                  value={editQuadra}
                  onChange={(e) => setEditQuadra(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lote">Lote</Label>
                <Input
                  id="edit-lote"
                  type="text"
                  placeholder="Ex: 10, 20, 30..."
                  value={editLote}
                  onChange={(e) => setEditLote(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fase">Fase</Label>
                <Input
                  id="edit-fase"
                  type="text"
                  placeholder="Ex: 1, 2, 3..."
                  value={editFase}
                  onChange={(e) => setEditFase(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-data-compra">Data da Compra</Label>
                <Input
                  id="edit-data-compra"
                  type="date"
                  value={editDataCompra}
                  onChange={(e) => setEditDataCompra(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCooperado(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Import Dialog */}
      <Dialog open={showPreview} onOpenChange={(open) => !open && handleCancelPreview()}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Preview da Importação
            </DialogTitle>
            <DialogDescription>
              Revise os dados antes de confirmar a importação
            </DialogDescription>
          </DialogHeader>
          
          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total de Registros</p>
              <p className="text-2xl font-bold">{previewStats.total}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Com Email ✓</p>
              <p className="text-2xl font-bold text-green-600">{previewStats.comEmail}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Senhas</p>
              <p className="text-lg font-semibold text-primary">Geradas automaticamente</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Com Nome ✓</p>
              <p className="text-2xl font-bold text-green-600">{previewStats.comNome}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Com CPF</p>
              <p className="text-lg font-semibold">{previewStats.comCpf}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Com Telefone</p>
              <p className="text-lg font-semibold">{previewStats.comTelefone}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Com Quadra</p>
              <p className="text-lg font-semibold">{previewStats.comQuadra}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Com Lote</p>
              <p className="text-lg font-semibold">{previewStats.comLote}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Com Fase</p>
              <p className="text-lg font-semibold">{previewStats.comFase}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Com Data Compra</p>
              <p className="text-lg font-semibold">{previewStats.comDataCompra}</p>
            </div>
          </div>

          {/* Validação */}
          <div className="space-y-2">
            {previewStats.comEmail < previewStats.total && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <XCircle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {previewStats.total - previewStats.comEmail} registros sem email serão ignorados
                </p>
              </div>
            )}
            {previewStats.comNome < previewStats.total && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <XCircle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {previewStats.total - previewStats.comNome} registros sem nome serão ignorados
                </p>
              </div>
            )}
          </div>

          {/* Tabela de Preview */}
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Senha</TableHead>
                  <TableHead>Quadra</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Data Compra</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 100).map((row, index) => (
                  <TableRow key={index} className={!row.valid ? 'bg-muted/50' : ''}>
                    <TableCell className="text-xs text-muted-foreground">{row.row}</TableCell>
                    <TableCell className="font-medium">
                      {row.nome_completo || <span className="text-muted-foreground italic">-</span>}
                    </TableCell>
                    <TableCell>
                      {row.email || <span className="text-muted-foreground italic">-</span>}
                    </TableCell>
                    <TableCell>
                      {row.password ? <span className="text-xs">••••••••</span> : <span className="text-muted-foreground italic">-</span>}
                    </TableCell>
                    <TableCell>
                      {row.quadra || <span className="text-muted-foreground italic">-</span>}
                    </TableCell>
                    <TableCell>
                      {row.lote || <span className="text-muted-foreground italic">-</span>}
                    </TableCell>
                    <TableCell>
                      {row.fase || <span className="text-muted-foreground italic">-</span>}
                    </TableCell>
                    <TableCell>
                      {row.data_compra || <span className="text-muted-foreground italic">-</span>}
                    </TableCell>
                    <TableCell>
                      {row.valid ? (
                        <Badge variant="default" className="text-xs">OK</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Incompleto</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {previewData.length > 100 && (
              <div className="p-4 text-center text-sm text-muted-foreground border-t">
                Mostrando 100 de {previewData.length} registros no preview
              </div>
            )}
          </ScrollArea>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleCancelPreview}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={previewStats.comEmail === 0 || previewStats.comNome === 0}>
              <Upload className="h-4 w-4 mr-2" />
              Confirmar Importação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Results Dialog */}
      <Dialog open={showImportResults} onOpenChange={setShowImportResults}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Resultados da Importação</span>
              {importResults.filter(r => r.status === 'success' && r.password).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCredentials}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exportar Credenciais
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              Detalhes de cada linha processada da planilha. As senhas foram geradas automaticamente.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-2">
              {importResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.status === 'success'
                      ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900'
                      : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.status === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    )}
                     <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Linha {result.row}
                        </span>
                        <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                          {result.status === 'success' ? 'Sucesso' : 'Erro'}
                        </Badge>
                      </div>
                      <p className="font-medium mt-1">{result.nome}</p>
                      <p className="text-sm text-muted-foreground">{result.email}</p>
                      {result.status === 'success' && result.password && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 p-2 bg-background/50 rounded border font-mono text-xs">
                            <span className="text-muted-foreground">Senha: </span>
                            {result.password}
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              navigator.clipboard.writeText(result.password!);
                              toast.success('Senha copiada!');
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {result.error && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {result.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Generated Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Cooperado Criado com Sucesso!
            </DialogTitle>
            <DialogDescription>
              A senha foi gerada automaticamente. Copie e envie para o cooperado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nome do Cooperado</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">{generatedUserName}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Senha Gerada</Label>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                  {generatedPassword}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={copyPasswordToClipboard}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Clique no botão ao lado para copiar a senha
              </p>
            </div>
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
              <p className="text-xs text-foreground">
                <strong>Importante:</strong> Guarde esta senha em local seguro. O cooperado precisará dela para fazer login no sistema.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowPasswordDialog(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Import Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Importação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá interromper a importação e <strong>excluir todos os cooperados</strong> que já foram criados neste processo ({createdUserIds.length} usuários). 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Importando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsCancelling(true);
                setShowCancelDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, Cancelar e Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cooperados Selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{selectedCooperados.length} cooperado(s)</strong>. 
              Esta ação não pode ser desfeita e todos os dados associados serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
