import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Upload, FileSpreadsheet, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

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
    const { data, error } = await supabase
      .from('investimentos')
      .select(`
        *,
        profiles (nome_completo)
      `)
      .order('data_inicio', { ascending: false });

    if (error) {
      console.error('Erro ao carregar investimentos:', error);
      return;
    }
    setInvestimentos(data || []);
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

  return (
    <div className="space-y-6">
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