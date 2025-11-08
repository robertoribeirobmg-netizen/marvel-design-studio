import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LogOut, UserPlus, Shield, Users, Trash2, Camera, Upload, DollarSign, FileSpreadsheet, Search, X, Edit, ChevronLeft, ChevronRight, BarChart3, FileText, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceiroAdmin } from '@/components/FinanceiroAdmin';
import { DashboardCooperados } from '@/components/DashboardCooperados';
import { AdminObras } from '@/components/AdminObras';
import { DashboardComparativoObras } from '@/components/DashboardComparativoObras';
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
  const [newPassword, setNewPassword] = useState('');
  const [newNome, setNewNome] = useState('');
  const [newQuadra, setNewQuadra] = useState('');
  const [newLote, setNewLote] = useState('');
  const [newFase, setNewFase] = useState('');
  const [newDataCompra, setNewDataCompra] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Excel import state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<Array<{
    row: number;
    nome: string;
    email: string;
    status: 'success' | 'error';
    error?: string;
  }>>([]);
  const [showImportResults, setShowImportResults] = useState(false);
  
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
  
  // Photo gallery state
  const [fotos, setFotos] = useState<any[]>([]);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoTitulo, setFotoTitulo] = useState('');
  const [fotoDescricao, setFotoDescricao] = useState('');
  const [fotoCategoria, setFotoCategoria] = useState<'fundacao' | 'estrutura' | 'acabamento'>('fundacao');
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);

  useEffect(() => {
    loadCooperados();
    loadFotos();
  }, []);

  const loadCooperados = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles (role)
        `)
        .order('data_cadastro', { ascending: false });

      if (error) throw error;
      setCooperados(profiles || []);
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

      // Create user using admin function
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newEmail,
          password: newPassword,
          nome_completo: newNome,
          quadra: newQuadra || null,
          lote: newLote || null,
          fase: newFase || null,
          data_compra: newDataCompra || null,
        },
      });

      if (error) throw error;

      toast.success('Cooperado criado com sucesso!');
      setNewEmail('');
      setNewPassword('');
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

  const handleExcelImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) {
      toast.error('Selecione um arquivo Excel');
      return;
    }

    setIsImporting(true);
    const results: Array<{
      row: number;
      nome: string;
      email: string;
      status: 'success' | 'error';
      error?: string;
    }> = [];

    try {
      const data = await excelFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        toast.error('Planilha vazia');
        setIsImporting(false);
        return;
      }

      let sucessos = 0;
      let erros = 0;

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const email = row.email || row.Email;
        const password = row.senha || row.Senha || row.password || row.Password;
        const nome_completo = row.nome_completo || row.nome || row.Nome || row['Nome Completo'];
        const quadra = row.quadra || row.Quadra || null;
        const lote = row.lote || row.Lote || null;
        const fase = row.fase || row.Fase || null;
        const data_compra = row.data_compra || row.data || row.Data || row['Data Compra'] || row['Data da Compra'] || null;

        try {
          if (!email || !password || !nome_completo) {
            throw new Error('Dados incompletos: email, senha ou nome faltando');
          }

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

          const { error } = await supabase.functions.invoke('create-user', {
            body: {
              email,
              password,
              nome_completo,
              quadra,
              lote,
              fase,
              data_compra,
            },
          });

          if (error) {
            results.push({
              row: i + 2, // +2 porque linha 1 é cabeçalho e array começa em 0
              nome: nome_completo,
              email,
              status: 'error',
              error: error.message || 'Erro desconhecido',
            });
            erros++;
          } else {
            results.push({
              row: i + 2,
              nome: nome_completo,
              email,
              status: 'success',
            });
            sucessos++;
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

      setImportResults(results);
      setShowImportResults(true);
      toast.success(`Importação concluída: ${sucessos} sucessos, ${erros} erros`);
      setExcelFile(null);
      loadCooperados();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar planilha');
    } finally {
      setIsImporting(false);
    }
  };

  const loadFotos = async () => {
    try {
      const { data, error } = await supabase
        .from('obra_fotos')
        .select('*')
        .order('data_upload', { ascending: false });

      if (error) throw error;
      setFotos(data || []);
    } catch (error) {
      console.error('Erro ao carregar fotos:', error);
      toast.error('Erro ao carregar galeria de fotos');
    }
  };

  const handleUploadFoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotoFile) {
      toast.error('Selecione uma foto');
      return;
    }

    setIsUploadingFoto(true);

    try {
      const fileExt = fotoFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('obra-fotos')
        .upload(filePath, fotoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('obra-fotos')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('obra_fotos')
        .insert({
          titulo: fotoTitulo,
          descricao: fotoDescricao || null,
          foto_url: publicUrl,
          categoria: fotoCategoria,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (dbError) throw dbError;

      toast.success('Foto enviada com sucesso!');
      setFotoFile(null);
      setFotoTitulo('');
      setFotoDescricao('');
      setFotoCategoria('fundacao');
      loadFotos();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar foto');
    } finally {
      setIsUploadingFoto(false);
    }
  };

  const handleDeleteFoto = async (fotoId: string, fotoUrl: string) => {
    if (!confirm('Tem certeza que deseja remover esta foto?')) return;

    try {
      const fileName = fotoUrl.split('/').pop();
      
      if (fileName) {
        await supabase.storage
          .from('obra-fotos')
          .remove([fileName]);
      }

      const { error } = await supabase
        .from('obra_fotos')
        .delete()
        .eq('id', fotoId);

      if (error) throw error;

      toast.success('Foto removida com sucesso!');
      loadFotos();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover foto');
    }
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
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Senha (min 6 caracteres)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
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
              <form onSubmit={handleExcelImport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="excel">Selecionar Planilha Excel</Label>
                  <Input
                    id="excel"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Colunas obrigatórias: <strong>nome_completo</strong> (ou nome), <strong>email</strong>, <strong>senha</strong><br/>
                    Colunas opcionais: <strong>quadra</strong>, <strong>lote</strong>, <strong>fase</strong>, <strong>data_compra</strong> (ou data)
                  </p>
                </div>
                <Button type="submit" disabled={isImporting} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importando...' : 'Importar Cooperados'}
                </Button>
              </form>
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
                        <TableHead>Nome</TableHead>
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
                          <TableCell className="font-medium">
                            {cooperado.nome_completo}
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
                <DashboardComparativoObras />
                <AdminObras />
              </div>
            </TabsContent>

            <TabsContent value="fotos">
              <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Galeria de Fotos da Obra
              </CardTitle>
              <CardDescription>
                Adicione fotos do andamento da construção
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadFoto} className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título da Foto</Label>
                    <Input
                      id="titulo"
                      type="text"
                      placeholder="Ex: Fundação concluída"
                      value={fotoTitulo}
                      onChange={(e) => setFotoTitulo(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <select
                      id="categoria"
                      value={fotoCategoria}
                      onChange={(e) => setFotoCategoria(e.target.value as any)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="fundacao">Fundação</option>
                      <option value="estrutura">Estrutura</option>
                      <option value="acabamento">Acabamento</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição (opcional)</Label>
                    <Input
                      id="descricao"
                      type="text"
                      placeholder="Detalhes adicionais"
                      value={fotoDescricao}
                      onChange={(e) => setFotoDescricao(e.target.value)}
                    />
                  </div>

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
    </div>
                <div className="space-y-2">
                  <Label htmlFor="foto">Selecionar Foto</Label>
                  <Input
                    id="foto"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isUploadingFoto} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploadingFoto ? 'Enviando...' : 'Enviar Foto'}
                </Button>
              </form>

              {/* Photos Grid */}
              <div className="mt-8">
                {fotos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma foto adicionada ainda
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {fotos.map((foto) => (
                      <div key={foto.id} className="relative group">
                        <img
                          src={foto.foto_url}
                          alt={foto.titulo}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-between p-3">
                          <div>
                            <p className="text-white font-semibold text-sm">{foto.titulo}</p>
                            {foto.descricao && (
                              <p className="text-white/80 text-xs mt-1">{foto.descricao}</p>
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteFoto(foto.id, foto.foto_url)}
                            className="w-full"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Import Results Dialog */}
      <Dialog open={showImportResults} onOpenChange={setShowImportResults}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Resultados da Importação</DialogTitle>
            <DialogDescription>
              Detalhes de cada linha processada da planilha
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
    </div>
  );
}
