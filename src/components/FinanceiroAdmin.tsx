import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Upload, FileSpreadsheet, Edit, Check, X, FileDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function FinanceiroAdmin() {
  const [cooperados, setCooperados] = useState<any[]>([]);
  const [investimentos, setInvestimentos] = useState<any[]>([]);
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [selectedInvestimento, setSelectedInvestimento] = useState<string | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingParcela, setEditingParcela] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  useEffect(() => {
    loadCooperados();
    loadInvestimentos();
  }, []);

  useEffect(() => {
    if (selectedInvestimento) {
      loadParcelas(selectedInvestimento);
    }
  }, [selectedInvestimento]);

  const loadCooperados = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome_completo')
      .order('nome_completo');

    if (error) {
      console.error('Erro ao carregar cooperados:', error);
      return;
    }
    setCooperados(data || []);
  };

  const loadInvestimentos = async () => {
    // Buscar investimentos
    const { data: investimentosData, error: invError } = await supabase
      .from('investimentos')
      .select('*')
      .order('data_inicio', { ascending: false });

    if (invError) {
      console.error('Erro ao carregar investimentos:', invError);
      return;
    }

    // Buscar profiles dos cooperados
    const userIds = [...new Set(investimentosData?.map(i => i.user_id) || [])];
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, nome_completo')
      .in('id', userIds);

    if (profilesError) {
      console.error('Erro ao carregar profiles:', profilesError);
    }

    // Criar um map de profiles
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    // Juntar os dados
    const investimentosWithProfiles = investimentosData?.map(inv => ({
      ...inv,
      profiles: profilesMap.get(inv.user_id) || null
    })) || [];

    setInvestimentos(investimentosWithProfiles);
  };

  const loadParcelas = async (investimentoId: string) => {
    const { data, error } = await supabase
      .from('parcelas')
      .select('*')
      .eq('investimento_id', investimentoId)
      .order('numero_parcela');

    if (error) {
      console.error('Erro ao carregar parcelas:', error);
      return;
    }
    setParcelas(data || []);
  };

  const handleExcelUpload = async () => {
    if (!excelFile) {
      toast.error('Selecione um arquivo Excel');
      return;
    }

    setIsUploading(true);
    try {
      const data = await excelFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Formato esperado da planilha:
      // cooperado_id, valor_total, numero_parcelas, valor_parcela, data_inicio
      // E linhas de parcelas: numero_parcela, data_vencimento, valor_parcela, status, data_pagamento, valor_pago, juros, multa

      for (const row of jsonData as any[]) {
        if (row.cooperado_id) {
          // Criar investimento
          const { data: investimento, error: invError } = await supabase
            .from('investimentos')
            .insert({
              user_id: row.cooperado_id,
              valor_total: row.valor_total,
              numero_parcelas: row.numero_parcelas,
              valor_parcela: row.valor_parcela,
              data_inicio: row.data_inicio,
              observacoes: row.observacoes || null,
            })
            .select()
            .single();

          if (invError) throw invError;

          // Criar parcelas
          if (row.parcelas && Array.isArray(row.parcelas)) {
            const parcelasData = row.parcelas.map((p: any) => ({
              investimento_id: investimento.id,
              numero_parcela: p.numero_parcela,
              valor_parcela: p.valor_parcela,
              data_vencimento: p.data_vencimento,
              data_pagamento: p.data_pagamento || null,
              valor_pago: p.valor_pago || null,
              juros: p.juros || 0,
              multa: p.multa || 0,
              status: p.status || 'pendente',
              observacoes: p.observacoes || null,
            }));

            const { error: parcelasError } = await supabase
              .from('parcelas')
              .insert(parcelasData);

            if (parcelasError) throw parcelasError;
          }
        }
      }

      toast.success('Dados importados com sucesso!');
      loadInvestimentos();
      setExcelFile(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao importar dados');
      console.error('Erro no upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleBaixarParcela = async (parcelaId: string, status: 'paga' | 'pendente') => {
    try {
      const updates: any = { status };
      
      if (status === 'paga') {
        updates.data_pagamento = new Date().toISOString().split('T')[0];
        
        // Se está editando, usar os valores editados
        if (editingParcela === parcelaId && editValues[parcelaId]) {
          const parcela = parcelas.find(p => p.id === parcelaId);
          updates.valor_pago = editValues[parcelaId].valor_pago || parcela?.valor_parcela;
          updates.juros = editValues[parcelaId].juros || 0;
          updates.multa = editValues[parcelaId].multa || 0;
        } else {
          // Usar valor padrão da parcela
          const parcela = parcelas.find(p => p.id === parcelaId);
          updates.valor_pago = parcela?.valor_parcela;
        }
      } else {
        updates.data_pagamento = null;
        updates.valor_pago = null;
        updates.juros = 0;
        updates.multa = 0;
      }

      const { error } = await supabase
        .from('parcelas')
        .update(updates)
        .eq('id', parcelaId);

      if (error) throw error;

      toast.success(status === 'paga' ? 'Parcela baixada com sucesso!' : 'Parcela reaberta');
      setEditingParcela(null);
      setEditValues({});
      if (selectedInvestimento) {
        loadParcelas(selectedInvestimento);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar parcela');
    }
  };

  const startEdit = (parcela: any) => {
    setEditingParcela(parcela.id);
    setEditValues({
      [parcela.id]: {
        valor_pago: parcela.valor_pago || parcela.valor_parcela,
        juros: parcela.juros || 0,
        multa: parcela.multa || 0,
      }
    });
  };

  const exportToExcel = async () => {
    try {
      // Buscar todos os dados com relacionamentos
      const { data: investimentosData, error: invError } = await supabase
        .from('investimentos')
        .select(`
          *,
          profiles (nome_completo),
          parcelas (*)
        `)
        .order('data_inicio', { ascending: false });

      if (invError) throw invError;

      // Preparar dados para o Excel
      const excelData: any[] = [];
      
      investimentosData?.forEach((inv: any) => {
        // Adicionar linha do investimento
        excelData.push({
          'Cooperado': inv.profiles?.nome_completo || '-',
          'Valor Total': inv.valor_total,
          'Número de Parcelas': inv.numero_parcelas,
          'Valor Parcela': inv.valor_parcela,
          'Data Início': new Date(inv.data_inicio).toLocaleDateString('pt-BR'),
          'Observações': inv.observacoes || '-',
          '': '',
          'Parcela Nº': '',
          'Vencimento': '',
          'Status': '',
          'Data Pagamento': '',
          'Valor Pago': '',
          'Juros': '',
          'Multa': '',
        });

        // Adicionar linhas das parcelas
        inv.parcelas?.forEach((parcela: any) => {
          excelData.push({
            'Cooperado': '',
            'Valor Total': '',
            'Número de Parcelas': '',
            'Valor Parcela': '',
            'Data Início': '',
            'Observações': '',
            '': '',
            'Parcela Nº': parcela.numero_parcela,
            'Vencimento': new Date(parcela.data_vencimento).toLocaleDateString('pt-BR'),
            'Status': parcela.status === 'paga' ? 'Paga' : 'Pendente',
            'Data Pagamento': parcela.data_pagamento ? new Date(parcela.data_pagamento).toLocaleDateString('pt-BR') : '-',
            'Valor Pago': parcela.valor_pago ? parcela.valor_pago.toFixed(2) : '-',
            'Juros': (parcela.juros || 0).toFixed(2),
            'Multa': (parcela.multa || 0).toFixed(2),
          });
        });

        // Linha vazia entre investimentos
        excelData.push({});
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório Financeiro');

      const fileName = `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success('Relatório Excel exportado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao exportar relatório');
      console.error('Erro na exportação:', error);
    }
  };

  const exportToPDF = async () => {
    try {
      // Buscar todos os dados com relacionamentos
      const { data: investimentosData, error: invError } = await supabase
        .from('investimentos')
        .select(`
          *,
          profiles (nome_completo),
          parcelas (*)
        `)
        .order('data_inicio', { ascending: false });

      if (invError) throw invError;

      const doc = new jsPDF();
      let yPosition = 20;

      // Título
      doc.setFontSize(18);
      doc.text('Relatório Financeiro Completo', 14, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, yPosition);
      yPosition += 15;

      investimentosData?.forEach((inv: any, index: number) => {
        // Verificar se precisa de nova página
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Informações do investimento
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Investimento ${index + 1}: ${inv.profiles?.nome_completo || 'N/A'}`, 14, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Valor Total: R$ ${inv.valor_total.toFixed(2)}`, 14, yPosition);
        doc.text(`Parcelas: ${inv.numero_parcelas}x de R$ ${inv.valor_parcela.toFixed(2)}`, 110, yPosition);
        yPosition += 6;
        doc.text(`Data Início: ${new Date(inv.data_inicio).toLocaleDateString('pt-BR')}`, 14, yPosition);
        if (inv.observacoes) {
          doc.text(`Obs: ${inv.observacoes}`, 110, yPosition);
        }
        yPosition += 10;

        // Tabela de parcelas
        if (inv.parcelas && inv.parcelas.length > 0) {
          const parcelasData = inv.parcelas.map((p: any) => [
            p.numero_parcela,
            new Date(p.data_vencimento).toLocaleDateString('pt-BR'),
            `R$ ${p.valor_parcela.toFixed(2)}`,
            p.status === 'paga' ? 'Paga' : 'Pendente',
            p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('pt-BR') : '-',
            p.valor_pago ? `R$ ${p.valor_pago.toFixed(2)}` : '-',
            `R$ ${(p.juros || 0).toFixed(2)}`,
            `R$ ${(p.multa || 0).toFixed(2)}`,
          ]);

          autoTable(doc, {
            startY: yPosition,
            head: [['Nº', 'Vencimento', 'Valor', 'Status', 'Dt Pgto', 'Pago', 'Juros', 'Multa']],
            body: parcelasData,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] },
          });

          yPosition = (doc as any).lastAutoTable.finalY + 15;
        }
      });

      // Resumo final
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Geral', 14, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const totalInvestimentos = investimentosData?.reduce((sum, inv) => sum + Number(inv.valor_total), 0) || 0;
      const totalParcelas = investimentosData?.reduce((sum, inv) => sum + (inv.parcelas?.length || 0), 0) || 0;
      const parcelasPagas = investimentosData?.reduce((sum, inv) => 
        sum + (inv.parcelas?.filter((p: any) => p.status === 'paga').length || 0), 0) || 0;
      const totalPago = investimentosData?.reduce((sum, inv) => 
        sum + (inv.parcelas?.filter((p: any) => p.status === 'paga')
          .reduce((s: number, p: any) => s + (Number(p.valor_pago) || 0), 0) || 0), 0) || 0;

      doc.text(`Total de Investimentos: ${investimentosData?.length || 0}`, 14, yPosition);
      yPosition += 6;
      doc.text(`Valor Total Investido: R$ ${totalInvestimentos.toFixed(2)}`, 14, yPosition);
      yPosition += 6;
      doc.text(`Total de Parcelas: ${totalParcelas}`, 14, yPosition);
      yPosition += 6;
      doc.text(`Parcelas Pagas: ${parcelasPagas} (${totalParcelas > 0 ? ((parcelasPagas/totalParcelas)*100).toFixed(1) : 0}%)`, 14, yPosition);
      yPosition += 6;
      doc.text(`Valor Total Pago: R$ ${totalPago.toFixed(2)}`, 14, yPosition);

      const fileName = `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao exportar relatório');
      console.error('Erro na exportação:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Exportação de Relatórios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Exportar Relatórios Financeiros
          </CardTitle>
          <CardDescription>
            Baixe o histórico completo de investimentos e parcelas em Excel ou PDF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={exportToExcel} variant="outline" className="flex-1">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Excel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Dados via Excel
          </CardTitle>
          <CardDescription>
            Faça upload de uma planilha com dados de investimentos e parcelas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="excel">Arquivo Excel (.xlsx)</Label>
              <Input
                id="excel"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Formato: cooperado_id, valor_total, numero_parcelas, valor_parcela, data_inicio
              </p>
            </div>
            <Button onClick={handleExcelUpload} disabled={isUploading || !excelFile}>
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Importando...' : 'Importar Dados'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Investimentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Investimentos Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {investimentos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum investimento cadastrado ainda
            </p>
          ) : (
            <div className="space-y-4">
              {investimentos.map((inv) => (
                <div 
                  key={inv.id} 
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedInvestimento === inv.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedInvestimento(inv.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{inv.profiles?.nome_completo}</p>
                      <p className="text-sm text-muted-foreground">
                        {inv.numero_parcelas}x de R$ {inv.valor_parcela.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total: R$ {inv.valor_total.toFixed(2)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {new Date(inv.data_inicio).toLocaleDateString('pt-BR')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gestão de Parcelas */}
      {selectedInvestimento && (
        <Card>
          <CardHeader>
            <CardTitle>Parcelas do Investimento</CardTitle>
            <CardDescription>
              Gerencie as parcelas e faça baixas de pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {parcelas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma parcela cadastrada
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Juros</TableHead>
                    <TableHead>Multa</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.map((parcela) => (
                    <TableRow key={parcela.id}>
                      <TableCell>{parcela.numero_parcela}</TableCell>
                      <TableCell>
                        {new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>R$ {parcela.valor_parcela.toFixed(2)}</TableCell>
                      <TableCell>
                        {editingParcela === parcela.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues[parcela.id]?.juros || 0}
                            onChange={(e) => setEditValues({
                              ...editValues,
                              [parcela.id]: {
                                ...editValues[parcela.id],
                                juros: parseFloat(e.target.value) || 0
                              }
                            })}
                            className="w-24"
                          />
                        ) : (
                          `R$ ${(parcela.juros || 0).toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell>
                        {editingParcela === parcela.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editValues[parcela.id]?.multa || 0}
                            onChange={(e) => setEditValues({
                              ...editValues,
                              [parcela.id]: {
                                ...editValues[parcela.id],
                                multa: parseFloat(e.target.value) || 0
                              }
                            })}
                            className="w-24"
                          />
                        ) : (
                          `R$ ${(parcela.multa || 0).toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell>
                        {parcela.valor_pago ? `R$ ${parcela.valor_pago.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={parcela.status === 'paga' ? 'default' : 'secondary'}>
                          {parcela.status === 'paga' ? 'Paga' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {editingParcela === parcela.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleBaixarParcela(parcela.id, 'paga')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingParcela(null);
                                  setEditValues({});
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {parcela.status === 'pendente' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEdit(parcela)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Baixar
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleBaixarParcela(parcela.id, 'pendente')}
                                >
                                  Reabrir
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}