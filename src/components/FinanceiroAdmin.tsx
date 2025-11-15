import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertCircle, Search, FileText, Check, X, Users, TrendingUp, Receipt, RefreshCw, FileDown, Upload, Eye, CheckSquare, Filter, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { RenegociacaoDividas } from './RenegociacaoDividas';
import { gerarRelatorioRenegociacoes } from '@/lib/relatorioRenegociacoes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CooperadoFinanceiro {
  id: string;
  nome_completo: string;
  quadra: string | null;
  lote: string | null;
  investimento: any;
  parcelas: any[];
  totalParcelas: number;
  parcelasPagas: number;
  parcelasPendentes: number;
  parcelasVencidas: number;
  diasMaximoAtraso: number;
  valorTotal: number;
  valorPago: number;
  saldoDevedor: number;
}

export function FinanceiroAdmin() {
  const [cooperados, setCooperados] = useState<CooperadoFinanceiro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCooperado, setSelectedCooperado] = useState<CooperadoFinanceiro | null>(null);
  const [showParcelasDialog, setShowParcelasDialog] = useState(false);
  const [showRenegociacaoDialog, setShowRenegociacaoDialog] = useState(false);
  const [processandoBaixa, setProcessandoBaixa] = useState(false);
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [filtroRelatorio, setFiltroRelatorio] = useState<'todas' | 'ativas' | 'finalizadas'>('todas');
  const [showBaixaDialog, setShowBaixaDialog] = useState(false);
  const [parcelaParaBaixa, setParcelaParaBaixa] = useState<any>(null);
  const [observacoesBaixa, setObservacoesBaixa] = useState('');
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState<Set<string>>(new Set());
  const [showBaixaLoteDialog, setShowBaixaLoteDialog] = useState(false);
  const [observacoesLote, setObservacoesLote] = useState('');
  const [comprovanteLoteFile, setComprovanteLoteFile] = useState<File | null>(null);
  const [previewUrlLote, setPreviewUrlLote] = useState<string | null>(null);
  
  // Filtros de parcelas
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'pendente' | 'paga' | 'vencida'>('todas');
  const [dataVencimentoInicio, setDataVencimentoInicio] = useState<Date | undefined>(undefined);
  const [dataVencimentoFim, setDataVencimentoFim] = useState<Date | undefined>(undefined);
  const [valorMinimo, setValorMinimo] = useState<string>('');
  const [valorMaximo, setValorMaximo] = useState<string>('');
  const [ordenacao, setOrdenacao] = useState<'parcela' | 'vencimento' | 'valor'>('parcela');
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<'asc' | 'desc'>('asc');
  const [termoBusca, setTermoBusca] = useState('');

  useEffect(() => {
    loadDadosFinanceiros();
  }, []);

  const loadDadosFinanceiros = async () => {
    try {
      setIsLoading(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('nome_completo');

      if (profilesError) throw profilesError;

      const { data: investimentos, error: invError } = await supabase
        .from('investimentos')
        .select('*');

      if (invError) throw invError;

      const { data: parcelas, error: parcelasError } = await supabase
        .from('parcelas')
        .select('*')
        .neq('status', 'renegociada');

      if (parcelasError) throw parcelasError;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const cooperadosData: CooperadoFinanceiro[] = profiles.map(profile => {
        const investimento = investimentos?.find(inv => inv.user_id === profile.id);
        const parcelasCooperado = parcelas?.filter(p => p.investimento_id === investimento?.id) || [];
        
        const pagas = parcelasCooperado.filter(p => p.status === 'paga');
        const pendentes = parcelasCooperado.filter(p => p.status === 'pendente');
        const vencidas = parcelasCooperado.filter(p => {
          if (p.status !== 'pendente') return false;
          const dataVenc = new Date(p.data_vencimento);
          dataVenc.setHours(0, 0, 0, 0);
          return dataVenc < hoje;
        });

        let diasMaximoAtraso = 0;
        vencidas.forEach(parcela => {
          const dataVenc = new Date(parcela.data_vencimento);
          dataVenc.setHours(0, 0, 0, 0);
          const diasAtraso = Math.floor((hoje.getTime() - dataVenc.getTime()) / (1000 * 60 * 60 * 24));
          if (diasAtraso > diasMaximoAtraso) {
            diasMaximoAtraso = diasAtraso;
          }
        });

        const valorTotal = investimento?.valor_total || 0;
        const valorPago = pagas.reduce((sum, p) => sum + (Number(p.valor_pago) || 0), 0);
        const saldoDevedor = valorTotal - valorPago;

        return {
          id: profile.id,
          nome_completo: profile.nome_completo,
          quadra: profile.quadra,
          lote: profile.lote,
          investimento,
          parcelas: parcelasCooperado,
          totalParcelas: parcelasCooperado.length,
          parcelasPagas: pagas.length,
          parcelasPendentes: pendentes.length,
          parcelasVencidas: vencidas.length,
          diasMaximoAtraso,
          valorTotal,
          valorPago,
          saldoDevedor,
        };
      });

      setCooperados(cooperadosData);
    } catch (error: any) {
      console.error('Erro ao carregar dados financeiros:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setIsLoading(false);
    }
  };

  const cooperadosFiltrados = useMemo(() => {
    return cooperados.filter(c => 
      c.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.quadra && c.quadra.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.lote && c.lote.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [cooperados, searchTerm]);

  const stats = useMemo(() => {
    const totalCooperados = cooperados.length;
    const cooperadosComInvestimento = cooperados.filter(c => c.investimento).length;
    const cooperadosSemInvestimento = totalCooperados - cooperadosComInvestimento;
    const inadimplentes = cooperados.filter(c => c.parcelasVencidas > 0).length;
    
    const inadimplencia30 = cooperados.filter(c => c.diasMaximoAtraso >= 30 && c.diasMaximoAtraso < 60).length;
    const inadimplencia60 = cooperados.filter(c => c.diasMaximoAtraso >= 60 && c.diasMaximoAtraso < 80).length;
    const inadimplencia80 = cooperados.filter(c => c.diasMaximoAtraso >= 80 && c.diasMaximoAtraso < 85).length;
    const inadimplencia85 = cooperados.filter(c => c.diasMaximoAtraso >= 85 && c.diasMaximoAtraso < 89).length;
    const inadimplencia89 = cooperados.filter(c => c.diasMaximoAtraso >= 89 && c.diasMaximoAtraso < 90).length;
    const inadimplencia90 = cooperados.filter(c => c.diasMaximoAtraso >= 90).length;

    const valorTotalReceber = cooperados.reduce((sum, c) => sum + c.saldoDevedor, 0);
    const valorTotalRecebido = cooperados.reduce((sum, c) => sum + c.valorPago, 0);

    return {
      totalCooperados,
      cooperadosComInvestimento,
      cooperadosSemInvestimento,
      inadimplentes,
      inadimplencia30,
      inadimplencia60,
      inadimplencia80,
      inadimplencia85,
      inadimplencia89,
      inadimplencia90,
      valorTotalReceber,
      valorTotalRecebido,
    };
  }, [cooperados]);

  const limparFiltros = () => {
    setTermoBusca('');
    setFiltroStatus('todas');
    setDataVencimentoInicio(undefined);
    setDataVencimentoFim(undefined);
    setValorMinimo('');
    setValorMaximo('');
    setOrdenacao('parcela');
    setDirecaoOrdenacao('asc');
  };

  const parcelasFiltradas = useMemo(() => {
    if (!selectedCooperado) return [];
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    let parcelas = selectedCooperado.parcelas.filter(parcela => {
      // Filtro de busca
      if (termoBusca) {
        const termo = termoBusca.toLowerCase();
        const numeroMatch = parcela.numero_parcela.toString().includes(termo);
        const descricaoMatch = parcela.descricao?.toLowerCase().includes(termo);
        if (!numeroMatch && !descricaoMatch) return false;
      }
      
      // Filtro de status
      if (filtroStatus !== 'todas') {
        if (filtroStatus === 'vencida') {
          const dataVenc = new Date(parcela.data_vencimento);
          dataVenc.setHours(0, 0, 0, 0);
          if (parcela.status !== 'pendente' || dataVenc >= hoje) return false;
        } else {
          if (parcela.status !== filtroStatus) return false;
        }
      }
      
      // Filtro de data de vencimento
      if (dataVencimentoInicio) {
        const dataVenc = new Date(parcela.data_vencimento);
        const dataInicio = new Date(dataVencimentoInicio);
        dataInicio.setHours(0, 0, 0, 0);
        if (dataVenc < dataInicio) return false;
      }
      
      if (dataVencimentoFim) {
        const dataVenc = new Date(parcela.data_vencimento);
        const dataFim = new Date(dataVencimentoFim);
        dataFim.setHours(23, 59, 59, 999);
        if (dataVenc > dataFim) return false;
      }
      
      // Filtro de valor
      const valor = Number(parcela.valor_parcela);
      if (valorMinimo && valor < Number(valorMinimo)) return false;
      if (valorMaximo && valor > Number(valorMaximo)) return false;
      
      return true;
    });
    
    // Ordenação
    parcelas.sort((a, b) => {
      let comparacao = 0;
      
      if (ordenacao === 'parcela') {
        comparacao = a.numero_parcela - b.numero_parcela;
      } else if (ordenacao === 'vencimento') {
        comparacao = new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
      } else if (ordenacao === 'valor') {
        comparacao = Number(a.valor_parcela) - Number(b.valor_parcela);
      }
      
      return direcaoOrdenacao === 'asc' ? comparacao : -comparacao;
    });
    
    return parcelas;
  }, [selectedCooperado, termoBusca, filtroStatus, dataVencimentoInicio, dataVencimentoFim, valorMinimo, valorMaximo, ordenacao, direcaoOrdenacao]);

  const abrirDialogBaixa = (parcela: any) => {
    setParcelaParaBaixa(parcela);
    setObservacoesBaixa('');
    setComprovanteFile(null);
    setPreviewUrl(null);
    setShowBaixaDialog(true);
  };

  const toggleSelecionarParcela = (parcelaId: string) => {
    const novaSelecao = new Set(parcelasSelecionadas);
    if (novaSelecao.has(parcelaId)) {
      novaSelecao.delete(parcelaId);
    } else {
      novaSelecao.add(parcelaId);
    }
    setParcelasSelecionadas(novaSelecao);
  };

  const selecionarTodasParcelas = () => {
    const parcelasPendentes = parcelasFiltradas.filter(p => p.status === 'pendente');
    if (parcelasSelecionadas.size === parcelasPendentes.length && parcelasPendentes.length > 0) {
      setParcelasSelecionadas(new Set());
    } else {
      setParcelasSelecionadas(new Set(parcelasPendentes.map(p => p.id)));
    }
  };

  const abrirDialogBaixaLote = () => {
    if (parcelasSelecionadas.size === 0) {
      toast.error('Selecione pelo menos uma parcela');
      return;
    }
    setObservacoesLote('');
    setComprovanteLoteFile(null);
    setPreviewUrlLote(null);
    setShowBaixaLoteDialog(true);
  };

  const handleFileLoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou PDF.');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande. Tamanho máximo: 5MB');
      return;
    }

    setComprovanteLoteFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrlLote(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrlLote(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 5MB');
      return;
    }

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use: JPG, PNG, WEBP ou PDF');
      return;
    }

    setComprovanteFile(file);

    // Criar preview se for imagem
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const darBaixaParcela = async () => {
    try {
      setProcessandoBaixa(true);
      
      if (!parcelaParaBaixa) {
        toast.error('Parcela não encontrada');
        return;
      }

      let comprovanteUrl: string | null = null;

      // Upload do comprovante se houver
      if (comprovanteFile) {
        const fileExt = comprovanteFile.name.split('.').pop();
        const fileName = `${selectedCooperado?.id}/${parcelaParaBaixa.id}_${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('comprovantes')
          .upload(fileName, comprovanteFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          toast.error('Erro ao fazer upload do comprovante');
          return;
        }

        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from('comprovantes')
          .getPublicUrl(fileName);

        comprovanteUrl = urlData.publicUrl;
      }

      // Atualizar parcela
      const { error } = await supabase
        .from('parcelas')
        .update({
          status: 'paga',
          data_pagamento: new Date().toISOString().split('T')[0],
          valor_pago: parcelaParaBaixa.valor_parcela,
          observacoes: observacoesBaixa || null,
          comprovante_url: comprovanteUrl
        })
        .eq('id', parcelaParaBaixa.id);

      if (error) throw error;

      toast.success('Baixa registrada com sucesso!');
      setShowBaixaDialog(false);
      await loadDadosFinanceiros();
      
      if (selectedCooperado) {
        const cooperadoAtualizado = cooperados.find(c => c.id === selectedCooperado.id);
        if (cooperadoAtualizado) {
          setSelectedCooperado(cooperadoAtualizado);
        }
      }
    } catch (error: any) {
      console.error('Erro ao dar baixa:', error);
      toast.error('Erro ao dar baixa na parcela');
    } finally {
      setProcessandoBaixa(false);
    }
  };

  const darBaixaLote = async () => {
    try {
      setProcessandoBaixa(true);
      
      if (parcelasSelecionadas.size === 0) {
        toast.error('Nenhuma parcela selecionada');
        return;
      }

      let comprovanteUrl: string | null = null;

      // Upload do comprovante se houver (será o mesmo para todas)
      if (comprovanteLoteFile) {
        const fileExt = comprovanteLoteFile.name.split('.').pop();
        const fileName = `${selectedCooperado?.id}/lote_${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('comprovantes')
          .upload(fileName, comprovanteLoteFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Erro no upload:', uploadError);
          toast.error('Erro ao fazer upload do comprovante');
          return;
        }

        const { data: urlData } = supabase.storage
          .from('comprovantes')
          .getPublicUrl(fileName);

        comprovanteUrl = urlData.publicUrl;
      }

      // Atualizar todas as parcelas selecionadas
      const parcelasIds = Array.from(parcelasSelecionadas);
      
      for (const parcelaId of parcelasIds) {
        const parcela = selectedCooperado?.parcelas.find(p => p.id === parcelaId);
        if (!parcela) continue;

        const { error } = await supabase
          .from('parcelas')
          .update({
            status: 'paga',
            data_pagamento: new Date().toISOString().split('T')[0],
            valor_pago: parcela.valor_parcela,
            observacoes: observacoesLote || null,
            comprovante_url: comprovanteUrl
          })
          .eq('id', parcelaId);

        if (error) {
          console.error('Erro ao atualizar parcela:', parcelaId, error);
          toast.error(`Erro ao processar parcela ${parcela.numero_parcela}`);
          return;
        }
      }

      toast.success(`${parcelasIds.length} parcela(s) processada(s) com sucesso!`);
      setShowBaixaLoteDialog(false);
      setParcelasSelecionadas(new Set());
      await loadDadosFinanceiros();
      
      if (selectedCooperado) {
        const cooperadoAtualizado = cooperados.find(c => c.id === selectedCooperado.id);
        if (cooperadoAtualizado) {
          setSelectedCooperado(cooperadoAtualizado);
        }
      }
    } catch (error: any) {
      console.error('Erro ao dar baixa em lote:', error);
      toast.error('Erro ao dar baixa nas parcelas');
    } finally {
      setProcessandoBaixa(false);
    }
  };

  const visualizarComprovante = (url: string) => {
    window.open(url, '_blank');
  };

  const reverterBaixaParcela = async (parcelaId: string) => {
    try {
      setProcessandoBaixa(true);

      const { error } = await supabase
        .from('parcelas')
        .update({
          status: 'pendente',
          data_pagamento: null,
          valor_pago: null,
        })
        .eq('id', parcelaId);

      if (error) throw error;

      toast.success('Baixa revertida com sucesso');
      await loadDadosFinanceiros();
      
      if (selectedCooperado) {
        const cooperadoAtualizado = cooperados.find(c => c.id === selectedCooperado.id);
        if (cooperadoAtualizado) {
          setSelectedCooperado(cooperadoAtualizado);
        }
      }
    } catch (error: any) {
      console.error('Erro ao reverter baixa:', error);
      toast.error('Erro ao reverter baixa da parcela');
    } finally {
      setProcessandoBaixa(false);
    }
  };

  const getAlertColor = (diasAtraso: number) => {
    if (diasAtraso >= 90) return 'destructive';
    if (diasAtraso >= 85) return 'destructive';
    if (diasAtraso >= 60) return 'destructive';
    if (diasAtraso >= 30) return 'default';
    return 'secondary';
  };

  const handleGerarRelatorio = async () => {
    try {
      setGerandoRelatorio(true);
      
      // Buscar todas as renegociações
      const { data: renegociacoes, error: renegociacoesError } = await supabase
        .from('renegociacoes')
        .select('*')
        .order('data_renegociacao', { ascending: false });

      if (renegociacoesError) throw renegociacoesError;

      if (!renegociacoes || renegociacoes.length === 0) {
        toast.error('Nenhuma renegociação encontrada');
        return;
      }

      // Buscar dados dos cooperados
      const userIds = [...new Set(renegociacoes.map(r => r.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome_completo, quadra, lote')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Buscar parcelas de cada renegociação
      const renegociacaoIds = renegociacoes.map(r => r.id);
      const { data: parcelas, error: parcelasError } = await supabase
        .from('parcelas')
        .select('*')
        .in('renegociacao_id', renegociacaoIds)
        .order('numero_parcela');

      if (parcelasError) throw parcelasError;

      // Montar dados para o relatório
      const dadosRelatorio = renegociacoes.map(renegociacao => {
        const cooperado = profiles?.find(p => p.id === renegociacao.user_id);
        const parcelasRenegociacao = parcelas?.filter(p => p.renegociacao_id === renegociacao.id) || [];

        return {
          ...renegociacao,
          cooperado: {
            nome_completo: cooperado?.nome_completo || 'Desconhecido',
            quadra: cooperado?.quadra || null,
            lote: cooperado?.lote || null,
          },
          parcelas: parcelasRenegociacao,
        };
      });

      // Gerar PDF
      await gerarRelatorioRenegociacoes(dadosRelatorio, filtroRelatorio);
      toast.success('Relatório gerado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório: ' + error.message);
    } finally {
      setGerandoRelatorio(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard de Estatísticas */}
      
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Cooperados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalCooperados}</p>
            <div className="flex gap-2 mt-2 text-xs">
              <Badge variant="secondary">{stats.cooperadosComInvestimento} com investimento</Badge>
              {stats.cooperadosSemInvestimento > 0 && (
                <Badge variant="outline" className="border-orange-500 text-orange-500">
                  {stats.cooperadosSemInvestimento} sem investimento
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Inadimplência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.inadimplentes}</p>
            <div className="flex flex-col gap-1 mt-2 text-xs">
              {stats.inadimplencia30 > 0 && (
                <Badge variant="default">
                  Atraso +30 dias: {stats.inadimplencia30}
                </Badge>
              )}
              {stats.inadimplencia60 > 0 && (
                <Badge variant="default">
                  Atraso +60 dias: {stats.inadimplencia60}
                </Badge>
              )}
              {stats.inadimplencia80 > 0 && (
                <Badge variant="default">
                  Atraso +80 dias: {stats.inadimplencia80}
                </Badge>
              )}
               {stats.inadimplencia85 > 0 && (
                <Badge variant="destructive">
                  Atraso +85 dias: {stats.inadimplencia85}
                </Badge>
              )}
              {stats.inadimplencia89 > 0 && (
                <Badge variant="destructive">
                  Atraso +89 dias: {stats.inadimplencia89}
                </Badge>
              )}
              {stats.inadimplencia90 > 0 && (
                <Badge variant="destructive">
                  Atraso +90 dias: {stats.inadimplencia90}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              R$ {stats.valorTotalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <Badge variant="outline" className="mt-2 text-xs border-green-500 text-green-500">
              {((stats.valorTotalRecebido / stats.valorTotalReceber) * 100).toFixed(2)}% recebido
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Total Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              R$ {stats.valorTotalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <Badge variant="outline" className="mt-2 text-xs border-blue-500 text-blue-500">
              {((stats.valorTotalRecebido / (stats.valorTotalReceber + stats.valorTotalRecebido)) * 100).toFixed(2)}% do total
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Filtro e Tabela de Cooperados */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Financeiros dos Cooperados</CardTitle>
          <CardDescription>
            Visualize e gerencie as informações financeiras dos cooperados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              type="search"
              placeholder="Buscar cooperado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Quadra</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Total Parcelas</TableHead>
                  <TableHead className="text-right">Pagas</TableHead>
                  <TableHead className="text-right">Pendentes</TableHead>
                  <TableHead className="text-right">Vencidas</TableHead>
                  <TableHead className="text-right">Saldo Devedor</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cooperadosFiltrados.map(cooperado => (
                  <TableRow key={cooperado.id}>
                    <TableCell>{cooperado.nome_completo}</TableCell>
                    <TableCell>{cooperado.quadra || '-'}</TableCell>
                    <TableCell>{cooperado.lote || '-'}</TableCell>
                    <TableCell className="text-right">{cooperado.totalParcelas}</TableCell>
                    <TableCell className="text-right">{cooperado.parcelasPagas}</TableCell>
                    <TableCell className="text-right">{cooperado.parcelasPendentes}</TableCell>
                    <TableCell className="text-right">
                      {cooperado.parcelasVencidas > 0 ? (
                        <Badge variant={getAlertColor(cooperado.diasMaximoAtraso)}>
                          {cooperado.parcelasVencidas}
                        </Badge>
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      R$ {cooperado.saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCooperado(cooperado);
                            setShowParcelasDialog(true);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Ver Parcelas
                        </Button>
                        {cooperado.parcelasVencidas > 0 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedCooperado(cooperado);
                              setShowRenegociacaoDialog(true);
                            }}
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Renegociar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {cooperadosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Nenhum cooperado encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog de Parcelas */}
      <Dialog open={showParcelasDialog} onOpenChange={(open) => {
        setShowParcelasDialog(open);
        if (!open) {
          setParcelasSelecionadas(new Set());
          limparFiltros();
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Parcelas - {selectedCooperado?.nome_completo}
            </DialogTitle>
            <DialogDescription>
              Visualize as parcelas do cooperado e registre o pagamento.
            </DialogDescription>
          </DialogHeader>

          {/* Filtros */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros e Ordenação</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={limparFiltros}
              >
                Limpar Filtros
              </Button>
            </div>

            {/* Campo de Busca */}
            <div className="space-y-2">
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número ou descrição..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro de Status */}
              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <Select value={filtroStatus} onValueChange={(value: any) => setFiltroStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="paga">Pagas</SelectItem>
                    <SelectItem value="vencida">Vencidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Data Início */}
              <div className="space-y-2">
                <Label className="text-xs">Vencimento De</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataVencimentoInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataVencimentoInicio ? format(dataVencimentoInicio, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataVencimentoInicio}
                      onSelect={setDataVencimentoInicio}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro de Data Fim */}
              <div className="space-y-2">
                <Label className="text-xs">Vencimento Até</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataVencimentoFim && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataVencimentoFim ? format(dataVencimentoFim, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataVencimentoFim}
                      onSelect={setDataVencimentoFim}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro de Valor Mínimo */}
              <div className="space-y-2">
                <Label className="text-xs">Valor Mínimo</Label>
                <Input
                  type="number"
                  placeholder="R$ 0,00"
                  value={valorMinimo}
                  onChange={(e) => setValorMinimo(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Filtro de Valor Máximo */}
              <div className="space-y-2">
                <Label className="text-xs">Valor Máximo</Label>
                <Input
                  type="number"
                  placeholder="R$ 0,00"
                  value={valorMaximo}
                  onChange={(e) => setValorMaximo(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Ordenação */}
              <div className="space-y-2">
                <Label className="text-xs">Ordenar por</Label>
                <div className="flex gap-2">
                  <Select value={ordenacao} onValueChange={(value: any) => setOrdenacao(value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parcela">Nº Parcela</SelectItem>
                      <SelectItem value="vencimento">Vencimento</SelectItem>
                      <SelectItem value="valor">Valor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDirecaoOrdenacao(direcaoOrdenacao === 'asc' ? 'desc' : 'asc')}
                    title={direcaoOrdenacao === 'asc' ? 'Crescente' : 'Decrescente'}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Exibindo {parcelasFiltradas.length} de {selectedCooperado?.parcelas.length || 0} parcelas
            </div>
          </div>

          {parcelasFiltradas.filter(p => p.status === 'pendente').length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selecionarTodasParcelas}
              >
                {parcelasSelecionadas.size === parcelasFiltradas.filter(p => p.status === 'pendente').length
                  ? 'Desmarcar Todas'
                  : 'Selecionar Todas'}
              </Button>
              {parcelasSelecionadas.size > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={abrirDialogBaixaLote}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Dar Baixa em Lote ({parcelasSelecionadas.size})
                </Button>
              )}
            </div>
          )}

          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelasFiltradas.map(parcela => (
                  <TableRow key={parcela.id}>
                    <TableCell>
                      {parcela.status === 'pendente' && (
                        <Checkbox
                          checked={parcelasSelecionadas.has(parcela.id)}
                          onCheckedChange={() => toggleSelecionarParcela(parcela.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell>{parcela.numero_parcela}</TableCell>
                    <TableCell>{parcela.descricao}</TableCell>
                    <TableCell className="text-right">
                      R$ {Number(parcela.valor_parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(parcela.data_vencimento), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {parcela.status === 'paga' ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          Paga em {format(new Date(parcela.data_pagamento), 'dd/MM/yyyy')}
                        </Badge>
                      ) : parcela.status === 'pendente' ? (
                        new Date(parcela.data_vencimento) < new Date() ? (
                          <Badge variant="destructive">Vencida</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )
                      ) : (
                        <Badge>{parcela.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {parcela.status === 'pendente' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirDialogBaixa(parcela)}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Dar Baixa
                        </Button>
                      )}
                      {parcela.status === 'paga' && parcela.comprovante_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => visualizarComprovante(parcela.comprovante_url)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Comprovante
                        </Button>
                      )}
                      {parcela.observacoes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Obs: {parcela.observacoes}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {parcelasFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Nenhuma parcela encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowParcelasDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Baixa com Comprovante */}
      <Dialog open={showBaixaDialog} onOpenChange={(open) => {
        setShowBaixaDialog(open);
        if (!open) {
          setObservacoesBaixa('');
          setComprovanteFile(null);
          setPreviewUrl(null);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Dar Baixa na Parcela
            </DialogTitle>
            <DialogDescription>
              Registre o pagamento da parcela {parcelaParaBaixa?.numero_parcela} de{' '}
              {selectedCooperado?.nome_completo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Valor da Parcela</Label>
                <p className="font-semibold">
                  R$ {Number(parcelaParaBaixa?.valor_parcela || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Vencimento</Label>
                <p className="font-semibold">
                  {parcelaParaBaixa?.data_vencimento && format(new Date(parcelaParaBaixa.data_vencimento), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Adicione observações sobre o pagamento (forma de pagamento, número do cheque, etc.)"
                value={observacoesBaixa}
                onChange={(e) => setObservacoesBaixa(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comprovante">Comprovante de Pagamento</Label>
              <div className="space-y-2">
                <Input
                  id="comprovante"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: JPG, PNG, WEBP, PDF (máx. 5MB)
                </p>
              </div>

              {previewUrl && (
                <div className="mt-2">
                  <img
                    src={previewUrl}
                    alt="Preview do comprovante"
                    className="max-h-40 rounded-lg border"
                  />
                </div>
              )}

              {comprovanteFile && comprovanteFile.type === 'application/pdf' && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm">{comprovanteFile.name}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBaixaDialog(false)}
              disabled={processandoBaixa}
            >
              Cancelar
            </Button>
            <Button
              onClick={darBaixaParcela}
              disabled={processandoBaixa}
            >
              {processandoBaixa ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar Baixa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Baixa em Lote */}
      <Dialog open={showBaixaLoteDialog} onOpenChange={(open) => {
        setShowBaixaLoteDialog(open);
        if (!open) {
          setObservacoesLote('');
          setComprovanteLoteFile(null);
          setPreviewUrlLote(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Dar Baixa em Lote
            </DialogTitle>
            <DialogDescription>
              Registrar pagamento de {parcelasSelecionadas.size} parcela(s) selecionada(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="observacoes-lote">Observações (opcional)</Label>
              <Textarea
                id="observacoes-lote"
                placeholder="Ex: Pagamento via transferência bancária"
                value={observacoesLote}
                onChange={(e) => setObservacoesLote(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="comprovante-lote">Comprovante (opcional)</Label>
              <Input
                id="comprovante-lote"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileLoteChange}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: JPG, PNG, WEBP, PDF (máx. 5MB)
              </p>
            </div>

            {previewUrlLote && (
              <div className="border rounded-lg p-2">
                <img 
                  src={previewUrlLote} 
                  alt="Preview" 
                  className="max-h-40 mx-auto rounded"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBaixaLoteDialog(false)}
              disabled={processandoBaixa}
            >
              Cancelar
            </Button>
            <Button
              onClick={darBaixaLote}
              disabled={processandoBaixa}
            >
              {processandoBaixa ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar Baixa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedCooperado && (
        <RenegociacaoDividas
          cooperado={selectedCooperado}
          open={showRenegociacaoDialog}
          onOpenChange={setShowRenegociacaoDialog}
          onSuccess={() => {
            loadDadosFinanceiros();
            setShowRenegociacaoDialog(false);
          }}
        />
      )}
    </div>
  );
}
