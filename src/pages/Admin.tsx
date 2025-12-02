import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { LogOut, UserPlus, Shield, Users, Trash2, Camera, Upload, DollarSign, FileSpreadsheet, Search, X, Edit, ChevronLeft, ChevronRight, FileText, Building2, Copy, Eye, EyeOff, Check, GitCompare, RefreshCw, LineChart } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminObras } from '@/components/AdminObras';
import { HistoricoGeralObras } from '@/components/HistoricoGeralObras';
import { AcompanhamentoObras } from '@/components/AcompanhamentoObras';

import { DashboardComparativoObras } from '@/components/DashboardComparativoObras';
import { AdminGaleria } from '@/components/AdminGaleria';

import { FinanceiroAdminDashboard } from '@/components/admin/FinanceiroAdminDashboard';
import { ImportacaoCOHAPM } from '@/components/admin/ImportacaoCOHAPM';
import { UploadCooperadosLote } from '@/components/admin/UploadCooperadosLote';

import { generateCooperadosReport } from '@/lib/pdfGenerator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Download } from 'lucide-react';
import { downloadFinancialTemplate, downloadCooperadosTemplate } from '@/lib/excelTemplateGenerator';

export default function Admin() {
  const { signOut, user, isAdmin, isAdminObras, isExecutivoVendas } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cooperados, setCooperados] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newTelefone, setNewTelefone] = useState('');
  const [newQuadra, setNewQuadra] = useState('');
  const [newLote, setNewLote] = useState('');
  const [newFase, setNewFase] = useState('');
  const [newDataCompra, setNewDataCompra] = useState('');
  const [newUserRole, setNewUserRole] = useState<'cooperado' | 'admin' | 'admin_obras' | 'executivo_vendas'>('cooperado');
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
  
  // Preview pagination state
  const [previewPage, setPreviewPage] = useState(1);
  const [previewItemsPerPage] = useState(50);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  
  // Filter state
  const [filterNome, setFilterNome] = useState('');
  const [filterQuadra, setFilterQuadra] = useState('');
  const [filterLote, setFilterLote] = useState('');
  const [filterFase, setFilterFase] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
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
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newGeneratedPassword, setNewGeneratedPassword] = useState('');
  const [showNewPasswordDialog, setShowNewPasswordDialog] = useState(false);
  
  // Linking COHAPM state
  const [linkingCohapm, setLinkingCohapm] = useState<any>(null);
  const [linkMode, setLinkMode] = useState<'existing' | 'new'>('new');
  const [profilesForLink, setProfilesForLink] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);
  const [searchProfileTerm, setSearchProfileTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Auth users state
  const [authUsers, setAuthUsers] = useState<any[]>([]);
  const [authSummary, setAuthSummary] = useState<any>(null);
  const [isLoadingAuthUsers, setIsLoadingAuthUsers] = useState(false);
  const [showAuthUsersDialog, setShowAuthUsersDialog] = useState(false);
  const [selectedAuthUsers, setSelectedAuthUsers] = useState<Set<string>>(new Set());
  


  useEffect(() => {
    loadCooperados();
  }, []);
  
  // Handle return from preview page with selected data
  useEffect(() => {
    const state = location.state as any;
    if (state?.startImport && state?.importData) {
      // Start import with selected data
      handleImportWithData(state.importData);
      // Clear state to prevent re-import on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

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
      // Buscar profiles com email
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

      // Buscar compradores_cohapm que não estão vinculados a um profile
      const { data: compradoresCohapm, error: cohapmError } = await supabase
        .from('compradores_cohapm')
        .select('*')
        .order('created_at', { ascending: false });

      if (cohapmError) throw cohapmError;

      // Juntar os dados de profiles com roles
      const profilesWithRoles = profiles?.map(profile => {
        return {
          ...profile,
          email: profile.email || '-',
          user_roles: userRoles?.filter(role => role.user_id === profile.id) || [],
          fonte: 'profile' as const
        };
      }) || [];

      // Processar compradores_cohapm que não têm profile_id (não vinculados)
      // ou todos para mostrar a lista completa
      const cohapmRecords = compradoresCohapm?.map(comprador => {
        // Verificar se já existe um profile vinculado
        const hasProfile = profiles?.some(p => p.id === comprador.profile_id);
        
        return {
          id: comprador.id,
          nome_completo: comprador.nome,
          email: comprador.email || '-',
          cpf: comprador.cpf_cnpj,
          telefone: comprador.telefone,
          quadra: comprador.quadra,
          lote: comprador.lote,
          fase: null,
          data_compra: comprador.data_venda,
          data_cadastro: comprador.created_at,
          user_roles: [],
          fonte: 'cohapm' as const,
          profile_vinculado: hasProfile,
          situacao_financeira: comprador.situacao_financeira,
          empreendimento: comprador.empreendimento
        };
      }).filter(c => !c.profile_vinculado) || []; // Apenas os não vinculados a profiles

      // Combinar as duas listas
      const todosCooperados = [...profilesWithRoles, ...cohapmRecords];

      setCooperados(todosCooperados);
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
          cpf: newCpf || null,
          telefone: newTelefone || null,
          quadra: newQuadra || null,
          lote: newLote || null,
          fase: newFase || null,
          data_compra: newDataCompra || null,
          role: newUserRole,
        },
      });

      if (error) throw error;
      
      // Check if user already exists (duplicate)
      if (data?.duplicate) {
        toast.error(`Já existe um usuário cadastrado com o email ${newEmail}`);
        setIsCreating(false);
        return;
      }

      // Check if user was recovered (orphan user)
      if (data?.recovered) {
        toast.success(`Usuário ${newEmail} recuperado com sucesso!`);
      } else {
        toast.success(`${
          newUserRole === 'cooperado' ? 'Cooperado' : 
          newUserRole === 'admin' ? 'Admin Geral' : 
          newUserRole === 'admin_obras' ? 'Admin Obras' :
          'Executivo de Vendas'
        } criado com sucesso!`);
      }

      // Mostrar senha gerada
      setGeneratedPassword(autoPassword);
      setGeneratedUserName(newNome);
      setShowPasswordDialog(true);
      setNewEmail('');
      setNewNome('');
      setNewCpf('');
      setNewTelefone('');
      setNewQuadra('');
      setNewLote('');
      setNewFase('');
      setNewDataCompra('');
      setNewUserRole('cooperado');
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
      // Verificar se é um registro COHAPM ou Profile
      const isCohapmSource = editingCooperado.fonte === 'cohapm';

      if (isCohapmSource) {
        // Atualizar diretamente na tabela compradores_cohapm
        const { error: cohapmError } = await supabase
          .from('compradores_cohapm')
          .update({
            nome: editNome,
            telefone: editTelefone || null,
            cpf_cnpj: editCpf || null,
            quadra: editQuadra || null,
            lote: editLote || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCooperado.id);

        if (cohapmError) throw cohapmError;

        toast.success('Registro COHAPM atualizado com sucesso!');
      } else {
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

        // Atualizar profile
        const { error: profileError } = await supabase
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

        if (profileError) throw profileError;

        // Também atualizar compradores_cohapm vinculado (se existir)
        const { data: compradorVinculado } = await supabase
          .from('compradores_cohapm')
          .select('id')
          .eq('profile_id', editingCooperado.id)
          .maybeSingle();

        if (compradorVinculado) {
          await supabase
            .from('compradores_cohapm')
            .update({
              nome: editNome,
              telefone: editTelefone || null,
              cpf_cnpj: editCpf || null,
              quadra: editQuadra || null,
              lote: editLote || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', compradorVinculado.id);
        }

        toast.success('Cooperado atualizado com sucesso!');
      }

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

  const handleResetPassword = async () => {
    if (!editingCooperado) return;
    
    // Verificar se é um cooperado do tipo profile (tem usuário auth)
    if (editingCooperado.fonte === 'cohapm') {
      toast.error('Este registro COHAPM não possui usuário no sistema. Vincule-o primeiro.');
      return;
    }
    
    if (!confirm(`Tem certeza que deseja gerar uma nova senha para ${editingCooperado.nome_completo}?`)) return;
    
    setIsResettingPassword(true);
    
    try {
      // Gerar nova senha
      const newPassword = generatePassword();
      
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { 
          userId: editingCooperado.id,
          newPassword: newPassword
        }
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar nova senha');
      
      // Mostrar nova senha gerada
      setNewGeneratedPassword(newPassword);
      setShowNewPasswordDialog(true);
      toast.success('Nova senha gerada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      toast.error(error.message || 'Erro ao gerar nova senha');
    } finally {
      setIsResettingPassword(false);
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

  // Funções para vincular COHAPM
  const openLinkDialog = async (cohapmRecord: any) => {
    setLinkingCohapm(cohapmRecord);
    setLinkMode('new');
    setSelectedProfileId('');
    setSearchProfileTerm('');
    
    // Carregar profiles disponíveis para vinculação
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome_completo, email, cpf, quadra, lote')
      .order('nome_completo');
    
    setProfilesForLink(profiles || []);
  };

  const handleLinkToExistingProfile = async () => {
    if (!selectedProfileId || !linkingCohapm) return;
    
    setIsLinking(true);
    try {
      const { error } = await supabase
        .from('compradores_cohapm')
        .update({ profile_id: selectedProfileId })
        .eq('id', linkingCohapm.id);

      if (error) throw error;

      toast.success('Registro COHAPM vinculado ao profile com sucesso!');
      setLinkingCohapm(null);
      loadCooperados();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao vincular registro');
    } finally {
      setIsLinking(false);
    }
  };

  const handleCreateUserFromCohapm = async () => {
    if (!linkingCohapm) return;
    
    // Verificar se tem email
    if (!linkingCohapm.email || linkingCohapm.email === '-') {
      toast.error('Registro COHAPM não possui email válido para criar usuário');
      return;
    }
    
    setIsLinking(true);
    try {
      // Gerar senha automaticamente
      const autoPassword = generatePassword();

      // Create user using admin function
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: linkingCohapm.email,
          password: autoPassword,
          nome_completo: linkingCohapm.nome_completo,
          cpf: linkingCohapm.cpf || null,
          telefone: linkingCohapm.telefone || null,
          quadra: linkingCohapm.quadra || null,
          lote: linkingCohapm.lote || null,
          fase: null,
          data_compra: linkingCohapm.data_compra || null,
          role: 'cooperado',
        },
      });

      if (error) throw error;
      
      if (data?.duplicate) {
        toast.error(`Já existe um usuário cadastrado com o email ${linkingCohapm.email}`);
        setIsLinking(false);
        return;
      }

      // Vincular o registro COHAPM ao novo profile
      if (data?.userId) {
        await supabase
          .from('compradores_cohapm')
          .update({ profile_id: data.userId })
          .eq('id', linkingCohapm.id);
      }

      // Mostrar senha gerada
      setGeneratedPassword(autoPassword);
      setGeneratedUserName(linkingCohapm.nome_completo);
      setShowPasswordDialog(true);

      toast.success('Usuário criado e vinculado com sucesso!');
      setLinkingCohapm(null);
      loadCooperados();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setIsLinking(false);
    }
  };

  const filteredProfilesForLink = profilesForLink.filter(p => {
    if (!searchProfileTerm) return true;
    const term = searchProfileTerm.toLowerCase();
    return (
      p.nome_completo?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.cpf?.includes(term) ||
      p.quadra?.toLowerCase().includes(term) ||
      p.lote?.toLowerCase().includes(term)
    );
  });

  // Load auth users to check for orphans
  const loadAuthUsers = async () => {
    setIsLoadingAuthUsers(true);
    setSelectedAuthUsers(new Set());
    try {
      const { data, error } = await supabase.functions.invoke('list-auth-users');
      
      if (error) throw error;
      
      setAuthUsers(data.users || []);
      setAuthSummary(data.summary || null);
      setShowAuthUsersDialog(true);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar usuários');
    } finally {
      setIsLoadingAuthUsers(false);
    }
  };

  // Toggle auth user selection
  const toggleAuthUserSelection = (userId: string) => {
    setSelectedAuthUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Select all orphan auth users
  const selectAllOrphanAuthUsers = () => {
    const orphanIds = authUsers.filter(u => u.is_orphan).map(u => u.id);
    setSelectedAuthUsers(new Set(orphanIds));
  };

  // Select all auth users
  const selectAllAuthUsers = () => {
    const allIds = authUsers.map(u => u.id);
    setSelectedAuthUsers(new Set(allIds));
  };

  // Clear auth user selection
  const clearAuthUserSelection = () => {
    setSelectedAuthUsers(new Set());
  };

  // Delete selected auth users
  const handleDeleteSelectedAuthUsers = async () => {
    const selectedUsers = authUsers.filter(u => selectedAuthUsers.has(u.id));
    const orphanSelected = selectedUsers.filter(u => u.is_orphan);
    
    if (orphanSelected.length === 0) {
      toast.error('Selecione ao menos um usuário órfão para deletar');
      return;
    }
    
    if (!confirm(`Tem certeza que deseja deletar ${orphanSelected.length} usuário(s) órfão(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    
    let deleted = 0;
    let alreadyDeleted = 0;
    let errors = 0;
    const successfullyDeletedIds: string[] = [];
    
    toast.info(`Iniciando exclusão de ${orphanSelected.length} usuário(s)...`);
    
    for (const user of orphanSelected) {
      try {
        const { data, error } = await supabase.functions.invoke('delete-orphan-user', {
          body: { userId: user.id }
        });
        
        // Check if operation was successful (either deleted or already deleted)
        if (data?.success) {
          if (data.already_deleted) {
            alreadyDeleted++;
          } else {
            deleted++;
          }
          successfullyDeletedIds.push(user.id);
        } else if (error) {
          console.error('Erro ao deletar:', user.email, error);
          errors++;
        } else {
          // Treat as success if no error and no explicit success flag
          deleted++;
          successfullyDeletedIds.push(user.id);
        }
      } catch (e) {
        console.error('Exceção ao deletar:', user.email, e);
        errors++;
      }
    }
    
    // Update UI with results
    if (successfullyDeletedIds.length > 0) {
      const deletedSet = new Set(successfullyDeletedIds);
      setAuthUsers(prev => prev.filter(u => !deletedSet.has(u.id)));
      setAuthSummary(prev => prev ? {
        ...prev,
        total_auth_users: prev.total_auth_users - successfullyDeletedIds.length,
        orphan_users: prev.orphan_users - successfullyDeletedIds.length
      } : null);
      setSelectedAuthUsers(new Set());
    }
    
    // Show result messages
    if (deleted > 0) {
      toast.success(`${deleted} usuário(s) deletado(s) com sucesso!`);
    }
    if (alreadyDeleted > 0) {
      toast.info(`${alreadyDeleted} usuário(s) já haviam sido deletados`);
    }
    if (errors > 0) {
      toast.error(`${errors} usuário(s) não puderam ser deletados`);
    }
    
    // Force refresh the list to ensure accuracy
    await loadAuthUsers();
  };

  const handleDeleteOrphanUser = async (userId: string, email: string) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário órfão ${email}?`)) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('delete-orphan-user', {
        body: { userId }
      });
      
      if (error) throw error;
      
      toast.success(`Usuário órfão ${email} deletado com sucesso!`);
      
      // Atualizar lista
      setAuthUsers(prev => prev.filter(u => u.id !== userId));
      setAuthSummary(prev => prev ? {
        ...prev,
        total_auth_users: prev.total_auth_users - 1,
        orphan_users: prev.orphan_users - 1
      } : null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao deletar usuário órfão');
    }
  };

  const handleDeleteAllOrphans = async () => {
    const orphanUsers = authUsers.filter(u => u.is_orphan);
    
    if (orphanUsers.length === 0) {
      toast.info('Não há usuários órfãos para deletar');
      return;
    }
    
    if (!confirm(`Tem certeza que deseja deletar TODOS os ${orphanUsers.length} usuário(s) órfão(s)? Esta ação não pode ser desfeita.`)) return;
    
    let deleted = 0;
    let errors = 0;
    
    for (const user of orphanUsers) {
      try {
        const { error } = await supabase.functions.invoke('delete-orphan-user', {
          body: { userId: user.id }
        });
        
        if (error) {
          errors++;
        } else {
          deleted++;
        }
      } catch {
        errors++;
      }
    }
    
    if (deleted > 0) {
      toast.success(`${deleted} usuário(s) órfão(s) deletado(s) com sucesso!`);
      // Atualizar lista
      setAuthUsers(prev => prev.filter(u => !u.is_orphan));
      setAuthSummary(prev => prev ? {
        ...prev,
        total_auth_users: prev.total_auth_users - deleted,
        orphan_users: 0
      } : null);
    }
    
    if (errors > 0) {
      toast.error(`${errors} usuário(s) não puderam ser deletados`);
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

    setIsProcessingFile(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        toast.error('Planilha vazia');
        setIsProcessingFile(false);
        return;
      }

      // Processar dados para preview
      const processedData = jsonData.map((row, index) => {
        const email = row.email || row.Email;
        const nome_completo = row.nome_completo || row.nome || row.Nome || row['Nome Completo'];
        const cpf = row.cpf || row.CPF || null;
        const telefone = row.telefone || row.Telefone || row.phone || row.Phone || null;
        
        // Processar quadra e lote (pode vir combinado como "H 2 / 652")
        let quadra = row.quadra || row.Quadra || null;
        let lote = row.lote || row.Lote || null;
        
        // Limpar valores inúteis como "x" e "y"
        if (quadra && (quadra.toString().toLowerCase() === 'x' || quadra.toString().toLowerCase() === 'y')) {
          quadra = null;
        }
        
        // Se o lote contém barra "/", provavelmente é dado combinado "Quadra / Lote"
        if (lote && typeof lote === 'string' && lote.includes('/')) {
          const parts = lote.split('/').map(p => p.trim());
          if (parts.length === 2) {
            // Formato: "H 2 / 652" ou "B / 28"
            quadra = parts[0];
            lote = parts[1];
          }
        }
        
        // Limpar valores inúteis do lote
        if (lote && (lote.toString().toLowerCase() === 'x' || lote.toString().toLowerCase() === 'y')) {
          lote = null;
        }
        
        let fase = row.fase || row.Fase || null;
        // Limpar valores inúteis como "x" e "y"
        if (fase && (fase.toString().toLowerCase() === 'x' || fase.toString().toLowerCase() === 'y')) {
          fase = null;
        }
        
        let data_compra = row.data_compra || row.data || row.Data || row['Data Compra'] || row['Data da Compra'] || null;
        
        // Processar diferentes formatos de data
        if (data_compra && typeof data_compra === 'number') {
          // Formato numérico do Excel
          const excelEpoch = new Date(1899, 11, 30);
          const date = new Date(excelEpoch.getTime() + data_compra * 86400000);
          data_compra = date.toISOString().split('T')[0];
        } else if (data_compra instanceof Date) {
          data_compra = data_compra.toISOString().split('T')[0];
        } else if (typeof data_compra === 'string' && data_compra.trim() !== '') {
          // Tentar formato DD-MM-YYYY
          const ddmmyyyyMatch = data_compra.match(/^(\d{2})-(\d{2})-(\d{4})$/);
          if (ddmmyyyyMatch) {
            const [, day, month, year] = ddmmyyyyMatch;
            data_compra = `${year}-${month}-${day}`;
          } else {
            // Tentar outros formatos
            const parsed = new Date(data_compra);
            if (!isNaN(parsed.getTime())) {
              data_compra = parsed.toISOString().split('T')[0];
            } else {
              data_compra = null;
            }
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
      setIsProcessingFile(false);
      
      // Navigate to preview page
      navigate('/preview-importacao', {
        state: {
          previewData: processedData,
          previewStats: {
            total: stats.total,
            valid: processedData.filter(r => r.valid).length,
            invalid: processedData.filter(r => !r.valid).length,
            autogenPasswords: stats.total
          }
        }
      });
    } catch (error: any) {
      toast.error('Erro ao processar planilha: ' + error.message);
      setIsProcessingFile(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!excelFile || previewData.length === 0) {
      toast.error('Nenhum dado para importar');
      return;
    }
    
    if (selectedRows.size === 0) {
      toast.error('Selecione pelo menos um registro para importar');
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
      // Only import selected rows
      const jsonData = previewData.filter(row => selectedRows.has(row.row));

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
  
  const handleImportWithData = async (importData: any[]) => {
    if (!importData || importData.length === 0) {
      toast.error('Nenhum dado para importar');
      return;
    }

    setIsImporting(true);
    setIsCancelling(false);
    setCreatedUserIds([]);
    setImportProgress({ current: 0, total: 0 });
    setStartTime(Date.now());
    setEstimatedTimeLeft('');
    const results: ImportResult[] = [];
    const createdIds: string[] = [];

    try {
      const jsonData = importData;

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

          // Se a edge function retornar duplicado, ignorar
          if (data?.duplicate) {
            ignorados++;
            continue;
          }

          if (error || data?.error) {
            results.push({
              row: row.row,
              nome: nome_completo,
              email,
              status: 'error',
              error: data?.error || error?.message || 'Erro desconhecido',
            });
            erros++;
          } else {
            results.push({
              row: row.row,
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
            row: row.row,
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
    setSelectedRows(new Set());
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
  
  const handleToggleRow = (rowNumber: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowNumber)) {
        newSet.delete(rowNumber);
      } else {
        newSet.add(rowNumber);
      }
      return newSet;
    });
  };
  
  const handleToggleAll = () => {
    const currentPageRows = previewData
      .slice((previewPage - 1) * previewItemsPerPage, previewPage * previewItemsPerPage)
      .filter(r => r.valid)
      .map(r => r.row);
    
    const allSelected = currentPageRows.every(row => selectedRows.has(row));
    
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        currentPageRows.forEach(row => newSet.delete(row));
      } else {
        currentPageRows.forEach(row => newSet.add(row));
      }
      return newSet;
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
          <Tabs defaultValue={(isAdminObras || isExecutivoVendas) && !isAdmin ? "obras" : "cooperados"} className="space-y-6">
            <TabsList className={`grid w-full ${(isAdminObras || isExecutivoVendas) && !isAdmin ? 'grid-cols-2' : 'grid-cols-5'}`}>
              {isAdmin && (
                <>
                  <TabsTrigger value="cooperados" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Cooperados
                  </TabsTrigger>
                  <TabsTrigger value="financeiro" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Financeiro
                  </TabsTrigger>
                  <TabsTrigger value="cohapm" className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    COHAPM
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="obras" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Obras
              </TabsTrigger>
              <TabsTrigger value="fotos" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Galeria
              </TabsTrigger>
            </TabsList>

            {isAdmin && (
              <TabsContent value="cooperados" className="space-y-8">
            {/* Create User Form */}
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Criar Novo Usuário
              </CardTitle>
              <CardDescription>
                Adicione um novo cooperado ou admin ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCooperado} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo-usuario">Tipo de Usuário *</Label>
                    <select
                      id="tipo-usuario"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'cooperado' | 'admin' | 'admin_obras' | 'executivo_vendas')}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="cooperado">Cooperado/Comprador</option>
                      <option value="admin">Admin Geral</option>
                      <option value="admin_obras">Admin Obras</option>
                      <option value="executivo_vendas">Executivo de Vendas</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {newUserRole === 'cooperado' && 'Acesso à área do cooperado'}
                      {newUserRole === 'admin' && 'Acesso total ao sistema'}
                      {newUserRole === 'admin_obras' && 'Acesso para editar Obras e Galeria'}
                      {newUserRole === 'executivo_vendas' && 'Acesso apenas para visualizar Obras e Galeria'}
                    </p>
                  </div>
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
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={newCpf}
                      onChange={(e) => setNewCpf(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={newTelefone}
                      onChange={(e) => setNewTelefone(e.target.value)}
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

          {/* Upload em Lote */}
          <UploadCooperadosLote onImportComplete={loadCooperados} />

          {/* Lista de Cooperadores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Lista de Cooperadores Compradores
              </CardTitle>
              <CardDescription className="flex items-center justify-between">
                <span>Todos os cooperados cadastrados no sistema</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadAuthUsers}
                  disabled={isLoadingAuthUsers}
                >
                  {isLoadingAuthUsers ? 'Carregando...' : 'Ver Usuários Auth'}
                </Button>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Campo de Busca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email, CPF ou telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : cooperados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum cooperado cadastrado ainda
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex gap-2 mb-4">
                    <Badge variant="outline" className="bg-primary/10">
                      Profiles: {cooperados.filter(c => c.fonte === 'profile').length}
                    </Badge>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700">
                      COHAPM: {cooperados.filter(c => c.fonte === 'cohapm').length}
                    </Badge>
                    <Badge variant="secondary">
                      Total: {cooperados.length}
                    </Badge>
                    {searchTerm && (
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-700">
                        Filtrados: {cooperados.filter(c => {
                          const term = searchTerm.toLowerCase();
                          return (
                            (c.nome_completo?.toLowerCase().includes(term)) ||
                            (c.email?.toLowerCase().includes(term)) ||
                            (c.cpf?.toLowerCase().includes(term)) ||
                            (c.telefone?.toLowerCase().includes(term))
                          );
                        }).length}
                      </Badge>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo de Usuário</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Quadra</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Fase</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cooperados
                        .filter((cooperado) => {
                          if (!searchTerm) return true;
                          const term = searchTerm.toLowerCase();
                          return (
                            (cooperado.nome_completo?.toLowerCase().includes(term)) ||
                            (cooperado.email?.toLowerCase().includes(term)) ||
                            (cooperado.cpf?.toLowerCase().includes(term)) ||
                            (cooperado.telefone?.toLowerCase().includes(term))
                          );
                        })
                        .map((cooperado) => (
                        <TableRow key={`${cooperado.fonte}-${cooperado.id}`}>
                          <TableCell>
                            {cooperado.user_roles && cooperado.user_roles.length > 0 ? (
                              <Badge 
                                variant={cooperado.user_roles[0]?.role === 'admin' ? 'destructive' : 
                                        cooperado.user_roles[0]?.role === 'admin_obras' ? 'secondary' :
                                        cooperado.user_roles[0]?.role === 'executivo_vendas' ? 'outline' : 'default'}
                              >
                                {cooperado.user_roles[0]?.role === 'admin' ? 'Administrador' :
                                 cooperado.user_roles[0]?.role === 'admin_obras' ? 'Admin Obras' :
                                 cooperado.user_roles[0]?.role === 'executivo_vendas' ? 'Executivo Vendas' :
                                 'Cooperado'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300">
                                Não vinculado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{cooperado.nome_completo}</TableCell>
                          <TableCell>{cooperado.email || '-'}</TableCell>
                          <TableCell>{cooperado.cpf || '-'}</TableCell>
                          <TableCell>{cooperado.telefone || '-'}</TableCell>
                          <TableCell>{cooperado.quadra || '-'}</TableCell>
                          <TableCell>{cooperado.lote || '-'}</TableCell>
                          <TableCell>{cooperado.fase || '-'}</TableCell>
                          <TableCell>
                            {cooperado.fonte === 'profile' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingCooperado(cooperado);
                                  setEditNome(cooperado.nome_completo);
                                  setEditTelefone(cooperado.telefone || '');
                                  setEditCpf(cooperado.cpf || '');
                                  setEditQuadra(cooperado.quadra || '');
                                  setEditLote(cooperado.lote || '');
                                  setEditFase(cooperado.fase || '');
                                  setEditDataCompra(cooperado.data_compra || '');
                                }}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openLinkDialog(cooperado)}
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Vincular
                                </Button>
                                {cooperado.situacao_financeira && (
                                  <Badge variant="secondary" className="text-xs">
                                    {cooperado.situacao_financeira}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="financeiro">
                <div className="space-y-6">
                  <FinanceiroAdminDashboard />
                </div>
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="cohapm">
                <div className="space-y-6">
                  <ImportacaoCOHAPM />
                </div>
              </TabsContent>
            )}


            <TabsContent value="obras">
              <div className="space-y-6">
                <AcompanhamentoObras />
                <DashboardComparativoObras showVariacoes={true} />
                <HistoricoGeralObras />
                <AdminObras readOnly={isExecutivoVendas && !isAdmin && !isAdminObras} />
              </div>
            </TabsContent>

            <TabsContent value="fotos">
              <AdminGaleria readOnly={isExecutivoVendas && !isAdmin && !isAdminObras} />
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
            
            {/* Seção de Senha - apenas para profiles (com usuário auth) */}
            {editingCooperado?.fonte !== 'cohapm' && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Gerar Nova Senha</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gera uma nova senha aleatória para o cooperado
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleResetPassword}
                    disabled={isResettingPassword}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {isResettingPassword ? 'Gerando...' : 'Gerar Nova Senha'}
                  </Button>
                </div>
              </div>
            )}
            
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

      {/* Link COHAPM Dialog */}
      <Dialog open={!!linkingCohapm} onOpenChange={(open) => !open && setLinkingCohapm(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Vincular Registro COHAPM
            </DialogTitle>
            <DialogDescription>
              Vincule este registro a um profile existente ou crie um novo usuário
            </DialogDescription>
          </DialogHeader>
          
          {linkingCohapm && (
            <div className="space-y-4">
              {/* Dados do registro COHAPM */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Dados do Registro COHAPM</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nome:</span> {linkingCohapm.nome_completo}</div>
                  <div><span className="text-muted-foreground">Email:</span> {linkingCohapm.email || '-'}</div>
                  <div><span className="text-muted-foreground">CPF:</span> {linkingCohapm.cpf || '-'}</div>
                  <div><span className="text-muted-foreground">Telefone:</span> {linkingCohapm.telefone || '-'}</div>
                  <div><span className="text-muted-foreground">Quadra:</span> {linkingCohapm.quadra || '-'}</div>
                  <div><span className="text-muted-foreground">Lote:</span> {linkingCohapm.lote || '-'}</div>
                </div>
              </div>

              {/* Opções de vinculação */}
              <div className="space-y-3">
                <Label>Escolha uma opção:</Label>
                <div className="flex gap-3">
                  <Button
                    variant={linkMode === 'new' ? 'default' : 'outline'}
                    onClick={() => setLinkMode('new')}
                    className="flex-1"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Criar Novo Usuário
                  </Button>
                  <Button
                    variant={linkMode === 'existing' ? 'default' : 'outline'}
                    onClick={() => setLinkMode('existing')}
                    className="flex-1"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Vincular a Existente
                  </Button>
                </div>
              </div>

              {linkMode === 'new' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Será criado um novo usuário com os dados do registro COHAPM.
                      {linkingCohapm.email && linkingCohapm.email !== '-' ? (
                        <span className="block mt-1 text-primary">
                          Email: <strong>{linkingCohapm.email}</strong>
                        </span>
                      ) : (
                        <span className="block mt-1 text-destructive">
                          ⚠️ Este registro não possui email. Não é possível criar um usuário.
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateUserFromCohapm}
                    disabled={isLinking || !linkingCohapm.email || linkingCohapm.email === '-'}
                    className="w-full"
                  >
                    {isLinking ? 'Criando...' : 'Criar Usuário e Vincular'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Buscar Profile</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome, email, CPF, quadra ou lote..."
                        value={searchProfileTerm}
                        onChange={(e) => setSearchProfileTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[200px] border rounded-md">
                    <div className="p-2 space-y-1">
                      {filteredProfilesForLink.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          Nenhum profile encontrado
                        </p>
                      ) : (
                        filteredProfilesForLink.map((profile) => (
                          <div
                            key={profile.id}
                            className={`p-3 rounded-md cursor-pointer transition-colors ${
                              selectedProfileId === profile.id
                                ? 'bg-primary/10 border border-primary'
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => setSelectedProfileId(profile.id)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{profile.nome_completo}</p>
                                <p className="text-sm text-muted-foreground">{profile.email}</p>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                {profile.quadra && profile.lote && (
                                  <p>Q{profile.quadra} L{profile.lote}</p>
                                )}
                                {profile.cpf && <p>{profile.cpf}</p>}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  <Button
                    onClick={handleLinkToExistingProfile}
                    disabled={isLinking || !selectedProfileId}
                    className="w-full"
                  >
                    {isLinking ? 'Vinculando...' : 'Vincular ao Profile Selecionado'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Auth Users Dialog */}
      <Dialog open={showAuthUsersDialog} onOpenChange={setShowAuthUsersDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Usuários no Sistema de Autenticação
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadAuthUsers}
                disabled={isLoadingAuthUsers}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingAuthUsers ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
            <DialogDescription>
              Lista de todos os usuários cadastrados no auth.users
            </DialogDescription>
          </DialogHeader>
          
          {authSummary && (
            <div className="grid grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Auth</p>
                <p className="text-2xl font-bold">{authSummary.total_auth_users}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Com Profile</p>
                <p className="text-2xl font-bold text-green-600">{authSummary.active_users}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Órfãos</p>
                <p className="text-2xl font-bold text-destructive">{authSummary.orphan_users}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Profiles</p>
                <p className="text-lg font-semibold">{authSummary.total_profiles}</p>
              </div>
            </div>
          )}

          {/* Selection Controls */}
          <div className="flex items-center justify-between gap-2 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllAuthUsers}
              >
                Selecionar Todos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllOrphanAuthUsers}
              >
                Selecionar Órfãos
              </Button>
              {selectedAuthUsers.size > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAuthUserSelection}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelectedAuthUsers}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir ({authUsers.filter(u => selectedAuthUsers.has(u.id) && u.is_orphan).length})
                  </Button>
                </>
              )}
            </div>
            {selectedAuthUsers.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedAuthUsers.size} selecionado(s)
              </span>
            )}
          </div>

          <ScrollArea className="h-[350px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={authUsers.length > 0 && selectedAuthUsers.size === authUsers.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectAllAuthUsers();
                        } else {
                          clearAuthUserSelection();
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nome (Profile)</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authUsers.map((user) => (
                  <TableRow key={user.id} className={user.is_orphan ? 'bg-destructive/5' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAuthUsers.has(user.id)}
                        onCheckedChange={() => toggleAuthUserSelection(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_orphan ? 'destructive' : 'default'}>
                        {user.is_orphan ? 'Órfão' : 'Ativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.profile_name || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR') : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      {user.is_orphan && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteOrphanUser(user.id, user.email)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Actions Section */}
          <div className="space-y-3">
            {selectedAuthUsers.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleDeleteSelectedAuthUsers}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar {authUsers.filter(u => selectedAuthUsers.has(u.id) && u.is_orphan).length} Usuário(s) Órfão(s) Selecionado(s)
              </Button>
            )}
            
            {authSummary?.orphan_users > 0 && (
              <>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    💡 <strong>Dica:</strong> Usuários órfãos podem ser recuperados ao tentar cadastrá-los novamente com o mesmo email. O sistema irá detectar e criar o profile automaticamente.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDeleteAllOrphans}
                  className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar Todos os {authSummary.orphan_users} Usuário(s) Órfão(s)
                </Button>
              </>
            )}
          </div>
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

          {/* Selection Summary */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {selectedRows.size} de {previewData.filter(r => r.valid).length} registros selecionados
                </span>
              </div>
              {selectedRows.size < previewData.filter(r => r.valid).length && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSelectedRows(new Set(previewData.filter(r => r.valid).map(r => r.row)))}
                  className="h-auto p-0 text-primary"
                >
                  Selecionar todos válidos
                </Button>
              )}
              {selectedRows.size > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSelectedRows(new Set())}
                  className="h-auto p-0 text-muted-foreground"
                >
                  Limpar seleção
                </Button>
              )}
            </div>
          </div>

          {/* Tabela de Preview */}
          <ScrollArea className="h-[450px] rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        previewData
                          .slice((previewPage - 1) * previewItemsPerPage, previewPage * previewItemsPerPage)
                          .filter(r => r.valid)
                          .every(r => selectedRows.has(r.row)) &&
                        previewData
                          .slice((previewPage - 1) * previewItemsPerPage, previewPage * previewItemsPerPage)
                          .filter(r => r.valid).length > 0
                      }
                      onCheckedChange={handleToggleAll}
                    />
                  </TableHead>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-24">Senha</TableHead>
                  <TableHead className="w-24">Quadra</TableHead>
                  <TableHead className="w-24">Lote</TableHead>
                  <TableHead className="w-24">Fase</TableHead>
                  <TableHead className="w-32">Data Compra</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData
                  .slice((previewPage - 1) * previewItemsPerPage, previewPage * previewItemsPerPage)
                  .map((row, index) => (
                  <TableRow 
                    key={index} 
                    className={`${!row.valid ? 'bg-muted/50' : ''} ${selectedRows.has(row.row) ? 'bg-primary/5' : ''}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(row.row)}
                        onCheckedChange={() => handleToggleRow(row.row)}
                        disabled={!row.valid}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{row.row}</TableCell>
                    <TableCell className="font-medium">
                      {row.nome_completo || <span className="text-muted-foreground italic text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.email || <span className="text-muted-foreground italic text-xs">-</span>}
                    </TableCell>
                    <TableCell>
                      {row.password ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">••••••••</code>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.quadra || <span className="text-muted-foreground italic text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.lote || <span className="text-muted-foreground italic text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.fase || <span className="text-muted-foreground italic text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.data_compra || <span className="text-muted-foreground italic text-xs">-</span>}
                    </TableCell>
                    <TableCell>
                      {row.valid ? (
                        <Badge variant="default" className="text-xs">Válido</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Incompleto</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Paginação do Preview */}
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {Math.min((previewPage - 1) * previewItemsPerPage + 1, previewData.length)} a {Math.min(previewPage * previewItemsPerPage, previewData.length)} de {previewData.length} registros
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                    disabled={previewPage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </Button>
                </PaginationItem>
                
                {/* First page */}
                {previewPage > 2 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setPreviewPage(1)} isActive={false}>
                      1
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {/* Ellipsis before */}
                {previewPage > 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                
                {/* Previous page */}
                {previewPage > 1 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setPreviewPage(previewPage - 1)} isActive={false}>
                      {previewPage - 1}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {/* Current page */}
                <PaginationItem>
                  <PaginationLink isActive={true}>
                    {previewPage}
                  </PaginationLink>
                </PaginationItem>
                
                {/* Next page */}
                {previewPage < Math.ceil(previewData.length / previewItemsPerPage) && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setPreviewPage(previewPage + 1)} isActive={false}>
                      {previewPage + 1}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {/* Ellipsis after */}
                {previewPage < Math.ceil(previewData.length / previewItemsPerPage) - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                
                {/* Last page */}
                {previewPage < Math.ceil(previewData.length / previewItemsPerPage) - 1 && (
                  <PaginationItem>
                    <PaginationLink 
                      onClick={() => setPreviewPage(Math.ceil(previewData.length / previewItemsPerPage))} 
                      isActive={false}
                    >
                      {Math.ceil(previewData.length / previewItemsPerPage)}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewPage(p => Math.min(Math.ceil(previewData.length / previewItemsPerPage), p + 1))}
                    disabled={previewPage >= Math.ceil(previewData.length / previewItemsPerPage)}
                    className="gap-1"
                  >
                    <span className="hidden sm:inline">Próxima</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>

          {/* Ações */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedRows.size === 0 ? (
                <span className="text-destructive font-medium">Selecione pelo menos um registro para importar</span>
              ) : (
                <span>
                  <strong className="text-primary">{selectedRows.size}</strong> registro{selectedRows.size !== 1 ? 's' : ''} será{selectedRows.size !== 1 ? 'ão' : ''} importado{selectedRows.size !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCancelPreview}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmImport}
                disabled={selectedRows.size === 0}
                size="lg"
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-5 w-5 mr-2" />
                Iniciar Importação ({selectedRows.size})
              </Button>
            </div>
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

      {/* New Password Generated Dialog (from edit) */}
      <Dialog open={showNewPasswordDialog} onOpenChange={setShowNewPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Nova Senha Gerada
            </DialogTitle>
            <DialogDescription>
              A nova senha para <strong>{editingCooperado?.nome_completo}</strong> foi gerada com sucesso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-muted rounded-md font-mono text-lg select-all">
                  {newGeneratedPassword}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(newGeneratedPassword);
                    toast.success('Senha copiada para área de transferência!');
                  }}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Clique no botão ao lado para copiar a senha
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Importante:</strong> Envie esta nova senha ao cooperado. Ele precisará dela para fazer login no sistema.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowNewPasswordDialog(false)}>
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
